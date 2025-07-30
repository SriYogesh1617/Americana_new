const { query } = require('./config/database');

async function checkRealDemandData() {
  try {
    console.log('📊 Checking for real demand data...');
    
    // Check if there's any real demand data (not sample data)
    const result = await query(`
      SELECT DISTINCT dc.upload_batch_id, w.workbook_name, COUNT(dc.id) as record_count
      FROM demand_cursor dc
      JOIN workbooks w ON dc.workbook_id = w.id
      WHERE w.workbook_name NOT LIKE '%Sample%'
      GROUP BY dc.upload_batch_id, w.workbook_name
      ORDER BY record_count DESC
      LIMIT 5
    `);
    
    console.log('Real demand data found:');
    result.rows.forEach(row => {
      console.log(`  Upload Batch: ${row.upload_batch_id}`);
      console.log(`  Workbook: ${row.workbook_name}`);
      console.log(`  Records: ${row.record_count}`);
      console.log('');
    });
    
    // Also check for any demand data with the real SKU codes
    const realSkus = await query(`
      SELECT DISTINCT dc.upload_batch_id, dc.cell_value as sku_code
      FROM demand_cursor dc
      WHERE dc.column_name = 'Code' 
        AND dc.cell_value IN ('4001370340', '4001370861')
      ORDER BY dc.upload_batch_id
    `);
    
    console.log('Demand data with real SKU codes:');
    realSkus.rows.forEach(row => {
      console.log(`  Upload Batch: ${row.upload_batch_id}, SKU: ${row.sku_code}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkRealDemandData(); 