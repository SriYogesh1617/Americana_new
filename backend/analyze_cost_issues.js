const { query } = require('./config/database');
const TransportCostCalculator = require('./models/TransportCostCalculator');

async function analyzeCostIssues() {
  try {
    console.log('🔍 Analyzing Cost Per Unit Issues...\n');
    
    // Load freight data
    console.log('📊 Loading freight data...');
    const freightData = await TransportCostCalculator.loadFreightData();
    
    // Get summary of freight data
    const summary = await TransportCostCalculator.getCalculationSummary(freightData);
    console.log('\n📈 Freight Data Summary:');
    console.log(`Total specific costs: ${summary.totalSpecificCosts}`);
    console.log(`Origin-destination pairs: ${summary.originDestinationPairs}`);
    console.log(`Destination averages: ${summary.destinationAverages}`);
    console.log(`Max destination average: ${summary.maxDestinationAverage.toFixed(4)}`);
    
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
      LIMIT 20
    `);
    
    if (shouldHaveCostResult.rows.length > 0) {
      console.log('\n❌ RECORDS THAT SHOULD HAVE COST > 0:');
      
      for (const row of shouldHaveCostResult.rows) {
        const { wh, plt, cty, fgsku_code, count } = row;
        
        console.log(`\n🔍 Analyzing: ${wh} -> ${plt} (${cty}) - SKU: ${fgsku_code}`);
        
        // Check what the TransportCostCalculator would return
        const calculatedCost = TransportCostCalculator.calculateTransportCost(cty, wh, fgsku_code, freightData);
        
        console.log(`  Expected cost: ${calculatedCost.toFixed(4)}`);
        
        // Check if we have specific data for this combination
        const specificKey = `${cty}_${wh}_${fgsku_code}`;
        const specificCost = freightData.specificCosts.get(specificKey);
        
        if (specificCost !== undefined) {
          console.log(`  ✅ Found specific cost: ${specificCost.toFixed(4)}`);
        } else {
          console.log(`  ❌ No specific cost found for key: ${specificKey}`);
          
          // Check fallback 1: origin-destination
          const origin = wh.replace('M', '');
          const odKey = `${origin}_${cty}`;
          const odCost = freightData.fallbackStructure.originDestinationAvg.get(odKey);
          
          if (odCost !== undefined) {
            console.log(`  ✅ Fallback 1 (Origin-Destination): ${odCost.toFixed(4)} for key: ${odKey}`);
          } else {
            console.log(`  ❌ No origin-destination fallback for key: ${odKey}`);
            
            // Check fallback 2: destination only
            const destCost = freightData.fallbackStructure.destinationAvg.get(cty);
            
            if (destCost !== undefined) {
              console.log(`  ✅ Fallback 2 (Destination): ${destCost.toFixed(4)} for destination: ${cty}`);
            } else {
              console.log(`  ❌ No destination fallback for: ${cty}`);
              console.log(`  ✅ Fallback 3 (Max): ${freightData.fallbackStructure.maxDestinationAvg.toFixed(4)}`);
            }
          }
        }
      }
    } else {
      console.log('✅ All records with cost = 0 are valid according to the rules');
    }
    
    // Check if there are any records with cost > 0 that should be 0
    console.log('\n🔍 Checking for records with cost > 0 that should be 0...');
    
    const shouldBeZeroResult = await query(`
      SELECT 
        wh, plt, cty, fgsku_code, cost_per_unit,
        COUNT(*) as count
      FROM t03_primdist 
      WHERE cost_per_unit > 0 
        AND (
          wh = 'X' OR
          (wh = 'GFCM' AND cty = 'UAE FS') OR
          (wh = 'KFCM' AND cty = 'Kuwait') OR
          (wh = 'NFCM' AND cty = 'KSA') OR
          (wh = 'GFCM' AND plt = 'GFC') OR
          (wh = 'KFCM' AND plt = 'KFC') OR
          (wh = 'NFCM' AND plt = 'NFC')
        )
      GROUP BY wh, plt, cty, fgsku_code, cost_per_unit
      ORDER BY wh, plt, cty
    `);
    
    if (shouldBeZeroResult.rows.length > 0) {
      console.log('\n❌ RECORDS WITH COST > 0 THAT SHOULD BE 0:');
      shouldBeZeroResult.rows.forEach(row => {
        console.log(`   ${row.wh} -> ${row.plt} (${row.cty}): ${row.count} records - Cost: ${row.cost_per_unit}`);
      });
    } else {
      console.log('✅ No records with cost > 0 that should be 0');
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
    console.error('❌ Error analyzing cost issues:', error);
  }
}

analyzeCostIssues()
  .then(() => {
    console.log('\n✅ Analysis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  }); 