// routes/sensory.js (CLEANED ROUTE HANDLER)

const express = require('express');
const router = express.Router();
const sensoryController = require('../controllers/sensoryController');

/**
 * GET /api/sensory
 * Returns all stored sensory results (paginated/filtered).
 */
router.get('/', sensoryController.getAllSensoryResults);

/**
 * GET /api/sensory/sample/:sampleId
 * Get sample-specific results
 */
router.get('/sample/:sampleId', sensoryController.getSampleResults);

/**
 * GET /api/sensory/dashboard/stats
 * Get dashboard statistics
 */
router.get('/dashboard/stats', sensoryController.getDashboardStats);

/**
 * GET /api/sensory/dashboard/table
 * Get dashboard table data
 */
router.get('/dashboard/table', sensoryController.getDashboardTable);

module.exports = router;