const express = require('express');
const router = express.Router();
const T03Controller = require('../controllers/t03Controller');

// GET /api/t03 - Get all T03 data with optional filters
router.get('/', T03Controller.getAllT03Data);

// GET /api/t03/summary - Get T03 summary statistics
router.get('/summary', T03Controller.getT03Summary);

// POST /api/t03/process - Process and generate T03 data from raw sources
router.post('/process', T03Controller.processT03Data);

// PUT /api/t03/:id/quantity - Update quantity for a specific T03 record
router.put('/:id/quantity', T03Controller.updateT03Quantity);

// GET /api/t03/sku/:skuCode - Get T03 data by SKU code
router.get('/sku/:skuCode', T03Controller.getT03BySKU);

// GET /api/t03/factory/:factory - Get T03 data by factory
router.get('/factory/:factory', T03Controller.getT03ByFactory);

// GET /api/t03/warehouse/:warehouse - Get T03 data by warehouse
router.get('/warehouse/:warehouse', T03Controller.getT03ByWarehouse);

// DELETE /api/t03/workbook/:workbook_id - Delete T03 data by workbook
router.delete('/workbook/:workbook_id', T03Controller.deleteT03Data);

// POST /api/t03/recalculate - Recalculate all T03 formulas
router.post('/recalculate', T03Controller.recalculateT03);

module.exports = router; 