// middleware/upload.js

const upload = require('../config/multer');

// Middleware wrapper to catch multer errors and format them for the client
const handleMulterUpload = (req, res, next) => {
    // This calls multer's single file handler
    upload.single('sensoryFile')(req, res, (err) => {
        if (err) {
            // Log the error for debugging purposes on the backend
            console.error('Multer Upload Error:', err.message, err.code); 
            
            // Check for specific Multer errors
            if (err.message && err.message.includes('file type')) {
                return res.status(400).json({
                    success: false,
                    message: err.message 
                });
            }
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File too large. Maximum size is 10MB.'
                });
            }
            if (err.message === 'Unexpected field') {
                return res.status(400).json({
                    success: false,
                    message: 'File upload field name mismatch. Expected "sensoryFile".'
                });
            }
            
            // Pass all other errors to the main Express error handler
            err.status = err.status || 500;
            return next(err);
        }
        // If no error, continue to the next middleware (uploadController.uploadFile)
        next();
    });
};

module.exports = handleMulterUpload;