const DemandCountryMasterCursor = require('./models/DemandCountryMasterCursor');

async function testFixedLookup() {
  try {
    const countryMasterData = await DemandCountryMasterCursor.getStructuredData('c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7');
    
    // Create CTY lookup map
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
    
    // Create market mapping for T01 to Country Master market values
    const marketMapping = {
      'Others': 'Others', // Default fallback
      'KSA': 'KSA',
      'Kuwait': 'Kuwait',
      'UAE-FS': 'UAE FS'
    };
    
    console.log('Testing Fixed CTY Lookup:');
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
    
    // Test each T01 combination with market mapping
    t01Combinations.forEach(combo => {
      const mappedMarket = marketMapping[combo.market] || combo.market;
      const lookupKey = `${combo.cty}_${mappedMarket}`;
      const result = ctyLookupMap.get(lookupKey);
      console.log(`${combo.cty}_${combo.market} -> ${lookupKey} -> ${result || 'NOT FOUND'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testFixedLookup(); 