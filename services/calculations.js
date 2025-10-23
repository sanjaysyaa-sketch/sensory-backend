const { CMQ4_WEIGHTS, MIN_SAMPLES_FOR_CLIPPING, CLIP_LOW_COUNT, CLIP_HIGH_COUNT } = require('../utils/constants');

const calculateCMQ4 = (scores) => {
  const weights = CMQ4_WEIGHTS;
  const scoreKeys = ['score_t', 'score_j', 'score_f', 'score_o'];
  let sScoreTally = 0;
  let sScoreCount = 0;

  for (const key of scoreKeys) {
    if (typeof scores[key] === 'number' && scores[key] !== null && !isNaN(scores[key])) {
      sScoreTally += scores[key];
      sScoreCount += 1;
    }
  }

  const imputeValue = sScoreCount > 0 ? sScoreTally / sScoreCount : 0;
  let sCMQ4 = 0;

  for (const key of scoreKeys) {
    let score = scores[key];
    if (score === null || isNaN(score)) {
      score = imputeValue;
    }
    sCMQ4 += score * weights[key];
  }
  
  return parseFloat(sCMQ4.toFixed(3));
};

const calculateSampleMeans = (scores) => {
  const numericScores = scores.filter(score => 
    typeof score === 'number' && score !== null && !isNaN(score)
  );
  
  const count = numericScores.length;
  
  if (count === 0) {
    return { unclipped: 0, clipped: 0 };
  }

  const sum = numericScores.reduce((acc, curr) => acc + curr, 0);
  const unclippedMean = sum / count;

  if (count < MIN_SAMPLES_FOR_CLIPPING) {
    return { 
      unclipped: parseFloat(unclippedMean.toFixed(3)), 
      clipped: parseFloat(unclippedMean.toFixed(3)) 
    };
  }

  const sortedScores = [...numericScores].sort((a, b) => a - b);
  const centralScores = sortedScores.slice(CLIP_LOW_COUNT, count - CLIP_HIGH_COUNT);
  const clippedSum = centralScores.reduce((acc, curr) => acc + curr, 0);
  const clippedMean = clippedSum / centralScores.length;

  return { 
    unclipped: parseFloat(unclippedMean.toFixed(3)), 
    clipped: parseFloat(clippedMean.toFixed(3)) 
  };
};

const processSampleGroup = (sampleGroup) => {
  if (!sampleGroup || sampleGroup.length === 0) {
    throw new Error('Sample group cannot be empty');
  }

  const eqsRef = sampleGroup[0].eqsRef;
  const result = { eqsRef };

  const transformedScores = sampleGroup.map((score) => {
    const cmq4 = calculateCMQ4(score);
    return {
      ...score,
      cmq4_score: cmq4
    };
  });

  const traits = ['score_t', 'score_j', 'score_f', 'score_o', 'cmq4_score'];
  
  for (const trait of traits) {
    const scoresForTrait = transformedScores.map(s => s[trait]);
    const means = calculateSampleMeans(scoresForTrait);
    
    let fieldName;
    if (trait === 'cmq4_score') {
      fieldName = 'cmq4';
    } else {
      fieldName = trait.replace('score_', '');
    }
    
    result[`${fieldName}Unclipped`] = means.unclipped;
    result[`${fieldName}Clipped`] = means.clipped;
  }

  result.consumerCount = transformedScores.length;
  result.rawScores = transformedScores;

  return result;
};

const calculateQualityMetrics = (sampleResult) => {
  const { rawScores } = sampleResult;
  
  const metrics = {
    completeness: 0,
    consistency: 0,
    outlierCount: 0,
    dataQuality: 'Good'
  };

  if (!rawScores || rawScores.length === 0) {
    metrics.dataQuality = 'Poor';
    return metrics;
  }

  const totalScores = rawScores.length * 4;
  const nonNullScores = rawScores.reduce((count, score) => {
    return count + [score.score_t, score.score_j, score.score_f, score.score_o]
      .filter(s => s !== null && !isNaN(s)).length;
  }, 0);
  
  metrics.completeness = parseFloat(((nonNullScores / totalScores) * 100).toFixed(1));

  const cmq4Scores = rawScores.map(s => s.cmq4_score);
  const mean = cmq4Scores.reduce((a, b) => a + b, 0) / cmq4Scores.length;
  const variance = cmq4Scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / cmq4Scores.length;
  metrics.consistency = parseFloat(Math.sqrt(variance).toFixed(3));

  const threshold = metrics.consistency * 2;
  metrics.outlierCount = cmq4Scores.filter(score => 
    Math.abs(score - mean) > threshold
  ).length;

  if (metrics.completeness >= 95 && metrics.outlierCount === 0) {
    metrics.dataQuality = 'Excellent';
  } else if (metrics.completeness >= 90 && metrics.outlierCount <= 1) {
    metrics.dataQuality = 'Good';
  } else if (metrics.completeness >= 80) {
    metrics.dataQuality = 'Fair';
  } else {
    metrics.dataQuality = 'Poor';
  }

  return metrics;
};

module.exports = {
  calculateCMQ4,
  calculateSampleMeans,
  processSampleGroup,
  calculateQualityMetrics
};