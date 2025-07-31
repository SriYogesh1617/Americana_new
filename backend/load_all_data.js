// ================================================
// SCRIPT TO LOAD ALL DATA FILES INTO DATABASE
// ================================================

const { InputDataLoadController } = require('./controllers/InputDataController');
const path = require('path');

// Configuration for the database and data folder
const config = {
    database: {
        host: 'localhost',
        port: 5432,
        user: 'postgres_user',
        password: '1234',
        database: 'americana_db_v2'
    },
    dataFolder: path.join(__dirname, '../../data')
};

// Main execution function
async function loadAllData() {
    console.log('🚀 Starting data load process...');
    console.log(`📁 Data folder: ${config.dataFolder}`);
    console.log(`🗄️  Database: ${config.database.database}`);
    console.log('');
    
    const controller = new InputDataLoadController(config);
    
    try {
        await controller.execute();
        
        // Get summary of loaded tables
        const tables = await controller.getLoadedTables();
        console.log('\n📊 Final Summary - All Loaded Tables:');
        console.log('='.repeat(70));
        tables.forEach(table => {
            console.log(`Table: ${table.table_name.padEnd(40)} | Size: ${table.size.padEnd(10)} | Columns: ${table.column_count}`);
        });
        
        console.log('\n✅ All data loaded successfully!');
        
    } catch (error) {
        console.error('\n❌ Failed to load data:', error);
        process.exit(1);
    } finally {
        await controller.close();
    }
}

// Run the data load
loadAllData();