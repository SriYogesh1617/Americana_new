const { query } = require('./config/database');

async function checkItemMasterNFCData() {
  try {
    console.log('📊 Checking actual Item-master NFC data...');
    
    // Get the Item_master_NFC workbook and Sheet1
    const result = await query(`
      SELECT 
        sd.row_index,
        sd.column_index,
        sd.cell_value,
        sd.column_name
      FROM sheet_data sd
      JOIN worksheets ws ON sd.worksheet_id = ws.id
      JOIN workbooks w ON ws.workbook_id = w.id
      WHERE w.workbook_name = 'Item_master_NFC' 
        AND ws.sheet_name = 'Sheet1'
        AND sd.column_name IS NOT NULL
      ORDER BY sd.row_index, sd.column_index
      LIMIT 100
    `);
    
    console.log(`Found ${result.rows.length} Item-master NFC records`);
    
    // Group by row to see the structure
    const rowsByIndex = {};
    for (const cell of result.rows) {
      if (!rowsByIndex[cell.row_index]) {
        rowsByIndex[cell.row_index] = {};
      }
      rowsByIndex[cell.row_index][cell.column_index] = cell.cell_value;
      if (cell.column_name) {
        rowsByIndex[cell.row_index][`col_${cell.column_name}`] = cell.cell_value;
      }
    }
    
    console.log('\n📋 First few rows of Item-master NFC data:');
    for (let i = 0; i <= 5; i++) {
      if (rowsByIndex[i]) {
        console.log(`Row ${i}:`, rowsByIndex[i]);
      }
    }
    
    // Find Item Code and Unit Weight columns
    console.log('\n🔍 Looking for Item Code and Unit Weight columns...');
    const headerRow = rowsByIndex[0] || {};
    
    let itemCodeColumn = null;
    let unitWeightColumn = null;
    
    for (const [colIndex, value] of Object.entries(headerRow)) {
      if (typeof colIndex === 'string' && colIndex.startsWith('col_')) continue;
      
      const cellValue = String(value).toLowerCase();
      if (cellValue.includes('item code') || cellValue.includes('item') || cellValue.includes('sku') || cellValue.includes('code')) {
        itemCodeColumn = parseInt(colIndex);
        console.log(`Found Item Code column at index ${itemCodeColumn}: "${value}"`);
      }
      if (cellValue.includes('unit weight') || cellValue.includes('weight') || cellValue.includes('wt')) {
        unitWeightColumn = parseInt(colIndex);
        console.log(`Found Unit Weight column at index ${unitWeightColumn}: "${value}"`);
      }
    }
    
    if (itemCodeColumn !== null && unitWeightColumn !== null) {
      console.log('\n📊 Sample Item Code -> Unit Weight mappings:');
      let count = 0;
      for (const [rowIndex, rowData] of Object.entries(rowsByIndex)) {
        const rowNum = parseInt(rowIndex);
        if (rowNum <= 0) continue; // Skip header
        
        const itemCode = rowData[itemCodeColumn];
        const unitWeight = rowData[unitWeightColumn];
        
        if (itemCode && unitWeight && count < 10) {
          console.log(`  "${itemCode}" -> ${unitWeight}`);
          count++;
        }
      }
    }
    
    // Check what SKU codes are in the demand data
    console.log('\n📊 Checking what SKU codes are in demand data...');
    const demandSkus = await query(`
      SELECT DISTINCT cell_value
      FROM demand_cursor dc
      WHERE dc.column_name = 'Code' 
        AND dc.cell_value IS NOT NULL 
        AND dc.cell_value != ''
      ORDER BY cell_value
      LIMIT 20
    `);
    
    console.log('SKU codes in demand data:');
    demandSkus.rows.forEach(row => {
      console.log(`  "${row.cell_value}"`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkItemMasterNFCData(); 