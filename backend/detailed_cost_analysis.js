const { query } = require('./config/database');
const TransportCostCalculator = require('./models/TransportCostCalculator');

async function detailedCostAnalysis() {
  try {
    console.log('🔍 Detailed Cost Per Unit Analysis...\n');
    
    // Load freight data
    console.log('📊 Loading freight data...');
    const freightData = await TransportCostCalculator.loadFreightData();
    
    // Get all unique warehouse-factory combinations
    const combinationsResult = await query(`
      SELECT DISTINCT wh, plt, cty, COUNT(*) as record_count
      FROM t03_primdist 
      GROUP BY wh, plt, cty
      ORDER BY wh, plt, cty
    `);
    
    console.log(`📊 Found ${combinationsResult.rows.length} unique warehouse-factory-country combinations\n`);
    
    let totalRecords = 0;
    let zeroCostRecords = 0;
    let nonZeroCostRecords = 0;
    let incorrectZeroRecords = 0;
    
    console.log('🔍 Analyzing each combination:');
    console.log('=' .repeat(80));
    
    for (const combo of combinationsResult.rows) {
      const { wh, plt, cty, record_count } = combo;
      totalRecords += parseInt(record_count);
      
      // Check if this should be 0 according to rules
      let shouldBeZero = false;
      let zeroReason = '';
      
      if (wh === 'X') {
        shouldBeZero = true;
        zeroReason = 'X warehouse';
      } else if ((wh === 'GFCM' && plt === 'GFC') ||
                 (wh === 'KFCM' && plt === 'KFC') ||
                 (wh === 'NFCM' && plt === 'NFC')) {
        shouldBeZero = true;
        zeroReason = 'same factory-warehouse';
      }
      
      // Get cost statistics for this combination
      const costStatsResult = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN cost_per_unit = 0 THEN 1 END) as zero_count,
          COUNT(CASE WHEN cost_per_unit > 0 THEN 1 END) as non_zero_count,
          AVG(cost_per_unit) as avg_cost,
          MIN(cost_per_unit) as min_cost,
          MAX(cost_per_unit) as max_cost
        FROM t03_primdist 
        WHERE wh = $1 AND plt = $2 AND cty = $3
      `, [wh, plt, cty]);
      
      const stats = costStatsResult.rows[0];
      const hasZeroCost = parseInt(stats.zero_count) > 0;
      const hasNonZeroCost = parseInt(stats.non_zero_count) > 0;
      
      if (shouldBeZero) {
        if (hasNonZeroCost) {
          console.log(`❌ ${wh} -> ${plt} (${cty}): ${record_count} records - Should be 0 (${zeroReason}) but has non-zero costs`);
        } else {
          console.log(`✅ ${wh} -> ${plt} (${cty}): ${record_count} records - Correctly 0 (${zeroReason})`);
        }
        zeroCostRecords += parseInt(record_count);
      } else {
        if (hasZeroCost) {
          console.log(`❌ ${wh} -> ${plt} (${cty}): ${record_count} records - Should have cost but has 0 cost`);
          incorrectZeroRecords += parseInt(stats.zero_count);
          
          // Calculate what the cost should be
          const sampleRecord = await query(`
            SELECT fgsku_code FROM t03_primdist 
            WHERE wh = $1 AND plt = $2 AND cty = $3 AND cost_per_unit = 0 
            LIMIT 1
          `, [wh, plt, cty]);
          
          if (sampleRecord.rows.length > 0) {
            const expectedCost = TransportCostCalculator.calculateTransportCost(
              cty, wh, sampleRecord.rows[0].fgsku_code, freightData
            );
            console.log(`   Expected cost: ${expectedCost.toFixed(4)}`);
          }
        } else {
          console.log(`✅ ${wh} -> ${plt} (${cty}): ${record_count} records - Has proper cost (avg: ${parseFloat(stats.avg_cost).toFixed(4)})`);
        }
        nonZeroCostRecords += parseInt(record_count);
      }
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('📊 SUMMARY:');
    console.log(`Total records: ${totalRecords}`);
    console.log(`Records that should be 0: ${zeroCostRecords}`);
    console.log(`Records that should have cost: ${nonZeroCostRecords}`);
    console.log(`Records incorrectly having 0 cost: ${incorrectZeroRecords}`);
    
    if (incorrectZeroRecords > 0) {
      console.log('\n❌ ISSUE FOUND: Some records have 0 cost when they should have fallback values!');
      console.log('This needs to be fixed.');
    } else {
      console.log('\n✅ All records have correct cost values!');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

detailedCostAnalysis()
  .then(() => {
    console.log('\n✅ Analysis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  }); 