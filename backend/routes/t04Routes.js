const express = require('express');
const router = express.Router();
const T04Controller = require('../controllers/t04Controller');

// Get all T04 WHBal data
router.get('/', T04Controller.getAllT04Data);

// Get T04 data with formulas
router.get('/formulas', T04Controller.getT04DataWithFormulas);

// Get specific T04 columns (including os_gfc)
router.get('/columns', T04Controller.getT04Columns);

// Get T04 data with dynamic os_gfc calculation (M5=m1os, M6-16=prev month cs_gfc)
router.get('/dynamic-os', T04Controller.getT04WithDynamicOS);

// Get T04 summary statistics
router.get('/summary', T04Controller.getT04Summary);

// Process T04 data from source workbooks
router.post('/process', T04Controller.processT04Data);

// Get T04 data by SKU
router.get('/sku/:skuCode', T04Controller.getT04BySKU);

// Get T04 data by warehouse
router.get('/warehouse/:warehouse', T04Controller.getT04ByWarehouse);

// Update specific T04 field
router.put('/:id/field', T04Controller.updateT04Field);

// Recalculate T04 formulas
router.post('/recalculate', T04Controller.recalculateT04);

// Delete T04 data by workbook
router.delete('/workbook/:workbook_id', T04Controller.deleteT04Data);

module.exports = router; 