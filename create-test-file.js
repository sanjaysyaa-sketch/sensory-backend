const XLSX = require('xlsx');

// Create test data matching your original structure
const testData = [
    ['Test Country', 'Pick No', 'Session', 'Consumer No', 'Serving order', 'EQS Ref', 'Tender', 'Juicy', 'Like Flav', 'Overall'],
    ['AUS', 2284, '2284.1', 1, 1, '6H8V', 16, 61, 20, 20],
    ['AUS', 2284, '2284.1', 2, 2, '6H8V', 18, 20, 59, 19],
    ['AUS', 2284, '2284.1', 3, 3, '6H8V', 14, 74, 26, 25],
    ['AUS', 2284, '2284.1', 4, 4, '6H8V', 0, 39, 59, 19],
    ['AUS', 2284, '2284.1', 5, 5, '6H8V', 21, 20, 20, 20],
    ['AUS', 2284, '2284.1', 6, 6, '6H8V', 50, 68, 52, 51],
    ['AUS', 2284, '2284.1', 7, 7, '6H8V', 7, 14, 18, 14],
    ['AUS', 2284, '2284.1', 8, 8, '6H8V', 60, 80, 63, 64],
    ['AUS', 2284, '2284.1', 9, 9, '6H8V', 18, 73, 75, 42],
    ['AUS', 2284, '2284.1', 10, 10, '6H8V', 4, 19, 5, 3]
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(testData);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Score Table');
XLSX.writeFile(workbook, 'test-sensory-file.xlsx');

console.log('✅ Test Excel file created: test-sensory-file.xlsx');
console.log('📊 File contains 10 consumer records for sample 6H8V');