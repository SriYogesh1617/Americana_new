const File = require('../models/File');
const Workbook = require('../models/Workbook');
const Worksheet = require('../models/Worksheet');
const SheetData = require('../models/SheetData');

// Get all workbooks
const getWorkbooks = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const workbooks = await Workbook.findAll(parseInt(limit), offset);
    
    res.json({
      workbooks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting workbooks:', error);
    res.status(500).json({ error: 'Failed to get workbooks' });
  }
};

// Get specific workbook with its worksheets
const getWorkbook = async (req, res) => {
  try {
    const { workbookId } = req.params;
    const workbook = await Workbook.getWorkbookWithSheets(workbookId);
    
    if (!workbook) {
      return res.status(404).json({ error: 'Workbook not found' });
    }

    res.json(workbook);

  } catch (error) {
    console.error('Error getting workbook:', error);
    res.status(500).json({ error: 'Failed to get workbook' });
  }
};

// Get worksheets for a workbook
const getWorksheets = async (req, res) => {
  try {
    const { workbookId } = req.params;
    const worksheets = await Worksheet.findByWorkbookId(workbookId);
    
    res.json(worksheets);

  } catch (error) {
    console.error('Error getting worksheets:', error);
    res.status(500).json({ error: 'Failed to get worksheets' });
  }
};

// Get specific worksheet with data
const getWorksheet = async (req, res) => {
  try {
    const { worksheetId } = req.params;
    const { page = 1, limit = 1000 } = req.query;
    const offset = (page - 1) * limit;
    
    const worksheet = await Worksheet.getWorksheetWithData(
      worksheetId, 
      parseInt(limit), 
      offset
    );
    
    if (!worksheet) {
      return res.status(404).json({ error: 'Worksheet not found' });
    }

    // Get data summary
    const summary = await Worksheet.getDataSummary(worksheetId);

    res.json({
      ...worksheet,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting worksheet:', error);
    res.status(500).json({ error: 'Failed to get worksheet' });
  }
};

// Get data from a worksheet by range
const getWorksheetDataByRange = async (req, res) => {
  try {
    const { worksheetId } = req.params;
    const { startRow, endRow, startCol, endCol } = req.query;
    
    if (!startRow || !endRow || !startCol || !endCol) {
      return res.status(400).json({ 
        error: 'Please provide startRow, endRow, startCol, and endCol parameters' 
      });
    }

    const data = await SheetData.findByRange(
      worksheetId,
      parseInt(startRow),
      parseInt(endRow),
      parseInt(startCol),
      parseInt(endCol)
    );
    
    res.json(data);

  } catch (error) {
    console.error('Error getting worksheet data by range:', error);
    res.status(500).json({ error: 'Failed to get worksheet data' });
  }
};

// Get specific cell data
const getCellData = async (req, res) => {
  try {
    const { worksheetId, row, col } = req.params;
    
    const cellData = await SheetData.findByCell(
      worksheetId,
      parseInt(row),
      parseInt(col)
    );
    
    if (!cellData) {
      return res.status(404).json({ error: 'Cell data not found' });
    }

    res.json(cellData);

  } catch (error) {
    console.error('Error getting cell data:', error);
    res.status(500).json({ error: 'Failed to get cell data' });
  }
};

// Update cell data
const updateCellData = async (req, res) => {
  try {
    const { worksheetId, row, col } = req.params;
    const { cellValue, cellType } = req.body;
    
    const updatedCell = await SheetData.updateCell(
      worksheetId,
      parseInt(row),
      parseInt(col),
      cellValue,
      cellType
    );
    
    if (!updatedCell) {
      return res.status(404).json({ error: 'Cell not found' });
    }

    res.json(updatedCell);

  } catch (error) {
    console.error('Error updating cell data:', error);
    res.status(500).json({ error: 'Failed to update cell data' });
  }
};

// Search data within a worksheet
const searchWorksheetData = async (req, res) => {
  try {
    const { worksheetId } = req.params;
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await SheetData.searchCells(worksheetId, query);
    
    res.json({
      query,
      results,
      count: results.length
    });

  } catch (error) {
    console.error('Error searching worksheet data:', error);
    res.status(500).json({ error: 'Failed to search worksheet data' });
  }
};

// Get worksheet headers
const getWorksheetHeaders = async (req, res) => {
  try {
    const { worksheetId } = req.params;
    
    const headers = await SheetData.getHeaders(worksheetId);
    
    res.json(headers);

  } catch (error) {
    console.error('Error getting worksheet headers:', error);
    res.status(500).json({ error: 'Failed to get worksheet headers' });
  }
};

// Get formula cells in a worksheet
const getFormulaCells = async (req, res) => {
  try {
    const { worksheetId } = req.params;
    
    const formulaCells = await SheetData.getFormulaCells(worksheetId);
    
    res.json(formulaCells);

  } catch (error) {
    console.error('Error getting formula cells:', error);
    res.status(500).json({ error: 'Failed to get formula cells' });
  }
};

// Get row data
const getRowData = async (req, res) => {
  try {
    const { worksheetId, row } = req.params;
    
    const rowData = await SheetData.getRowData(worksheetId, parseInt(row));
    
    res.json(rowData);

  } catch (error) {
    console.error('Error getting row data:', error);
    res.status(500).json({ error: 'Failed to get row data' });
  }
};

// Get column data
const getColumnData = async (req, res) => {
  try {
    const { worksheetId, col } = req.params;
    
    const columnData = await SheetData.getColumnData(worksheetId, parseInt(col));
    
    res.json(columnData);

  } catch (error) {
    console.error('Error getting column data:', error);
    res.status(500).json({ error: 'Failed to get column data' });
  }
};

module.exports = {
  getWorkbooks,
  getWorkbook,
  getWorksheets,
  getWorksheet,
  getWorksheetDataByRange,
  getCellData,
  updateCellData,
  searchWorksheetData,
  getWorksheetHeaders,
  getFormulaCells,
  getRowData,
  getColumnData
}; 