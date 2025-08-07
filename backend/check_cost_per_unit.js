const { query } = require('./config/database');

async function checkCostPerUnit() {
  try {
    console.log('🔍 Checking T03 Cost Per Unit Values...\n');
    
    // Get all T03 records with cost_per_unit = 0
    const zeroCostResult = await query(`
      SELECT 
        wh, plt, cty, fgsku_code, cost_per_unit, custom_cost_per_unit,
        COUNT(*) as count
      FROM t03_primdist 
      WHERE cost_per_unit = 0
      GROUP BY wh, plt, cty, fgsku_code, cost_per_unit, custom_cost_per_unit
      ORDER BY wh, plt, cty
    `);
    
    console.log(`Total records with cost_per_unit = 0: ${zeroCostResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0)}\n`);
    
    if (zeroCostResult.rows.length > 0) {
      console.log('📋 Breakdown of records with cost_per_unit = 0:');
      
      // Categorize by the rules
      const xWarehouse = [];
      const sameCountry = [];
      const sameFactoryWarehouse = [];
      const other = [];
      
      zeroCostResult.rows.forEach(row => {
        const { wh, plt, cty, fgsku_code, count } = row;
        
        // Rule 4: Cost for all X warehouse and factory rows is 0
        if (wh === 'X') {
          xWarehouse.push({ wh, plt, cty, fgsku_code, count });
        }
        // Rule 5: Cost for shipping within the same country is 0
        else if ((wh === 'GFCM' && cty === 'UAE FS') ||
                 (wh === 'KFCM' && cty === 'Kuwait') ||
                 (wh === 'NFCM' && cty === 'KSA')) {
          sameCountry.push({ wh, plt, cty, fgsku_code, count });
        }
        // Rule 6: Cost = 0 for same factory-warehouse shipping
        else if ((wh === 'GFCM' && plt === 'GFC') ||
                 (wh === 'KFCM' && plt === 'KFC') ||
                 (wh === 'NFCM' && plt === 'NFC')) {
          sameFactoryWarehouse.push({ wh, plt, cty, fgsku_code, count });
        }
        else {
          other.push({ wh, plt, cty, fgsku_code, count });
        }
      });
      
      console.log('\n✅ X Warehouse (Rule 4):');
      xWarehouse.forEach(row => {
        console.log(`   ${row.wh} -> ${row.plt} (${row.cty}): ${row.count} records`);
      });
      
      console.log('\n✅ Same Country Shipping (Rule 5):');
      sameCountry.forEach(row => {
        console.log(`   ${row.wh} -> ${row.plt} (${row.cty}): ${row.count} records`);
      });
      
      console.log('\n✅ Same Factory-Warehouse (Rule 6):');
      sameFactoryWarehouse.forEach(row => {
        console.log(`   ${row.wh} -> ${row.plt} (${row.cty}): ${row.count} records`);
      });
      
      if (other.length > 0) {
        console.log('\n⚠️  POTENTIAL ISSUES - Records with cost = 0 that may need fallback:');
        other.forEach(row => {
          console.log(`   ${row.wh} -> ${row.plt} (${row.cty}): ${row.count} records`);
        });
        
        // Check if these should have fallback values
        console.log('\n🔍 Checking fallback data availability...');
        
        for (const row of other) {
          const { wh, plt, cty, fgsku_code } = row;
          
          // Check if we have freight data for this combination
          const freightCheck = await query(`
            SELECT COUNT(*) as count 
            FROM freight_storage_costs 
            WHERE origin = $1 AND destination = $2 AND fgsku_code = $3
          `, [plt, cty, fgsku_code]);
          
          if (freightCheck.rows[0].count > 0) {
            console.log(`   ⚠️  Found ${freightCheck.rows[0].count} freight records for ${plt} -> ${cty} (${fgsku_code}) but cost is 0`);
          }
        }
      }
    }
    
    // Check for records that should have cost > 0 but don't
    console.log('\n🔍 Checking for records that should have cost > 0...');
    
    const shouldHaveCostResult = await query(`
      SELECT 
        wh, plt, cty, fgsku_code, cost_per_unit,
        COUNT(*) as count
      FROM t03_primdist 
      WHERE cost_per_unit = 0 
        AND wh != 'X'
        AND NOT ((wh = 'GFCM' AND cty = 'UAE FS') OR
                 (wh = 'KFCM' AND cty = 'Kuwait') OR
                 (wh = 'NFCM' AND cty = 'KSA'))
        AND NOT ((wh = 'GFCM' AND plt = 'GFC') OR
                 (wh = 'KFCM' AND plt = 'KFC') OR
                 (wh = 'NFCM' AND plt = 'NFC'))
      GROUP BY wh, plt, cty, fgsku_code, cost_per_unit
      ORDER BY wh, plt, cty
    `);
    
    if (shouldHaveCostResult.rows.length > 0) {
      console.log('\n❌ RECORDS THAT SHOULD HAVE COST > 0:');
      shouldHaveCostResult.rows.forEach(row => {
        console.log(`   ${row.wh} -> ${row.plt} (${row.cty}): ${row.count} records - SKU: ${row.fgsku_code}`);
      });
    } else {
      console.log('✅ All records with cost = 0 are valid according to the rules');
    }
    
    // Check overall statistics
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN cost_per_unit > 0 THEN 1 END) as records_with_cost,
        COUNT(CASE WHEN cost_per_unit = 0 THEN 1 END) as records_with_zero_cost,
        AVG(cost_per_unit) as avg_cost,
        MAX(cost_per_unit) as max_cost,
        MIN(cost_per_unit) as min_cost
      FROM t03_primdist
    `);
    
    const stats = statsResult.rows[0];
    console.log('\n📊 Overall Statistics:');
    console.log(`Total records: ${stats.total_records}`);
    console.log(`Records with cost > 0: ${stats.records_with_cost}`);
    console.log(`Records with cost = 0: ${stats.records_with_zero_cost}`);
    console.log(`Average cost: ${parseFloat(stats.avg_cost || 0).toFixed(4)}`);
    console.log(`Maximum cost: ${parseFloat(stats.max_cost || 0).toFixed(4)}`);
    console.log(`Minimum cost: ${parseFloat(stats.min_cost || 0).toFixed(4)}`);
    
  } catch (error) {
    console.error('❌ Error checking cost per unit:', error);
  }
}

checkCostPerUnit()
  .then(() => {
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  }); 