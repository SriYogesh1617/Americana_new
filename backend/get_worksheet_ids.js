const { query } = require('./config/database');

async function getWorksheetIds() {
  try {
    console.log('📊 Getting worksheet IDs...');
    
    const result = await query(`
      SELECT 
        w.id as workbook_id,
        w.workbook_name,
        ws.id as worksheet_id,
        ws.sheet_name
      FROM workbooks w
      JOIN worksheets ws ON w.id = ws.workbook_id
      WHERE w.workbook_name LIKE '%Sample%'
      ORDER BY w.workbook_name, ws.sheet_name
    `);
    
    console.log('Found worksheets:');
    result.rows.forEach(row => {
      console.log(`  ${row.workbook_name} > ${row.sheet_name}: ${row.worksheet_id}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

getWorksheetIds(); 