const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('../test_demand_template.xlsm');
  const sheet = workbook.Sheets['T_01'];
  
  if (!sheet) {
    console.log('T_01 sheet not found');
    process.exit(1);
  }
  
  const range = XLSX.utils.decode_range(sheet['!ref']);
  console.log('T_01 sheet range:', sheet['!ref']);
  console.log('Number of rows:', range.e.r + 1);
  console.log('Number of columns:', range.e.c + 1);
  
  // Count non-empty rows (excluding header)
  let nonEmptyRows = 0;
  for (let row = 1; row <= range.e.r; row++) {
    const cellA = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
    if (cellA && cellA.v && cellA.v.toString().trim() !== '') {
      nonEmptyRows++;
    }
  }
  
  console.log('Non-empty data rows (excluding header):', nonEmptyRows);
  console.log('Total rows with data:', nonEmptyRows + 1); // +1 for header
  
} catch (error) {
  console.error('Error reading file:', error.message);
} 