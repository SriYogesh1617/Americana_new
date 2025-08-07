const TransportCostCalculator = require('./models/TransportCostCalculator');

async function testTransportCost() {
  try {
    console.log('🧪 Testing TransportCostCalculator...');
    
    // Load freight data
    const freightData = await TransportCostCalculator.loadFreightData();
    
    // Test some cross-country shipping combinations
    const testCases = [
      { cty: 'Bahrain', wh: 'GFCM', fgsku: '4001100156', description: 'GFCM -> Bahrain' },
      { cty: 'KSA', wh: 'GFCM', fgsku: '4001100156', description: 'GFCM -> KSA' },
      { cty: 'Kuwait', wh: 'NFCM', fgsku: '4001100156', description: 'NFCM -> Kuwait' },
      { cty: 'UAE', wh: 'KFCM', fgsku: '4001100156', description: 'KFCM -> UAE' },
      { cty: 'Bahrain', wh: 'NFCM', fgsku: '4001100156', description: 'NFCM -> Bahrain' },
      { cty: 'UAE FS', wh: 'GFCM', fgsku: '4001100156', description: 'GFCM -> UAE FS (same country)' },
      { cty: 'Kuwait', wh: 'KFCM', fgsku: '4001100156', description: 'KFCM -> Kuwait (same country)' },
      { cty: 'KSA', wh: 'NFCM', fgsku: '4001100156', description: 'NFCM -> KSA (same country)' }
    ];
    
    console.log('\n📊 Transport Cost Test Results:');
    console.log('================================');
    
    for (const testCase of testCases) {
      const cost = TransportCostCalculator.calculateTransportCost(
        testCase.cty,
        testCase.wh,
        testCase.fgsku,
        freightData
      );
      
      console.log(`${testCase.description}: ${cost.toFixed(4)}`);
    }
    
    // Get calculation summary
    const summary = await TransportCostCalculator.getCalculationSummary(freightData);
    console.log('\n📈 Freight Data Summary:');
    console.log(`Total specific costs: ${summary.totalSpecificCosts}`);
    console.log(`Origin-destination pairs: ${summary.originDestinationPairs}`);
    console.log(`Destination averages: ${summary.destinationAverages}`);
    console.log(`Max destination average: ${summary.maxDestinationAverage.toFixed(4)}`);
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTransportCost(); 