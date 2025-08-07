const express = require('express');
const router = express.Router();
const T03Controller = require('../controllers/t03Controller');

// Get all T03 data with pagination
router.get('/', T03Controller.getAllT03Data);

// Get T03 summary statistics
router.get('/summary', T03Controller.getT03Summary);

// Get T03 data by SKU
router.get('/sku/:skuCode', T03Controller.getT03BySKU);

// Get T03 data by factory
router.get('/factory/:factory', T03Controller.getT03ByFactory);

// Get T03 data by warehouse
router.get('/warehouse/:warehouse', T03Controller.getT03ByWarehouse);

// Update T03 quantity
router.put('/:id/quantity', T03Controller.updateT03Quantity);

// Process T03 data from T02
router.post('/process', T03Controller.processT03Data);

// Recalculate T03 formulas
router.post('/recalculate', T03Controller.recalculateT03Data);

// Get upload batches
router.get('/upload-batches', T03Controller.getUploadBatches);

// Export T03 data to Excel
router.get('/export', T03Controller.exportToExcel);

// Export T03 data to CSV
router.get('/export-csv', T03Controller.exportToCSV);

// Delete T03 data
router.delete('/', T03Controller.deleteT03Data);

module.exports = router; 