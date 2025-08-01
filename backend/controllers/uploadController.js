const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');

const File = require('../models/File');
const Workbook = require('../models/Workbook');
const Worksheet = require('../models/Worksheet');
const SheetData = require('../models/SheetData');
const DemandCursor = require('../models/DemandCursor');
const DemandCountryMasterCursor = require('../models/DemandCountryMasterCursor');
const BaseScenarioConfigurationCursor = require('../models/BaseScenarioConfigurationCursor');
const CapacityCursor = require('../models/CapacityCursor');
const FreightStorageCostsCursor = require('../models/FreightStorageCostsCursor');
const { query } = require('../config/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    'application/vnd.ms-excel', // .xls
    'application/zip', // .zip
    'application/x-zip-compressed'
  ];
  
  if (allowedTypes.includes(file.mimetype) || 
      file.originalname.match(/\.(xlsx|xlsm|xls|zip)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel files (.xlsx, .xlsm, .xls) and ZIP files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
}).single('file');

// Helper function to determine cell type
const determineCellType = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'empty';
  }
  
  if (typeof value === 'number') {
    // Check if it's an Excel date serial number (between 40000 and 50000 for modern dates)
    // Excel date serial numbers for dates from 2009 onwards are typically in this range
    if (value >= 40000 && value <= 50000 && value === Math.floor(value)) {
      return 'date';
    }
    return 'number';
  }
  
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  
  if (typeof value === 'string') {
    // Check if it's a formula
    if (value.startsWith('=')) {
      return 'formula';
    }
    
    // Check if it's a date string
    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime()) && value.match(/\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/)) {
      return 'date';
    }
    
    return 'string';
  }
  
  return 'string';
};

// Helper function to determine which cursor table to use based on sheet name
const getCursorTableForSheet = (sheetName, workbookName) => {
  const normalizedSheetName = sheetName.toLowerCase().trim();
  const normalizedWorkbookName = workbookName.toLowerCase().trim();
  
  // Check for Demand sheet
  if (normalizedSheetName === 'demand' || 
      normalizedWorkbookName.includes('demand') && !normalizedWorkbookName.includes('country') && !normalizedWorkbookName.includes('master')) {
    return 'demand';
  }
  
  // Check for Demand Country Master sheet
  if (normalizedSheetName.includes('demand') && normalizedSheetName.includes('country') && normalizedSheetName.includes('master') ||
      normalizedWorkbookName.includes('demand') && normalizedWorkbookName.includes('country') && normalizedWorkbookName.includes('master')) {
    return 'demand_country_master';
  }
  
  // Check for Base Scenario Configuration / Planning Time Period sheet
  if (normalizedSheetName.includes('base') && normalizedSheetName.includes('scenario') && normalizedSheetName.includes('configuration') ||
      normalizedSheetName.includes('planning') && normalizedSheetName.includes('time') && normalizedSheetName.includes('period') ||
      normalizedWorkbookName.includes('base') && normalizedWorkbookName.includes('scenario') ||
      normalizedWorkbookName.includes('planning') && normalizedWorkbookName.includes('time')) {
    return 'base_scenario_configuration';
  }
  
  // Check for Capacity sheet
  if (normalizedSheetName.includes('capacity') ||
      normalizedWorkbookName.includes('capacity')) {
    return 'capacity';
  }
  
  // Check for Freight Storage Costs sheet
  if (normalizedSheetName.includes('freight') && normalizedSheetName.includes('storage') && normalizedSheetName.includes('costs') ||
      normalizedSheetName.includes('freightrawdata') ||
      normalizedWorkbookName.includes('freight') && normalizedWorkbookName.includes('storage') && normalizedWorkbookName.includes('costs') ||
      normalizedWorkbookName.includes('freightrawdata')) {
    return 'freight_storage_costs';
  }
  
  return null; // Not a special sheet
};

// Helper function to insert data into the appropriate cursor table
const insertCursorBatch = async (cursorDataBatch, cursorTableType) => {
  if (cursorDataBatch.length === 0) return;

  try {
    switch (cursorTableType) {
      case 'demand':
        await DemandCursor.createBatch(cursorDataBatch);
        break;
      case 'demand_country_master':
        await DemandCountryMasterCursor.createBatch(cursorDataBatch);
        break;
      case 'base_scenario_configuration':
        await BaseScenarioConfigurationCursor.createBatch(cursorDataBatch);
        break;
      case 'capacity':
        await CapacityCursor.createBatch(cursorDataBatch);
        break;
      case 'freight_storage_costs':
        await FreightStorageCostsCursor.createBatch(cursorDataBatch);
        break;
      default:
        console.warn(`Unknown cursor table type: ${cursorTableType}`);
    }
  } catch (error) {
    console.error(`Error inserting into ${cursorTableType} cursor table:`, error);
    throw error;
  }
};

// Process Excel file and save to database
const processExcelFile = async (filePath, fileRecord) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    // Create workbook record
    const workbookRecord = await Workbook.create({
      file_id: fileRecord.id,
      workbook_name: path.basename(filePath, path.extname(filePath)),
      sheet_count: sheetNames.length,
      total_rows: 0,
      total_columns: 0
    });

    let totalRows = 0;
    let maxColumns = 0;

    // Generate upload batch ID for cursor tables
    const uploadBatchId = uuidv4();

    for (let i = 0; i < sheetNames.length; i++) {
      const sheetName = sheetNames[i];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) continue;

      // Get sheet range
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const rowCount = range.e.r + 1;
      const columnCount = range.e.c + 1;

      totalRows += rowCount;
      maxColumns = Math.max(maxColumns, columnCount);

      // Create worksheet record
      const worksheetRecord = await Worksheet.create({
        workbook_id: workbookRecord.id,
        sheet_name: sheetName,
        sheet_index: i,
        row_count: rowCount,
        column_count: columnCount,
        has_headers: true // Assume first row contains headers
      });

      // Check if this sheet should be stored in cursor tables
      const cursorTableType = getCursorTableForSheet(sheetName, workbookRecord.workbook_name);
      
      // Process sheet data in batches
      const batchSize = 1000;
      const cellDataBatch = [];
      const cursorDataBatch = [];

      for (let row = 0; row <= range.e.r; row++) {
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell) {
            let cellValue = cell.v;
            const cellType = determineCellType(cellValue);
            
            // Convert Excel date serial numbers to readable date format
            if (cellType === 'date' && typeof cellValue === 'number') {
              // Excel date serial numbers start from January 1, 1900
              // Convert to JavaScript date
              const excelDate = new Date((cellValue - 25569) * 86400 * 1000);
              cellValue = excelDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short'
              });
              console.log(`Converted Excel date ${cell.v} to ${cellValue}`);
            }
            
            const columnName = row === 0 ? String(cellValue) : `Column_${col}`;

            const cellData = {
              worksheet_id: worksheetRecord.id,
              row_index: row,
              column_index: col,
              column_name: columnName,
              cell_value: String(cellValue || ''),
              cell_type: cellType
            };

            cellDataBatch.push(cellData);

            // If this is a special sheet, also add to cursor batch
            if (cursorTableType) {
              cursorDataBatch.push({
                ...cellData,
                workbook_id: workbookRecord.id,
                formula: cell.f || null,
                upload_batch_id: uploadBatchId
              });
            }

            // Insert batch when it reaches the limit
            if (cellDataBatch.length >= batchSize) {
              await SheetData.createBatch(cellDataBatch);
              cellDataBatch.length = 0; // Clear the batch
            }

            // Insert cursor batch when it reaches the limit
            if (cursorDataBatch.length >= batchSize) {
              await insertCursorBatch(cursorDataBatch, cursorTableType);
              cursorDataBatch.length = 0; // Clear the batch
            }
          }
        }
      }

      // Insert remaining cells
      if (cellDataBatch.length > 0) {
        await SheetData.createBatch(cellDataBatch);
      }

      // Insert remaining cursor data
      if (cursorDataBatch.length > 0) {
        await insertCursorBatch(cursorDataBatch, cursorTableType);
      }

      // Log if this sheet was stored in cursor tables
      if (cursorTableType) {
        console.log(`📊 Stored sheet "${sheetName}" in ${cursorTableType} cursor table`);
      }
    }

    // Update workbook with totals
    await Workbook.update(workbookRecord.id, {
      total_rows: totalRows,
      total_columns: maxColumns
    });

    // Automatically create demand template for this upload
    await createDemandTemplateForUpload(fileRecord, workbookRecord);

    return workbookRecord;

  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw error;
  }
};

// Automatically create demand template for uploaded data
const createDemandTemplateForUpload = async (fileRecord, workbookRecord) => {
  try {
    // Extract month and year from filename or use current date
    const filename = fileRecord.original_name;
    let month = null;
    let year = null;
    
    // Try to extract date from filename (e.g., "OneDrive_2025-07-17.zip")
    const dateMatch = filename.match(/(\d{4})-(\d{2})/);
    if (dateMatch) {
      year = parseInt(dateMatch[1]);
      month = dateMatch[2];
    } else {
      // Use current date if no date found in filename
      const now = new Date();
      year = now.getFullYear();
      month = String(now.getMonth() + 1).padStart(2, '0');
    }

    // Create demand template name
    const templateName = `Demand_Template_${year}_${month}`;
    
    // Check if a template already exists for this month/year
    const existingTemplate = await query(
      'SELECT * FROM demand_templates WHERE template_name = $1 AND upload_month = $2 AND upload_year = $3',
      [templateName, month, year]
    );
    
    if (existingTemplate.rows.length > 0) {
      console.log(`Demand template already exists for ${month}/${year}, skipping creation`);
      return existingTemplate.rows[0];
    }
    
    // Get all workbooks from this upload
    const workbooksResult = await query(
      'SELECT * FROM workbooks WHERE file_id = $1',
      [fileRecord.id]
    );
    
    const sourceWorkbooks = workbooksResult.rows.map(wb => ({
      workbookId: wb.id,
      workbookName: wb.workbook_name,
      sheetCount: wb.sheet_count
    }));

    // Create demand template
    const templateResult = await query(
      `INSERT INTO demand_templates 
       (template_name, source_workbooks, lookup_configs, calculations, output_format, upload_month, upload_year) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        templateName,
        JSON.stringify(sourceWorkbooks),
        JSON.stringify([]), // Empty lookup configs for now
        JSON.stringify([]), // Empty calculations for now
        'xlsm',
        month,
        year
      ]
    );

    console.log(`Created demand template: ${templateName} for upload: ${fileRecord.original_name}`);
    return templateResult.rows[0];

  } catch (error) {
    console.error('Error creating demand template for upload:', error);
    // Don't throw error - we don't want to fail the upload if template creation fails
  }
};

// Process ZIP file containing Excel files
const processZipFile = async (filePath, fileRecord) => {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const processedWorkbooks = [];

    for (const entry of entries) {
      if (!entry.isDirectory && entry.entryName.match(/\.(xlsx|xlsm|xls)$/i)) {
        console.log('Processing ZIP entry:', entry.entryName);
        
        // Extract Excel file to temporary location
        const tempDir = path.join(__dirname, '../temp');
        await fs.mkdir(tempDir, { recursive: true });
        
        // Handle nested directory structure in ZIP
        const entryPath = entry.entryName;
        const tempFilePath = path.join(tempDir, path.basename(entryPath));
        
        console.log('Extracting to:', tempFilePath);
        
        // Ensure the directory exists
        const tempFileDir = path.dirname(tempFilePath);
        await fs.mkdir(tempFileDir, { recursive: true });
        
        await fs.writeFile(tempFilePath, entry.getData());

        // Process the extracted Excel file
        const workbook = await processExcelFile(tempFilePath, fileRecord);
        processedWorkbooks.push(workbook);

        // Clean up temporary file
        await fs.unlink(tempFilePath);
      }
    }

    return processedWorkbooks;

  } catch (error) {
    console.error('Error processing ZIP file:', error);
    throw error;
  }
};

// Controller functions
const uploadFile = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    try {
      // Create file record
      const fileRecord = await File.create({
        original_name: req.file.originalname,
        file_type: req.file.mimetype,
        file_size: req.file.size
      });

      // Update status to processing
      await File.updateStatus(fileRecord.id, 'processing');

      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();

      let result;

      if (fileExtension === '.zip') {
        result = await processZipFile(filePath, fileRecord);
      } else if (['.xlsx', '.xlsm', '.xls'].includes(fileExtension)) {
        result = await processExcelFile(filePath, fileRecord);
      } else {
        throw new Error('Unsupported file type');
      }

      // Update status to completed
      await File.updateStatus(fileRecord.id, 'completed');

      // Clean up uploaded file
      await fs.unlink(filePath);

      res.status(200).json({
        message: 'File uploaded and processed successfully',
        file: fileRecord,
        workbooks: Array.isArray(result) ? result : [result]
      });

    } catch (error) {
      console.error('Upload processing error:', error);
      
      // Update status to failed
      if (req.file) {
        const fileRecord = await File.create({
          original_name: req.file.originalname,
          file_type: req.file.mimetype,
          file_size: req.file.size
        });
        await File.updateStatus(fileRecord.id, 'failed', error.message);
      }

      res.status(500).json({ 
        error: 'Failed to process uploaded file',
        details: error.message 
      });
    }
  });
};

const getUploadStatus = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findById(fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const workbooks = await Workbook.findByFileId(fileId);
    
    res.json({
      file,
      workbooks
    });

  } catch (error) {
    console.error('Error getting upload status:', error);
    res.status(500).json({ error: 'Failed to get upload status' });
  }
};

const getUploads = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const files = await File.findAll(parseInt(limit), offset);
    
    res.json({
      files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: files.length
      }
    });

  } catch (error) {
    console.error('Error getting uploads:', error);
    res.status(500).json({ error: 'Failed to get uploads' });
  }
};

module.exports = {
  uploadFile,
  getUploadStatus,
  getUploads
}; 