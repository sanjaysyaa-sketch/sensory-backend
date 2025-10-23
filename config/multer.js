// config/multer.js (Final fix for ENOENT path issue)

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs'); // <--- NEW IMPORT

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use path.resolve to create a fully absolute and reliable path
        const uploadPath = path.resolve(__dirname, '../public/uploads/'); 
        
        // Ensure the uploads directory exists before Multer tries to save the file
        // This is crucial on Windows if the directory was deleted or not present.
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // 1. Get the actual extension from the original file name (e.g., .csv)
        const extension = path.extname(file.originalname);
        
        // 2. Get the base name, clean it, and make it lowercase
        const baseName = path
            .basename(file.originalname, extension) 
            .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric chars/spaces with underscore
            .toLowerCase();

        // 3. Construct the unique filename
        const uniqueName = `${Date.now()}_${uuidv4()}_${baseName}${extension}`;
        
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/json'
    ];
    
    // Allow file if MIME type matches OR if the original name ends with .csv (robust check)
    if (allowedTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Only Excel, CSV, and JSON files are allowed.`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    }
});

module.exports = upload;