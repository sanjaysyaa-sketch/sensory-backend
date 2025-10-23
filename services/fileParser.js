const XLSX = require('xlsx');
const fs = require('fs');
const csv = require('csv-parser');

const parseExcelFile = async (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    let scoreSheet = workbook.Sheets['Score Table'];
    if (!scoreSheet) {
      const possibleNames = ['Score Table', 'Score', 'Scores', 'Score Data'];
      for (const name of possibleNames) {
        if (workbook.Sheets[name]) {
          scoreSheet = workbook.Sheets[name];
          break;
        }
      }
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
        if (rowString.includes('test country') && rowString.includes('eqs ref')) {
          headerRowIndex = i;
          headers = row;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Could not find header row containing required columns');
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
      .pipe(csv())
      .on('data', (row) => {
        try {
          const score = {
            testCountry: row['Test Country'] || row['test_country'] || 'AUS',
            pickNo: row['Pick No'] || row['pick_no'] || 'unknown',
            session: row['Session'] || row['session'] || 'unknown',
            consumerNo: parseInt(row['Consumer No'] || row['consumer_no'] || '0'),
            servingOrder: parseInt(row['Serving order'] || row['serving_order'] || '0'),
            eqsRef: row['EQS Ref'] || row['eqs_ref'] || row['EQSRef'] || 'unknown',
            score_t: parseFloat(row['Tender'] || row['tender'] || '0'),
            score_j: parseFloat(row['Juicy'] || row['juicy'] || '0'),
            score_f: parseFloat(row['Like Flav'] || row['like_flav'] || row['flavor'] || '0'),
            score_o: parseFloat(row['Overall'] || row['overall'] || '0')
          };
          
          if (score.eqsRef && score.eqsRef !== 'EQS Ref' && score.eqsRef !== 'unknown') {
            scores.push(score);
          }
        } catch (error) {
          console.warn('Skipping invalid CSV row');
        }
      })
      .on('end', () => {
        resolve(groupScoresByEQSRef(scores));
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      });
  });
};

const parseJSONFile = async (filePath) => {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    
    let scores = [];
    
    if (Array.isArray(jsonData)) {
      scores = jsonData;
    } else if (jsonData.scores) {
      scores = jsonData.scores;
    } else if (jsonData.data) {
      scores = jsonData.data;
    } else if (jsonData.results) {
      scores = jsonData.results;
    } else {
      throw new Error('Invalid JSON structure');
    }
    
    return groupScoresByEQSRef(scores);
    
  } catch (error) {
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
};

const extractScoresFromRows = (dataRows, headers) => {
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
    if (!eqsRef || eqsRef === 'EQS Ref') continue;

    const score = {
      testCountry: row[colIndices.testCountry] || 'AUS',
      pickNo: row[colIndices.pickNo] || 'unknown',
      session: row[colIndices.session] || 'unknown',
      consumerNo: parseInt(row[colIndices.consumerNo]) || 0,
      servingOrder: parseInt(row[colIndices.servingOrder]) || 0,
      eqsRef: String(eqsRef).trim(),
      score_t: parseFloat(row[colIndices.tender]) || 0,
      score_j: parseFloat(row[colIndices.juicy]) || 0,
      score_f: parseFloat(row[colIndices.likeFlav]) || 0,
      score_o: parseFloat(row[colIndices.overall]) || 0
    };

    if (score.eqsRef && score.eqsRef.length > 0) {
      scores.push(score);
    }
  }

  return scores;
};

const groupScoresByEQSRef = (scores) => {
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