// services/fileParser.js (FINAL, most robust version)

const XLSX = require('xlsx');
const fs = require('fs');
const csv = require('csv-parser');

// Helper functions for safe numeric parsing (essential for preventing NaNs)
const safeParseFloat = (value) => {
    const val = String(value).trim();
    if (val === '' || val === null || val === undefined) return 0;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
};
const safeParseInt = (value) => {
    const val = String(value).trim();
    if (val === '' || val === null || val === undefined) return 0;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? 0 : parsed;
};

const parseExcelFile = async (filePath) => {
    // ... (Excel parsing logic remains the same)
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        
        let scoreSheet = null;

        const possibleNames = [
            '1st Entry', 
            '2nd entry & Check', 
            'Score Table', 
            'Score', 
            'Scores', 
            'Score Data'
        ];
        
        for (const name of possibleNames) {
            if (workbook.Sheets[name]) {
                scoreSheet = workbook.Sheets[name];
                break;
            }
        }
        
        if (!scoreSheet && sheetNames.length > 0) {
            console.warn(`Using first sheet "${sheetNames[0]}" as no standard score sheet was found.`);
            scoreSheet = workbook.Sheets[sheetNames[0]];
        }

        if (!scoreSheet) {
            throw new Error(`Score sheet not found. Available sheets: ${sheetNames.join(', ')}`);
        }
        
        const scoreData = XLSX.utils.sheet_to_json(scoreSheet, { 
            header: 1,
            defval: null,
            blankrows: false
        });

        let headerRowIndex = -1;
        let headers = [];
        
        for (let i = 0; i < Math.min(scoreData.length, 10); i++) {
            const row = scoreData[i];
            if (row && Array.isArray(row)) {
                const rowString = row.map(cell => String(cell || '')).join(' ').toLowerCase();
                if (rowString.includes('eqs ref')) {
                    headerRowIndex = i;
                    headers = row;
                    break;
                }
            }
        }

        if (headerRowIndex === -1) {
            throw new Error('Could not find header row containing required columns (EQS Ref)');
        }

        const dataRows = scoreData.slice(headerRowIndex + 1);
        const scores = extractScoresFromRows(dataRows, headers);
        
        return groupScoresByEQSRef(scores);

    } catch (error) {
        throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
};

const parseCSVFile = async (filePath) => {
    return new Promise((resolve, reject) => {
        const scores = [];
        
        fs.createReadStream(filePath)
            .pipe(csv({
                mapValues: ({ value }) => value === '' ? null : value
            }))
            .on('data', (row) => {
                try {
                    const getVal = (keys) => {
                        for (const key of keys) {
                            if (row[key] !== undefined) {
                                return row[key];
                            }
                            const trimmedKey = Object.keys(row).find(k => k.trim() === key.trim());
                            if (trimmedKey && row[trimmedKey] !== undefined) {
                                return row[trimmedKey];
                            }
                        }
                        return null; 
                    };
                    
                    const score = {
                        testCountry: getVal(['Test Country', 'test_country']) || 'AUS',
                        pickNo: getVal(['Pick No', 'pick_no']) || 'unknown',
                        session: getVal(['Session', 'session']) || 'unknown',
                        consumerNo: safeParseInt(getVal(['Consumer No', 'consumer_no', 'id no'])),
                        servingOrder: safeParseInt(getVal(['Serving order', 'serving_order'])),
                        eqsRef: String(getVal(['EQS Ref', 'EQSRef', 'eqs_ref']) || '').trim(),
                        score_t: safeParseFloat(getVal(['Tender', 'tender'])),
                        score_j: safeParseFloat(getVal(['Juicy', 'juicy'])),
                        score_f: safeParseFloat(getVal(['Like Flav', 'like_flav', 'flavor', 'like flav'])),
                        score_o: safeParseFloat(getVal(['Overall', 'overall']))
                    };
                    
                    if (score.eqsRef && score.eqsRef.length > 0 && score.eqsRef.toUpperCase() !== 'EQS REF' && score.eqsRef !== 'unknown') {
                        scores.push(score);
                    }
                } catch (error) {
                    console.warn('Skipping invalid CSV row:', error.message);
                }
            })
            .on('end', () => {
                if (scores.length === 0) {
                     reject(new Error("Score Table data missing or all rows were invalid/empty. This usually means the header row was not correctly read."));
                     return;
                }
                resolve(groupScoresByEQSRef(scores));
            })
            .on('error', (error) => {
                reject(new Error(`CSV parsing failed: ${error.message}`));
            });
    });
};

const extractScoresFromRows = (dataRows, headers) => {
    // ... (Logic for extracting scores from Excel remains the same)
    const colIndices = {
        testCountry: headers.findIndex(h => String(h || '').toLowerCase().includes('test country')),
        pickNo: headers.findIndex(h => String(h || '').toLowerCase().includes('pick no')),
        session: headers.findIndex(h => String(h || '').toLowerCase().includes('session')),
        consumerNo: headers.findIndex(h => String(h || '').toLowerCase().includes('consumer no')),
        servingOrder: headers.findIndex(h => String(h || '').toLowerCase().includes('serving order')),
        eqsRef: headers.findIndex(h => String(h || '').toLowerCase().includes('eqs ref')),
        tender: headers.findIndex(h => String(h || '').toLowerCase().includes('tender')),
        juicy: headers.findIndex(h => String(h || '').toLowerCase().includes('juicy')),
        likeFlav: headers.findIndex(h => String(h || '').toLowerCase().includes('like flav')),
        overall: headers.findIndex(h => String(h || '').toLowerCase().includes('overall'))
    };

    const scores = [];
    
    for (const row of dataRows) {
        if (!row || !Array.isArray(row)) continue;

        const eqsRef = row[colIndices.eqsRef];
        if (!eqsRef || String(eqsRef).trim().toUpperCase().includes('EQS REF')) continue;

        const score = {
            testCountry: row[colIndices.testCountry] || 'AUS',
            pickNo: row[colIndices.pickNo] || 'unknown',
            session: row[colIndices.session] || 'unknown',
            consumerNo: safeParseInt(row[colIndices.consumerNo]),
            servingOrder: safeParseInt(row[colIndices.servingOrder]),
            eqsRef: String(eqsRef).trim(),
            score_t: safeParseFloat(row[colIndices.tender]),
            score_j: safeParseFloat(row[colIndices.juicy]),
            score_f: safeParseFloat(row[colIndices.likeFlav]),
            score_o: safeParseFloat(row[colIndices.overall])
        };

        if (score.eqsRef && score.eqsRef.length > 0) {
            scores.push(score);
        }
    }

    return scores;
};

const groupScoresByEQSRef = (scores) => {
    // ... (logic remains the same)
    const grouped = {};
    
    for (const score of scores) {
        if (!grouped[score.eqsRef]) {
            grouped[score.eqsRef] = [];
        }
        grouped[score.eqsRef].push(score);
    }
    
    return grouped;
};

const parseFile = async (filePath) => {
    const fileExtension = filePath.split('.').pop().toLowerCase();
    
    switch (fileExtension) {
        case 'xlsx':
        case 'xls':
            return await parseExcelFile(filePath);
        case 'csv':
            return await parseCSVFile(filePath);
        case 'json':
            return await parseJSONFile(filePath);
        default:
            throw new Error(`Unsupported file type: ${fileExtension}`);
    }
};

module.exports = {
    parseFile
};