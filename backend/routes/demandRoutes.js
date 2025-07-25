const express = require('express');
const router = express.Router();
const {
  createDemandTemplate,
  executeDemandTemplate,
  getDemandTemplates,
  getDemandTemplate,
  getDemandExportHistory,
  createDefaultDemandTemplate,
  checkMonthData
} = require('../controllers/demandController');

// Demand template routes
router.post('/templates', createDemandTemplate);
router.post('/templates/default', createDefaultDemandTemplate);
router.get('/templates', getDemandTemplates);
router.get('/templates/:templateId', getDemandTemplate);
router.post('/templates/:templateId/execute', executeDemandTemplate);
router.get('/export-history', getDemandExportHistory);
router.get('/check-month', checkMonthData);

module.exports = router; 