const TransportCostCalculator = require('./models/TransportCostCalculator');

async function testTransportCalculator() {
  try {
    console.log('🧪 Testing TransportCostCalculator...\n');
    
    // Load freight data
    console.log('📊 Loading freight data...');
    const freightData = await TransportCostCalculator.loadFreightData();
    
    // Test cases that should have fallback values
    const testCases = [
      { cty: 'UAE', wh: 'GFCM', fgskuCode: '4001310103', description: 'GFCM -> KFC (UAE)' },
      { cty: 'Kuwait FS', wh: 'KFCM', fgskuCode: '4001310103', description: 'KFCM -> GFC (Kuwait FS)' },
      { cty: 'KSA FS', wh: 'NFCM', fgskuCode: '4001310103', description: 'NFCM -> GFC (KSA FS)' }
    ];
    
    console.log('\n🔍 Testing specific cases:');
    
    for (const testCase of testCases) {
      const { cty, wh, fgskuCode, description } = testCase;
      
      console.log(`\n📋 Testing: ${description}`);
      console.log(`  Country: ${cty}, Warehouse: ${wh}, SKU: ${fgskuCode}`);
      
      // Check if this should be 0 according to rules
      let shouldBeZero = false;
      let zeroReason = '';
      
      if (wh === 'X') {
        shouldBeZero = true;
        zeroReason = 'X warehouse';
      } else if ((wh === 'NFCM' && (cty === 'KSA' || cty === 'KSA FS')) ||
                 (wh === 'GFCM' && (cty === 'UAE' || cty === 'UAE FS')) ||
                 (wh === 'KFCM' && (cty === 'Kuwait' || cty === 'Kuwait FS'))) {
        shouldBeZero = true;
        zeroReason = 'same country shipping';
      }
      
      if (shouldBeZero) {
        console.log(`  ✅ Should be 0: ${zeroReason}`);
        continue;
      }
      
      // Calculate cost
      const cost = TransportCostCalculator.calculateTransportCost(cty, wh, fgskuCode, freightData);
      console.log(`  Calculated cost: ${cost.toFixed(4)}`);
      
      // Check what fallback should be used
      const specificKey = `${cty}_${wh}_${fgskuCode}`;
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
      
      // Check if calculated cost matches expected
      if (cost === 0 && !shouldBeZero) {
        console.log(`  ❌ ISSUE: Cost is 0 but should have fallback value!`);
      } else if (cost > 0) {
        console.log(`  ✅ Cost is correctly calculated`);
      }
    }
    
    // Test the specific problematic combinations
    console.log('\n🔍 Testing problematic combinations from analysis:');
    
    const problematicCases = [
      { cty: 'UAE', wh: 'GFCM', fgskuCode: '4001310103' },
      { cty: 'UAE', wh: 'GFCM', fgskuCode: '4001310134' },
      { cty: 'Kuwait FS', wh: 'KFCM', fgskuCode: '4001310103' },
      { cty: 'KSA FS', wh: 'NFCM', fgskuCode: '4001310103' }
    ];
    
    for (const testCase of problematicCases) {
      const { cty, wh, fgskuCode } = testCase;
      
      console.log(`\n📋 Testing: ${wh} -> ${cty} - SKU: ${fgskuCode}`);
      
      const cost = TransportCostCalculator.calculateTransportCost(cty, wh, fgskuCode, freightData);
      console.log(`  Calculated cost: ${cost.toFixed(4)}`);
      
      // Check what the fallback should be
      const origin = wh.replace('M', '');
      const odKey = `${origin}_${cty}`;
      const odCost = freightData.fallbackStructure.originDestinationAvg.get(odKey);
      const destCost = freightData.fallbackStructure.destinationAvg.get(cty);
      
      console.log(`  Origin-Destination key: ${odKey}, Cost: ${odCost ? odCost.toFixed(4) : 'Not found'}`);
      console.log(`  Destination: ${cty}, Cost: ${destCost ? destCost.toFixed(4) : 'Not found'}`);
      console.log(`  Max destination average: ${freightData.fallbackStructure.maxDestinationAvg.toFixed(4)}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTransportCalculator()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }); 