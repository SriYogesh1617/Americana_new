const { query } = require('./config/database');

async function checkItemMasterData() {
  try {
    console.log('📊 Checking available workbooks...');
    
    const workbooksResult = await query(`
      SELECT id, workbook_name, created_at 
      FROM workbooks 
      ORDER BY created_at DESC
    `);
    
    console.log('Found workbooks:');
    workbooksResult.rows.forEach(wb => {
      console.log(`  - ${wb.workbook_name} (ID: ${wb.id})`);
    });
    
    console.log('\n📊 Checking worksheets...');
    const worksheetsResult = await query(`
      SELECT ws.id, ws.sheet_name, w.workbook_name, ws.created_at
      FROM worksheets ws
      JOIN workbooks w ON ws.workbook_id = w.id
      ORDER BY w.workbook_name, ws.sheet_name
    `);
    
    console.log('Found worksheets:');
    worksheetsResult.rows.forEach(ws => {
      console.log(`  - ${ws.workbook_name} > ${ws.sheet_name}`);
    });
    
    console.log('\n📊 Checking for Item-master related data...');
    const itemMasterResult = await query(`
      SELECT 
        w.workbook_name,
        ws.sheet_name,
        COUNT(sd.id) as cell_count
      FROM workbooks w
      JOIN worksheets ws ON w.id = ws.workbook_id
      JOIN sheet_data sd ON ws.id = sd.worksheet_id
      WHERE w.workbook_name ILIKE '%item%' 
         OR w.workbook_name ILIKE '%master%'
         OR ws.sheet_name ILIKE '%item%'
         OR ws.sheet_name ILIKE '%master%'
         OR ws.sheet_name ILIKE '%nfc%'
      GROUP BY w.workbook_name, ws.sheet_name
      ORDER BY w.workbook_name, ws.sheet_name
    `);
    
    console.log('Found Item-master related data:');
    itemMasterResult.rows.forEach(row => {
      console.log(`  - ${row.workbook_name} > ${row.sheet_name} (${row.cell_count} cells)`);
    });

    console.log('\n📊 Checking for any data with "weight" in column names...');
    const weightColumnsResult = await query(`
      SELECT DISTINCT
        w.workbook_name,
        ws.sheet_name,
        sd.column_name
      FROM workbooks w
      JOIN worksheets ws ON w.id = ws.workbook_id
      JOIN sheet_data sd ON ws.id = sd.worksheet_id
      WHERE sd.column_name ILIKE '%weight%'
         OR sd.column_name ILIKE '%wt%'
      ORDER BY w.workbook_name, ws.sheet_name, sd.column_name
    `);
    
    console.log('Found weight-related columns:');
    weightColumnsResult.rows.forEach(row => {
      console.log(`  - ${row.workbook_name} > ${row.sheet_name} > ${row.column_name}`);
    });

    console.log('\n📊 Checking for any data with "item" or "sku" in column names...');
    const itemColumnsResult = await query(`
      SELECT DISTINCT
        w.workbook_name,
        ws.sheet_name,
        sd.column_name
      FROM workbooks w
      JOIN worksheets ws ON w.id = ws.workbook_id
      JOIN sheet_data sd ON ws.id = sd.worksheet_id
      WHERE sd.column_name ILIKE '%item%'
         OR sd.column_name ILIKE '%sku%'
         OR sd.column_name ILIKE '%code%'
      ORDER BY w.workbook_name, ws.sheet_name, sd.column_name
    `);
    
    console.log('Found item/SKU-related columns:');
    itemColumnsResult.rows.forEach(row => {
      console.log(`  - ${row.workbook_name} > ${row.sheet_name} > ${row.column_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkItemMasterData(); 