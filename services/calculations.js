// services/calculations.js

const { CMQ4_WEIGHTS, MIN_SAMPLES_FOR_CLIPPING, CLIP_LOW_COUNT, CLIP_HIGH_COUNT } = require('../utils/constants');

// Helper function to ensure score is treated as a number
const getNumericScore = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};


const calculateCMQ4 = (scores) => {
    const weights = CMQ4_WEIGHTS;
    const weightKeys = {
        TENDER: 'score_t',
        JUICY: 'score_j',
        FLAVOR: 'score_f',
        OVERALL: 'score_o'
    };
    
    let sScoreTally = 0;
    let sScoreCount = 0;

    // Calculate Tally for Imputation
    const scoreKeys = ['score_t', 'score_j', 'score_f', 'score_o'];
    for (const key of scoreKeys) {
        const score = getNumericScore(scores[key]);
        if (score !== null) {
            sScoreTally += score;
            sScoreCount += 1;
        }
    }

    const imputeValue = sScoreCount > 0 ? sScoreTally / sScoreCount : 0;
    let sCMQ4 = 0;

    // Calculate CMQ4
    for (const [weightName, scoreKey] of Object.entries(weightKeys)) {
        let score = getNumericScore(scores[scoreKey]);
        
        if (score === null || isNaN(score)) {
            score = imputeValue;
        }
        
        sCMQ4 += score * weights[weightName];
    }
    
    return parseFloat(sCMQ4.toFixed(3));
};

const calculateSampleMeans = (scores) => {
    const numericScores = scores
        .map(getNumericScore)
        .filter(score => score !== null);
    
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

    // FIX: Limit the sample group to the first 10 scores found
    const limitedSampleGroup = sampleGroup.slice(0, 10);
    
    const eqsRef = limitedSampleGroup[0].eqsRef;
    const result = { eqsRef, sampleProductNo: 'P-TBD' }; 

    const transformedScores = limitedSampleGroup.map((score) => {
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
        dataQuality: 'Poor'
    };

    if (!rawScores || rawScores.length === 0) {
        metrics.dataQuality = 'Poor';
        return metrics;
    }

    const totalScores = rawScores.length * 4;
    const nonNullScores = rawScores.reduce((count, score) => {
        const validScores = [score.score_t, score.score_j, score.score_f, score.score_o]
            .map(getNumericScore)
            .filter(s => s !== null).length;
        return count + validScores;
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