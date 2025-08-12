// ================================================
// INPUT DATA LOAD CONTROLLER
// Complete implementation with header.xlsx loading
// ================================================

const { Client } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

class InputDataLoadController {
    constructor(config) {
        this.config = config;
        this.client = null;
        this.headerTableName = 'header_configuration';
        this.loadResults = [];
    }

    // Initialize database connection
    async initialize() {
        try {
            // First connect to default postgres database
            const defaultClient = new Client({
                ...this.config.database,
                database: 'postgres'
            });
            
            await defaultClient.connect();
            console.log('✅ Connected to postgres database');

            // Check if target database exists
            const dbCheckResult = await defaultClient.query(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [this.config.database.database]
            );

            if (dbCheckResult.rowCount === 0) {
                // Create database
                await defaultClient.query(`CREATE DATABASE ${this.config.database.database}`);
                console.log(`✅ Created database: ${this.config.database.database}`);
            } else {
                console.log(`ℹ️ Database ${this.config.database.database} already exists`);
            }

            await defaultClient.end();

            // Now connect to target database
            this.client = new Client(this.config.database);
            await this.client.connect();
            console.log(`✅ Connected to ${this.config.database.database}`);

        } catch (error) {
            console.error('❌ Database initialization error:', error);
            throw error;
        }
    }

    // Close database connection
    async close() {
        if (this.client) {
            await this.client.end();
            console.log('✅ Database connection closed');
        }
    }

    // Step 1: Load header.xlsx into database
    async loadHeaderFile() {
        console.log('\n📋 STEP 1: Loading header.xlsx into database...');
        
        const headerFilePath = path.join(this.config.dataFolder, 'header_rows.xlsx');
        
        if (!fs.existsSync(headerFilePath)) {
            throw new Error(`Header file not found at: ${headerFilePath}`);
        }

        try {
            // Read the header file
            const workbook = XLSX.readFile(headerFilePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);

            console.log(`  Found ${data.length} file configurations in header.xlsx`);

            // Drop and create header configuration table
            await this.client.query(`DROP TABLE IF EXISTS ${this.headerTableName} CASCADE`);
            
            await this.client.query(`
                CREATE TABLE ${this.headerTableName} (
                    id SERIAL PRIMARY KEY,
                    s_no INTEGER,
                    file_name TEXT,
                    sheet_name TEXT,
                    header_row INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.log(`  ✅ Created table: ${this.headerTableName}`);

            // Insert header data
            const insertQuery = `
                INSERT INTO ${this.headerTableName} 
                (s_no, file_name, sheet_name, header_row)
                VALUES ($1, $2, $3, $4)
            `;

            for (const row of data) {
                await this.client.query(insertQuery, [
                    row['S No'],
                    row['File Name'].replace(/^\/data\//, ''), // Remove /data/ prefix
                    row['SheetName'],
                    parseInt(row['header'])
                ]);
            }

            console.log(`  ✅ Inserted ${data.length} configurations into database`);

            // Verify the data
            const verifyResult = await this.client.query(
                `SELECT COUNT(*) as count FROM ${this.headerTableName}`
            );
            console.log(`  ✅ Verified: ${verifyResult.rows[0].count} rows in ${this.headerTableName}`);

        } catch (error) {
            console.error('❌ Error loading header file:', error);
            throw error;
        }
    }

    // Step 2: Load all data files using header configuration from database
    async loadAllDataFiles() {
        console.log('\n📁 STEP 2: Loading all data files using header configuration...');

        try {
            // Fetch header configurations from database
            const configResult = await this.client.query(`
                SELECT s_no, file_name, sheet_name, header_row 
                FROM ${this.headerTableName}
                ORDER BY s_no
            `);

            const configurations = configResult.rows;
            console.log(`  Found ${configurations.length} file configurations to process`);

            // Process each configuration
            for (const config of configurations) {
                await this.processDataFile(config);
            }

            // Generate summary report
            this.generateLoadReport();

        } catch (error) {
            console.error('❌ Error loading data files:', error);
            throw error;
        }
    }

    // Process individual data file based on configuration
    async processDataFile(config) {
        const filePath = path.join(this.config.dataFolder, config.file_name);
        
        console.log(`\n📄 Processing: ${config.file_name}`);
        console.log(`   Sheet: ${config.sheet_name} | Header Row: ${config.header_row}`);

        if (!fs.existsSync(filePath)) {
            console.error(`   ❌ File not found: ${filePath}`);
            this.loadResults.push({
                ...config,
                status: 'FAILED',
                error: 'File not found'
            });
            return;
        }

        try {
            // Read Excel file
            const workbook = XLSX.readFile(filePath, {
                cellDates: true,
                cellNF: false,
                cellText: false
            });

            // Check if sheet exists
            if (!workbook.SheetNames.includes(config.sheet_name)) {
                console.error(`   ❌ Sheet '${config.sheet_name}' not found`);
                console.log(`   Available sheets: ${workbook.SheetNames.join(', ')}`);
                this.loadResults.push({
                    ...config,
                    status: 'FAILED',
                    error: 'Sheet not found'
                });
                return;
            }

            // Read sheet data
            const sheet = workbook.Sheets[config.sheet_name];
            const allData = XLSX.utils.sheet_to_json(sheet, { 
                header: 1, 
                defval: null,
                raw: false,
                dateNF: 'yyyy-mm-dd'
            });

            // Extract headers and data based on header_row
            const headerRowIndex = config.header_row - 1; // Convert to 0-based
            
            if (allData.length <= headerRowIndex) {
                console.error(`   ❌ Not enough rows. File has ${allData.length} rows`);
                this.loadResults.push({
                    ...config,
                    status: 'FAILED',
                    error: 'Not enough rows'
                });
                return;
            }


            let headers = allData[headerRowIndex];
            console.log(`   🧪 Header Row Raw Data:`, headers);
            
            // Trim and sanitize header values
            headers = headers.map(h => (h || '').toString().trim());
            const dataRows = allData.slice(headerRowIndex + 1);

            
            // const headers = allData[headerRowIndex];
            // const dataRows = allData.slice(headerRowIndex + 1);

            // Filter out empty rows
            const nonEmptyRows = dataRows.filter(row => 
                row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
            );

            console.log(`   Found ${headers.length} columns and ${nonEmptyRows.length} data rows`);

            // Create table and load data
            const tableName = await this.createAndLoadTable(
                config.file_name, 
                config.sheet_name, 
                headers, 
                nonEmptyRows
            );

            this.loadResults.push({
                ...config,
                status: 'SUCCESS',
                table_name: tableName,
                row_count: nonEmptyRows.length,
                column_count: headers.length
            });

            console.log(`   ✅ Successfully loaded into table: ${tableName}`);

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            this.loadResults.push({
                ...config,
                status: 'FAILED',
                error: error.message
            });
        }
    }

    // Create table and load data
    async createAndLoadTable(fileName, sheetName, headers, dataRows) {
        // Generate table name
        const tableName = this.generateTableName(fileName, sheetName);

        // Prepare columns
        const columns = headers.map((header, idx) => ({
            original: header || `column_${idx + 1}`,
            sanitized: this.sanitizeColumnName(header || `column_${idx + 1}`),
            type: this.inferColumnType(dataRows.map(row => row[idx])),
            index: idx
        }));

        // Drop existing table
        await this.client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);

        // Create table
        const columnDefs = columns.map(col => 
            `"${col.sanitized}" ${col.type}`
        ).join(', ');

        await this.client.query(`
            CREATE TABLE ${tableName} (
                id SERIAL PRIMARY KEY,
                ${columnDefs},
                loaded_from_file TEXT DEFAULT '${fileName}',
                loaded_from_sheet TEXT DEFAULT '${sheetName}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert data
        if (dataRows.length > 0) {
            const columnNames = columns.map(c => `"${c.sanitized}"`).join(', ');
            const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
            
            const insertQuery = `
                INSERT INTO ${tableName} (${columnNames}) 
                VALUES (${placeholders})
            `;

            let insertedCount = 0;
            for (const row of dataRows) {
                try {
                    const values = columns.map(col => {
                        const value = row[col.index];
                        return this.convertValue(value, col.type);
                    });

                    await this.client.query(insertQuery, values);
                    insertedCount++;
                } catch (error) {
                    // Log but continue with other rows
                    if (insertedCount === 0) {
                        console.error(`     ⚠️ Sample insert error: ${error.message}`);
                    }
                }
            }

            console.log(`   📥 Inserted ${insertedCount}/${dataRows.length} rows`);
        }

        return tableName;
    }

    // Generate table name from file and sheet
    generateTableName(fileName, sheetName) {
        // Remove path and extension
        const fileBase = path.basename(fileName, '.xlsx')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_');
        
        const sheetBase = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        // Handle common sheet names
        if (sheetBase === 'sheet1' || sheetBase === 'sheet') {
            return fileBase;
        }
        
        // Combine file and sheet name
        let tableName = `${fileBase}_${sheetBase}`;
        
        // Ensure valid PostgreSQL table name (max 63 chars)
        if (tableName.length > 63) {
            tableName = tableName.substring(0, 63);
        }
        
        return tableName.replace(/_{2,}/g, '_').replace(/^_|_$/g, '');
    }

    // Sanitize column name
    sanitizeColumnName(name) {
        return name
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 63);
    }

    // Infer column type
    inferColumnType(values) {
        const nonEmptyValues = values.filter(v => 
            v !== null && v !== undefined && v !== '' && v !== 'N/A'
        );

        if (nonEmptyValues.length === 0) return 'TEXT';

        // Check for boolean
        if (nonEmptyValues.every(v => 
            ['true', 'false', 'yes', 'no', '1', '0'].includes(String(v).toLowerCase())
        )) {
            return 'BOOLEAN';
        }

        // Check for integer
        if (nonEmptyValues.every(v => {
            const num = Number(v);
            return !isNaN(num) && Number.isInteger(num) && Math.abs(num) < 2147483647;
        })) {
            return 'INTEGER';
        }

        // Check for numeric
        if (nonEmptyValues.every(v => !isNaN(Number(v)))) {
            return 'NUMERIC';
        }

        // Check for date
        if (nonEmptyValues.every(v => {
            const date = new Date(v);
            return date instanceof Date && !isNaN(date);
        })) {
            return 'DATE';
        }

        return 'TEXT';
    }

    // Convert value based on type
    convertValue(value, type) {
        if (value === null || value === undefined || value === '' || value === 'N/A') {
            return null;
        }

        switch (type) {
            case 'BOOLEAN':
                return ['true', 'yes', '1'].includes(String(value).toLowerCase());
            case 'INTEGER':
            case 'NUMERIC':
                const num = Number(value);
                return isNaN(num) ? null : num;
            case 'DATE':
                if (typeof value === 'number') {
                    // Excel date serial
                    return new Date((value - 25569) * 86400 * 1000);
                }
                return value;
            default:
                return String(value);
        }
    }

    // Generate load report
    generateLoadReport() {
        console.log('\n' + '='.repeat(70));
        console.log('DATA LOAD SUMMARY REPORT');
        console.log('='.repeat(70));

        const successful = this.loadResults.filter(r => r.status === 'SUCCESS');
        const failed = this.loadResults.filter(r => r.status === 'FAILED');

        console.log(`\nTotal configurations: ${this.loadResults.length}`);
        console.log(`✅ Successful: ${successful.length}`);
        console.log(`❌ Failed: ${failed.length}`);

        if (successful.length > 0) {
            console.log('\n✅ Successfully Loaded Tables:');
            console.log('-'.repeat(70));
            successful.forEach(r => {
                console.log(`${r.table_name.padEnd(40)} | ${String(r.row_count).padStart(6)} rows | ${String(r.column_count).padStart(3)} cols | ${r.file_name}`);
            });
        }

        if (failed.length > 0) {
            console.log('\n❌ Failed Loads:');
            console.log('-'.repeat(70));
            failed.forEach(r => {
                console.log(`${r.file_name.padEnd(40)} | ${r.sheet_name.padEnd(20)} | ${r.error}`);
            });
        }

        console.log('\n' + '='.repeat(70));
    }

    // Main execution method
    async execute() {
        console.log('🚀 Starting InputDataLoadController...\n');
        
        try {
            // Initialize database connection
            await this.initialize();

            // Step 1: Load header.xlsx
            await this.loadHeaderFile();

            // Step 2: Load all data files
            await this.loadAllDataFiles();

            console.log('\n✅ Data loading completed successfully!');

        } catch (error) {
            console.error('\n❌ Fatal error during data loading:', error);
            throw error;
        }
    }

    // Utility method to query loaded tables
    async getLoadedTables() {
        const result = await this.client.query(`
            SELECT 
                table_name,
                pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE columns.table_name = tables.table_name) as column_count
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name != '${this.headerTableName}'
            ORDER BY table_name
        `);

        return result.rows;
    }
}

// ================================================
// JUPYTER NOTEBOOK USAGE
// ================================================

// Configuration
// Option 1: Check if config exists and update it
if (typeof config === 'undefined') {
    var config = {
        database: {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'your_password',
            database: 'americana_db'
        },
        dataFolder: 'D:\\Factory Production\\Input Data'
    };
} else {
    // Update existing config
    config.database = {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'your_password',
        database: 'americana_db'
    };
    dataFolder: 'D:\\Factory Production\\Input Data'
}

// Main execution function
async function runDataLoad() {
    const controller = new InputDataLoadController(config);
    
    try {
        await controller.execute();
        
        // Get summary of loaded tables
        const tables = await controller.getLoadedTables();
        console.log('\n📊 Loaded Tables Summary:');
        console.table(tables);
        
    } finally {
        await controller.close();
    }
}

// Utility functions for Jupyter

// Function to query any loaded table
async function queryLoadedTable(tableName, limit = 10) {
    const client = new Client(config.database);
    
    try {
        await client.connect();
        
        const result = await client.query(
            `SELECT * FROM ${tableName} LIMIT $1`,
            [limit]
        );
        
        console.log(`\n📊 Table: ${tableName} (showing ${limit} rows)`);
        console.table(result.rows);
        
    } finally {
        await client.end();
    }
}

// Function to check header configuration
async function checkHeaderConfiguration() {
    const client = new Client(config.database);
    
    try {
        await client.connect();
        
        const result = await client.query(`
            SELECT * FROM header_configuration 
            ORDER BY s_no
        `);
        
        console.log('\n📋 Header Configuration:');
        console.table(result.rows);
        
    } finally {
        await client.end();
    }
}

// Export for use
module.exports = {
    InputDataLoadController,
    runDataLoad,
    queryLoadedTable,
    checkHeaderConfiguration,
    config
};

// Simply call the function that's already defined in your code
runDataLoad()
    .then(() => {
        console.log('✅ Data loading completed!');
    })
    .catch((error) => {
        console.error('❌ Error:', error);
    });
    