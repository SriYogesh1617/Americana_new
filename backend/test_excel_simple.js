const ExcelJS = require('exceljs');
const fs = require('fs');

async function testExcelGeneration() {
  try {
    console.log('🧪 Testing Excel generation...');
    
    // Create a simple workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test Data');
    
    // Add simple headers
    worksheet.addRow(['Name', 'Age', 'City']);
    
    // Add some test data
    worksheet.addRow(['John', 25, 'New York']);
    worksheet.addRow(['Jane', 30, 'London']);
    worksheet.addRow(['Bob', 35, 'Paris']);
    
    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    // Write to file
    const filename = 'test_simple.xlsx';
    await workbook.xlsx.writeFile(filename);
    
    console.log(`✅ Simple Excel file created: ${filename}`);
    console.log(`File size: ${fs.statSync(filename).size} bytes`);
    
    // Test with T03-like data
    const workbook2 = new ExcelJS.Workbook();
    const worksheet2 = workbook2.addWorksheet('T03 Test');
    
    // T03 headers
    const headers = [
      'WH', 'PLT', 'FGSKU Code', 'Month', 'Cost Per Unit', 
      'Custom Cost/Unit', 'Max Qty', 'FG Wt Per Unit', 'Qty', 
      'Wt', 'Custom Duty', 'Pos Check', 'Qty≤Max', 'Row Cost'
    ];
    
    worksheet2.addRow(headers);
    
    // Add test T03 data
    worksheet2.addRow([
      'GFCM', 'GFC', '4001100156', 5, 1.66, 0.52, 10000000000, 0.5, 0, 0, 0, 'TRUE', 'TRUE', 0
    ]);
    
    // Style headers
    const headerRow2 = worksheet2.getRow(1);
    headerRow2.font = { bold: true };
    headerRow2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Auto-fit columns
    worksheet2.columns.forEach(column => {
      column.width = 15;
    });
    
    // Add borders
    worksheet2.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // Write to file
    const filename2 = 'test_t03_like.xlsx';
    await workbook2.xlsx.writeFile(filename2);
    
    console.log(`✅ T03-like Excel file created: ${filename2}`);
    console.log(`File size: ${fs.statSync(filename2).size} bytes`);
    
  } catch (error) {
    console.error('❌ Error creating Excel file:', error);
  }
}

testExcelGeneration(); 