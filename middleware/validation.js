// middleware/validation.js

/**
 * Middleware to check for essential required fields in the request body 
 * for an action (like file processing metadata).
 * * @param {Array<string>} requiredFields - An array of strings representing the field names.
 * @returns {Function} Express middleware function.
 */
const validateRequiredBodyFields = (requiredFields) => (req, res, next) => {
    const missingFields = requiredFields.filter(field => {
        // Check if the field is missing or an empty string after trimming
        return !req.body[field] || String(req.body[field]).trim() === '';
    });

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Validation failed. Missing required fields: ${missingFields.join(', ')}`
        });
    }
    
    // If all required fields are present and non-empty, proceed.
    next();
};

/**
 * A reusable validator specifically for the sensory upload metadata.
 * It checks for 'pickNo' and 'testCountry'.
 */
const validateUploadMetadata = (req, res, next) => {
    const requiredFields = ['pickNo', 'testCountry'];
    return validateRequiredBodyFields(requiredFields)(req, res, next);
};


module.exports = {
    validateRequiredBodyFields,
    validateUploadMetadata
};