const { query } = require('./config/database');

async function clearT03Data() {
  try {
    console.log('🧹 Starting T03 data cleanup...');
    
    // Clear all T03 data
    const result = await query('DELETE FROM t03_primdist RETURNING *');
    
    console.log(`✅ Cleared ${result.rows.length} T03 records`);
    
    // Reset the sequence
    await query('ALTER SEQUENCE t03_primdist_id_seq RESTART WITH 1');
    console.log('✅ Reset T03 ID sequence');
    
    console.log('🎉 T03 data cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing T03 data:', error);
    throw error;
  }
}

// Run the cleanup
clearT03Data()
  .then(() => {
    console.log('✅ T03 cleanup script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ T03 cleanup script failed:', error);
    process.exit(1);
  }); 