const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const T04Data = require('./models/T04Data');
const { query } = require('./config/database');

async function readT04ExcelFile() {
  try {
    console.log('📊 Reading complete T04.xlsx file from samples...');
    
    const filePath = path.join(__dirname, '..', 'samples', 'T04.xlsx');
    console.log('File path:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read the workbook with formulas
    const workbook = XLSX.readFile(filePath, { cellFormula: true, cellDates: true });
    
    console.log('\n📋 Workbook Information:');
    console.log('=' .repeat(80));
    console.log('Sheet Names:', workbook.SheetNames);
    
    const allData = {};
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n🔍 Processing sheet: ${sheetName}`);
      console.log('-' .repeat(60));
      
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet['!ref']) {
        console.log('Empty sheet, skipping...');
        continue;
      }
      
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      console.log(`Range: ${worksheet['!ref']}`);
      console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);
      
      // Extract all cell data including formulas
      const sheetData = [];
      const headers = [];
      
      for (let row = 0; row <= range.e.r; row++) {
        const rowData = {};
        
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell) {
            const columnLetter = XLSX.utils.encode_col(col);
            
            if (row === 0) {
              // Store headers
              headers[col] = cell.v || `Column_${columnLetter}`;
            }
            
            const cellInfo = {
              address: cellAddress,
              value: cell.v,
              type: cell.t,
              formula: cell.f || null,
              rawValue: cell.w || cell.v
            };
            
            if (row === 0) {
              rowData[`col_${col}_${columnLetter}`] = cellInfo;
            } else {
              const headerName = headers[col] || `Column_${columnLetter}`;
              rowData[headerName] = cellInfo;
            }
          }
        }
        
        if (Object.keys(rowData).length > 0) {
          sheetData.push({
            row: row,
            data: rowData
          });
        }
      }
      
      allData[sheetName] = {
        range: worksheet['!ref'],
        headers: headers,
        totalRows: range.e.r + 1,
        totalColumns: range.e.c + 1,
        data: sheetData
      };
      
      console.log(`Extracted ${sheetData.length} rows from ${sheetName}`);
      
      // Show sample data (first 5 rows)
      console.log('\n📄 Sample Data (first 5 rows):');
      sheetData.slice(0, 5).forEach((row, index) => {
        console.log(`Row ${row.row}:`, Object.keys(row.data).slice(0, 5).map(key => {
          const cell = row.data[key];
          return `${key}: ${cell.formula ? `=${cell.formula}` : cell.value}`;
        }).join(' | '));
      });
    }
    
    // Save detailed analysis to JSON file
    const outputPath = path.join(__dirname, 't04_complete_analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2));
    console.log(`\n💾 Detailed analysis saved to: ${outputPath}`);
    
    // Process T04 data for database if applicable
    await processT04ForDatabase(allData);
    
    return allData;
    
  } catch (error) {
    console.error('❌ Error reading T04 Excel file:', error);
    throw error;
  }
}

async function processT04ForDatabase(excelData) {
  try {
    console.log('\n🗄️ Processing T04 data for database insertion...');
    
    // Find the main T04 data sheet
    let mainSheet = null;
    let sheetName = null;
    
    // Look for sheets that might contain T04 data
    const possibleSheets = ['T04', 'WHBal', 'Sheet1', 'T04_WHBal'];
    for (const name of possibleSheets) {
      if (excelData[name]) {
        mainSheet = excelData[name];
        sheetName = name;
        break;
      }
    }
    
    // If no specific sheet found, use the first one
    if (!mainSheet && Object.keys(excelData).length > 0) {
      sheetName = Object.keys(excelData)[0];
      mainSheet = excelData[sheetName];
    }
    
    if (!mainSheet) {
      console.log('No suitable data sheet found for database processing');
      return;
    }
    
    console.log(`📊 Processing sheet: ${sheetName}`);
    console.log(`Headers available:`, mainSheet.headers);
    
    // Create mapping from Excel columns to database fields
    const columnMapping = createColumnMapping(mainSheet.headers);
    console.log('\n🔗 Column Mapping:');
    Object.entries(columnMapping).forEach(([excelCol, dbField]) => {
      console.log(`  ${excelCol} -> ${dbField}`);
    });
    
    // Process data rows (skip header row)
    const t04Records = [];
    const dataRows = mainSheet.data.slice(1); // Skip header
    
    for (const row of dataRows) {
      const record = processT04Row(row, columnMapping, mainSheet.headers);
      if (record && record.fg_sku_code) { // Only process rows with SKU code
        t04Records.push(record);
      }
    }
    
    console.log(`\n📦 Processed ${t04Records.length} T04 records`);
    
    if (t04Records.length > 0) {
      // Show sample processed record
      console.log('\n📄 Sample processed record:');
      console.log(JSON.stringify(t04Records[0], null, 2));
      
      // Create table and insert data
      await T04Data.createTable();
      
      // Generate a workbook ID for this import
      const workbookId = require('crypto').randomUUID();
      t04Records.forEach(record => {
        record.workbook_id = workbookId;
      });
      
      console.log('\n💾 Inserting data into database...');
      const insertedRecords = await T04Data.bulkInsert(t04Records);
      console.log(`✅ Successfully inserted ${insertedRecords.length} T04 records`);
      
      // Update calculated fields
      console.log('\n🧮 Updating calculated fields...');
      await T04Data.updateAllCalculatedFields(workbookId);
      
      console.log('\n📊 Summary statistics:');
      const stats = await T04Data.getSummaryStats(workbookId);
      console.log(stats);
    }
    
  } catch (error) {
    console.error('❌ Error processing T04 for database:', error);
    throw error;
  }
}

function createColumnMapping(headers) {
  const mapping = {};
  
  // Common T04 column mappings
  const columnMappings = {
    // Core identifiers
    'WH': 'wh',
    'Warehouse': 'wh', 
    'FG_SKU_CODE': 'fg_sku_code',
    'SKU': 'fg_sku_code',
    'Product': 'fg_sku_code',
    'MTH_NUM': 'mth_num',
    'Month': 'mth_num',
    'Mth': 'mth_num',
    
    // Demand columns
    'MTO_Demand_Next_Month': 'mto_demand_next_month',
    'MTS_Demand_Next_Month': 'mts_demand_next_month',
    'MTS_Demand_Next_3_Months': 'mts_demand_next_3_months',
    
    // Inventory columns
    'Inventory_Days_Norm': 'inventory_days_norm',
    'Store_Cost': 'store_cost',
    'Min_OS': 'min_os',
    'Max_OS': 'max_os',
    'Min_CS': 'min_cs',
    'Max_CS': 'max_cs',
    
    // Opening stock columns
    'M1OS_GFC': 'm1os_gfc',
    'M1OS_KFC': 'm1os_kfc',
    'M1OS_NFC': 'm1os_nfc',
    'M1OS_X': 'm1os_x',
    
    // Weight and other attributes
    'FG_Wt_Per_Unit': 'fg_wt_per_unit',
    'CS_Norm': 'cs_norm',
    'Norm_Markup': 'norm_markup',
    
    // Stock flow columns
    'OS_GFC': 'os_gfc',
    'IN_GFC': 'in_gfc',
    'OUT_GFC': 'out_gfc',
    'CS_GFC': 'cs_gfc',
    'Max_Supply_GFC': 'max_supply_gfc',
    
    'OS_KFC': 'os_kfc',
    'IN_KFC': 'in_kfc',
    'OUT_KFC': 'out_kfc',
    'CS_KFC': 'cs_kfc',
    'Max_Supply_KFC': 'max_supply_kfc',
    
    'OS_NFC': 'os_nfc',
    'IN_NFC': 'in_nfc',
    'OUT_NFC': 'out_nfc',
    'CS_NFC': 'cs_nfc',
    'Max_Supply_NFC': 'max_supply_nfc',
    
    'OS_X': 'os_x',
    'IN_X': 'in_x',
    'OUT_X': 'out_x',
    'CS_X': 'cs_x',
    'Max_Supply_X': 'max_supply_x'
  };
  
  // Map headers to database fields
  headers.forEach((header, index) => {
    if (header && columnMappings[header]) {
      mapping[header] = columnMappings[header];
    } else if (header) {
      // Try fuzzy matching
      const normalized = header.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      for (const [excelCol, dbField] of Object.entries(columnMappings)) {
        const excelNormalized = excelCol.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (normalized === excelNormalized || normalized.includes(excelNormalized)) {
          mapping[header] = dbField;
          break;
        }
      }
    }
  });
  
  return mapping;
}

function processT04Row(row, columnMapping, headers) {
  const record = {};
  
  // Process each cell in the row
  Object.entries(row.data).forEach(([columnName, cellInfo]) => {
    const dbField = columnMapping[columnName];
    if (dbField) {
      let value = cellInfo.value;
      
      // Handle formulas - store both the formula and calculated value
      if (cellInfo.formula) {
        console.log(`Formula found in ${columnName}: =${cellInfo.formula} = ${value}`);
        // For now, use the calculated value, but we could store formulas separately
        record[dbField] = value;
        record[`${dbField}_formula`] = cellInfo.formula; // Store formula for reference
      } else {
        record[dbField] = value;
      }
    }
  });
  
  // Set default values for required fields
  if (!record.wh) record.wh = 'UNKNOWN';
  if (!record.mth_num) record.mth_num = 1;
  if (!record.fg_wt_per_unit) record.fg_wt_per_unit = 1;
  if (!record.norm_markup) record.norm_markup = 1;
  if (!record.max_sup_lim) record.max_sup_lim = 1;
  
  return record;
}

// Main execution
if (require.main === module) {
  readT04ExcelFile().then(() => {
    console.log('\n✅ T04 Excel file processing completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { readT04ExcelFile, processT04ForDatabase }; 