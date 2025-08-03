const express = require('express');
const router = express.Router();
const {
  exportCombinedItemMasterToCSV,
  getCombinedItemMasterData,
  getItemMasterStats
} = require('../controllers/itemMasterController');

// Export combined Item Master data as CSV
router.get('/export-csv', exportCombinedItemMasterToCSV);

// Get combined Item Master data as JSON
router.get('/data', getCombinedItemMasterData);

// Get Item Master statistics
router.get('/stats', getItemMasterStats);

module.exports = router; 