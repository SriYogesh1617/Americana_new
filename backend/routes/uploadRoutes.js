const express = require('express');
const router = express.Router();
const { uploadFile, getUploadStatus, getUploads } = require('../controllers/uploadController');

// Upload file (Excel or ZIP)
router.post('/', uploadFile);

// Get upload status by file ID
router.get('/status/:fileId', getUploadStatus);

// Get all uploads with pagination
router.get('/', getUploads);

module.exports = router; 