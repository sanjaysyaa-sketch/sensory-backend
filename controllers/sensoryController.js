// controllers/sensoryController.js

const { 
    getAllResults, 
    getSampleResults, 
    getDashboardTableData,
    getGlobalSummaryStats
} = require('../services/sensoryProcessor'); 

// The 'calculateStats' from utils/helpers is no longer needed here, 
// as the service pre-calculates the stats.

const getAllSensoryResults = async (req, res, next) => {
    try {
        // Query params for pagination/filtering
        const { page = 1, limit = 50, pickNo, testCountry } = req.query;
        
        // Pass options to the service
        const results = getAllResults({
            page: parseInt(page), // Note: Pagination logic is simple in the service, but the structure is correct
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
                total: results.length // Simple total count based on current filtered/paginated results
            }
        });

    } catch (error) {
        next(error);
    }
};

const getSampleResultsController = async (req, res, next) => {
    try {
        const { sampleId } = req.params;
        
        const result = getSampleResults(sampleId);
        
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
        // Retrieve pre-calculated statistics from the service
        const stats = getGlobalSummaryStats();

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
    getSampleResults: getSampleResultsController, 
    getDashboardStats,
    getDashboardTable
};