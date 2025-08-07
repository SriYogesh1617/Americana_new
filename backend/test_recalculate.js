const { query } = require('./config/database');
const T03Data = require('./models/T03Data');

async function testRecalculate() {
  try {
    console.log('🧪 Testing T03 Recalculate Functionality...\n');
    
    // Get a sample upload batch ID
    const batchResult = await query(`
      SELECT DISTINCT upload_batch_id 
      FROM t03_primdist 
      WHERE upload_batch_id IS NOT NULL 
      LIMIT 1
    `);
    
    if (batchResult.rows.length === 0) {
      console.log('❌ No upload batches found to test with');
      return;
    }
    
    const uploadBatchId = batchResult.rows[0].upload_batch_id;
    console.log(`📊 Testing with upload batch: ${uploadBatchId}`);
    
    // Check current state
    console.log('\n🔍 Current state before recalculate:');
    const beforeResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN cost_per_unit > 0 THEN 1 END) as records_with_cost,
        COUNT(CASE WHEN cost_per_unit = 0 THEN 1 END) as records_with_zero_cost,
        COUNT(CASE WHEN cost_per_unit = 0 AND NOT (wh = 'X' OR (wh = 'GFCM' AND plt = 'GFC') OR (wh = 'KFCM' AND plt = 'KFC') OR (wh = 'NFCM' AND plt = 'NFC')) THEN 1 END) as incorrect_zero_records
      FROM t03_primdist 
      WHERE upload_batch_id = $1
    `, [uploadBatchId]);
    
    const before = beforeResult.rows[0];
    console.log(`Total records: ${before.total_records}`);
    console.log(`Records with cost > 0: ${before.records_with_cost}`);
    console.log(`Records with cost = 0: ${before.records_with_zero_cost}`);
    console.log(`Incorrect 0 cost records: ${before.incorrect_zero_records}`);
    
    // Run the recalculate
    console.log('\n🔄 Running recalculate...');
    const customCostUpdated = await T03Data.updateCustomCostPerUnit(uploadBatchId);
    const maxQtyUpdated = await T03Data.updateMaxQuantity(uploadBatchId);
    const costPerUnitUpdated = await T03Data.updateCostPerUnit(uploadBatchId);
    const calculatedFieldsUpdated = await T03Data.updateCalculatedFieldsWithFormulas(uploadBatchId);
    
    console.log(`✅ Custom cost updated: ${customCostUpdated} records`);
    console.log(`✅ Max quantity updated: ${maxQtyUpdated} records`);
    console.log(`✅ Cost per unit updated: ${costPerUnitUpdated} records`);
    console.log(`✅ Calculated fields updated: ${calculatedFieldsUpdated} records`);
    
    // Check state after recalculate
    console.log('\n🔍 State after recalculate:');
    const afterResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN cost_per_unit > 0 THEN 1 END) as records_with_cost,
        COUNT(CASE WHEN cost_per_unit = 0 THEN 1 END) as records_with_zero_cost,
        COUNT(CASE WHEN cost_per_unit = 0 AND NOT (wh = 'X' OR (wh = 'GFCM' AND plt = 'GFC') OR (wh = 'KFCM' AND plt = 'KFC') OR (wh = 'NFCM' AND plt = 'NFC')) THEN 1 END) as incorrect_zero_records
      FROM t03_primdist 
      WHERE upload_batch_id = $1
    `, [uploadBatchId]);
    
    const after = afterResult.rows[0];
    console.log(`Total records: ${after.total_records}`);
    console.log(`Records with cost > 0: ${after.records_with_cost}`);
    console.log(`Records with cost = 0: ${after.records_with_zero_cost}`);
    console.log(`Incorrect 0 cost records: ${after.incorrect_zero_records}`);
    
    // Check specific combinations
    console.log('\n🔍 Checking specific combinations:');
    const combinationsResult = await query(`
      SELECT wh, plt, cty, COUNT(*) as count, AVG(cost_per_unit) as avg_cost
      FROM t03_primdist 
      WHERE upload_batch_id = $1 AND ((wh = 'GFCM' AND plt = 'NFC') OR (wh = 'NFCM' AND plt = 'GFC'))
      GROUP BY wh, plt, cty
      ORDER BY wh, plt, cty
    `, [uploadBatchId]);
    
    combinationsResult.rows.forEach(row => {
      console.log(`  ${row.wh} -> ${row.plt} (${row.cty}): ${row.count} records, Avg cost: ${parseFloat(row.avg_cost).toFixed(4)}`);
    });
    
    if (after.incorrect_zero_records === 0) {
      console.log('\n🎉 SUCCESS: Recalculate functionality is working correctly!');
    } else {
      console.log('\n❌ ISSUE: Still have incorrect 0 cost records after recalculate');
    }
    
  } catch (error) {
    console.error('❌ Error testing recalculate:', error);
  }
}

testRecalculate()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }); 