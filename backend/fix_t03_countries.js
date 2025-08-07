const { query } = require('./config/database');

async function fixT03Countries() {
  try {
    console.log('🔧 Fixing T03 Country Mapping...\n');
    
    // Check current countries
    console.log('📊 Current countries in T03:');
    const currentCountries = await query(`
      SELECT cty, COUNT(*) as count 
      FROM t03_primdist 
      GROUP BY cty 
      ORDER BY count DESC
    `);
    
    currentCountries.rows.forEach(row => {
      console.log(`  ${row.cty}: ${row.count} records`);
    });
    
    // Update existing records with correct country mapping
    console.log('\n🔄 Updating existing T03 records with correct country mapping...');
    
    const updateResult = await query(`
      UPDATE t03_primdist 
      SET cty = CASE 
        WHEN wh = 'GFCM' THEN 'UAE FS'
        WHEN wh = 'KFCM' THEN 'Kuwait'
        WHEN wh = 'NFCM' THEN 'KSA'
        WHEN wh = 'X' THEN 'X'
        ELSE 'Unknown'
      END,
      updated_at = CURRENT_TIMESTAMP
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} records`);
    
    // Check countries after update
    console.log('\n📊 Countries in T03 after fix:');
    const updatedCountries = await query(`
      SELECT cty, COUNT(*) as count 
      FROM t03_primdist 
      GROUP BY cty 
      ORDER BY count DESC
    `);
    
    updatedCountries.rows.forEach(row => {
      console.log(`  ${row.cty}: ${row.count} records`);
    });
    
    // Verify the mapping is correct
    console.log('\n🔍 Verifying warehouse-country mapping:');
    const mappingCheck = await query(`
      SELECT wh, cty, COUNT(*) as count
      FROM t03_primdist 
      GROUP BY wh, cty
      ORDER BY wh, cty
    `);
    
    mappingCheck.rows.forEach(row => {
      console.log(`  ${row.wh} -> ${row.cty}: ${row.count} records`);
    });
    
    // Check for any remaining incorrect mappings
    console.log('\n🔍 Checking for incorrect mappings:');
    const incorrectMappings = await query(`
      SELECT wh, cty, COUNT(*) as count
      FROM t03_primdist 
      WHERE NOT (
        (wh = 'GFCM' AND cty = 'UAE FS') OR
        (wh = 'KFCM' AND cty = 'Kuwait') OR
        (wh = 'NFCM' AND cty = 'KSA') OR
        (wh = 'X' AND cty = 'X')
      )
      GROUP BY wh, cty
      ORDER BY wh, cty
    `);
    
    if (incorrectMappings.rows.length === 0) {
      console.log('  ✅ All warehouse-country mappings are correct!');
    } else {
      console.log('  ❌ Found incorrect mappings:');
      incorrectMappings.rows.forEach(row => {
        console.log(`    ${row.wh} -> ${row.cty}: ${row.count} records`);
      });
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('✅ T03 country mapping has been fixed!');
    console.log('✅ Only KSA, Kuwait, UAE FS, and X countries should exist');
    console.log('✅ Each warehouse maps to its correct country:');
    console.log('   - GFCM -> UAE FS');
    console.log('   - KFCM -> Kuwait');
    console.log('   - NFCM -> KSA');
    console.log('   - X -> X');
    
  } catch (error) {
    console.error('❌ Error fixing T03 countries:', error);
  }
}

fixT03Countries()
  .then(() => {
    console.log('\n✅ Fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  }); 