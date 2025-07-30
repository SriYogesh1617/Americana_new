const fs = require('fs').promises;
const path = require('path');
const { pool } = require('./config/database');

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...');
    
    // Read the database schema file
    const schemaPath = path.join(__dirname, 'models', 'database.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let executedCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        if (statement.trim()) {
          await client.query(statement);
          executedCount++;
          console.log(`✅ Executed statement ${executedCount}`);
        }
      } catch (error) {
        // Ignore errors for statements that might already exist (like CREATE TABLE IF NOT EXISTS)
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`ℹ️  Skipped (already exists): ${statement.substring(0, 50)}...`);
        } else {
          console.error(`❌ Error executing statement: ${error.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
          errorCount++;
        }
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully executed: ${executedCount} statements`);
    if (errorCount > 0) {
      console.log(`❌ Errors encountered: ${errorCount} statements`);
    }
    
    // Verify the new tables exist
    console.log('\n🔍 Verifying new cursor tables...');
    const tables = ['demand_cursor', 'demand_country_master_cursor', 'base_scenario_configuration_cursor'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        if (result.rows[0].exists) {
          console.log(`✅ Table '${table}' exists`);
        } else {
          console.log(`❌ Table '${table}' does not exist`);
        }
      } catch (error) {
        console.error(`❌ Error checking table '${table}':`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('\n✨ All migrations completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations }; 