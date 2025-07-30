const { query } = require('./config/database');

async function testDemandCursor() {
  try {
    console.log('🧪 Testing Demand Filtered Cursor...\n');
    
    // Test 1: Check if processed_demand_data table exists and has data
    console.log('1. Checking processed_demand_data table...');
    const tableCheck = await query(`
      SELECT COUNT(*) as total_records 
      FROM processed_demand_data
    `);
    
    console.log(`Total records in processed_demand_data: ${tableCheck.rows[0].total_records}`);
    
    if (tableCheck.rows[0].total_records === 0) {
      console.log('⚠️  No data found in processed_demand_data table');
      console.log('   You may need to process some demand data first');
      return;
    }
    
    // Test 2: Test basic cursor functionality
    console.log('\n2. Testing basic cursor query...');
    const basicCursor = await query(`
      SELECT 
        geography,
        market,
        cty,
        fgsku_code,
        demand_cases,
        supply,
        month,
        year
      FROM processed_demand_data
      LIMIT 5
    `);
    
    console.log('Sample data:');
    basicCursor.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.geography} | ${row.market} | ${row.cty} | ${row.fgsku_code} | ${row.demand_cases} | ${row.supply} | ${row.month}/${row.year}`);
    });
    
    // Test 3: Test filtering functionality
    console.log('\n3. Testing filtering...');
    const filterTest = await query(`
      SELECT COUNT(*) as filtered_count
      FROM processed_demand_data
      WHERE geography IS NOT NULL AND geography != ''
    `);
    
    console.log(`Records with non-empty geography: ${filterTest.rows[0].filtered_count}`);
    
    // Test 4: Test statistics functionality
    console.log('\n4. Testing statistics...');
    const statsTest = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT geography) as unique_geographies,
        COUNT(DISTINCT market) as unique_markets,
        COUNT(DISTINCT cty) as unique_cty,
        COALESCE(SUM(demand_cases), 0) as total_demand_cases,
        COALESCE(SUM(supply), 0) as total_supply,
        COALESCE(AVG(inventory_days_norm), 0) as avg_inventory_days
      FROM processed_demand_data
    `);
    
    const stats = statsTest.rows[0];
    console.log('Statistics:');
    console.log(`   Total Records: ${stats.total_records}`);
    console.log(`   Unique Geographies: ${stats.unique_geographies}`);
    console.log(`   Unique Markets: ${stats.unique_markets}`);
    console.log(`   Unique CTY: ${stats.unique_cty}`);
    console.log(`   Total Demand Cases: ${stats.total_demand_cases}`);
    console.log(`   Total Supply: ${stats.total_supply}`);
    console.log(`   Avg Inventory Days: ${stats.avg_inventory_days}`);
    
    // Test 5: Test top values
    console.log('\n5. Testing top values...');
    const topGeographies = await query(`
      SELECT geography, COUNT(*) as count 
      FROM processed_demand_data 
      WHERE geography IS NOT NULL AND geography != ''
      GROUP BY geography 
      ORDER BY count DESC 
      LIMIT 5
    `);
    
    console.log('Top 5 Geographies:');
    topGeographies.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.geography}: ${row.count} records`);
    });
    
    console.log('\n✅ Demand cursor functionality test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Total records: ${tableCheck.rows[0].total_records}`);
    console.log(`   - Unique geographies: ${stats.unique_geographies}`);
    console.log(`   - Unique markets: ${stats.unique_markets}`);
    console.log(`   - Total demand cases: ${stats.total_demand_cases}`);
    console.log(`   - Total supply: ${stats.total_supply}`);
    
  } catch (error) {
    console.error('❌ Error testing demand cursor:', error);
  }
}

// Run the test
testDemandCursor().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 