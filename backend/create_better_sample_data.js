const { query } = require('./config/database');
const { v4: uuidv4 } = require('uuid');

async function createBetterSampleData() {
  try {
    console.log('🚀 Creating better sample data for T01/T02 testing...');

    const batchId = uuidv4();
    console.log('📦 Using batch ID:', batchId);

    // Get existing workbooks and worksheets
    const workbook1 = 'fa4490dd-40ee-49f3-8375-673b58e1a5fd'; // Sample Workbook 1
    const workbook2 = '67152e75-3ea6-423e-a3c9-a9ff6f863b63'; // Sample Workbook 2
    const worksheet1 = '1a1c7ee9-c5d4-441c-833e-49f86bbe5268'; // Demand Sheet from Workbook 1
    const worksheet2 = '53ce6855-afcd-403f-9c2c-35b2fdfcadb9'; // Demand Sheet from Workbook 2

    // Clear existing sample data
    console.log('🧹 Clearing existing sample data...');
    await query('DELETE FROM demand_cursor WHERE upload_batch_id = $1', [batchId]);
    await query('DELETE FROM demand_country_master_cursor WHERE upload_batch_id = $1', [batchId]);

    // Create proper demand data with correct structure
    console.log('📊 Creating demand data...');
    const demandData = [
      // Row 0: Headers
      { row: 0, col: 0, value: 'Geography', colName: 'Geography' },
      { row: 0, col: 1, value: 'Market', colName: 'Market' },
      { row: 0, col: 2, value: 'Description', colName: 'Description' },
      { row: 0, col: 3, value: 'PD/NPD', colName: 'PD/NPD' },
      { row: 0, col: 4, value: 'Origin', colName: 'Origin' },
      { row: 0, col: 5, value: 'Unified code', colName: 'Unified code' },
      { row: 0, col: 6, value: 'Code', colName: 'Code' },
      { row: 0, col: 7, value: 'Description', colName: 'Description' },
      { row: 0, col: 8, value: 'UOM', colName: 'UOM' },
      { row: 0, col: 9, value: '1', colName: '1' },
      { row: 0, col: 10, value: '2', colName: '2' },
      { row: 0, col: 11, value: '3', colName: '3' },
      { row: 0, col: 12, value: '4', colName: '4' },
      { row: 0, col: 13, value: '5', colName: '5' },
      { row: 0, col: 14, value: '6', colName: '6' },
      { row: 0, col: 15, value: '7', colName: '7' },
      { row: 0, col: 16, value: '8', colName: '8' },
      { row: 0, col: 17, value: '9', colName: '9' },
      { row: 0, col: 18, value: '10', colName: '10' },
      { row: 0, col: 19, value: '11', colName: '11' },
      { row: 0, col: 20, value: '12', colName: '12' },

      // Row 1: Data row 1
      { row: 1, col: 0, value: 'KSA', colName: 'Geography' },
      { row: 1, col: 1, value: 'KFC', colName: 'Market' },
      { row: 1, col: 2, value: 'Chicken Product 1', colName: 'Description' },
      { row: 1, col: 3, value: 'PD', colName: 'PD/NPD' },
      { row: 1, col: 4, value: 'Local', colName: 'Origin' },
      { row: 1, col: 5, value: '4001370340', colName: 'Unified code' },
      { row: 1, col: 6, value: '4001370340', colName: 'Code' },
      { row: 1, col: 7, value: 'Chicken Product 1', colName: 'Description' },
      { row: 1, col: 8, value: 'Cases', colName: 'UOM' },
      { row: 1, col: 9, value: '100', colName: '1' },
      { row: 1, col: 10, value: '120', colName: '2' },
      { row: 1, col: 11, value: '110', colName: '3' },
      { row: 1, col: 12, value: '130', colName: '4' },
      { row: 1, col: 13, value: '140', colName: '5' },
      { row: 1, col: 14, value: '150', colName: '6' },
      { row: 1, col: 15, value: '160', colName: '7' },
      { row: 1, col: 16, value: '170', colName: '8' },
      { row: 1, col: 17, value: '180', colName: '9' },
      { row: 1, col: 18, value: '190', colName: '10' },
      { row: 1, col: 19, value: '200', colName: '11' },
      { row: 1, col: 20, value: '210', colName: '12' },

      // Row 2: Data row 2
      { row: 2, col: 0, value: 'UAE', colName: 'Geography' },
      { row: 2, col: 1, value: 'GFC', colName: 'Market' },
      { row: 2, col: 2, value: 'Chicken Product 2', colName: 'Description' },
      { row: 2, col: 3, value: 'PD', colName: 'PD/NPD' },
      { row: 2, col: 4, value: 'Local', colName: 'Origin' },
      { row: 2, col: 5, value: '4001370861', colName: 'Unified code' },
      { row: 2, col: 6, value: '4001370861', colName: 'Code' },
      { row: 2, col: 7, value: 'Chicken Product 2', colName: 'Description' },
      { row: 2, col: 8, value: 'Cases', colName: 'UOM' },
      { row: 2, col: 9, value: '80', colName: '1' },
      { row: 2, col: 10, value: '90', colName: '2' },
      { row: 2, col: 11, value: '85', colName: '3' },
      { row: 2, col: 12, value: '95', colName: '4' },
      { row: 2, col: 13, value: '100', colName: '5' },
      { row: 2, col: 14, value: '105', colName: '6' },
      { row: 2, col: 15, value: '110', colName: '7' },
      { row: 2, col: 16, value: '115', colName: '8' },
      { row: 2, col: 17, value: '120', colName: '9' },
      { row: 2, col: 18, value: '125', colName: '10' },
      { row: 2, col: 19, value: '130', colName: '11' },
      { row: 2, col: 20, value: '135', colName: '12' }
    ];

    // Insert demand data
    for (const item of demandData) {
      await query(`
        INSERT INTO demand_cursor (
          workbook_id, worksheet_id, row_index, column_index, column_name, 
          cell_value, cell_type, upload_batch_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [workbook1, worksheet1, item.row, item.col, item.colName, item.value, 'string', batchId]);
    }

    // Create country master data
    console.log('📊 Creating country master data...');
    const countryMasterData = [
      // Row 0: Headers
      { row: 0, col: 0, value: 'Country', colName: 'Country' },
      { row: 0, col: 1, value: 'Market', colName: 'Market' },
      { row: 0, col: 2, value: 'Country Name (Raw demand)', colName: 'Country Name (Raw demand)' },
      { row: 0, col: 3, value: 'Default WH', colName: 'Default WH' },
      { row: 0, col: 4, value: 'Safety Stock WH', colName: 'Safety Stock WH' },

      // Row 1: KSA data
      { row: 1, col: 0, value: 'KSA', colName: 'Country' },
      { row: 1, col: 1, value: 'KFC', colName: 'Market' },
      { row: 1, col: 2, value: 'Saudi Arabia', colName: 'Country Name (Raw demand)' },
      { row: 1, col: 3, value: 'KFCM', colName: 'Default WH' },
      { row: 1, col: 4, value: 'KFCM', colName: 'Safety Stock WH' },

      // Row 2: UAE data
      { row: 2, col: 0, value: 'UAE', colName: 'Country' },
      { row: 2, col: 1, value: 'GFC', colName: 'Market' },
      { row: 2, col: 2, value: 'United Arab Emirates', colName: 'Country Name (Raw demand)' },
      { row: 2, col: 3, value: 'GFCM', colName: 'Default WH' },
      { row: 2, col: 4, value: 'GFCM', colName: 'Safety Stock WH' }
    ];

    // Insert country master data
    for (const item of countryMasterData) {
      await query(`
        INSERT INTO demand_country_master_cursor (
          workbook_id, worksheet_id, row_index, column_index, column_name, 
          cell_value, cell_type, upload_batch_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [workbook2, worksheet2, item.row, item.col, item.colName, item.value, 'string', batchId]);
    }

    console.log('✅ Better sample data created successfully!');
    console.log('📋 Batch ID:', batchId);
    console.log('🎯 You can now test T01 and T02 calculations with this batch ID!');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    process.exit(0);
  }
}

createBetterSampleData(); 