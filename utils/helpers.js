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
  return sampleResults.map(result => ({
    id: result.sampleId,
    pickNo: result.pickNo,
    eqsRef: result.eqsRef,
    testCountry: result.testCountry,
    consumers: result.consumerCount,
    tender: result.tenderClipped,
    juicy: result.juicyClipped,
    flavor: result.flavorClipped,
    overall: result.overallClipped,
    cmq4: result.cmq4Clipped,
    quality: result.qualityMetrics ? result.qualityMetrics.completeness : 100,
    processedAt: result.processedAt
  }));
};

const calculateStats = (results) => {
  if (!results || results.length === 0) {
    return {
      totalSamples: 0,
      totalConsumers: 0,
      averageCMQ4: 0,
      averageQuality: 0
    };
  }

  const totalConsumers = results.reduce((sum, sample) => sum + sample.consumerCount, 0);
  const averageCMQ4 = results.reduce((sum, sample) => sum + sample.cmq4Clipped, 0) / results.length;
  const averageQuality = results.reduce((sum, sample) => 
    sum + (sample.qualityMetrics ? sample.qualityMetrics.completeness : 100), 0) / results.length;

  return {
    totalSamples: results.length,
    totalConsumers,
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