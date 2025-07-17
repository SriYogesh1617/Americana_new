const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const Workbook = require('../models/Workbook');
const Worksheet = require('../models/Worksheet');
const SheetData = require('../models/SheetData');
const { query } = require('../config/database');

// Export workbook as Excel file
const exportWorkbook = async (req, res) => {
  try {
    const { workbookId } = req.params;
    const { format = 'xlsx' } = req.query;
    
    // Validate format
    const allowedFormats = ['xlsx', 'xlsm', 'csv'];
    if (!allowedFormats.includes(format)) {
      return res.status(400).json({ 
        error: 'Invalid format. Allowed formats: xlsx, xlsm, csv' 
      });
    }

    // Get workbook with worksheets
    const workbook = await Workbook.getWorkbookWithSheets(workbookId);
    if (!workbook) {
      return res.status(404).json({ error: 'Workbook not found' });
    }

    // Create new Excel workbook
    const wb = XLSX.utils.book_new();

    for (const worksheet of workbook.worksheets) {
      // Get worksheet data
      const worksheetData = await SheetData.findByWorksheet(worksheet.id);
      
      // Convert data to worksheet format
      const wsData = convertToWorksheetFormat(worksheetData);
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Add formulas if any
      await addFormulasToWorksheet(ws, worksheet.id);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, worksheet.sheet_name);
    }

    // Generate export directory
    const exportDir = path.join(__dirname, '../exports');
    await fs.mkdir(exportDir, { recursive: true });
    
    // Generate filename
    const filename = `${workbook.workbook_name}_${Date.now()}.${format}`;
    const filepath = path.join(exportDir, filename);

    // Write file
    if (format === 'csv' && workbook.worksheets.length > 0) {
      // For CSV, export only the first worksheet
      const firstWorksheet = workbook.worksheets[0];
      const worksheetData = await SheetData.findByWorksheet(firstWorksheet.id);
      const csvData = convertToCSV(worksheetData);
      await fs.writeFile(filepath, csvData);
    } else {
      // For Excel formats
      XLSX.writeFile(wb, filepath);
    }

    // Create export job record
    const exportJob = await query(
      `INSERT INTO export_jobs (workbook_id, export_type, status, file_path) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [workbookId, format, 'completed', filepath]
    );

    // Send file for download
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Failed to download file' });
      }
      
      // Clean up file after download
      setTimeout(async () => {
        try {
          await fs.unlink(filepath);
        } catch (cleanupErr) {
          console.error('Error cleaning up export file:', cleanupErr);
        }
      }, 5000); // Delete after 5 seconds
    });

  } catch (error) {
    console.error('Error exporting workbook:', error);
    res.status(500).json({ error: 'Failed to export workbook' });
  }
};

// Export specific worksheet
const exportWorksheet = async (req, res) => {
  try {
    const { worksheetId } = req.params;
    const { format = 'xlsx' } = req.query;
    
    // Get worksheet
    const worksheet = await Worksheet.findById(worksheetId);
    if (!worksheet) {
      return res.status(404).json({ error: 'Worksheet not found' });
    }

    // Get worksheet data
    const worksheetData = await SheetData.findByWorksheet(worksheetId);
    
    const exportDir = path.join(__dirname, '../exports');
    await fs.mkdir(exportDir, { recursive: true });
    
    const filename = `${worksheet.sheet_name}_${Date.now()}.${format}`;
    const filepath = path.join(exportDir, filename);

    if (format === 'csv') {
      // Export as CSV
      const csvData = convertToCSV(worksheetData);
      await fs.writeFile(filepath, csvData);
    } else {
      // Export as Excel
      const wb = XLSX.utils.book_new();
      const wsData = convertToWorksheetFormat(worksheetData);
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Add formulas
      await addFormulasToWorksheet(ws, worksheetId);
      
      XLSX.utils.book_append_sheet(wb, ws, worksheet.sheet_name);
      XLSX.writeFile(wb, filepath);
    }

    // Send file for download
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).json({ error: 'Failed to download file' });
      }
      
      // Clean up file
      setTimeout(async () => {
        try {
          await fs.unlink(filepath);
        } catch (cleanupErr) {
          console.error('Error cleaning up export file:', cleanupErr);
        }
      }, 5000);
    });

  } catch (error) {
    console.error('Error exporting worksheet:', error);
    res.status(500).json({ error: 'Failed to export worksheet' });
  }
};

// Get export history
const getExportHistory = async (req, res) => {
  try {
    const { workbookId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM export_jobs 
       WHERE workbook_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [workbookId, limit, offset]
    );

    res.json({
      exports: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting export history:', error);
    res.status(500).json({ error: 'Failed to get export history' });
  }
};

// Helper function to convert database data to worksheet format
const convertToWorksheetFormat = (data) => {
  if (!data || data.length === 0) {
    return [];
  }

  // Find max row and column
  const maxRow = Math.max(...data.map(cell => cell.row_index));
  const maxCol = Math.max(...data.map(cell => cell.column_index));

  // Create 2D array
  const wsData = [];
  for (let row = 0; row <= maxRow; row++) {
    wsData[row] = new Array(maxCol + 1).fill('');
  }

  // Fill data
  data.forEach(cell => {
    wsData[cell.row_index][cell.column_index] = cell.cell_value || '';
  });

  return wsData;
};

// Helper function to add formulas to worksheet
const addFormulasToWorksheet = async (worksheet, worksheetId) => {
  try {
    const formulaCells = await SheetData.getFormulaCells(worksheetId);
    
    formulaCells.forEach(cell => {
      const cellAddress = XLSX.utils.encode_cell({
        r: cell.row_index,
        c: cell.column_index
      });
      
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].f = cell.cell_value; // Set formula
      }
    });
  } catch (error) {
    console.error('Error adding formulas:', error);
  }
};

// Helper function to convert to CSV
const convertToCSV = (data) => {
  if (!data || data.length === 0) {
    return '';
  }

  const wsData = convertToWorksheetFormat(data);
  
  return wsData.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma or quotes
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
};

// Create macro calculation
const createMacroCalculation = async (req, res) => {
  try {
    const { workbookId } = req.params;
    const { calculationName, formula, calculationType, dependencies } = req.body;

    if (!calculationName || !formula) {
      return res.status(400).json({ 
        error: 'Calculation name and formula are required' 
      });
    }

    const result = await query(
      `INSERT INTO macro_calculations 
       (workbook_id, calculation_name, formula, calculation_type, dependencies) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [workbookId, calculationName, formula, calculationType, JSON.stringify(dependencies)]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Error creating macro calculation:', error);
    res.status(500).json({ error: 'Failed to create macro calculation' });
  }
};

// Get macro calculations for a workbook
const getMacroCalculations = async (req, res) => {
  try {
    const { workbookId } = req.params;

    const result = await query(
      'SELECT * FROM macro_calculations WHERE workbook_id = $1 ORDER BY created_at DESC',
      [workbookId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error getting macro calculations:', error);
    res.status(500).json({ error: 'Failed to get macro calculations' });
  }
};

// Execute macro calculation
const executeMacroCalculation = async (req, res) => {
  try {
    const { calculationId } = req.params;

    // Get calculation
    const calculationResult = await query(
      'SELECT * FROM macro_calculations WHERE id = $1',
      [calculationId]
    );

    if (calculationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Macro calculation not found' });
    }

    const calculation = calculationResult.rows[0];

    // Here you would implement the actual formula execution logic
    // For now, we'll just return a placeholder result
    const resultValue = 'Calculation executed (placeholder)';

    // Update calculation with result
    const updateResult = await query(
      `UPDATE macro_calculations 
       SET result_value = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING *`,
      [resultValue, calculationId]
    );

    res.json(updateResult.rows[0]);

  } catch (error) {
    console.error('Error executing macro calculation:', error);
    res.status(500).json({ error: 'Failed to execute macro calculation' });
  }
};

module.exports = {
  exportWorkbook,
  exportWorksheet,
  getExportHistory,
  createMacroCalculation,
  getMacroCalculations,
  executeMacroCalculation
}; 