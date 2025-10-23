// sensory-backend/public/script.js (Updated for table removal and integer rounding)

// API base URL
const API_BASE_URL = 'http://localhost:3000/api';

class SensoryDashboard {
    constructor() {
        this.initializeEventListeners();
        this.loadInitialData();
    }

    initializeEventListeners() {
        const uploadForm = document.getElementById('uploadForm');
        uploadForm.addEventListener('submit', (e) => this.handleFileUpload(e));
    }

    async loadInitialData() {
        try {
            await this.loadSensoryResults();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async handleFileUpload(event) {
        event.preventDefault();
        
        const formData = new FormData();
        const fileInput = document.getElementById('sensoryFile');
        const pickNo = document.getElementById('pickNo').value;
        const testCountry = document.getElementById('testCountry').value;
        const uploadBtn = document.getElementById('uploadBtn');
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        const messageDiv = document.getElementById('uploadMessage');

        if (!fileInput.files[0]) {
            this.showMessage('Please select a file to upload.', 'error');
            return;
        }

        formData.append('sensoryFile', fileInput.files[0]);
        formData.append('pickNo', pickNo);
        formData.append('testCountry', testCountry);

        try {
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Processing...';
            progressBar.style.display = 'block';
            messageDiv.innerHTML = '';

            this.simulateProgress(progressFill);

            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Upload failed');
            }

            if (result.success) {
                this.showMessage(`✅ ${result.message}`, 'success');
                console.log('Processing result:', result);
                
                await this.loadSensoryResults();
                
            } else {
                throw new Error(result.message || 'Processing failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage(`❌ Error: ${error.message}`, 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Process File';
            progressBar.style.display = 'none';
            progressFill.style.width = '0%';
        }
    }

    simulateProgress(progressFill) {
        let width = 0;
        const interval = setInterval(() => {
            if (width >= 90) {
                clearInterval(interval);
            } else {
                width += Math.random() * 10;
                progressFill.style.width = Math.min(width, 90) + '%';
            }
        }, 200);
        progressFill.dataset.intervalId = interval;
    }

    async loadSensoryResults() {
        try {
            // Fetch the dashboard table data
            const tableResponse = await fetch(`${API_BASE_URL}/sensory/dashboard/table`);
            
            if (!tableResponse.ok) {
                throw new Error('Failed to load table results');
            }

            const tableResult = await tableResponse.json();
            const tableData = tableResult.data; 
            
            // Stats are still fetched but are no longer explicitly displayed in the layout
            const statsResponse = await fetch(`${API_BASE_URL}/sensory/dashboard/stats`);
            const statsResult = await statsResponse.json();

            if (tableResult.success && tableData.length > 0) {
                this.displayResultsTable(tableData);
            } else {
                this.showNoDataMessage();
            }
            
            if (statsResult.success && statsResult.data) {
                this.updateStats(statsResult.data);
            }


        } catch (error) {
            console.error('Error loading results:', error);
            this.showNoDataMessage();
            this.updateStats(this.calculateStats([]));
        }
    }
    
    displayResultsTable(data) {
        const table = document.getElementById('resultsTable');
        const tableBody = document.getElementById('resultsTableBody');
        const loadingDiv = document.getElementById('loadingResults');

        // --- UPDATE TABLE HEADERS (PUBLIC/INDEX.HTML is required to be updated separately) ---
        // Assuming the public/index.html THs will be updated to match the new structure:
        // <th>Test Country</th> <th>Pick No.</th> <th>EQS Ref</th> <th>Average CMQ4</th> <th>UnClipped MQ4</th>

        loadingDiv.style.display = 'none';
        table.style.display = 'table';
        tableBody.innerHTML = '';

        data.forEach(item => {
            const row = document.createElement('tr');
            
            // UPDATED: Removed 'sampleProductNo' column and used Math.round() for means
            row.innerHTML = `
                <td>${item.testCountry}</td>
                <td>${item.pickNo}</td>
                <td>${item.eqsRef}</td>
                <td><strong>${Math.round(item.averageCMQ4)}</strong></td>
                <td>${Math.round(item.unClippedMQ4)}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    // Keep function for passive use, even if display is removed
    updateStats(summary) {
        const statsContainer = document.getElementById('statsContainer');
        
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${summary.totalSamples}</div>
                <div class="stat-label">Total Samples</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${summary.totalConsumers}</div>
                <div class="stat-label">Total Consumers (Unique)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${summary.averageCMQ4.toFixed(2)}</div>
                <div class="stat-label">Average CMQ4 (Total)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${summary.averageQuality.toFixed(1)}%</div>
                <div class="stat-label">Data Quality (Avg)</div>
            </div>
        `;
    }

    // ... (rest of helper functions remain the same)

    showNoDataMessage() {
        const loadingDiv = document.getElementById('loadingResults');
        const table = document.getElementById('resultsTable');
        
        table.style.display = 'none';
        loadingDiv.style.display = 'block';
        loadingDiv.textContent = 'No data available. Upload a sensory file to see results.';
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('uploadMessage');
        messageDiv.innerHTML = `<div class="${type}">${message}</div>`;
        
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.innerHTML = '';
            }, 5000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SensoryDashboard();
});