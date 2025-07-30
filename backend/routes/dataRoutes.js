const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/dataController');
const { clearDatabase } = require('../clear_database');

// Workbook routes
router.get('/workbooks', getWorkbooks);
router.get('/workbooks/:workbookId', getWorkbook);

// Worksheet routes
router.get('/workbooks/:workbookId/worksheets', getWorksheets);
router.get('/worksheets/:worksheetId', getWorksheet);
router.get('/worksheets/:worksheetId/range', getWorksheetDataByRange);
router.get('/worksheets/:worksheetId/headers', getWorksheetHeaders);
router.get('/worksheets/:worksheetId/formulas', getFormulaCells);
router.get('/worksheets/:worksheetId/search', searchWorksheetData);

// Cell and row/column data routes
router.get('/worksheets/:worksheetId/cells/:row/:col', getCellData);
router.put('/worksheets/:worksheetId/cells/:row/:col', updateCellData);
router.get('/worksheets/:worksheetId/rows/:row', getRowData);
router.get('/worksheets/:worksheetId/columns/:col', getColumnData);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/activities', getRecentActivities);

// Database routes
router.get('/worksheets', getAllWorksheets);
router.get('/schema', getDatabaseSchema);

// Monthly routes
router.get('/monthly-stats', getMonthlyStats);
router.get('/monthly-uploads', getMonthlyUploads);
router.get('/monthly-workbooks', getMonthlyWorkbooks);

// Database management routes
router.delete('/clear-database', async (req, res) => {
  try {
    await clearDatabase();
    res.json({ 
      success: true, 
      message: 'Database cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing database:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear database',
      error: error.message 
    });
  }
});

module.exports = router; 