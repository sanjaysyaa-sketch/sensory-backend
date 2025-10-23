const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const {
  processSensoryFile,
  getAllResults,
  getSampleResults: getSampleResultsService,
  getDashboardTableData
} = require('../services/sensoryProcessor');

const { calculateStats } = require('../utils/helpers');

/**
 * GET /api/sensory
 * - If ?sensoryFile=... is provided, process uploaded Excel file
 * - Otherwise, return all sensory results
 */
router.get('/', async (req, res, next) => {
  const { sensoryFile } = req.query;

  try {
    if (sensoryFile) {
      // Process uploaded Excel
      const { pickNo, testCountry } = req.query;

      const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
      const filename = path.basename(decodeURIComponent(sensoryFile));
      const filePath = path.join(uploadsDir, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Uploaded file not found',
          file: filename
        });
      }

      const { processedSamples, summary } = await processSensoryFile(filePath, pickNo, testCountry);

      return res.status(200).json({
        success: true,
        file: filename,
        pickNo,
        testCountry,
        sheets: processedSamples.length,
        summary,
        data: processedSamples
      });
    } else {
      // Return all sensory results
      const { page = 1, limit = 50, pickNo, testCountry } = req.query;

      const results = getAllResults({
        page: parseInt(page),
        limit: parseInt(limit),
        pickNo,
        testCountry
      });

      return res.status(200).json({
        success: true,
        data: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: results.length
        }
      });
    }
  } catch (error) {
    console.error('Error in /api/sensory:', error);
    next(error);
  }
});

/**
 * GET /api/sensory/sample/:sampleId
 * Get sample-specific results
 */
router.get('/sample/:sampleId', (req, res, next) => {
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
});

/**
 * GET /api/sensory/dashboard/stats
 */
router.get('/dashboard/stats', (req, res, next) => {
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
});

/**
 * GET /api/sensory/dashboard/table
 */
router.get('/dashboard/table', (req, res, next) => {
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
});

// ✅ Export the router object (important!)
module.exports = router;
