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
  getColumnData
} = require('../controllers/dataController');

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

module.exports = router; 