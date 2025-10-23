const { processSensoryFile, getAllResults, getSampleResults: getSampleResultsService, getDashboardTableData } = require('../services/sensoryProcessor');
const { calculateStats } = require('../utils/helpers');
const path = require('path');

/**
 * Get all sensory results (paginated + filtered)
 */
const getAllSensoryResults = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, pickNo, testCountry } = req.query;
    
    const results = getAllResults({
      page: parseInt(page),
      limit: parseInt(limit),
      pickNo,
      testCountry
    });

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.length
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get sample-specific sensory results
 */
const getSampleResultsController = async (req, res, next) => {
  try {
    const { sampleId } = req.params;
    
    const result = getSampleResultsService(sampleId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Sample not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const results = getAllResults();
    const stats = calculateStats(results);

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard table data
 */
const getDashboardTable = async (req, res, next) => {
  try {
    const tableData = getDashboardTableData(req.query);
    
    res.json({
      success: true,
      data: tableData,
      total: tableData.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process uploaded sensory Excel file and return processed results
 */
const processUploadedFile = async (req, res, next) => {
  try {
    const { sensoryFile, pickNo, testCountry } = req.query;

    if (!sensoryFile) {
      return res.status(400).json({
        success: false,
        message: 'Missing sensoryFile query parameter.'
      });
    }

    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
    const filename = path.basename(decodeURIComponent(sensoryFile));
    const filePath = path.join(uploadsDir, filename);

    // Process the file using existing service
    const { processedSamples, summary } = await processSensoryFile(filePath, pickNo, testCountry);

    return res.status(200).json({
      success: true,
      file: filename,
      pickNo,
      testCountry,
      sheets: processedSamples.length, // number of samples processed
      summary,
      data: processedSamples
    });

  } catch (error) {
    console.error('processUploadedFile error:', error);
    next(error);
  }
};

module.exports = {
  getAllSensoryResults,
  getSampleResults: getSampleResultsController,
  getDashboardStats,
  getDashboardTable,
  processUploadedFile
};
