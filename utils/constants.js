module.exports = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_FILE_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/json'
  ],
  
  CMQ4_WEIGHTS: {
    TENDER: 0.3,
    JUICY: 0.1,
    FLAVOR: 0.3,
    OVERALL: 0.3
  },
  
  MIN_SAMPLES_FOR_CLIPPING: 5,
  CLIP_LOW_COUNT: 2,
  CLIP_HIGH_COUNT: 2
};