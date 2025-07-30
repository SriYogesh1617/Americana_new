const { pool } = require('./config/database');
const { v4: uuidv4 } = require('uuid');

async function populateCursorTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting cursor tables population...');
    
    // Generate a batch ID for this population
    const batchId = uuidv4();
    console.log(`📦 Using batch ID: ${batchId}`);
    
    // 1. Populate demand_cursor from Demand workbook
    console.log('\n📊 Processing Demand data...');
    const demandResult = await client.query(`
      INSERT INTO demand_cursor (
        workbook_id, worksheet_id, row_index, column_index, column_name, 
        cell_value, cell_type, formula, upload_batch_id
      )
      SELECT 
        w.id as workbook_id,
        ws.id as worksheet_id,
        sd.row_index,
        sd.column_index,
        sd.column_name,
        sd.cell_value,
        sd.cell_type,
        sd.formula,
        $1 as upload_batch_id
      FROM workbooks w
      JOIN worksheets ws ON w.id = ws.workbook_id
      JOIN sheet_data sd ON ws.id = sd.worksheet_id
      WHERE w.workbook_name ILIKE '%demand%' 
        AND w.workbook_name NOT ILIKE '%country%' 
        AND w.workbook_name NOT ILIKE '%master%'
      ON CONFLICT DO NOTHING
      RETURNING id;
    `, [batchId]);
    
    console.log(`✅ Inserted ${demandResult.rowCount} records into demand_cursor`);
    
    // 2. Populate demand_country_master_cursor from Demand_country_master workbook
    console.log('\n📊 Processing Demand Country Master data...');
    const countryMasterResult = await client.query(`
      INSERT INTO demand_country_master_cursor (
        workbook_id, worksheet_id, row_index, column_index, column_name, 
        cell_value, cell_type, formula, upload_batch_id
      )
      SELECT 
        w.id as workbook_id,
        ws.id as worksheet_id,
        sd.row_index,
        sd.column_index,
        sd.column_name,
        sd.cell_value,
        sd.cell_type,
        sd.formula,
        $1 as upload_batch_id
      FROM workbooks w
      JOIN worksheets ws ON w.id = ws.workbook_id
      JOIN sheet_data sd ON ws.id = sd.worksheet_id
      WHERE w.workbook_name ILIKE '%demand%country%master%'
      ON CONFLICT DO NOTHING
      RETURNING id;
    `, [batchId]);
    
    console.log(`✅ Inserted ${countryMasterResult.rowCount} records into demand_country_master_cursor`);
    
    // 3. Populate base_scenario_configuration_cursor from Base_scenario_configuration workbook
    console.log('\n📊 Processing Base Scenario Configuration data...');
    const baseScenarioResult = await client.query(`
      INSERT INTO base_scenario_configuration_cursor (
        workbook_id, worksheet_id, row_index, column_index, column_name, 
        cell_value, cell_type, formula, upload_batch_id
      )
      SELECT 
        w.id as workbook_id,
        ws.id as worksheet_id,
        sd.row_index,
        sd.column_index,
        sd.column_name,
        sd.cell_value,
        sd.cell_type,
        sd.formula,
        $1 as upload_batch_id
      FROM workbooks w
      JOIN worksheets ws ON w.id = ws.workbook_id
      JOIN sheet_data sd ON ws.id = sd.worksheet_id
      WHERE w.workbook_name ILIKE '%base%scenario%configuration%'
        AND (ws.sheet_name ILIKE '%planning%time%period%' OR ws.sheet_name ILIKE '%base%scenario%')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `, [batchId]);
    
    console.log(`✅ Inserted ${baseScenarioResult.rowCount} records into base_scenario_configuration_cursor`);
    
    // Verify the population
    console.log('\n🔍 Verifying population results...');
    const verificationResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM demand_cursor) as demand_count,
        (SELECT COUNT(*) FROM demand_country_master_cursor) as country_master_count,
        (SELECT COUNT(*) FROM base_scenario_configuration_cursor) as base_scenario_count;
    `);
    
    const counts = verificationResult.rows[0];
    console.log(`📈 Final counts:`);
    console.log(`   - Demand cursor: ${counts.demand_count} records`);
    console.log(`   - Country Master cursor: ${counts.country_master_count} records`);
    console.log(`   - Base Scenario cursor: ${counts.base_scenario_count} records`);
    
    console.log('\n🎉 Cursor tables population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error populating cursor tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run population if this file is executed directly
if (require.main === module) {
  populateCursorTables()
    .then(() => {
      console.log('\n✨ All cursor tables populated successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateCursorTables }; 