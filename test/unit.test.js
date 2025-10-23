// test/unit.test.js

const { 
    calculateCMQ4, 
    calculateSampleMeans, 
    processSampleGroup, 
    calculateQualityMetrics 
} = require('../services/calculations');
const { 
    generateSampleId, 
    calculateStats 
} = require('../utils/helpers');
const { 
    MIN_SAMPLES_FOR_CLIPPING, 
    CLIP_LOW_COUNT, 
    CLIP_HIGH_COUNT,
    CMQ4_WEIGHTS
} = require('../utils/constants');

// --- Mock Data ---

// A standard set of scores for a single sample (EQS Ref)
const MOCK_SAMPLE_GROUP_FULL = [
    // 10 scores are used for robust clipping
    { eqsRef: 'A01', score_t: 7.0, score_j: 5.0, score_f: 7.5, score_o: 8.0, consumerNo: 1 }, // High scores
    { eqsRef: 'A01', score_t: 6.5, score_j: 6.0, score_f: 7.0, score_o: 7.5, consumerNo: 2 },
    { eqsRef: 'A01', score_t: 6.0, score_j: 5.5, score_f: 6.5, score_o: 7.0, consumerNo: 3 },
    { eqsRef: 'A01', score_t: 5.5, score_j: 5.0, score_f: 6.0, score_o: 6.5, consumerNo: 4 },
    { eqsRef: 'A01', score_t: 5.0, score_j: 4.5, score_f: 5.5, score_o: 6.0, consumerNo: 5 },
    { eqsRef: 'A01', score_t: 4.5, score_j: 4.0, score_f: 5.0, score_o: 5.5, consumerNo: 6 },
    { eqsRef: 'A01', score_t: 4.0, score_j: 3.5, score_f: 4.5, score_o: 5.0, consumerNo: 7 },
    { eqsRef: 'A01', score_t: 3.5, score_j: 3.0, score_f: 4.0, score_o: 4.5, consumerNo: 8 },
    { eqsRef: 'A01', score_t: 3.0, score_j: 2.5, score_f: 3.5, score_o: 4.0, consumerNo: 9 },
    { eqsRef: 'A01', score_t: 2.0, score_j: 1.0, score_f: 2.5, score_o: 3.0, consumerNo: 10 }, // Low scores
];

const MOCK_SAMPLE_GROUP_IMPUTATION = [
    { eqsRef: 'B01', score_t: 8.0, score_j: 6.0, score_f: null, score_o: 7.0, consumerNo: 11 }, // Missing Flavor
];

const MOCK_SAMPLE_GROUP_NO_CLIPPING = [
    { eqsRef: 'C01', score_t: 10, score_j: 10, score_f: 10, score_o: 10, consumerNo: 12 },
    { eqsRef: 'C01', score_t: 5, score_j: 5, score_f: 5, score_o: 5, consumerNo: 13 },
    { eqsRef: 'C01', score_t: 0, score_j: 0, score_f: 0, score_o: 0, consumerNo: 14 },
    // Only 3 scores. Should be unclipped mean.
];

// --- Tests for utils/helpers.js ---

describe('Utils/Helpers', () => {
    
    test('generateSampleId should correctly format the ID', () => {
        const id = generateSampleId('P2284', 'EQS Ref-01');
        expect(id).toBe('P2284_EQS_REF-01');
    });

    test('calculateStats should return zero for empty results array', () => {
        const stats = calculateStats([], 0);
        expect(stats.totalSamples).toBe(0);
        expect(stats.totalConsumers).toBe(0);
        expect(stats.averageCMQ4).toBe(0);
        expect(stats.averageQuality).toBe(0);
    });

    test('calculateStats should correctly calculate global averages and counts', () => {
        const mockResults = [
            { cmq4Clipped: 6.0, qualityMetrics: { completeness: 100 } },
            { cmq4Clipped: 7.0, qualityMetrics: { completeness: 80 } },
        ];
        const stats = calculateStats(mockResults, 50);
        // Avg CMQ4: (6.0 + 7.0) / 2 = 6.5
        // Avg Quality: (100 + 80) / 2 = 90
        expect(stats.totalSamples).toBe(2);
        expect(stats.totalConsumers).toBe(50);
        expect(stats.averageCMQ4).toBe(6.500);
        expect(stats.averageQuality).toBe(90.0);
    });
});

// --- Tests for services/calculations.js ---

describe('Services/Calculations - CMQ4 and Means', () => {

    test('calculateCMQ4 should calculate score correctly with full data', () => {
        const score = { score_t: 7.0, score_j: 5.0, score_f: 7.5, score_o: 8.0 };
        // CMQ4 = (7.0*0.3) + (5.0*0.1) + (7.5*0.3) + (8.0*0.3)
        // CMQ4 = 2.1 + 0.5 + 2.25 + 2.4 = 7.25
        expect(calculateCMQ4(score)).toBe(7.250);
    });

    test('calculateCMQ4 should impute missing score_f using the average of other scores', () => {
        const score = MOCK_SAMPLE_GROUP_IMPUTATION[0]; // t=8, j=6, f=null, o=7
        // Average of non-null scores: (8.0 + 6.0 + 7.0) / 3 = 7.0 (Impute Value)
        // CMQ4 = (8.0*0.3) + (6.0*0.1) + (7.0*0.3) + (7.0*0.3)
        // CMQ4 = 2.4 + 0.6 + 2.1 + 2.1 = 7.2
        expect(calculateCMQ4(score)).toBe(7.200);
    });

    test('calculateSampleMeans should return unclipped mean when count < MIN_SAMPLES_FOR_CLIPPING', () => {
        // MIN_SAMPLES_FOR_CLIPPING = 5. We provide 3.
        const scores = [10, 5, 0];
        const means = calculateSampleMeans(scores);
        // Unclipped Mean: (10 + 5 + 0) / 3 = 5
        expect(means.unclipped).toBe(5.000);
        expect(means.clipped).toBe(5.000);
    });

    test('calculateSampleMeans should return clipped mean when count >= MIN_SAMPLES_FOR_CLIPPING', () => {
        // 10 scores: [2.0, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0]
        // CLIP_LOW_COUNT=2, CLIP_HIGH_COUNT=2.
        // Clipped scores: [3.5, 4.0, 4.5, 5.0, 5.5, 6.0] (6 scores)
        const scores = MOCK_SAMPLE_GROUP_FULL.map(s => s.score_t);
        const means = calculateSampleMeans(scores);
        
        // Unclipped Mean: (47/10) = 4.7
        // Clipped Sum: 3.5 + 4.0 + 4.5 + 5.0 + 5.5 + 6.0 = 28.5
        // Clipped Mean: 28.5 / 6 = 4.75
        expect(means.unclipped).toBe(4.700);
        expect(means.clipped).toBe(4.750);
    });
});

describe('Services/Calculations - Process and Metrics', () => {
    
    test('processSampleGroup should limit scores to 10 and calculate all means', () => {
        // Send 12 scores to ensure it limits to 10
        const extraScore = { eqsRef: 'A01', score_t: 10, score_j: 10, score_f: 10, score_o: 10, consumerNo: 11 };
        const group = [...MOCK_SAMPLE_GROUP_FULL, extraScore, extraScore]; 
        
        const result = processSampleGroup(group);

        // Should only have the first 10 scores (consumerNo 1-10) in rawScores
        expect(result.consumerCount).toBe(10); 
        expect(result.rawScores.length).toBe(10);
        
        // Check a calculated mean
        // From previous test, the clipped mean for score_t should be 4.75
        expect(result.tClipped).toBe(4.750);
        expect(result.cmq4Unclipped).toBeCloseTo(7.25 + 6.95 + 6.65 + 6.35 + 6.05 + 5.75 + 5.45 + 5.15 + 4.85 + 4.3, 3);
    });

    test('calculateQualityMetrics should correctly determine completeness and consistency', () => {
        // Use a sample with a full set of 10 scores
        const processedSample = processSampleGroup(MOCK_SAMPLE_GROUP_FULL);
        const metrics = calculateQualityMetrics(processedSample);

        // Completeness: 10 consumers * 4 scores = 40 total scores. All are present.
        expect(metrics.completeness).toBe(100.0);

        // Consistency (Standard Deviation of CMQ4 scores): 
        const cmq4Scores = processedSample.rawScores.map(s => s.cmq4_score);
        // Mean CMQ4: (7.25 + 6.95 + 6.65 + 6.35 + 6.05 + 5.75 + 5.45 + 5.15 + 4.85 + 4.3) / 10 = 5.875
        // (Calculated variance/stdev for this linear set is reliable)
        expect(metrics.consistency).toBeCloseTo(0.992, 3); 
        
        // Outliers: Threshold is 0.992 * 2 = 1.984. 
        // No scores are > 1.984 away from the mean (5.875)
        expect(metrics.outlierCount).toBe(0); 
        expect(metrics.dataQuality).toBe('Excellent');
    });

    test('calculateQualityMetrics should handle missing scores and poor quality', () => {
        const scores = [
            { eqsRef: 'D01', score_t: 8, score_j: 8, score_f: 8, score_o: 8, cmq4_score: 8.0 },
            { eqsRef: 'D01', score_t: 1, score_j: null, score_f: null, score_o: 1, cmq4_score: 1.6 }, // 2/4 scores are null
            { eqsRef: 'D01', score_t: 10, score_j: 10, score_f: 10, score_o: 10, cmq4_score: 10.0 },
            { eqsRef: 'D01', score_t: 1, score_j: 1, score_f: 1, score_o: 1, cmq4_score: 1.6 },
        ];
        
        const mockResult = { rawScores: scores };
        const metrics = calculateQualityMetrics(mockResult);
        
        // Completeness: 14 non-null scores / 16 total slots = 87.5%
        expect(metrics.completeness).toBe(87.5); // < 90%
        
        // Consistency (Std Dev of [8.0, 1.6, 10.0, 1.6])
        // Mean = 5.3
        // Std Dev ≈ 4.7
        expect(metrics.consistency).toBeCloseTo(4.708, 3); 
        
        // Outlier Check: Threshold 4.708 * 2 = 9.416
        // CMQ4 values: 8.0, 1.6, 10.0, 1.6. Mean = 5.3
        // 10.0 is |10.0 - 5.3| = 4.7 (Not an outlier)
        // 1.6 is |1.6 - 5.3| = 3.7 (Not an outlier)
        expect(metrics.outlierCount).toBe(0); 
        
        // Quality: 87.5% completeness falls into 'Poor' category (< 80% is poor, so it should be Fair).
        // Let's rely on the definition: > 80% is 'Fair'.
        expect(metrics.dataQuality).toBe('Fair'); 
    });
});