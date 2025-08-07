const { query } = require('./config/database');
const TransportCostCalculator = require('./models/TransportCostCalculator');

async function fixCostPerUnit() {
  try {
    console.log('🔧 Fixing Cost Per Unit with Correct Fallback Logic...\n');
    
    // Load freight data
    console.log('📊 Loading freight data...');
    const freightData = await TransportCostCalculator.loadFreightData();
    
    // Get summary of freight data
    const summary = await TransportCostCalculator.getCalculationSummary(freightData);
    console.log(`\n📈 Freight Data Summary:`);
    console.log(`Total specific costs: ${summary.totalSpecificCosts}`);
    console.log(`Origin-destination pairs: ${summary.originDestinationPairs}`);
    console.log(`Destination averages: ${summary.destinationAverages}`);
    console.log(`Max destination average: ${summary.maxDestinationAverage.toFixed(4)}`);
    
    // Get all T03 records that need cost calculation
    console.log('\n🔍 Getting T03 records for cost calculation...');
    const t03Result = await query(`
      SELECT 
        id, wh, plt, cty, fgsku_code, cost_per_unit
      FROM t03_primdist 
      ORDER BY wh, plt, cty
    `);
    
    console.log(`📊 Found ${t03Result.rows.length} T03 records to process`);
    
    let updatedCount = 0;
    let zeroCount = 0;
    let fallback1Count = 0;
    let fallback2Count = 0;
    let fallback3Count = 0;
    let specificCount = 0;
    
    // Process each record
    for (const record of t03Result.rows) {
      const { id, wh, plt, cty, fgsku_code, cost_per_unit } = record;
      
      let newCostPerUnit = 0;
      let costSource = 'zero';
      
      // Rule 1: X warehouse always has cost = 0
      if (wh === 'X') {
        newCostPerUnit = 0;
        costSource = 'X warehouse';
      }
      // Rule 2: Same factory-warehouse shipping has cost = 0
      else if ((wh === 'GFCM' && plt === 'GFC') ||
               (wh === 'KFCM' && plt === 'KFC') ||
               (wh === 'NFCM' && plt === 'NFC')) {
        newCostPerUnit = 0;
        costSource = 'same factory-warehouse';
      }
      // Rule 3: Same country shipping has cost = 0
      // This rule only applies when factory and warehouse are in the same country
      // GFC factory is in UAE, so GFCM -> GFC (UAE FS) = 0
      // KFC factory is in Kuwait, so KFCM -> KFC (Kuwait) = 0  
      // NFC factory is in KSA, so NFCM -> NFC (KSA) = 0
      else if ((wh === 'GFCM' && plt === 'GFC' && cty === 'UAE FS') ||
               (wh === 'KFCM' && plt === 'KFC' && cty === 'Kuwait') ||
               (wh === 'NFCM' && plt === 'NFC' && cty === 'KSA')) {
        newCostPerUnit = 0;
        costSource = 'same country';
      }
      // Rule 4: Calculate cost using fallback system
      else {
        newCostPerUnit = TransportCostCalculator.calculateTransportCost(cty, wh, fgsku_code, freightData);
        
        // Determine which fallback was used
        const specificKey = `${cty}_${wh}_${fgsku_code}`;
        const specificCost = freightData.specificCosts.get(specificKey);
        
        if (specificCost !== undefined) {
          costSource = 'specific';
          specificCount++;
        } else {
          const origin = wh.replace('M', '');
          const odKey = `${origin}_${cty}`;
          const odCost = freightData.fallbackStructure.originDestinationAvg.get(odKey);
          
          if (odCost !== undefined) {
            costSource = 'fallback1';
            fallback1Count++;
          } else {
            const destCost = freightData.fallbackStructure.destinationAvg.get(cty);
            
            if (destCost !== undefined) {
              costSource = 'fallback2';
              fallback2Count++;
            } else {
              costSource = 'fallback3';
              fallback3Count++;
            }
          }
        }
      }
      
      // Update the record if cost has changed
      if (Math.abs(newCostPerUnit - (parseFloat(cost_per_unit) || 0)) > 0.0001) {
        await query(`
          UPDATE t03_primdist 
          SET cost_per_unit = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [newCostPerUnit, id]);
        
        updatedCount++;
        
        // Log significant changes
        if (Math.abs(newCostPerUnit - (parseFloat(cost_per_unit) || 0)) > 0.1) {
          console.log(`  🔄 Updated: ${wh} -> ${plt} (${cty}) - SKU: ${fgsku_code}`);
          console.log(`     Old: ${(parseFloat(cost_per_unit) || 0).toFixed(4)} -> New: ${newCostPerUnit.toFixed(4)} (${costSource})`);
        }
      }
      
      if (newCostPerUnit === 0) {
        zeroCount++;
      }
    }
    
    console.log(`\n✅ Cost calculation completed!`);
    console.log(`📊 Summary:`);
    console.log(`  Total records processed: ${t03Result.rows.length}`);
    console.log(`  Records updated: ${updatedCount}`);
    console.log(`  Records with cost = 0: ${zeroCount}`);
    console.log(`  Records with specific cost: ${specificCount}`);
    console.log(`  Records using fallback 1: ${fallback1Count}`);
    console.log(`  Records using fallback 2: ${fallback2Count}`);
    console.log(`  Records using fallback 3: ${fallback3Count}`);
    
    // Verify no records have 0 cost when they shouldn't
    console.log('\n🔍 Verifying no invalid 0 costs...');
    
    const invalidZeroResult = await query(`
      SELECT 
        wh, plt, cty, fgsku_code, cost_per_unit,
        COUNT(*) as count
      FROM t03_primdist 
      WHERE cost_per_unit = 0 
        AND wh != 'X'
        AND NOT ((wh = 'GFCM' AND plt = 'GFC') OR
                 (wh = 'KFCM' AND plt = 'KFC') OR
                 (wh = 'NFCM' AND plt = 'NFC'))
        AND NOT ((wh = 'GFCM' AND cty = 'UAE FS') OR
                 (wh = 'KFCM' AND cty = 'Kuwait') OR
                 (wh = 'NFCM' AND cty = 'KSA'))
      GROUP BY wh, plt, cty, fgsku_code, cost_per_unit
      ORDER BY wh, plt, cty
    `);
    
    if (invalidZeroResult.rows.length > 0) {
      console.log('\n❌ WARNING: Found records with invalid 0 costs:');
      invalidZeroResult.rows.forEach(row => {
        console.log(`   ${row.wh} -> ${row.plt} (${row.cty}): ${row.count} records`);
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
    console.log('\n📊 Final Statistics:');
    console.log(`Total records: ${stats.total_records}`);
    console.log(`Records with cost > 0: ${stats.records_with_cost}`);
    console.log(`Records with cost = 0: ${stats.records_with_zero_cost}`);
    console.log(`Average cost: ${parseFloat(stats.avg_cost || 0).toFixed(4)}`);
    console.log(`Maximum cost: ${parseFloat(stats.max_cost || 0).toFixed(4)}`);
    console.log(`Minimum cost: ${parseFloat(stats.min_cost || 0).toFixed(4)}`);
    
  } catch (error) {
    console.error('❌ Error fixing cost per unit:', error);
  }
}

fixCostPerUnit()
  .then(() => {
    console.log('\n✅ Fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  }); 