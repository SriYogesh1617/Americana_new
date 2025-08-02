const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { query } = require('./config/database');

async function exportT04ToExcel() {
  try {
    console.log('📊 Exporting T04 data to Excel...');
    
    // Query all T04 data
    const selectQuery = `
      SELECT * FROM t04_whbal ORDER BY id;
    `;
    
    console.log('🔍 Querying database...');
    const result = await query(selectQuery);
    const data = result.rows;
    
    console.log(`📦 Retrieved ${data.length} records`);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'T04_WHBal_Data');
    
    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `T04_WHBal_Export_${timestamp}.xlsx`;
    const filepath = path.join(exportsDir, filename);
    
    // Write the Excel file
    XLSX.writeFile(wb, filepath);
    
    console.log(`✅ Excel file exported successfully!`);
    console.log(`📁 File location: ${filepath}`);
    console.log(`📊 Records exported: ${data.length}`);
    console.log(`🗂️ Columns exported: ${Object.keys(data[0] || {}).length}`);
    
    // Also create a CSV version
    const csvFilename = `T04_WHBal_Export_${timestamp}.csv`;
    const csvFilepath = path.join(exportsDir, csvFilename);
    XLSX.writeFile(wb, csvFilepath);
    
    console.log(`📄 CSV file also created: ${csvFilepath}`);
    
    return {
      excelFile: filepath,
      csvFile: csvFilepath,
      recordCount: data.length,
      columnCount: Object.keys(data[0] || {}).length
    };
    
  } catch (error) {
    console.error('❌ Error exporting T04 data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  exportT04ToExcel().then((result) => {
    console.log('\n✅ Export completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  });
}

module.exports = { exportT04ToExcel }; 