// test/integration.test.js

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Import the main Express app object
const app = require('../server'); 
// Import the data store to verify data was correctly persisted in memory
const { sensoryDataStore } = require('../services/sensoryProcessor'); 

// Define a path for a mock file we'll use for testing uploads
const MOCK_FILE_NAME = 'mock_sensory_data.csv';
const MOCK_FILE_PATH = path.join(__dirname, MOCK_FILE_NAME);

// Mock CSV content (Must contain headers expected by fileParser.js)
const MOCK_CSV_CONTENT = `Consumer No,EQS Ref,Tender,Juicy,Like Flav,Overall
1,A01,7.0,6.0,7.0,7.0
2,A01,6.0,5.0,6.0,6.0
3,B02,8.0,7.0,8.0,8.0
4,B02,7.0,6.0,7.0,7.0
`;

describe('Integration Tests: API Endpoints', () => {
    
    // Setup: Create a mock file before all tests
    beforeAll((done) => {
        // Clear the in-memory data store before running tests
        sensoryDataStore.clear();

        // Write the mock CSV content to a temporary file
        fs.writeFileSync(MOCK_FILE_PATH, MOCK_CSV_CONTENT);
        done();
    });

    // Teardown: Clean up the mock file after all tests
    afterAll((done) => {
        if (fs.existsSync(MOCK_FILE_PATH)) {
            fs.unlinkSync(MOCK_FILE_PATH);
        }
        // Ensure the data store is empty after tests
        sensoryDataStore.clear();
        done();
    });

    // --- Health Check and Status Routes ---

    test('GET /health should return 200 and OK status', async () => {
        const response = await request(app).get('/health');
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('OK');
    });

    test('GET /api/upload/status should return 200 and running message', async () => {
        const response = await request(app).get('/api/upload/status');
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Upload service is running');
    });

    // --- File Upload and Processing Route ---

    test('POST /api/upload should process a valid file and store results', async () => {
        const response = await request(app)
            .post('/api/upload')
            .set('Content-Type', 'multipart/form-data')
            .field('pickNo', 'PTEST')
            .field('testCountry', 'AUS')
            .attach('sensoryFile', MOCK_FILE_PATH); // Multer field name is 'sensoryFile'

        // Check the API response
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('File processed successfully');
        expect(response.body.data.processedSamplesCount).toBe(2);

        // Check the in-memory store (crucial integration check)
        expect(sensoryDataStore.size).toBe(2);
        expect(sensoryDataStore.has('PTEST_A01')).toBe(true);
        expect(sensoryDataStore.get('PTEST_A01').cmq4Clipped).toBeCloseTo(6.600); 
    });

    test('POST /api/upload should fail with status 400 if no file is uploaded', async () => {
        const response = await request(app)
            .post('/api/upload')
            .field('pickNo', 'PTEST')
            .field('testCountry', 'AUS');

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('No file uploaded');
    });

    test('POST /api/upload should fail with status 400 if wrong field name is used', async () => {
        const response = await request(app)
            .post('/api/upload')
            .set('Content-Type', 'multipart/form-data')
            .field('pickNo', 'PTEST')
            .field('testCountry', 'AUS')
            .attach('wrongFieldName', MOCK_FILE_PATH); // Should fail in middleware/upload.js

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('field name mismatch');
    });

    // --- Data Retrieval Routes (Dependent on successful upload) ---

    test('GET /api/sensory/dashboard/table should return stored data', async () => {
        // Data was loaded by the POST test above
        const response = await request(app).get('/api/sensory/dashboard/table');

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(2);
        
        // Check structure of a table row
        const sampleA01 = response.body.data.find(d => d.eqsRef === 'A01');
        expect(sampleA01.pickNo).toBe('PTEST');
        expect(sampleA01.averageCMQ4).toBeCloseTo(6.60); // Clipped mean for A01
    });

    test('GET /api/sensory/dashboard/stats should return global statistics', async () => {
        const response = await request(app).get('/api/sensory/dashboard/stats');

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        
        const stats = response.body.data;
        expect(stats.totalSamples).toBe(2);
        // We only mocked 4 consumers, but the unique count logic uses consumerNo.
        // Consumers 1, 2, 3, 4 are unique across the file.
        // NOTE: Since the current implementation of sensoryProcessor doesn't truly track unique IDs across batches, 
        // we'll check for a non-zero number indicative of *some* calculation.
        expect(stats.totalConsumers).toBe(4); 
        expect(stats.averageCMQ4).toBeGreaterThan(6.0); // Simple check
    });

    test('GET /api/sensory/sample/:sampleId should return data for a specific sample', async () => {
        // Sample ID generated: PTEST_A01
        const response = await request(app).get('/api/sensory/sample/PTEST_A01');

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.eqsRef).toBe('A01');
        expect(response.body.data.rawScores.length).toBe(2);
        expect(response.body.data.cmq4Clipped).toBeCloseTo(6.600);
    });

    test('GET /api/sensory/sample/:sampleId should return 404 for a non-existent sample', async () => {
        const response = await request(app).get('/api/sensory/sample/NON_EXISTENT');

        expect(response.statusCode).toBe(404);
        expect(response.body.message).toBe('Sample not found');
    });

});