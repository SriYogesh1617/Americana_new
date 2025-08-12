const T03Controller = require('./controllers/t03Controller');

async function regenerateT03() {
  try {
    console.log('🔄 Regenerating T03 data with corrected cost calculation...');
    
    const uploadBatchId = 'c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7';
    
    // Regenerate T03 data with optimized approach
    const result = await T03Controller.generateT03Data();
    
    if (result && result.totalRecords) {
      console.log(`✅ Successfully regenerated ${result.totalRecords} T03 records`);
      
      // Check the results
      const { query } = require('./config/database');
      const checkResult = await query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN cost_per_unit > 0 THEN 1 END) as records_with_cost,
          COUNT(CASE WHEN cost_per_unit = 0 THEN 1 END) as records_with_zero_cost,
          AVG(cost_per_unit) as avg_cost,
          MAX(cost_per_unit) as max_cost
        FROM t03_primdist 
        WHERE upload_batch_id = $1
      `, [uploadBatchId]);
      
      const stats = checkResult.rows[0];
      console.log('\n📊 T03 Data Statistics:');
      console.log(`Total records: ${stats.total_records}`);
      console.log(`Records with cost > 0: ${stats.records_with_cost}`);
      console.log(`Records with cost = 0: ${stats.records_with_zero_cost}`);
      console.log(`Average cost: ${parseFloat(stats.avg_cost).toFixed(4)}`);
      console.log(`Maximum cost: ${parseFloat(stats.max_cost).toFixed(4)}`);
      
      // Show some sample records with non-zero costs
      const sampleResult = await query(`
        SELECT wh, cty, fgsku_code, cost_per_unit, custom_cost_per_unit 
        FROM t03_primdist 
        WHERE upload_batch_id = $1 AND cost_per_unit > 0 
        LIMIT 10
      `, [uploadBatchId]);
      
      if (sampleResult.rows.length > 0) {
        console.log('\n📋 Sample records with non-zero costs:');
        sampleResult.rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.wh} -> ${row.cty} (${row.fgsku_code}): ${row.cost_per_unit.toFixed(4)}`);
        });
      }
      
    } else {
      console.log('❌ Failed to regenerate T03 data:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error regenerating T03 data:', error);
  }
}

regenerateT03(); 