const DemandCountryMasterCursor = require('./models/DemandCountryMasterCursor');

async function testLookup() {
  try {
    const countryMasterData = await DemandCountryMasterCursor.getStructuredData('c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7');
    
    console.log('Country Master Markets and Default WH:');
    const marketMap = {};
    countryMasterData.forEach(item => {
      const market = item['Market'];
      const defaultWh = item['Default WH'];
      if (!marketMap[market]) marketMap[market] = [];
      marketMap[market].push(defaultWh);
    });
    
    Object.keys(marketMap).forEach(market => {
      const uniqueWh = [...new Set(marketMap[market])];
      console.log(`${market}: ${uniqueWh.join(', ')}`);
    });
    
    console.log('\nT01 CTY and Market combinations:');
    const t01Combinations = [
      { cty: 'Bahrain', market: 'Others' },
      { cty: 'Bahrain FS', market: 'Others' },
      { cty: 'Cote d\'Ivoire', market: 'Others' },
      { cty: 'Iraq', market: 'Others' },
      { cty: 'Iraq FS', market: 'Others' },
      { cty: 'Jordan', market: 'Others' },
      { cty: 'Jordan FS', market: 'Others' },
      { cty: 'KSA', market: 'KSA' },
      { cty: 'KSA FS', market: 'Others' },
      { cty: 'Kuwait', market: 'Kuwait' },
      { cty: 'Kuwait FS', market: 'Others' },
      { cty: 'Oman', market: 'Others' },
      { cty: 'Oman FS', market: 'Others' },
      { cty: 'Qatar', market: 'Others' },
      { cty: 'Qatar FS', market: 'Others' },
      { cty: 'UAE', market: 'Others' },
      { cty: 'UAE FS', market: 'UAE-FS' }
    ];
    
    // Create lookup map
    const ctyLookupMap = new Map();
    countryMasterData.forEach(countryRecord => {
      const countryName = countryRecord['Country'];
      const market = countryRecord['Market'];
      const defaultWh = countryRecord['Default WH'];
      
      if (countryName && market) {
        let ctyName = countryName;
        if (countryName === 'Saudi Arabia') ctyName = 'KSA';
        if (countryName === 'United Arab Emirates') ctyName = 'UAE';
        if (countryName === 'Cote d\'Ivoire') ctyName = 'Cote d\'Ivoire';
        
        const key = `${ctyName}_${market}`;
        ctyLookupMap.set(key, defaultWh);
      }
    });
    
    // Test each T01 combination
    t01Combinations.forEach(combo => {
      const lookupKey = `${combo.cty}_${combo.market}`;
      const result = ctyLookupMap.get(lookupKey);
      console.log(`${lookupKey} -> ${result || 'NOT FOUND'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLookup(); 