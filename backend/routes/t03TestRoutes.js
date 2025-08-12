const express = require('express');
const router = express.Router();
const T03TestController = require('../controllers/t03TestController');

// Generate T03 Test data using SQL
router.post('/generate', T03TestController.generateData);

// Get all T03 Test data with pagination
router.get('/', T03TestController.getData);

// Get T03 Test summary statistics
router.get('/summary', T03TestController.getSummary);

// Get T03 Test validation report
router.get('/validation', T03TestController.getValidation);

// Export T03 Test data to Excel
router.get('/export', T03TestController.exportToExcel);

// Export T03 Test data to CSV
router.get('/export-csv', T03TestController.exportToCSV);

// Clear all T03 Test data
router.delete('/', T03TestController.clearData);

module.exports = router;