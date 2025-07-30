const XLSX = require('xlsx');

// Read the generated XLSM file
const workbook = XLSX.readFile('./test_demand_template_with_t01.xlsm');

// Check if T_01 sheet exists
if (workbook.SheetNames.includes('T_01')) {
  console.log('✅ T_01 sheet found in XLSM file');
  
  // Get T_01 worksheet
  const t01Sheet = workbook.Sheets['T_01'];
  
  // Convert to JSON to see the data
  const t01Data = XLSX.utils.sheet_to_json(t01Sheet, { header: 1 });
  
  console.log(`📊 T_01 sheet has ${t01Data.length} rows`);
  
  if (t01Data.length > 0) {
    console.log('📋 Headers:', t01Data[0]);
    
    if (t01Data.length > 1) {
      console.log('📝 First data row:', t01Data[1]);
      console.log('📝 Second data row:', t01Data[2]);
      console.log('📝 Third data row:', t01Data[3]);
    }
  }
  
  // Check for specific columns we expect
  const headers = t01Data[0] || [];
  const expectedColumns = ['CTY', 'FGSKU Code', 'MthNum', 'Demand Cases', 'Market', 'Production Environment', 'Safety Stock WH', 'Inventory Days (Norm)', 'Supply', 'Cons'];
  
  console.log('\n🔍 Checking for expected columns:');
  expectedColumns.forEach(col => {
    if (headers.includes(col)) {
      console.log(`✅ ${col}`);
    } else {
      console.log(`❌ ${col} - NOT FOUND`);
    }
  });
  
} else {
  console.log('❌ T_01 sheet NOT found in XLSM file');
  console.log('Available sheets:', workbook.SheetNames);
}

// Also check other sheets
console.log('\n📚 All sheets in XLSM file:');
workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`- ${sheetName}: ${data.length} rows`);
}); 