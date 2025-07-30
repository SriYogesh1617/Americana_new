const { pool } = require('./config/database');

async function clearDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Starting database cleanup...');
    
    // Disable foreign key checks temporarily (PostgreSQL doesn't have this, but we'll handle it properly)
    await client.query('BEGIN');
    
    // Clear data from all tables in the correct order (respecting foreign key constraints)
    const tables = [
      'demand_export_jobs',
      'export_jobs', 
      'macro_calculations',
      'sheet_data',
      'worksheets',
      'workbooks',
      'demand_templates',
      'uploaded_files'
    ];
    
    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ Cleared ${result.rowCount} rows from ${table}`);
      } catch (error) {
        console.error(`❌ Error clearing ${table}:`, error.message);
      }
    }
    
    // Reset sequences if they exist
    const sequences = [
      'uploaded_files_id_seq',
      'workbooks_id_seq', 
      'worksheets_id_seq',
      'sheet_data_id_seq',
      'macro_calculations_id_seq',
      'export_jobs_id_seq',
      'demand_templates_id_seq',
      'demand_export_jobs_id_seq'
    ];
    
    for (const sequence of sequences) {
      try {
        await client.query(`ALTER SEQUENCE IF EXISTS ${sequence} RESTART WITH 1`);
        console.log(`✅ Reset sequence: ${sequence}`);
      } catch (error) {
        // Sequences might not exist, that's okay
        console.log(`ℹ️  Sequence ${sequence} not found (this is normal)`);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Database cleanup completed successfully!');
    console.log('📝 You can now import your new zip file.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  clearDatabase()
    .then(() => {
      console.log('🎉 Database cleared successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to clear database:', error);
      process.exit(1);
    });
}

module.exports = { clearDatabase }; 