const XLSX = require('xlsx');
const path = require('path');

function examineT04Layout() {
  try {
    console.log('🔍 Examining T04.xlsx layout to find headers...');
    
    const filePath = path.join(__dirname, '..', 'samples', 'T04.xlsx');
    const workbook = XLSX.readFile(filePath, { cellFormula: true });
    const worksheet = workbook.Sheets['Sheet4'];
    
    if (!worksheet['!ref']) {
      throw new Error('Empty worksheet');
    }
    
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(`Worksheet range: ${worksheet['!ref']}`);
    
    // Examine first 10 rows to find headers
    console.log('\n📋 First 10 rows analysis:');
    console.log('=' .repeat(100));
    
    for (let row = 0; row < Math.min(10, range.e.r + 1); row++) {
      console.log(`\nRow ${row + 1}:`);
      
      const rowCells = [];
      for (let col = 0; col < Math.min(20, range.e.c + 1); col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          let cellDisplay = cell.v;
          if (cell.f) {
            cellDisplay = `=${cell.f}`;
          }
          
          rowCells.push(`${XLSX.utils.encode_col(col)}: ${cellDisplay}`);
        } else {
          rowCells.push(`${XLSX.utils.encode_col(col)}: [empty]`);
        }
      }
      
      console.log(`  ${rowCells.slice(0, 6).join(' | ')}`);
      if (rowCells.length > 6) {
        console.log(`  ${rowCells.slice(6, 12).join(' | ')}`);
      }
      if (rowCells.length > 12) {
        console.log(`  ${rowCells.slice(12, 18).join(' | ')}`);
      }
    }
    
    // Look for rows that might contain headers (text-heavy rows)
    console.log('\n🔍 Looking for potential header rows:');
    console.log('-' .repeat(60));
    
    for (let row = 0; row < Math.min(20, range.e.r + 1); row++) {
      let textCells = 0;
      let totalCells = 0;
      const sampleCells = [];
      
      for (let col = 0; col < Math.min(10, range.e.c + 1); col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          totalCells++;
          if (typeof cell.v === 'string' && cell.v.length > 2) {
            textCells++;
          }
          if (col < 5) {
            sampleCells.push(cell.v);
          }
        }
      }
      
      const textRatio = totalCells > 0 ? textCells / totalCells : 0;
      
      if (textRatio > 0.5 || textCells > 3) {
        console.log(`Row ${row + 1}: ${textCells}/${totalCells} text cells (${(textRatio * 100).toFixed(1)}%) - Sample: [${sampleCells.join(', ')}]`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error examining T04 layout:', error);
  }
}

examineT04Layout(); 