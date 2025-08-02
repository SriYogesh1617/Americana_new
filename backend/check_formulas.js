const XLSX = require('xlsx');
const path = require('path');

function checkT04Formulas() {
  try {
    console.log('🧮 Analyzing T04 Excel formulas...');
    console.log('=' .repeat(60));
    
    // Read the Excel file with formulas
    const filePath = path.join(__dirname, '..', 'samples', 'T04.xlsx');
    const workbook = XLSX.readFile(filePath, { cellFormula: true });
    const worksheet = workbook.Sheets['Sheet4'];
    
    if (!worksheet['!ref']) {
      throw new Error('Empty worksheet');
    }
    
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Get headers from row 3
    const headers = [];
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: col });
      const cell = worksheet[cellAddress];
      headers[col] = cell ? cell.v : `Column_${XLSX.utils.encode_col(col)}`;
    }
    
    console.log('📋 Headers:', headers.slice(0, 15), '...\n');
    
    // Find formulas in the first few data rows
    const formulas = [];
    let formulaCount = 0;
    
    for (let row = 3; row <= Math.min(10, range.e.r) && formulaCount < 20; row++) {
      for (let col = 0; col <= range.e.c && formulaCount < 20; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell && cell.f) {
          const colLetter = XLSX.utils.encode_col(col);
          const headerName = headers[col] || `Column_${colLetter}`;
          
          formulas.push({
            address: cellAddress,
            column: colLetter,
            header: headerName,
            formula: cell.f,
            value: cell.v
          });
          
          console.log(`${cellAddress} (${headerName}): =${cell.f} = ${cell.v}`);
          formulaCount++;
        }
      }
    }
    
    console.log(`\n📊 Analysis Summary:`);
    console.log(`Total formulas found: ${formulas.length}`);
    
    // Categorize formulas
    const categories = {
      selfReference: [],
      crossSheet: [],
      calculations: [],
      other: []
    };
    
    formulas.forEach(f => {
      if (f.formula.includes('!')) {
        categories.crossSheet.push(f);
      } else if (f.formula.match(/[A-Z]+\d+/)) {
        categories.selfReference.push(f);
      } else if (f.formula.match(/[+\-*/]/)) {
        categories.calculations.push(f);
      } else {
        categories.other.push(f);
      }
    });
    
    console.log(`\n🔗 Formula Categories:`);
    console.log(`Cross-sheet references: ${categories.crossSheet.length}`);
    console.log(`Self-references: ${categories.selfReference.length}`);
    console.log(`Calculations: ${categories.calculations.length}`);
    console.log(`Other: ${categories.other.length}`);
    
    if (categories.crossSheet.length > 0) {
      console.log(`\n🔍 Cross-sheet formulas (these are causing 0 values):`);
      categories.crossSheet.slice(0, 5).forEach(f => {
        console.log(`  ${f.header}: =${f.formula}`);
      });
    }
    
    if (categories.selfReference.length > 0) {
      console.log(`\n✅ Self-reference formulas (these can be calculated):`);
      categories.selfReference.slice(0, 5).forEach(f => {
        console.log(`  ${f.header}: =${f.formula}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error analyzing formulas:', error);
  }
}

checkT04Formulas(); 