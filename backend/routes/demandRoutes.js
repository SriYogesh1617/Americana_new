const express = require('express');
const router = express.Router();
const {
  createDemandTemplate,
  executeDemandTemplate,
  getDemandTemplates,
  getDemandTemplate,
  getDemandExportHistory,
  createDefaultDemandTemplate,
  checkMonthData,
  createFilteredDemandCursor,
  getDemandCursorStats,
  exportFilteredDemandData,
  getFilteredDemandData,
  getDemandDataStats
} = require('../controllers/demandController');

// Demand template routes
router.post('/templates', createDemandTemplate);
router.post('/templates/default', createDefaultDemandTemplate);
router.get('/templates', getDemandTemplates);
router.get('/templates/:templateId', getDemandTemplate);
router.post('/templates/:templateId/execute', executeDemandTemplate);
router.get('/export-history', getDemandExportHistory);
router.get('/check-month', checkMonthData);

// Demand filtered cursor routes
router.post('/cursor', createFilteredDemandCursor);
router.post('/cursor/stats', getDemandCursorStats);
router.post('/cursor/export', exportFilteredDemandData);

// New filtered demand data routes
router.get('/filtered-data', getFilteredDemandData);
router.get('/filtered-data/stats', getDemandDataStats);

module.exports = router; 