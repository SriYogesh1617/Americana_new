const DemandCountryMasterCursor = require('./models/DemandCountryMasterCursor');

async function testFinalLookup() {
  try {
    const countryMasterData = await DemandCountryMasterCursor.getStructuredData('c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7');
    
    // Create comprehensive CTY to Country Master mapping for T01 data
    const t01ToCountryMasterMapping = new Map();
    if (countryMasterData && countryMasterData.length > 0) {
      for (const countryRecord of countryMasterData) {
        const countryName = countryRecord['Country'];
        const market = countryRecord['Market'];
        const defaultWh = countryRecord['Default WH'];
        
        if (countryName && market) {
          // Map full country names to CTY names used in T01
          let ctyName = countryName;
          if (countryName === 'Saudi Arabia') ctyName = 'KSA';
          if (countryName === 'United Arab Emirates') ctyName = 'UAE';
          if (countryName === 'Cote d\'Ivoire') ctyName = 'Cote d\'Ivoire';
          
          // Create mappings for both regular and FS variants
          const baseCty = ctyName.replace(' FS', '');
          const isFS = ctyName.includes(' FS');
          
          // Map to T01 format
          const t01Cty = isFS ? `${baseCty} FS` : baseCty;
          const t01Market = 'Others'; // T01 uses 'Others' for most cases
          
          const t01Key = `${t01Cty}_${t01Market}`;
          t01ToCountryMasterMapping.set(t01Key, defaultWh);
          
          // Also map specific cases
          if (baseCty === 'KSA' && !isFS) {
            t01ToCountryMasterMapping.set('KSA_KSA', defaultWh);
          }
          if (baseCty === 'Kuwait' && !isFS) {
            t01ToCountryMasterMapping.set('Kuwait_Kuwait', defaultWh);
          }
          if (baseCty === 'UAE' && isFS) {
            t01ToCountryMasterMapping.set('UAE FS_UAE-FS', defaultWh);
          }
        }
      }
    }
    
    console.log('Testing Final CTY Lookup:');
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
    
    // Test each T01 combination
    t01Combinations.forEach(combo => {
      const lookupKey = `${combo.cty}_${combo.market}`;
      const result = t01ToCountryMasterMapping.get(lookupKey);
      console.log(`${lookupKey} -> ${result || 'NOT FOUND'}`);
    });
    
    console.log('\nAvailable mappings in t01ToCountryMasterMapping:');
    Array.from(t01ToCountryMasterMapping.keys()).sort().forEach(key => {
      console.log(`${key} -> ${t01ToCountryMasterMapping.get(key)}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testFinalLookup(); 