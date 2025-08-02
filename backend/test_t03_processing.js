const T03Data = require('./models/T03Data');
const T03Controller = require('./controllers/t03Controller');
const { query } = require('./config/database');

async function testT03Processing() {
  try {
    console.log('🧪 Testing T03 Primary Distribution Processing...');
    
    // Step 1: Create T03 table
    console.log('\n📊 Creating T03 table...');
    await T03Data.createTable();
    
    // Step 2: Check if we have any existing data sources
    console.log('\n🔍 Checking existing data sources...');
    
    // Check demand data
    const demandCount = await query('SELECT COUNT(*) as count FROM demand_cursor');
    console.log(`Found ${demandCount.rows[0].count} demand records`);
    
    // Check capacity data (if exists)
    try {
      const capacityCount = await query('SELECT COUNT(*) as count FROM capacity_cursor');
      console.log(`Found ${capacityCount.rows[0].count} capacity records`);
    } catch (error) {
      console.log('Capacity table not found or empty');
    }
    
    // Check freight data (if exists)
    try {
      const freightCount = await query('SELECT COUNT(*) as count FROM freight_storage_costs_cursor');
      console.log(`Found ${freightCount.rows[0].count} freight records`);
    } catch (error) {
      console.log('Freight table not found or empty');
    }
    
    // Step 3: Insert some test T03 data
    console.log('\n📝 Inserting test T03 data...');
    const testData = [
      {
        wh: 'GFCM',
        plt: 'Factory1',
        fg_sku_code: 'SKU001',
        mth_num: 1,
        cost_per_unit: 10.50,
        custom_cost_per_unit: 2.25,
        fg_wt_per_unit: 1.5,
        qty: 100
      },
      {
        wh: 'KFCM',
        plt: 'Factory1',
        fg_sku_code: 'SKU001',
        mth_num: 1,
        cost_per_unit: 12.75,
        custom_cost_per_unit: 2.25,
        fg_wt_per_unit: 1.5,
        qty: 150
      },
      {
        wh: 'NFCM',
        plt: 'Factory2',
        fg_sku_code: 'SKU002',
        mth_num: 2,
        cost_per_unit: 8.25,
        custom_cost_per_unit: 1.80,
        fg_wt_per_unit: 2.1,
        qty: 200
      }
    ];
    
    const insertedRecords = await T03Data.bulkInsert(testData);
    console.log(`✅ Inserted ${insertedRecords.length} test records`);
    
    // Step 4: Update calculated fields
    console.log('\n🧮 Updating calculated fields...');
    await T03Data.updateAllCalculatedFields();
    
    // Step 5: Test various queries
    console.log('\n📈 Testing queries...');
    
    // Get all data
    const allData = await T03Data.getAll();
    console.log(`Total T03 records: ${allData.length}`);
    
    // Get summary stats
    const summary = await T03Data.getSummaryStats();
    console.log('Summary statistics:', {
      totalRecords: summary.total_records,
      uniqueSkus: summary.unique_skus,
      uniqueFactories: summary.unique_factories,
      uniqueWarehouses: summary.unique_warehouses,
      totalQuantity: summary.total_quantity,
      totalWeight: summary.total_weight
    });
    
    // Test filtering by SKU
    const skuData = await T03Data.getBySKU('SKU001');
    console.log(`Records for SKU001: ${skuData.length}`);
    
    // Test filtering by factory
    const factoryData = await T03Data.getByFactory('Factory1');
    console.log(`Records for Factory1: ${factoryData.length}`);
    
    // Test filtering by warehouse
    const warehouseData = await T03Data.getByWarehouse('GFCM');
    console.log(`Records for GFCM warehouse: ${warehouseData.length}`);
    
    // Step 6: Test quantity update
    console.log('\n✏️ Testing quantity update...');
    if (insertedRecords.length > 0) {
      const firstRecord = insertedRecords[0];
      const updatedRecord = await T03Data.updateQuantity(firstRecord.id, 250);
      console.log(`Updated quantity for record ${firstRecord.id}: ${updatedRecord.qty}`);
      console.log(`Calculated weight: ${updatedRecord.wt}`);
      console.log(`Calculated custom duty: ${updatedRecord.custom_duty}`);
      console.log(`Calculated row cost: ${updatedRecord.row_cost}`);
    }
    
    // Step 7: Display sample records
    console.log('\n📋 Sample T03 records:');
    const sampleRecords = await T03Data.getAll({ limit: 5 });
    sampleRecords.slice(0, 5).forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log(`  Warehouse: ${record.wh}`);
      console.log(`  Factory: ${record.plt}`);
      console.log(`  SKU: ${record.fg_sku_code}`);
      console.log(`  Month: ${record.mth_num}`);
      console.log(`  Quantity: ${record.qty}`);
      console.log(`  Weight/Unit: ${record.fg_wt_per_unit}`);
      console.log(`  Total Weight: ${record.wt}`);
      console.log(`  Cost/Unit: ${record.cost_per_unit}`);
      console.log(`  Row Cost: ${record.row_cost}`);
    });
    
    console.log('\n✅ T03 processing test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in T03 processing test:', error);
  }
}

// Run the test
testT03Processing(); 