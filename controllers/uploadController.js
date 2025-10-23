const { processSensoryFile } = require('../services/sensoryProcessor');

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { pickNo = 'default', testCountry = 'AUS' } = req.body;

    const processingResult = await processSensoryFile(
      req.file.path, 
      pickNo, 
      testCountry
    );

    res.status(200).json({
      success: true,
      message: 'File processed successfully',
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        processedAt: new Date().toISOString(),
        ...processingResult
      }
    });

  } catch (error) {
    next(error);
  }
};

const getUploadStatus = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Upload service is running',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getUploadStatus
};