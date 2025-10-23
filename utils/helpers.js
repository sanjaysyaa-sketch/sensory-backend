// utils/helpers.js (Updated for new table format - removed sampleProductNo)

const path = require('path');

const getFileExtension = (filename) => {
    return path.extname(filename).toLowerCase().slice(1);
};

const isValidFileType = (mimetype, filename) => {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/json'
    ];
    
    const extension = getFileExtension(filename);
    const validExtensions = ['xlsx', 'xls', 'csv', 'json'];
    
    return allowedTypes.includes(mimetype) && validExtensions.includes(extension);
};

const generateSampleId = (pickNo, eqsRef) => {
    return `${pickNo}_${eqsRef}`.replace(/\s+/g, '_').toUpperCase();
};

const formatTableData = (sampleResults) => {
    // UPDATED: Removed sampleProductNo from the mapped output
    return sampleResults.map(result => ({
        // Display fields
        testCountry: result.testCountry,
        pickNo: result.pickNo,
        eqsRef: result.eqsRef,

        // Calculated CMQ4 Fields
        averageCMQ4: result.cmq4Clipped,
        unClippedMQ4: result.cmq4Unclipped,

        // Metadata (Keep for secondary info)
        consumers: result.consumerCount,
        processedAt: result.processedAt
    }));
};

const calculateStats = (results, uniqueConsumerCount = 0) => {
    if (!results || results.length === 0) {
        return {
            totalSamples: 0,
            totalConsumers: 0,
            averageCMQ4: 0,
            averageQuality: 0
        };
    }

    const totalConsumers = uniqueConsumerCount; 
    
    const averageCMQ4 = results.reduce((sum, sample) => sum + sample.cmq4Clipped, 0) / results.length;
    const averageQuality = results.reduce((sum, sample) => 
        sum + (sample.qualityMetrics ? sample.qualityMetrics.completeness : 100), 0) / results.length;

    return {
        totalSamples: results.length,
        totalConsumers: totalConsumers, 
        averageCMQ4: parseFloat(averageCMQ4.toFixed(3)),
        averageQuality: parseFloat(averageQuality.toFixed(1))
    };
};

module.exports = {
    getFileExtension,
    isValidFileType,
    generateSampleId,
    formatTableData,
    calculateStats
};