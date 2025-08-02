const XLSX = require('xlsx');
const path = require('path');
const { query } = require('./config/database');

async function extractFormulasToDatabase() {
  try {
    console.log('📊 Extracting formulas from T04.xlsx...');
    
    // Read the Excel file with formulas
    const filePath = path.join(__dirname, '..', 'samples', 'T04.xlsx');
    const workbook = XLSX.readFile(filePath, { cellFormula: true, cellDates: true });
    const worksheet = workbook.Sheets['Sheet4'];
    
    if (!worksheet['!ref']) {
      throw new Error('Empty worksheet');
    }
    
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Get headers from row 3 (index 2)
    const headers = [];
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 2, c: col });
      const cell = worksheet[cellAddress];
      headers[col] = cell ? cell.v : `Column_${XLSX.utils.encode_col(col)}`;
    }
    
    console.log('📋 Headers found:', headers.slice(0, 10), '...');
    
    // First, add formula columns to the table if they don't exist
    console.log('🔧 Adding formula columns to database...');
    
    try {
      await query(`
        ALTER TABLE t04_whbal 
        ADD COLUMN IF NOT EXISTS os_gfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS in_gfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS out_gfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS cs_gfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS os_kfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS in_kfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS out_kfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS cs_kfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS os_nfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS in_nfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS out_nfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS cs_nfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS os_x_formula TEXT,
        ADD COLUMN IF NOT EXISTS in_x_formula TEXT,
        ADD COLUMN IF NOT EXISTS out_x_formula TEXT,
        ADD COLUMN IF NOT EXISTS cs_x_formula TEXT,
        ADD COLUMN IF NOT EXISTS os_tot_formula TEXT,
        ADD COLUMN IF NOT EXISTS in_tot_formula TEXT,
        ADD COLUMN IF NOT EXISTS out_tot_formula TEXT,
        ADD COLUMN IF NOT EXISTS cs_tot_formula TEXT,
        ADD COLUMN IF NOT EXISTS storage_cost_formula TEXT,
        ADD COLUMN IF NOT EXISTS storage_cost_v2_formula TEXT,
        ADD COLUMN IF NOT EXISTS avg_stock_formula TEXT,
        ADD COLUMN IF NOT EXISTS cs_wt_gfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS cs_wt_kfc_formula TEXT,
        ADD COLUMN IF NOT EXISTS cs_wt_nfc_formula TEXT;
      `);
      console.log('✅ Formula columns added');
    } catch (error) {
      console.log('ℹ️ Formula columns may already exist');
    }
    
    // Create a mapping of column headers to formula column names
    const formulaColumnMapping = {
      'OS_GFC': 'os_gfc_formula',
      'In_GFC': 'in_gfc_formula', 
      'Out_GFC': 'out_gfc_formula',
      'CS_GFC': 'cs_gfc_formula',
      'OS_KFC': 'os_kfc_formula',
      'In_KFC': 'in_kfc_formula',
      'Out_KFC': 'out_kfc_formula', 
      'CS_KFC': 'cs_kfc_formula',
      'OS_NFC': 'os_nfc_formula',
      'In_NFC': 'in_nfc_formula',
      'Out_NFC': 'out_nfc_formula',
      'CS_NFC': 'cs_nfc_formula',
      'OS_X': 'os_x_formula',
      'In_X': 'in_x_formula',
      'Out_X': 'out_x_formula',
      'CS_X': 'cs_x_formula',
      'OS_Tot': 'os_tot_formula',
      'In_Tot': 'in_tot_formula',
      'Out_Tot': 'out_tot_formula',
      'CS_Tot': 'cs_tot_formula',
      'CSWt_GFC': 'cs_wt_gfc_formula',
      'CSWt_KFC': 'cs_wt_kfc_formula',
      'CSWt_NFC': 'cs_wt_nfc_formula'
    };
    
    // Process each row and extract formulas
    console.log('📄 Processing formulas from Excel rows...');
    
    let processedRows = 0;
    const batchSize = 50;
    
    for (let row = 3; row <= Math.min(range.e.r, 1000); row += batchSize) {
      const endRow = Math.min(row + batchSize - 1, range.e.r);
      
      // Process batch of rows
      for (let currentRow = row; currentRow <= endRow; currentRow++) {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        // Find the corresponding database record by SKU, WH, and Month
        let skuCode = null, wh = null, mthNum = null;
        
        // Get identifying data first
        for (let col = 0; col <= range.e.c; col++) {
          const header = headers[col];
          const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell) {
            if (header === 'FGSKUCode') skuCode = cell.v;
            if (header === 'WH') wh = cell.v;
            if (header === 'MthNum') mthNum = cell.v;
          }
        }
        
        if (!skuCode || !wh || !mthNum) continue;
        
        // Now extract formulas for this row
        for (let col = 0; col <= range.e.c; col++) {
          const header = headers[col];
          const formulaColumn = formulaColumnMapping[header];
          
          if (formulaColumn) {
            const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
            const cell = worksheet[cellAddress];
            
            if (cell && cell.f) {
              updates.push(`${formulaColumn} = $${paramIndex}`);
              values.push(`=${cell.f}`);
              paramIndex++;
            }
          }
        }
        
        // Update the database record if we have formulas
        if (updates.length > 0) {
          const updateQuery = `
            UPDATE t04_whbal 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE fg_sku_code = $${paramIndex} 
            AND wh = $${paramIndex + 1} 
            AND mth_num = $${paramIndex + 2};
          `;
          
          values.push(skuCode.toString(), wh, mthNum);
          
          try {
            await query(updateQuery, values);
            processedRows++;
          } catch (error) {
            console.error(`Error updating row ${currentRow}:`, error.message);
          }
        }
      }
      
      if (processedRows % 100 === 0) {
        console.log(`📊 Processed ${processedRows} rows with formulas...`);
      }
    }
    
    console.log(`✅ Formula extraction completed!`);
    console.log(`📊 Processed ${processedRows} rows with formulas`);
    
    // Show sample of extracted formulas
    const sampleResult = await query(`
      SELECT id, fg_sku_code, wh, mth_num,
             os_gfc_formula, out_gfc_formula, cs_gfc_formula,
             in_tot_formula, storage_cost_v2_formula
      FROM t04_whbal 
      WHERE os_gfc_formula IS NOT NULL 
      OR out_gfc_formula IS NOT NULL
      ORDER BY id 
      LIMIT 5;
    `);
    
    console.log('\n📄 Sample extracted formulas:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.fg_sku_code} (${row.wh}, M${row.mth_num}):`);
      if (row.os_gfc_formula) console.log(`   OS_GFC: ${row.os_gfc_formula}`);
      if (row.out_gfc_formula) console.log(`   OUT_GFC: ${row.out_gfc_formula}`);
      if (row.cs_gfc_formula) console.log(`   CS_GFC: ${row.cs_gfc_formula}`);
      console.log('');
    });
    
    return { processedRows, sampleFormulas: sampleResult.rows };
    
  } catch (error) {
    console.error('❌ Error extracting formulas:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  extractFormulasToDatabase().then((result) => {
    console.log('\n✅ Formula extraction completed successfully');
    console.log(`📊 Rows with formulas: ${result.processedRows}`);
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Formula extraction failed:', error);
    process.exit(1);
  });
}

module.exports = { extractFormulasToDatabase }; 