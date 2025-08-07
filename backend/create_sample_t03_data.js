const T03Data = require('./models/T03Data');

async function createSampleT03Data() {
  try {
    console.log('🚀 Creating sample T03 data...');
    
    // Sample T03 data
    const sampleData = [
      {
        wh: 'GFCM',
        plt: 'PLT1',
        fgsku_code: 'SKU001',
        mth_num: 5,
        cost_per_unit: 10.50,
        custom_cost_per_unit: 2.25,
        max_qty: 1000,
        fg_wt_per_unit: 0.5,
        qty: 100,
        wt: 50.0,
        custom_duty: 225.0,
        poscheck: true,
        qty_lte_max: true,
        row_cost: 1050.0,
        upload_batch_id: '550e8400-e29b-41d4-a716-446655440000'
      },
      {
        wh: 'KFCM',
        plt: 'PLT2',
        fgsku_code: 'SKU002',
        mth_num: 6,
        cost_per_unit: 12.75,
        custom_cost_per_unit: 3.00,
        max_qty: 1500,
        fg_wt_per_unit: 0.75,
        qty: 200,
        wt: 150.0,
        custom_duty: 600.0,
        poscheck: true,
        qty_lte_max: true,
        row_cost: 2550.0,
        upload_batch_id: '550e8400-e29b-41d4-a716-446655440000'
      },
      {
        wh: 'NFCM',
        plt: 'PLT1',
        fgsku_code: 'SKU003',
        mth_num: 7,
        cost_per_unit: 8.25,
        custom_cost_per_unit: 1.50,
        max_qty: 800,
        fg_wt_per_unit: 0.25,
        qty: 75,
        wt: 18.75,
        custom_duty: 112.5,
        poscheck: true,
        qty_lte_max: true,
        row_cost: 618.75,
        upload_batch_id: '550e8400-e29b-41d4-a716-446655440000'
      },
      {
        wh: 'GFCM',
        plt: 'PLT3',
        fgsku_code: 'SKU004',
        mth_num: 8,
        cost_per_unit: 15.00,
        custom_cost_per_unit: 4.00,
        max_qty: 2000,
        fg_wt_per_unit: 1.0,
        qty: 300,
        wt: 300.0,
        custom_duty: 1200.0,
        poscheck: true,
        qty_lte_max: true,
        row_cost: 4500.0,
        upload_batch_id: '550e8400-e29b-41d4-a716-446655440000'
      },
      {
        wh: 'KFCM',
        plt: 'PLT2',
        fgsku_code: 'SKU005',
        mth_num: 9,
        cost_per_unit: 9.50,
        custom_cost_per_unit: 2.00,
        max_qty: 1200,
        fg_wt_per_unit: 0.6,
        qty: 150,
        wt: 90.0,
        custom_duty: 300.0,
        poscheck: true,
        qty_lte_max: true,
        row_cost: 1425.0,
        upload_batch_id: '550e8400-e29b-41d4-a716-446655440000'
      }
    ];

    // Insert sample data
    const result = await T03Data.bulkInsert(sampleData);
    
    console.log(`✅ Created ${result.length} sample T03 records`);
    
    // Verify the data was inserted
    const allData = await T03Data.getAll();
    console.log(`📊 Total T03 records in database: ${allData.length}`);
    
    console.log('🎉 Sample T03 data creation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating sample T03 data:', error);
    throw error;
  }
}

// Run the sample data creation
createSampleT03Data()
  .then(() => {
    console.log('✅ Sample T03 data creation script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sample T03 data creation script failed:', error);
    process.exit(1);
  }); 