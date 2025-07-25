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

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get total workbooks count
    const totalWorkbooks = await Workbook.getTotalCount();
    
    // Get total files uploaded
    const totalFiles = await File.getTotalCount();
    
    // Get total data records
    const totalRecords = await SheetData.getTotalCount();
    
    // Get processing rate (completed uploads / total uploads)
    const processingStats = await File.getProcessingStats();
    
    res.json({
      totalWorkbooks,
      totalFiles,
      totalRecords,
      processingRate: processingStats.rate,
      processingStats
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
};

// Get recent activities
const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get recent uploads
    const recentUploads = await File.getRecentUploads(parseInt(limit));
    
    // Get recent workbooks
    const recentWorkbooks = await Workbook.getRecentWorkbooks(parseInt(limit));
    
    // Combine and sort by date
    const activities = [
      ...recentUploads.map(upload => ({
        type: 'upload',
        title: `File uploaded: ${upload.original_name}`,
        time: upload.upload_date,
        status: upload.status,
        id: upload.id
      })),
      ...recentWorkbooks.map(workbook => ({
        type: 'workbook',
        title: `Workbook processed: ${workbook.workbook_name}`,
        time: workbook.created_at,
        status: 'completed',
        id: workbook.id
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, parseInt(limit));
    
    res.json(activities);

  } catch (error) {
    console.error('Error getting recent activities:', error);
    res.status(500).json({ error: 'Failed to get recent activities' });
  }
};

// Get all worksheets
const getAllWorksheets = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const worksheets = await Worksheet.findAll(parseInt(limit), offset);
    
    res.json({
      worksheets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting worksheets:', error);
    res.status(500).json({ error: 'Failed to get worksheets' });
  }
};

// Get monthly statistics
const getMonthlyStats = async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM
    
    if (!month) {
      return res.status(400).json({ error: 'Month parameter is required' });
    }
    
    // Parse month to get start and end dates
    const [year, monthNum] = month.split('-');
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);
    
    // Get monthly uploads
    const monthlyUploads = await File.getMonthlyUploads(startDate, endDate);
    
    // Get monthly workbooks
    const monthlyWorkbooks = await Workbook.getMonthlyWorkbooks(startDate, endDate);
    
    // Get monthly data records
    const monthlyRecords = await SheetData.getMonthlyRecords(startDate, endDate);
    
    res.json({
      totalFiles: monthlyUploads.length,
      totalWorkbooks: monthlyWorkbooks.length,
      totalRecords: monthlyRecords,
      month: month,
      uploads: monthlyUploads,
      workbooks: monthlyWorkbooks
    });

  } catch (error) {
    console.error('Error getting monthly stats:', error);
    res.status(500).json({ error: 'Failed to get monthly statistics' });
  }
};

// Get monthly uploads
const getMonthlyUploads = async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month) {
      return res.status(400).json({ error: 'Month parameter is required' });
    }
    
    const [year, monthNum] = month.split('-');
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);
    
    const monthlyUploads = await File.getMonthlyUploads(startDate, endDate);
    
    res.json(monthlyUploads);

  } catch (error) {
    console.error('Error getting monthly uploads:', error);
    res.status(500).json({ error: 'Failed to get monthly uploads' });
  }
};

// Get monthly workbooks
const getMonthlyWorkbooks = async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month) {
      return res.status(400).json({ error: 'Month parameter is required' });
    }
    
    const [year, monthNum] = month.split('-');
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);
    
    const monthlyWorkbooks = await Workbook.getMonthlyWorkbooks(startDate, endDate);
    
    res.json(monthlyWorkbooks);

  } catch (error) {
    console.error('Error getting monthly workbooks:', error);
    res.status(500).json({ error: 'Failed to get monthly workbooks' });
  }
};

// Get database schema info
const getDatabaseSchema = async (req, res) => {
  try {
    const schema = [
      {
        table: 'uploaded_files',
        description: 'Stores information about uploaded files',
        columns: [
          { name: 'id', type: 'UUID', description: 'Primary key' },
          { name: 'original_name', type: 'VARCHAR(255)', description: 'Original filename' },
          { name: 'file_type', type: 'VARCHAR(50)', description: 'MIME type' },
          { name: 'file_size', type: 'BIGINT', description: 'File size in bytes' },
          { name: 'status', type: 'VARCHAR(50)', description: 'Processing status' },
          { name: 'upload_date', type: 'TIMESTAMP', description: 'Upload timestamp' }
        ]
      },
      {
        table: 'workbooks',
        description: 'Excel workbooks extracted from uploaded files',
        columns: [
          { name: 'id', type: 'UUID', description: 'Primary key' },
          { name: 'file_id', type: 'UUID', description: 'Reference to uploaded_files' },
          { name: 'workbook_name', type: 'VARCHAR(255)', description: 'Workbook name' },
          { name: 'sheet_count', type: 'INTEGER', description: 'Number of sheets' },
          { name: 'total_rows', type: 'BIGINT', description: 'Total rows across all sheets' },
          { name: 'total_columns', type: 'INTEGER', description: 'Total columns across all sheets' }
        ]
      },
      {
        table: 'worksheets',
        description: 'Individual sheets within workbooks',
        columns: [
          { name: 'id', type: 'UUID', description: 'Primary key' },
          { name: 'workbook_id', type: 'UUID', description: 'Reference to workbooks' },
          { name: 'sheet_name', type: 'VARCHAR(255)', description: 'Sheet name' },
          { name: 'sheet_index', type: 'INTEGER', description: 'Sheet position' },
          { name: 'row_count', type: 'BIGINT', description: 'Number of rows' },
          { name: 'column_count', type: 'INTEGER', description: 'Number of columns' }
        ]
      },
      {
        table: 'sheet_data',
        description: 'Actual cell data from worksheets',
        columns: [
          { name: 'id', type: 'UUID', description: 'Primary key' },
          { name: 'worksheet_id', type: 'UUID', description: 'Reference to worksheets' },
          { name: 'row_index', type: 'INTEGER', description: 'Row position' },
          { name: 'column_index', type: 'INTEGER', description: 'Column position' },
          { name: 'cell_value', type: 'TEXT', description: 'Cell content' },
          { name: 'cell_type', type: 'VARCHAR(50)', description: 'Data type' }
        ]
      }
    ];
    
    res.json(schema);

  } catch (error) {
    console.error('Error getting database schema:', error);
    res.status(500).json({ error: 'Failed to get database schema' });
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
  getColumnData,
  getDashboardStats,
  getRecentActivities,
  getAllWorksheets,
  getDatabaseSchema,
  getMonthlyStats,
  getMonthlyUploads,
  getMonthlyWorkbooks
}; 