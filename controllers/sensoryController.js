const { getAllResults, getSampleResults: getSampleResultsService, getDashboardTableData } = require('../services/sensoryProcessor');
const { calculateStats } = require('../utils/helpers');

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

// Renamed to avoid conflict with imported function
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

module.exports = {
  getAllSensoryResults,
  getSampleResults: getSampleResultsController, // Export with corrected name
  getDashboardStats,
  getDashboardTable
};