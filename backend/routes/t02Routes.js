const express = require('express');
const router = express.Router();
const {
  calculateT02Data,
  getT02Data,
  getT02Stats,
  clearT02Data,
  getT02DataAsArray,
  exportT02ToExcel,
  exportCombinedToExcel
} = require('../controllers/t02Controller');

// Calculate T02 data from T01 data
router.post('/calculate', calculateT02Data);

// Get T02 data
router.get('/data', getT02Data);

// Get T02 data as 2D array for frontend display
router.get('/data/array', getT02DataAsArray);

// Get T02 statistics
router.get('/stats', getT02Stats);

// Clear all T02 data
router.delete('/clear', clearT02Data);

// Export T02 data to Excel file
router.get('/export', exportT02ToExcel);

// Export combined T01 and T02 data to single XLSM file
router.get('/export-combined', exportCombinedToExcel);

module.exports = router; 