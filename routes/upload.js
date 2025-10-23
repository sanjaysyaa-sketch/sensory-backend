const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { uploadFile, getUploadStatus } = require('../controllers/uploadController');

router.get('/status', getUploadStatus);
router.post('/', upload.single('sensoryFile'), uploadFile);

module.exports = router;