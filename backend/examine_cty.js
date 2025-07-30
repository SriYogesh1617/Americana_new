const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('../test_demand_template_final.xlsm');
  const sheet = workbook.Sheets['T_01'];
  
  if (!sheet) {
    console.log('T_01 sheet not found');
    process.exit(1);
  }
  
  const range = XLSX.utils.decode_range(sheet['!ref']);
  console.log('T_01 sheet range:', sheet['!ref']);
  console.log('Number of rows:', range.e.r + 1);
  console.log('Number of columns:', range.e.c + 1);
  
  // Get headers
  const headers = [];
  for (let col = 0; col <= range.e.c; col++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    headers[col] = cell ? cell.v : `Column_${col}`;
  }
  console.log('Headers:', headers);
  
  // Count non-empty rows and examine CTY column (column A)
  let nonEmptyRows = 0;
  let ctyValues = new Set();
  let sampleCtyValues = [];
  
  for (let row = 1; row <= Math.min(range.e.r, 50); row++) { // Check first 50 rows
    const cellA = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
    if (cellA && cellA.v && cellA.v.toString().trim() !== '') {
      nonEmptyRows++;
      const ctyValue = cellA.v.toString().trim();
      ctyValues.add(ctyValue);
      
      if (sampleCtyValues.length < 10) {
        sampleCtyValues.push(ctyValue);
      }
    }
  }
  
  console.log('\n=== CTY Column Analysis ===');
  console.log('Non-empty data rows (first 50):', nonEmptyRows);
  console.log('Unique CTY values found:', ctyValues.size);
  console.log('Sample CTY values:', sampleCtyValues);
  
  // Check if CTY values look like country names or Geography_Market
  let countryNameCount = 0;
  let geographyMarketCount = 0;
  
  ctyValues.forEach(value => {
    if (value.includes('_')) {
      geographyMarketCount++;
    } else {
      countryNameCount++;
    }
  });
  
  console.log('\nCTY Value Types:');
  console.log('Country names (no underscore):', countryNameCount);
  console.log('Geography_Market format (with underscore):', geographyMarketCount);
  
  if (countryNameCount > geographyMarketCount) {
    console.log('\n✅ SUCCESS: CTY column appears to contain country names!');
  } else {
    console.log('\n❌ ISSUE: CTY column still contains Geography_Market format');
  }
  
} catch (error) {
  console.error('Error reading file:', error.message);
} 