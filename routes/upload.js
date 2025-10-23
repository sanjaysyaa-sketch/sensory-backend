// routes/upload.js (UPDATED)

const express = require('express');
const router = express.Router();
// const upload = require('../config/multer'); // REMOVE: No longer needed here
const handleMulterUpload = require('../middleware/upload'); // NEW import
const { uploadFile, getUploadStatus } = require('../controllers/uploadController');

router.get('/status', getUploadStatus);

// Use the new middleware wrapper which handles error reporting
router.post('/', handleMulterUpload, uploadFile);

module.exports = router;