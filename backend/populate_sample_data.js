const { query } = require('./config/database');
const { v4: uuidv4 } = require('uuid');

async function populateSampleData() {
  try {
    console.log('🚀 Starting to populate sample data...');
    
    // Create sample upload batch IDs
    const sampleBatch1 = uuidv4();
    const sampleBatch2 = uuidv4();
    
    console.log('Sample batch 1:', sampleBatch1);
    console.log('Sample batch 2:', sampleBatch2);
    
    // Create sample workbooks and worksheets
    console.log('📊 Creating sample workbooks and worksheets...');
    const workbook1 = uuidv4();
    const workbook2 = uuidv4();
    const worksheet1 = uuidv4();
    const worksheet2 = uuidv4();
    const file1 = uuidv4();
    const file2 = uuidv4();
    
    // Insert uploaded files first
    await query(`
      INSERT INTO uploaded_files (id, original_name, file_size, file_type, status)
      VALUES 
        ('${file1}', 'Sample File 1.xlsx', 1024, 'xlsx', 'processed'),
        ('${file2}', 'Sample File 2.xlsx', 1024, 'xlsx', 'processed')
      ON CONFLICT DO NOTHING
    `);
    
    // Insert workbooks
    await query(`
      INSERT INTO workbooks (id, workbook_name, file_id)
      VALUES 
        ('${workbook1}', 'Sample Workbook 1', '${file1}'),
        ('${workbook2}', 'Sample Workbook 2', '${file2}')
      ON CONFLICT DO NOTHING
    `);
    
    // Insert worksheets
    await query(`
      INSERT INTO worksheets (id, sheet_name, workbook_id, sheet_index)
      VALUES 
        ('${worksheet1}', 'Demand Sheet', '${workbook1}', 0),
        ('${worksheet2}', 'Demand Sheet', '${workbook2}', 0)
      ON CONFLICT DO NOTHING
    `);
    
    // Insert sample data into demand_cursor
    console.log('📊 Inserting sample demand cursor data...');
    await query(`
      INSERT INTO demand_cursor (workbook_id, worksheet_id, row_index, column_index, column_name, cell_value, cell_type, upload_batch_id)
      VALUES 
        ('${workbook1}', '${worksheet1}', 0, 0, 'Geography', 'KSA', 'string', '${sampleBatch1}'),
        ('${workbook1}', '${worksheet1}', 0, 1, 'Market', 'KFC', 'string', '${sampleBatch1}'),
        ('${workbook1}', '${worksheet1}', 0, 6, 'Code', 'SKU001', 'string', '${sampleBatch1}'),
        ('${workbook2}', '${worksheet2}', 1, 0, 'Geography', 'UAE', 'string', '${sampleBatch2}'),
        ('${workbook2}', '${worksheet2}', 1, 1, 'Market', 'GFC', 'string', '${sampleBatch2}'),
        ('${workbook2}', '${worksheet2}', 1, 6, 'Code', 'SKU002', 'string', '${sampleBatch2}')
      ON CONFLICT DO NOTHING
    `);
    
    // Insert sample data into demand_country_master_cursor
    console.log('📊 Inserting sample demand country master cursor data...');
    await query(`
      INSERT INTO demand_country_master_cursor (workbook_id, worksheet_id, row_index, column_index, column_name, cell_value, cell_type, upload_batch_id)
      VALUES 
        ('${workbook1}', '${worksheet1}', 0, 2, 'Country Name (Raw demand)', 'Saudi Arabia', 'string', '${sampleBatch1}'),
        ('${workbook1}', '${worksheet1}', 0, 1, 'Market', 'KFC', 'string', '${sampleBatch1}'),
        ('${workbook1}', '${worksheet1}', 0, 3, 'Default WH', 'KFC-WH', 'string', '${sampleBatch1}'),
        ('${workbook2}', '${worksheet2}', 1, 2, 'Country Name (Raw demand)', 'United Arab Emirates', 'string', '${sampleBatch2}'),
        ('${workbook2}', '${worksheet2}', 1, 1, 'Market', 'GFC', 'string', '${sampleBatch2}'),
        ('${workbook2}', '${worksheet2}', 1, 3, 'Default WH', 'GFC-WH', 'string', '${sampleBatch2}')
      ON CONFLICT DO NOTHING
    `);
    
    // Insert sample data into base_scenario_configuration_cursor
    console.log('📊 Inserting sample base scenario configuration cursor data...');
    await query(`
      INSERT INTO base_scenario_configuration_cursor (workbook_id, worksheet_id, row_index, column_index, column_name, cell_value, cell_type, upload_batch_id)
      VALUES 
        ('${workbook1}', '${worksheet1}', 0, 0, 'Month', 'January', 'string', '${sampleBatch1}'),
        ('${workbook1}', '${worksheet1}', 0, 1, 'Year', '2024', 'string', '${sampleBatch1}'),
        ('${workbook2}', '${worksheet2}', 1, 0, 'Month', 'February', 'string', '${sampleBatch2}'),
        ('${workbook2}', '${worksheet2}', 1, 1, 'Year', '2024', 'string', '${sampleBatch2}')
      ON CONFLICT DO NOTHING
    `);
    
    // Insert sample data into capacity_cursor
    console.log('📊 Inserting sample capacity cursor data...');
    await query(`
      INSERT INTO capacity_cursor (upload_batch_id, row_index, column_index, cell_value, cell_type)
      VALUES 
        ('${sampleBatch1}', 0, 1, 'SKU001', 'string'),
        ('${sampleBatch1}', 0, 9, 'Production', 'string'),
        ('${sampleBatch1}', 0, 13, '30', 'number'),
        ('${sampleBatch2}', 1, 1, 'SKU002', 'string'),
        ('${sampleBatch2}', 1, 9, 'Production', 'string'),
        ('${sampleBatch2}', 1, 13, '45', 'number')
      ON CONFLICT DO NOTHING
    `);
    
    // Insert sample data into freight_storage_costs_cursor
    console.log('📊 Inserting sample freight storage costs cursor data...');
    await query(`
      INSERT INTO freight_storage_costs_cursor (row_index, column_index, cell_value, cell_type, upload_batch_id)
      VALUES 
        (0, 0, 'SKU001', 'string', '${sampleBatch1}'),
        (0, 1, 'Origin', 'string', '${sampleBatch1}'),
        (0, 2, 'Destination', 'string', '${sampleBatch1}'),
        (0, 3, '100', 'number', '${sampleBatch1}'),
        (1, 0, 'SKU002', 'string', '${sampleBatch2}'),
        (1, 1, 'Origin', 'string', '${sampleBatch2}'),
        (1, 2, 'Destination', 'string', '${sampleBatch2}'),
        (1, 3, '150', 'number', '${sampleBatch2}')
      ON CONFLICT DO NOTHING
    `);
    
    console.log('✅ Sample data populated successfully!');
    console.log('📋 Sample batch IDs:');
    console.log(`   Batch 1: ${sampleBatch1}`);
    console.log(`   Batch 2: ${sampleBatch2}`);
    console.log('\n🎯 You can now test T01 and T02 calculations with these batch IDs!');
    
  } catch (error) {
    console.error('❌ Error populating sample data:', error);
  } finally {
    process.exit(0);
  }
}

populateSampleData(); 