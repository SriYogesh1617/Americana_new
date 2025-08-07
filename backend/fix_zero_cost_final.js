const { query } = require('./config/database');

async function fixZeroCostFinal() {
  try {
    console.log('🔧 Final Fix for Zero Cost Issues...\n');
    
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
      
      // First, check current count
      const checkResult = await query(`
        SELECT COUNT(*) as count
        FROM t03_primdist 
        WHERE wh = $1 AND plt = $2 AND cty = $3 AND cost_per_unit = 0
      `, [wh, plt, cty]);
      
      const currentZeroCount = parseInt(checkResult.rows[0].count);
      console.log(`   Current records with 0 cost: ${currentZeroCount}`);
      
      if (currentZeroCount > 0) {
        // Update all records for this combination
        const updateResult = await query(`
          UPDATE t03_primdist 
          SET cost_per_unit = $1, updated_at = CURRENT_TIMESTAMP
          WHERE wh = $2 AND plt = $3 AND cty = $4 AND cost_per_unit = 0
        `, [expectedCost, wh, plt, cty]);
        
        console.log(`   Updated ${updateResult.rowCount} records`);
        totalUpdated += updateResult.rowCount;
        
        // Verify the update
        const verifyResult = await query(`
          SELECT COUNT(*) as count
          FROM t03_primdist 
          WHERE wh = $1 AND plt = $2 AND cty = $3 AND cost_per_unit = 0
        `, [wh, plt, cty]);
        
        const remainingZero = parseInt(verifyResult.rows[0].count);
        if (remainingZero === 0) {
          console.log(`   ✅ Successfully fixed all records`);
        } else {
          console.log(`   ❌ Still has ${remainingZero} records with 0 cost`);
        }
      } else {
        console.log(`   ✅ No records to fix`);
      }
    }
    
    console.log(`\n✅ Total records updated: ${totalUpdated}`);
    
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
    
    // Check for any remaining problematic records
    const remainingProblematic = await query(`
      SELECT wh, plt, cty, COUNT(*) as count
      FROM t03_primdist 
      WHERE cost_per_unit = 0 AND NOT (wh = 'X' OR (wh = 'GFCM' AND plt = 'GFC') OR (wh = 'KFCM' AND plt = 'KFC') OR (wh = 'NFCM' AND plt = 'NFC'))
      GROUP BY wh, plt, cty
      ORDER BY wh, plt, cty
    `);
    
    if (remainingProblematic.rows.length === 0) {
      console.log('\n🎉 SUCCESS: All problematic records have been fixed!');
    } else {
      console.log('\n❌ Still have problematic records:');
      remainingProblematic.rows.forEach(row => {
        console.log(`   ${row.wh} -> ${row.plt} (${row.cty}): ${row.count} records`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing zero cost issues:', error);
  }
}

fixZeroCostFinal()
  .then(() => {
    console.log('\n✅ Fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  }); 