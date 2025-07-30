const { query } = require('./config/database');

async function checkDemandData() {
  try {
    console.log('📊 Checking demand cursor data...');
    
    const result = await query(`
      SELECT 
        dc.row_index,
        dc.column_index,
        dc.cell_value,
        dc.column_name,
        w.workbook_name,
        ws.sheet_name
      FROM demand_cursor dc
      JOIN workbooks w ON dc.workbook_id = w.id
      JOIN worksheets ws ON dc.worksheet_id = ws.id
      ORDER BY dc.row_index, dc.column_index
      LIMIT 20
    `);
    
    console.log('Found demand cursor data:');
    result.rows.forEach(row => {
      console.log(`  Row ${row.row_index}, Col ${row.column_index}: "${row.cell_value}" (${row.column_name})`);
    });
    
    console.log('\n📊 Checking demand country master data...');
    const cmResult = await query(`
      SELECT 
        dcmc.row_index,
        dcmc.column_index,
        dcmc.cell_value,
        dcmc.column_name
      FROM demand_country_master_cursor dcmc
      ORDER BY dcmc.row_index, dcmc.column_index
      LIMIT 20
    `);
    
    console.log('Found demand country master data:');
    cmResult.rows.forEach(row => {
      console.log(`  Row ${row.row_index}, Col ${row.column_index}: "${row.cell_value}" (${row.column_name})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkDemandData(); 