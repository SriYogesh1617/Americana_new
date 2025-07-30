const express = require('express');
const router = express.Router();

const {
  getDemandCursorData,
  getDemandCursorDataAsArray,
  getDemandCountryMasterCursorData,
  getDemandCountryMasterCursorDataAsArray,
  getBaseScenarioConfigurationCursorData,
  getBaseScenarioConfigurationCursorDataAsArray,
  getCapacityCursorData,
  getFreightStorageCostsCursorData,
  getCursorStats,
  getUploadBatches,
  clearAllCursorData
} = require('../controllers/cursorController');

// Demand cursor routes
router.get('/demand', getDemandCursorData);
router.get('/demand/:worksheetId/array', getDemandCursorDataAsArray);

// Demand Country Master cursor routes
router.get('/demand-country-master', getDemandCountryMasterCursorData);
router.get('/demand-country-master/:worksheetId/array', getDemandCountryMasterCursorDataAsArray);

// Base Scenario Configuration cursor routes
router.get('/base-scenario-configuration', getBaseScenarioConfigurationCursorData);
router.get('/base-scenario-configuration/:worksheetId/array', getBaseScenarioConfigurationCursorDataAsArray);

// Capacity cursor routes
router.get('/capacity', getCapacityCursorData);

// Freight Storage Costs cursor routes
router.get('/freight-storage-costs', getFreightStorageCostsCursorData);

// Statistics and management routes
router.get('/stats', getCursorStats);
router.get('/upload-batches', getUploadBatches);
router.delete('/clear', clearAllCursorData);

module.exports = router; 