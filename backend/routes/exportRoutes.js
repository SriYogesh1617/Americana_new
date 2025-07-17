const express = require('express');
const router = express.Router();
const {
  exportWorkbook,
  exportWorksheet,
  getExportHistory,
  createMacroCalculation,
  getMacroCalculations,
  executeMacroCalculation
} = require('../controllers/exportController');

// Export routes
router.get('/workbooks/:workbookId', exportWorkbook);
router.get('/worksheets/:worksheetId', exportWorksheet);
router.get('/workbooks/:workbookId/history', getExportHistory);

// Macro calculation routes
router.post('/workbooks/:workbookId/macros', createMacroCalculation);
router.get('/workbooks/:workbookId/macros', getMacroCalculations);
router.post('/macros/:calculationId/execute', executeMacroCalculation);

module.exports = router; 