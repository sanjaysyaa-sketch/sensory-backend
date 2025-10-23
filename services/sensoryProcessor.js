// services/sensoryProcessor.js

const { parseFile } = require('./fileParser');
const { processSampleGroup, calculateQualityMetrics } = require('./calculations');
const { generateSampleId, formatTableData, calculateStats } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');

// In-memory Data Store
const sensoryDataStore = new Map(); 
let dashboardTableData = []; 
let globalSummary = calculateStats([]);

/**
 * Core function to process an uploaded file, calculate metrics, and store results.
 */
const processSensoryFile = async (filePath, pickNo, testCountry) => {
    const groupedScores = await parseFile(filePath);

    const processedSamples = [];
    for (const eqsRef in groupedScores) {
        try {
            const sampleGroup = groupedScores[eqsRef];
            
            const result = processSampleGroup(sampleGroup);
            const qualityMetrics = calculateQualityMetrics(result);

            const sampleId = generateSampleId(pickNo, eqsRef);
            const finalSample = {
                ...result,
                sampleId,
                pickNo,
                testCountry,
                qualityMetrics,
                processedAt: new Date().toISOString()
            };

            processedSamples.push(finalSample);
            sensoryDataStore.set(sampleId, finalSample);

        } catch (error) {
            console.error(`Skipping sample ${eqsRef} due to processing error: ${error.message}`);
        }
    }
    
    fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete file ${filePath}:`, err);
    });

    updateGlobalData();

    return { 
        processedSamplesCount: processedSamples.length, 
        summary: globalSummary,
        processedSamples
    };
};

// Helper to update the derived data stores after a successful processing batch
const updateGlobalData = () => {
    const allResults = Array.from(sensoryDataStore.values()); 
    
    // Calculate Unique Consumer Count
    const uniqueConsumerIds = new Set();
    allResults.forEach(sample => {
        if (sample.rawScores) {
            sample.rawScores.forEach(score => {
                if (score.consumerNo) { 
                    // Use a composite key if necessary, but ConsumerNo is sufficient if unique per file
                    uniqueConsumerIds.add(score.consumerNo);
                }
            });
        }
    });
    const uniqueConsumerCount = uniqueConsumerIds.size;
    
    // Recalculate Dashboard Table Data
    dashboardTableData = formatTableData(allResults);
    
    // Recalculate Global Statistics, passing the unique count
    globalSummary = calculateStats(allResults, uniqueConsumerCount);
};


/**
 * Public function to retrieve a specific sample result.
 */
const getSampleResults = (sampleId) => {
    return sensoryDataStore.get(sampleId);
};

/**
 * Public function to retrieve all stored data, filtered and paginated.
 */
const getAllResults = (options = {}) => {
    let results = Array.from(sensoryDataStore.values());
    
    if (options.pickNo) {
        results = results.filter(r => r.pickNo === options.pickNo);
    }
    if (options.testCountry) {
        results = results.filter(r => r.testCountry === options.testCountry);
    }
    
    return results;
};

/**
 * Public function to retrieve the data formatted for the dashboard table.
 */
const getDashboardTableData = (options = {}) => {
    let data = [...dashboardTableData]; 

    if (options.pickNo) {
        data = data.filter(r => r.pickNo === options.pickNo);
    }
    if (options.testCountry) {
        data = data.filter(r => r.testCountry === options.testCountry);
    }

    return data;
};

/**
 * Public function to retrieve the latest global statistics.
 */
const getGlobalSummaryStats = () => {
    return globalSummary;
};


module.exports = {
    processSensoryFile,
    getAllResults,
    getSampleResults,
    getDashboardTableData,
    getGlobalSummaryStats,
    sensoryDataStore
};