const express = require('express');
const router = express.Router();
const {
  calculateT01Data,
  getT01Data,
  getT01Stats,
  clearT01Data,
  getT01DataAsArray,
  exportT01ToExcel,
  updateSupplyValues,
  removeDuplicates
} = require('../controllers/t01Controller');

// Calculate T01 data from cursor tables
router.post('/calculate', calculateT01Data);

// Get T01 data
router.get('/data', getT01Data);

// Get T01 data as Excel-like array
router.get('/data/array', getT01DataAsArray);

// Get T01 statistics
router.get('/stats', getT01Stats);

// Clear all T01 data
router.delete('/clear', clearT01Data);

// Export T01 data to Excel file
router.get('/export', exportT01ToExcel);

// Update Supply values with calculated T02 data
router.put('/update-supply/:uploadBatchId', updateSupplyValues);

// Remove duplicate T01 records
router.delete('/remove-duplicates/:uploadBatchId', removeDuplicates);

module.exports = router; 