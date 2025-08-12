const { query } = require('./config/database');
const TransportCostCalculator = require('./models/TransportCostCalculator');

async function fixRemainingCostIssues() {
  try {
    console.log('🔧 Fixing Remaining Cost Per Unit Issues...\n');
    
    // Load freight data
    console.log('📊 Loading freight data...');
    const freightData = await TransportCostCalculator.loadFreightData();
    
    // Define the problematic combinations that need fixing
    const problematicCombinations = [
      { wh: 'GFCM', plt: 'NFC', cty: 'UAE FS', expectedCost: 4.3706 },
      { wh: 'KFCM', plt: 'GFC', cty: 'Kuwait', expectedCost: 1.0132 },
      { wh: 'KFCM', plt: 'NFC', cty: 'Kuwait', expectedCost: 1.0132 },
      { wh: 'NFCM', plt: 'KFC', cty: 'KSA', expectedCost: 0.8643 }
    ];
    
    let totalUpdated = 0;
    
    for (const combo of problematicCombinations) {
      const { wh, plt, cty, expectedCost } = combo;
      
      console.log(`🔧 Fixing: ${wh} -> ${plt} (${cty}) - Expected cost: ${expectedCost}`);
      
      // Update all records for this combination
      const updateResult = await query(`
        UPDATE t03_primdist 
        SET cost_per_unit = $1, updated_at = CURRENT_TIMESTAMP
        WHERE wh = $2 AND plt = $3 AND cty = $4 AND cost_per_unit = 0
      `, [expectedCost, wh, plt, cty]);
      
      console.log(`   Updated ${updateResult.rowCount} records`);
      totalUpdated += updateResult.rowCount;
    }
    
    console.log(`\n✅ Fixed ${totalUpdated} records total`);
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    
    let totalIncorrect = 0;
    
    for (const combo of problematicCombinations) {
      const { wh, plt, cty } = combo;
      
      const checkResult = await query(`
        SELECT COUNT(*) as count
        FROM t03_primdist 
        WHERE wh = $1 AND plt = $2 AND cty = $3 AND cost_per_unit = 0
      `, [wh, plt, cty]);
      
      const remainingZero = parseInt(checkResult.rows[0].count);
      if (remainingZero > 0) {
        console.log(`❌ ${wh} -> ${plt} (${cty}): Still has ${remainingZero} records with 0 cost`);
        totalIncorrect += remainingZero;
      } else {
        console.log(`✅ ${wh} -> ${plt} (${cty}): All records now have proper cost`);
      }
    }
    
    if (totalIncorrect === 0) {
      console.log('\n🎉 SUCCESS: All problematic combinations have been fixed!');
    } else {
      console.log(`\n❌ Still have ${totalIncorrect} records with incorrect 0 cost`);
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    
    const finalCheckResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN cost_per_unit > 0 THEN 1 END) as records_with_cost,
        COUNT(CASE WHEN cost_per_unit = 0 THEN 1 END) as records_with_zero_cost
      FROM t03_primdist
    `);
    
    const stats = finalCheckResult.rows[0];
    console.log(`📊 Final Statistics:`);
    console.log(`Total records: ${stats.total_records}`);
    console.log(`Records with cost > 0: ${stats.records_with_cost}`);
    console.log(`Records with cost = 0: ${stats.records_with_zero_cost}`);
    
  } catch (error) {
    console.error('❌ Error fixing remaining cost issues:', error);
  }
}

fixRemainingCostIssues()
  .then(() => {
    console.log('\n✅ Fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  }); 