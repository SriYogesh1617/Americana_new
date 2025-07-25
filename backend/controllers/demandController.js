const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const Workbook = require('../models/Workbook');
const Worksheet = require('../models/Worksheet');
const SheetData = require('../models/SheetData');

// Create demand template with lookups and calculations
const createDemandTemplate = async (req, res) => {
  try {
    const { 
      templateName, 
      sourceWorkbooks, 
      lookupConfigs, 
      calculations,
      outputFormat = 'xlsm' 
    } = req.body;

    if (!templateName || !sourceWorkbooks || !lookupConfigs) {
      return res.status(400).json({ 
        error: 'Template name, source workbooks, and lookup configurations are required' 
      });
    }

    // Create template record
    const templateResult = await query(
      `INSERT INTO demand_templates 
       (template_name, source_workbooks, lookup_configs, calculations, output_format) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        templateName, 
        JSON.stringify(sourceWorkbooks), 
        JSON.stringify(lookupConfigs), 
        JSON.stringify(calculations || []),
        outputFormat
      ]
    );

    const template = templateResult.rows[0];

    res.status(201).json({
      message: 'Demand template created successfully',
      template
    });

  } catch (error) {
    console.error('Error creating demand template:', error);
    res.status(500).json({ error: 'Failed to create demand template' });
  }
};

// Execute demand template and generate final sheet
const executeDemandTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { month, year } = req.query;

    // Get template configuration
    const templateResult = await query(
      'SELECT * FROM demand_templates WHERE id = $1',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Demand template not found' });
    }

    const template = templateResult.rows[0];
    const sourceWorkbooks = template.source_workbooks;
    const lookupConfigs = template.lookup_configs;
    const calculations = template.calculations || [];

    // Create new workbook for final demand template
    const wb = XLSX.utils.book_new();

    // Create the 4 default sheets: T_01, T_02, T_03, T_04
    const sheetNames = ['T_01', 'T_02', 'T_03', 'T_04'];
    
    for (const sheetName of sheetNames) {
      // Create empty sheet with basic structure
      const sheetData = createDefaultSheetStructure(sheetName);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Add sheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    console.log('Executing demand template with sourceWorkbooks:', sourceWorkbooks);
    console.log('Month:', month, 'Year:', year);
    
    // Process T01 sheet data with demand logic (always process, even if sourceWorkbooks is empty)
    await processT01SheetData(wb, sourceWorkbooks || [], month, year);
    
    // Process source workbooks and apply lookups if configured
    if (sourceWorkbooks && sourceWorkbooks.length > 0) {
      const processedData = await processSourceWorkbooks(sourceWorkbooks, lookupConfigs);
      
      // Apply calculations if any
      if (calculations && calculations.length > 0) {
        const calculatedData = await applyCalculations(processedData, calculations);
        // Apply calculated data to appropriate sheets
        applyCalculatedDataToSheets(wb, calculatedData);
      }
    }

    // Add formulas and macros for XLSM format
    if (template.output_format === 'xlsm') {
      await addDemandFormulasToAllSheets(wb, calculations);
    }

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Demand_Template_${month || 'ALL'}_${year || new Date().getFullYear()}.${template.output_format}`;
    
    // Create export directory
    const exportDir = path.join(__dirname, '../exports/demand');
    await fs.mkdir(exportDir, { recursive: true });
    
    const filepath = path.join(exportDir, filename);

    // Write file
    XLSX.writeFile(wb, filepath);

    // Create export job record
    await query(
      `INSERT INTO demand_export_jobs 
       (template_id, status, file_path, month, year) 
       VALUES ($1, $2, $3, $4, $5)`,
      [templateId, 'completed', filepath, month, year]
    );

    // Send file for download
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending demand template file:', err);
        res.status(500).json({ error: 'Failed to download demand template' });
      }
      
      // Clean up file after download
      setTimeout(async () => {
        try {
          await fs.unlink(filepath);
        } catch (cleanupErr) {
          console.error('Error cleaning up demand template file:', cleanupErr);
        }
      }, 10000); // Delete after 10 seconds
    });

  } catch (error) {
    console.error('Error executing demand template:', error);
    res.status(500).json({ error: 'Failed to execute demand template' });
  }
};

// Get all demand templates
const getDemandTemplates = async (req, res) => {
  try {
    const result = await query(
      `SELECT dt.*, 
              COUNT(dej.id) as export_count,
              MAX(dej.created_at) as last_export_date
       FROM demand_templates dt
       LEFT JOIN demand_export_jobs dej ON dt.id = dej.template_id
       GROUP BY dt.id
       ORDER BY dt.created_at DESC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error getting demand templates:', error);
    res.status(500).json({ error: 'Failed to get demand templates' });
  }
};

// Get demand template by ID
const getDemandTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;

    const result = await query(
      'SELECT * FROM demand_templates WHERE id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demand template not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error getting demand template:', error);
    res.status(500).json({ error: 'Failed to get demand template' });
  }
};

// Get demand export history
const getDemandExportHistory = async (req, res) => {
  try {
    const result = await query(
      `SELECT dej.*, dt.template_name 
       FROM demand_export_jobs dej 
       JOIN demand_templates dt ON dej.template_id = dt.id 
       ORDER BY dej.created_at DESC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error getting demand export history:', error);
    res.status(500).json({ error: 'Failed to get demand export history' });
  }
};

// Check if data exists for a specific month
const checkMonthData = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ 
        error: 'Month and year are required' 
      });
    }

    // Check if demand template exists for this month
    const templateResult = await query(
      'SELECT * FROM demand_templates WHERE upload_month = $1 AND upload_year = $2',
      [month, year]
    );

    if (templateResult.rows.length > 0) {
      res.json({
        exists: true,
        template: templateResult.rows[0],
        message: `Data available for ${month}/${year}`
      });
    } else {
      res.json({
        exists: false,
        message: `No data found for ${month}/${year}. Please upload ZIP file.`
      });
    }

  } catch (error) {
    console.error('Error checking month data:', error);
    res.status(500).json({ error: 'Failed to check month data' });
  }
};

// Create default demand template
const createDefaultDemandTemplate = async (req, res) => {
  try {
    const defaultTemplate = {
      template_name: 'Default_Demand_Template',
      source_workbooks: [], // Empty for now
      lookup_configs: [], // Empty for now
      calculations: [], // Empty for now
      output_format: 'xlsm'
    };

    const templateResult = await query(
      `INSERT INTO demand_templates 
       (template_name, source_workbooks, lookup_configs, calculations, output_format) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        defaultTemplate.template_name,
        JSON.stringify(defaultTemplate.source_workbooks),
        JSON.stringify(defaultTemplate.lookup_configs),
        JSON.stringify(defaultTemplate.calculations),
        defaultTemplate.output_format
      ]
    );

    const template = templateResult.rows[0];

    res.status(201).json({
      message: 'Default demand template created successfully',
      template
    });

  } catch (error) {
    console.error('Error creating default demand template:', error);
    res.status(500).json({ error: 'Failed to create default demand template' });
  }
};

// Helper function to process source workbooks
const processSourceWorkbooks = async (sourceWorkbooks, lookupConfigs) => {
  const processedData = [];

  for (const sourceConfig of sourceWorkbooks) {
    const { workbookId, worksheetId, dataRange } = sourceConfig;
    
    // Get worksheet data
    const worksheetData = await SheetData.findByWorksheet(worksheetId);
    
    // Apply lookups based on configuration
    const lookedUpData = await applyLookups(worksheetData, lookupConfigs);
    
    processedData.push({
      source: sourceConfig,
      data: lookedUpData
    });
  }

  return processedData;
};

// Helper function to apply lookups
const applyLookups = async (data, lookupConfigs) => {
  const result = [];

  for (const lookupConfig of lookupConfigs) {
    const { lookupType, lookupValue, tableArray, colIndexNum, rangeLookup = false } = lookupConfig;
    
    switch (lookupType.toLowerCase()) {
      case 'vlookup':
        result.push(await performVLookup(lookupValue, tableArray, colIndexNum, rangeLookup));
        break;
      case 'hlookup':
        result.push(await performHLookup(lookupValue, tableArray, rowIndexNum, rangeLookup));
        break;
      case 'index_match':
        result.push(await performIndexMatch(lookupValue, tableArray, matchColumn, returnColumn));
        break;
      default:
        console.warn(`Unknown lookup type: ${lookupType}`);
    }
  }

  return result;
};

// Helper function to perform VLOOKUP
const performVLookup = async (lookupValue, tableArray, colIndexNum, rangeLookup) => {
  // Implementation of VLOOKUP logic
  // This would search the first column of tableArray for lookupValue
  // and return the value from the colIndexNum column
  return `VLOOKUP(${lookupValue}, ${tableArray}, ${colIndexNum}, ${rangeLookup})`;
};

// Helper function to perform HLOOKUP
const performHLookup = async (lookupValue, tableArray, rowIndexNum, rangeLookup) => {
  // Implementation of HLOOKUP logic
  return `HLOOKUP(${lookupValue}, ${tableArray}, ${rowIndexNum}, ${rangeLookup})`;
};

// Helper function to perform INDEX/MATCH
const performIndexMatch = async (lookupValue, tableArray, matchColumn, returnColumn) => {
  // Implementation of INDEX/MATCH logic
  return `INDEX(${tableArray}, MATCH(${lookupValue}, ${matchColumn}, 0), ${returnColumn})`;
};

// Helper function to apply calculations
const applyCalculations = async (processedData, calculations) => {
  const calculatedData = [];

  for (const calculation of calculations) {
    const { formula, targetCell, dependencies } = calculation;
    
    // Apply the calculation formula
    const result = await evaluateFormula(formula, dependencies, processedData);
    
    calculatedData.push({
      cell: targetCell,
      value: result,
      formula: formula
    });
  }

  return calculatedData;
};

// Helper function to evaluate formulas
const evaluateFormula = async (formula, dependencies, data) => {
  // This would evaluate Excel-like formulas
  // For now, return a placeholder
  return `=EVALUATE(${formula})`;
};

// Helper function to create default sheet structure
const createDefaultSheetStructure = (sheetName) => {
  const sheetData = [];
  
  if (sheetName === 'T_01') {
    // T_01 sheet with specific headers
    const t01Headers = [
      'CTY',
      'FGSKUCode', 
      'MthNum',
      'DemandCases',
      'Market',
      'Production Environment',
      'Safety Stock WH',
      'Inventory Days (Norm)',
      'Supply',
      'CONS'
    ];
    sheetData.push(t01Headers);
    
    // Add empty data rows (will be dynamically resized based on actual data)
    for (let row = 1; row <= 100; row++) {
      const rowData = [];
      for (let col = 0; col < t01Headers.length; col++) {
        rowData.push('');
      }
      sheetData.push(rowData);
    }
  } else {
    // For other sheets (T_02, T_03, T_04), create basic structure
    const headers = [];
    for (let col = 0; col < 20; col++) {
      headers.push(`Column_${col + 1}`);
    }
    sheetData.push(headers);
    
    // Add empty data rows
    for (let row = 1; row < 20; row++) {
      const rowData = [];
      for (let col = 0; col < 20; col++) {
        rowData.push('');
      }
      sheetData.push(rowData);
    }
  }
  
  return sheetData;
};

// Helper function to apply calculated data to sheets
const applyCalculatedDataToSheets = (workbook, calculatedData) => {
  // This function will apply calculated data to the appropriate sheets
  // For now, it's a placeholder for future implementation
  console.log('Applying calculated data to sheets:', calculatedData);
};

// Helper function to add demand formulas to all sheets
const addDemandFormulasToAllSheets = async (workbook, calculations) => {
  const sheetNames = ['T_01', 'T_02', 'T_03', 'T_04'];
  
  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (worksheet) {
      await addDemandFormulas(worksheet, calculations);
    }
  }
};

// Helper function to process T01 sheet data
const processT01SheetData = async (workbook, sourceWorkbooks, month, year) => {
  try {
    console.log('Processing T01 sheet data...');
    
    // Get the T01 worksheet
    const t01Worksheet = workbook.Sheets['T_01'];
    if (!t01Worksheet) {
      console.error('T01 worksheet not found');
      return;
    }

    // Get all workbooks from the source
    const allWorkbooks = [];
    console.log('Source workbooks config:', sourceWorkbooks);
    
    for (const sourceConfig of sourceWorkbooks) {
      const { workbookId } = sourceConfig;
      console.log('Processing workbook ID:', workbookId);
      const workbookData = await Workbook.getWorkbookWithSheets(workbookId);
      if (workbookData) {
        console.log('Found workbook:', workbookData.workbook_name);
        allWorkbooks.push(workbookData);
      } else {
        console.log('Workbook not found for ID:', workbookId);
      }
    }
    
    console.log('Total workbooks found:', allWorkbooks.length);
    console.log('Workbook names:', allWorkbooks.map(wb => wb.workbook_name));

    // Find Demand.xlsx and Demand_Country_Master.xlsx
    let demandWorkbooks = [];
    let countryMasterWorkbook = null;

    for (const wb of allWorkbooks) {
      if (wb.workbook_name.toLowerCase().includes('demand') && wb.workbook_name.toLowerCase().includes('country')) {
        countryMasterWorkbook = wb;
      } else if (wb.workbook_name.toLowerCase() === 'demand') {
        // This is the main Demand file
        demandWorkbooks.push(wb);
      }
    }
    
    console.log('Found demand workbooks:', demandWorkbooks.map(wb => wb.workbook_name));
    console.log('Found country master workbook:', countryMasterWorkbook?.workbook_name);

    if (demandWorkbooks.length === 0) {
      console.error('No demand data files found in uploaded files');
      return;
    }

    // Process demand data from all demand workbooks
    let allProcessedData = [];
    for (const demandWorkbook of demandWorkbooks) {
      console.log('Processing demand workbook:', demandWorkbook.workbook_name);
      const processedDemandData = await processDemandData(demandWorkbook, countryMasterWorkbook);
      allProcessedData = allProcessedData.concat(processedDemandData);
    }
    
    console.log('Total processed rows:', allProcessedData.length);
    
    // Populate T01 worksheet with processed data
    await populateT01Worksheet(t01Worksheet, allProcessedData);

  } catch (error) {
    console.error('Error processing T01 sheet data:', error);
  }
};

// Helper function to process demand data
const processDemandData = async (demandWorkbook, countryMasterWorkbook) => {
  const processedData = [];

  try {
    // Get all worksheets from demand workbook
    console.log('Processing demand workbook with', demandWorkbook.worksheets.length, 'worksheets');
    
    for (const worksheet of demandWorkbook.worksheets) {
      console.log('Processing worksheet:', worksheet.sheet_name, 'with', worksheet.row_count, 'rows');
      const worksheetData = await SheetData.findByWorksheet(worksheet.id, null, 0);
      
      if (worksheetData && worksheetData.length > 0) {
        // Convert to array format for easier processing
        const dataArray = convertSheetDataToArray(worksheetData);
        
        console.log('Demand data structure for', worksheet.sheet_name + ':');
        if (dataArray.length > 0) {
          console.log('Headers:', dataArray[0]);
          console.log('Total rows in this worksheet:', dataArray.length);
          console.log('First few rows:', dataArray.slice(1, 4));
        }
        
        // Process each row according to the logic
        let processedRowsInWorksheet = 0;
        let emptyGeographyRows = 0;
        let emptyMarketRows = 0;
        let headerRows = 0;
        
        console.log('Processing', dataArray.length, 'rows in worksheet', worksheet.sheet_name);
        
        for (const row of dataArray) {
          // Skip header row
          if (row[0] === 'Geography' || row[0] === 'CTY') {
            headerRows++;
            console.log('Skipping header row:', row[0]);
            continue;
          }
          
          // Create Geography-Market column from Demand sheet data
          const geography = row[0] || ''; // Geography column (Column 1)
          const market = row[1] || ''; // Market column (Column 2)
          
          // Skip rows with empty Geography or Market
          if (!geography || !market || geography.trim() === '' || market.trim() === '') {
            if (!geography || geography.trim() === '') emptyGeographyRows++;
            if (!market || market.trim() === '') emptyMarketRows++;
            console.log('Skipping row with empty Geography or Market:', { geography, market });
            continue;
          }
          
          const geographyMarket = `${geography}_${market}`;
          
          console.log('Created Geography-Market:', geographyMarket, 'from Geography:', geography, 'Market:', market);
          
          // Map Geography-Market to actual country name from Demand_Country_Master
          const cty = await mapToCountry(geographyMarket, countryMasterWorkbook);
          
          // Round DemandCases to nearest integer (will be populated from monthly data)
          const demandCases = 0; // Will be populated from monthly demand data
          
          // Create processed row using correct column mapping
          const processedRow = {
            CTY: cty,
            FGSKUCode: row[6] || null, // Unified code column (Column 7)
            MthNum: null, // Will be populated based on month/year
            DemandCases: demandCases,
            Market: market,
            'Production Environment': null, // Will be populated from other sources
            'Safety Stock WH': null, // Will be populated from country master
            'Inventory Days (Norm)': null, // Will be populated from other sources
            Supply: null, // Will be populated from T02_SecDist
            CONS: null // Will be populated from calculations
          };
          
          // Only add row if it has meaningful data
          if (cty && cty.toString().trim() !== '') {
            processedData.push(processedRow);
            processedRowsInWorksheet++;
          } else {
            console.log('Skipping row with empty CTY value');
          }
        }
        
        console.log('Processed', processedRowsInWorksheet, 'rows from worksheet:', worksheet.sheet_name);
        console.log('Filtered out:', headerRows, 'header rows,', emptyGeographyRows, 'empty geography rows,', emptyMarketRows, 'empty market rows');
      }
    }
    
    console.log('Total processed data rows:', processedData.length);
    console.log('=== DEMAND DATA PROCESSING SUMMARY ===');
    console.log('Total rows processed from all demand worksheets:', processedData.length);
    console.log('===============================================');
    return processedData;
    
  } catch (error) {
    console.error('Error processing demand data:', error);
    return [];
  }
};

// Helper function to convert sheet data to array format
const convertSheetDataToArray = (sheetData) => {
  console.log('Converting', sheetData.length, 'cells to array format');
  
  // Group data by row
  const rowMap = new Map();
  
  for (const cell of sheetData) {
    if (!rowMap.has(cell.row_index)) {
      rowMap.set(cell.row_index, []);
    }
    rowMap.get(cell.row_index)[cell.column_index] = cell.cell_value;
  }
  
  console.log('Found', rowMap.size, 'unique rows');
  
  // Get the actual row range
  const rowIndices = Array.from(rowMap.keys()).sort((a, b) => a - b);
  const minRow = Math.min(...rowIndices);
  const maxRow = Math.max(...rowIndices);
  
  console.log('Row range:', minRow, 'to', maxRow);
  
  // Convert to array and fill empty cells
  const maxColumns = Math.max(...Array.from(rowMap.values()).map(row => row.length));
  const result = [];
  
  for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
    const row = rowMap.get(rowIndex) || [];
    const filledRow = [];
    
    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      filledRow[colIndex] = row[colIndex] || '';
    }
    
    result.push(filledRow);
  }
  
  console.log('Converted to', result.length, 'rows with', maxColumns, 'columns');
  return result;
};

// Helper function to map Geography-Market to Country
const mapToCountry = async (geographyMarket, countryMasterWorkbook) => {
  try {
    console.log('Mapping Geography-Market to Country:', geographyMarket);
    console.log('Country Master Workbook:', countryMasterWorkbook?.workbook_name);
    
    if (!countryMasterWorkbook) {
      console.log('No country master workbook found, using fallback');
      return geographyMarket;
    }

    // Get all worksheets from country master workbook
    for (const worksheet of countryMasterWorkbook.worksheets) {
      console.log('Processing worksheet:', worksheet.sheet_name);
      
      const worksheetData = await SheetData.findByWorksheet(worksheet.id, null, 0);
      console.log(`Processing worksheet: ${worksheet.sheet_name} with ${worksheetData?.length || 0} cells`);
      if (worksheetData && worksheetData.length > 0) {
        // Convert to array format
        const dataArray = convertSheetDataToArray(worksheetData);
        
        console.log('Country master data structure:');
        if (dataArray.length > 0) {
          console.log('Headers:', dataArray[0]);
          console.log('First few rows:', dataArray.slice(1, 4));
        }
        
        // Find the Country Name (Raw demand) column and Country column
        const headers = dataArray[0] || [];
        let geographyMarketColIndex = -1;
        let countryNameColIndex = -1;
        
        console.log('Looking for Country Name (Raw demand) column in headers:', headers);
        
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i].toLowerCase();
          console.log(`Column ${i}: "${headers[i]}" (lowercase: "${header}")`);
          
          if (header.includes('country name') && header.includes('raw demand')) {
            geographyMarketColIndex = i;
            countryNameColIndex = i; // Use the same column for both lookup and return
            console.log(`Found Country Name (Raw demand) column at index ${i}: "${headers[i]}"`);
          }
        }
        
        console.log('Country Name (Raw demand) column index:', geographyMarketColIndex);
        console.log('Country Name column index:', countryNameColIndex);
        
        if (geographyMarketColIndex >= 0 && countryNameColIndex >= 0) {
          // Perform VLOOKUP - match Geography_Market with Country Name (Raw demand) column
          console.log(`Searching for "${geographyMarket}" in Country Name (Raw demand) column...`);
          
          for (let rowIndex = 1; rowIndex < dataArray.length; rowIndex++) {
            const row = dataArray[rowIndex];
            const rowGeographyMarket = row[geographyMarketColIndex];
            
            // Try exact match
            if (rowGeographyMarket === geographyMarket) {
              const countryName = row[countryNameColIndex];
              console.log(`Found exact match: ${geographyMarket} -> ${countryName}`);
              return countryName;
            }
            
            // Log first few comparisons for debugging
            if (rowIndex <= 5) {
              console.log(`Row ${rowIndex}: Geography_Market="${rowGeographyMarket}", Country Name="${row[countryNameColIndex]}"`);
            }
          }
          
          console.log(`No match found for "${geographyMarket}" in Country Name (Raw demand) column`);
        } else {
          console.log('Could not find Country Name (Raw demand) column in Demand_Country_Master');
          console.log('Available columns:', headers);
        }
      }
    }
    
    console.log('No match found, using fallback:', geographyMarket);
    return geographyMarket;
    
  } catch (error) {
    console.error('Error mapping to country:', error);
    return geographyMarket;
  }
};

// Helper function to populate T01 worksheet
const populateT01Worksheet = async (worksheet, processedData) => {
  try {
    // Clear existing data (keep headers)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:J1');
    
    // Filter out rows that have no meaningful data
    const validData = processedData.filter(row => {
      // Check if the row has at least one non-empty value in key columns
      return row.CTY && row.CTY.toString().trim() !== '' ||
             row.FGSKUCode && row.FGSKUCode.toString().trim() !== '' ||
             row.Market && row.Market.toString().trim() !== '';
    });
    
    console.log('Starting to populate T01 worksheet with', validData.length, 'valid rows out of', processedData.length, 'total rows');
    
    // Add processed data starting from row 2 (after headers)
    for (let i = 0; i < validData.length; i++) {
      const row = validData[i];
      const rowIndex = i + 2; // Start from row 2 (after headers)
      
      // Map data to columns with null handling
      const columnMapping = {
        'A': row.CTY || null,
        'B': row.FGSKUCode || null,
        'C': row.MthNum || null,
        'D': row.DemandCases || null,
        'E': row.Market || null,
        'F': row['Production Environment'] || null,
        'G': row['Safety Stock WH'] || null,
        'H': row['Inventory Days (Norm)'] || null,
        'I': row.Supply || null,
        'J': row.CONS || null
      };
      
      // Set cell values (only set if value is not null)
      for (const [col, value] of Object.entries(columnMapping)) {
        const cellAddress = `${col}${rowIndex}`;
        if (value !== null && value !== undefined && value.toString().trim() !== '') {
          worksheet[cellAddress] = { v: value };
        }
      }
    }
    
    // Update the worksheet range to reflect the actual data
    const maxRow = validData.length + 1; // +1 for header row
    const maxCol = 9; // Columns A-J (0-9)
    worksheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });
    
    console.log(`Populated T01 worksheet with ${validData.length} valid rows`);
    console.log(`Updated worksheet range to: A1:J${maxRow + 1}`);
    console.log(`Filtered out ${processedData.length - validData.length} empty/invalid rows`);
    
  } catch (error) {
    console.error('Error populating T01 worksheet:', error);
  }
};

// Helper function to add demand formulas to worksheet
const addDemandFormulas = async (worksheet, calculations) => {
  for (const calculation of calculations) {
    const { targetCell, formula } = calculation;
    
    if (worksheet[targetCell]) {
      worksheet[targetCell].f = formula; // Set formula
    }
  }
};

module.exports = {
  createDemandTemplate,
  executeDemandTemplate,
  getDemandTemplates,
  getDemandTemplate,
  getDemandExportHistory,
  createDefaultDemandTemplate,
  checkMonthData
}; 