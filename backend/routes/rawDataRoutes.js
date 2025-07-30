const express = require('express');
const router = express.Router();
const {
  processRawData,
  getProcessedDataStats,
  getProcessedDataByMonthYear
} = require('../controllers/rawDataController');

// Process raw data from Demand sheets
router.post('/process', processRawData);

// Get processed data statistics
router.get('/stats', getProcessedDataStats);

// Get processed data by month and year
router.get('/data/:month/:year', getProcessedDataByMonthYear);

module.exports = router; 