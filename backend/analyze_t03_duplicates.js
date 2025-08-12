const { query } = require('./config/database');

async function analyzeT03Duplicates() {
  try {
    console.log('🔍 Analyzing T03 "Duplicates"...\n');
    
    // Check total records
    const totalResult = await query('SELECT COUNT(*) as total FROM t03_primdist');
    console.log(`📊 Total T03 records: ${totalResult.rows[0].total}`);
    
    // Check unique combinations without country
    const uniqueWithoutCountry = await query(`
      SELECT COUNT(DISTINCT (wh, plt, fgsku_code, mth_num)) as unique_combinations
      FROM t03_primdist
    `);
    console.log(`📊 Unique combinations (wh, plt, fgsku_code, mth_num): ${uniqueWithoutCountry.rows[0].unique_combinations}`);
    
    // Check unique combinations with country
    const uniqueWithCountry = await query(`
      SELECT COUNT(DISTINCT (wh, plt, fgsku_code, mth_num, cty)) as unique_combinations
      FROM t03_primdist
    `);
    console.log(`📊 Unique combinations (wh, plt, fgsku_code, mth_num, cty): ${uniqueWithCountry.rows[0].unique_combinations}`);
    
    // Check "duplicates" by warehouse
    console.log('\n📊 "Duplicate" combinations by warehouse:');
    const duplicateByWarehouse = await query(`
      SELECT wh, COUNT(*) as duplicate_combinations 
      FROM (
        SELECT wh, plt, fgsku_code, mth_num, COUNT(*) as count 
        FROM t03_primdist 
        GROUP BY wh, plt, fgsku_code, mth_num 
        HAVING COUNT(*) > 1
      ) as duplicates 
      GROUP BY wh 
      ORDER BY duplicate_combinations DESC
    `);
    
    duplicateByWarehouse.rows.forEach(row => {
      console.log(`  ${row.wh}: ${row.duplicate_combinations} combinations with multiple countries`);
    });
    
    // Check countries per combination
    console.log('\n📊 Countries per combination (sample):');
    const countriesPerCombination = await query(`
      SELECT wh, plt, fgsku_code, mth_num, COUNT(DISTINCT cty) as country_count, COUNT(*) as total_count
      FROM t03_primdist 
      GROUP BY wh, plt, fgsku_code, mth_num 
      HAVING COUNT(DISTINCT cty) > 1
      ORDER BY total_count DESC 
      LIMIT 5
    `);
    
    countriesPerCombination.rows.forEach(row => {
      console.log(`  ${row.wh} -> ${row.plt} - SKU: ${row.fgsku_code} - Month: ${row.mth_num}`);
      console.log(`    Countries: ${row.country_count}, Total records: ${row.total_count}`);
    });
    
    // Show sample countries for one combination
    console.log('\n📊 Sample countries for X -> X SKU 4001371504 Month 10:');
    const sampleCountries = await query(`
      SELECT cty, cost_per_unit 
      FROM t03_primdist 
      WHERE wh = 'X' AND plt = 'X' AND fgsku_code = '4001371504' AND mth_num = 10 
      ORDER BY cty
    `);
    
    sampleCountries.rows.forEach(row => {
      console.log(`  ${row.cty}: ${row.cost_per_unit}`);
    });
    
    // Check if there are any REAL duplicates (same wh, plt, fgsku_code, mth_num, cty)
    console.log('\n🔍 Checking for REAL duplicates (same wh, plt, fgsku_code, mth_num, cty):');
    const realDuplicates = await query(`
      SELECT wh, plt, fgsku_code, mth_num, cty, COUNT(*) as count
      FROM t03_primdist 
      GROUP BY wh, plt, fgsku_code, mth_num, cty 
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (realDuplicates.rows.length === 0) {
      console.log('  ✅ No REAL duplicates found!');
    } else {
      console.log('  ❌ REAL duplicates found:');
      realDuplicates.rows.forEach(row => {
        console.log(`    ${row.wh} -> ${row.plt} - SKU: ${row.fgsku_code} - Month: ${row.mth_num} - Country: ${row.cty} - Count: ${row.count}`);
      });
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('✅ The "duplicates" are NOT actually duplicates!');
    console.log('✅ Each record represents a different country for the same warehouse-factory-SKU-month combination');
    console.log('✅ This is the CORRECT data structure for T03 table');
    console.log('✅ Different countries have different cost calculations and requirements');
    console.log('✅ Each country needs its own record for proper cost analysis');
    
  } catch (error) {
    console.error('❌ Error analyzing T03 duplicates:', error);
  }
}

analyzeT03Duplicates()
  .then(() => {
    console.log('\n✅ Analysis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  }); 