const { query } = require('./config/database');

async function checkSkuMatching() {
  try {
    console.log('📊 Checking SKU code matching between demand data and Item-master NFC...');
    
    // Get SKU codes from demand data
    const demandSkus = await query(`
      SELECT DISTINCT cell_value
      FROM demand_cursor dc
      WHERE dc.column_name = 'Code' 
        AND dc.cell_value IS NOT NULL 
        AND dc.cell_value != ''
        AND dc.cell_value != 'Code'
      ORDER BY cell_value
    `);
    
    console.log(`Found ${demandSkus.rows.length} unique SKU codes in demand data:`);
    demandSkus.rows.forEach(row => {
      console.log(`  "${row.cell_value}"`);
    });
    
    // Get Item Code and Unit Weight from Item-master NFC
    const itemMasterData = await query(`
      SELECT 
        sd.row_index,
        sd.column_index,
        sd.cell_value
      FROM sheet_data sd
      JOIN worksheets ws ON sd.worksheet_id = ws.id
      JOIN workbooks w ON ws.workbook_id = w.id
      WHERE w.workbook_name = 'Item_master_NFC' 
        AND ws.sheet_name = 'Sheet1'
        AND sd.column_index IN (4, 12) -- Item Code (4) and Unit Weight (12)
      ORDER BY sd.row_index, sd.column_index
    `);
    
    // Group by row to find Item Code -> Unit Weight mappings
    const itemCodeToWeight = new Map();
    const rowsByIndex = {};
    
    for (const cell of itemMasterData.rows) {
      if (!rowsByIndex[cell.row_index]) {
        rowsByIndex[cell.row_index] = {};
      }
      rowsByIndex[cell.row_index][cell.column_index] = cell.cell_value;
    }
    
    // Create mapping for rows that have both Item Code and Unit Weight
    for (const [rowIndex, rowData] of Object.entries(rowsByIndex)) {
      const rowNum = parseInt(rowIndex);
      if (rowNum <= 0) continue; // Skip header
      
      const itemCode = rowData[4]; // Item Code column
      const unitWeight = rowData[12]; // Unit Weight column
      
      if (itemCode && unitWeight) {
        const weight = parseFloat(unitWeight);
        if (!isNaN(weight)) {
          itemCodeToWeight.set(itemCode.toString().trim(), weight);
        }
      }
    }
    
    console.log(`\n📊 Found ${itemCodeToWeight.size} Item Code -> Unit Weight mappings in Item-master NFC`);
    
    // Check for matches
    console.log('\n🔍 Checking for matches between demand SKUs and Item-master NFC:');
    let matchCount = 0;
    for (const demandSku of demandSkus.rows) {
      const sku = demandSku.cell_value.trim();
      const weight = itemCodeToWeight.get(sku);
      
      if (weight !== undefined) {
        console.log(`✅ MATCH: "${sku}" -> Unit Weight: ${weight}`);
        matchCount++;
      } else {
        console.log(`❌ NO MATCH: "${sku}"`);
      }
    }
    
    console.log(`\n📈 Summary: ${matchCount} out of ${demandSkus.rows.length} demand SKUs found in Item-master NFC`);
    
    // Show some sample mappings from Item-master NFC
    console.log('\n📋 Sample Item Code -> Unit Weight mappings from Item-master NFC:');
    let count = 0;
    for (const [itemCode, weight] of itemCodeToWeight) {
      if (count < 10) {
        console.log(`  "${itemCode}" -> ${weight}`);
        count++;
      } else {
        break;
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkSkuMatching(); 