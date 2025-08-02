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
      
      // Extract headers from row 3 (index 2)
      const headerRow = 2; // Row 3 (0-indexed)
      const headers = [];
      
      console.log('\n📋 Reading headers from row 3:');
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
        const cell = worksheet[cellAddress];
        const headerValue = cell ? (cell.v || `Column_${XLSX.utils.encode_col(col)}`) : `Column_${XLSX.utils.encode_col(col)}`;
        headers[col] = headerValue;
        if (col < 25) { // Show first 25 headers
          console.log(`  Column ${XLSX.utils.encode_col(col)}: ${headerValue}`);
        }
      }
      
      console.log(`  ... and ${Math.max(0, headers.length - 25)} more columns`);
      
      // Extract all cell data including formulas
      const sheetData = [];
      
      // Start from row 4 (index 3) for data, since headers are in row 3
      for (let row = headerRow + 1; row <= range.e.r; row++) {
        const rowData = {};
        let hasData = false;
        
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell) {
            hasData = true;
            const headerName = headers[col] || `Column_${XLSX.utils.encode_col(col)}`;
            
            const cellInfo = {
              address: cellAddress,
              value: cell.v,
              type: cell.t,
              formula: cell.f || null,
              rawValue: cell.w || cell.v
            };
            
            rowData[headerName] = cellInfo;
          }
        }
        
        if (hasData) {
          sheetData.push({
            row: row,
            data: rowData
          });
        }
      }
      
      allData[sheetName] = {
        range: worksheet['!ref'],
        headers: headers,
        headerRow: headerRow,
        totalRows: range.e.r + 1,
        totalColumns: range.e.c + 1,
        dataRows: sheetData.length,
        data: sheetData
      };
      
      console.log(`\nExtracted ${sheetData.length} data rows from ${sheetName}`);
      
      // Show sample data (first 5 rows)
      console.log('\n📄 Sample Data (first 5 data rows):');
      sheetData.slice(0, 5).forEach((row, index) => {
        const sampleCells = Object.keys(row.data).slice(0, 5).map(key => {
          const cell = row.data[key];
          const displayValue = cell.formula ? `=${cell.formula}` : cell.value;
          return `${key}: ${displayValue}`;
        }).join(' | ');
        console.log(`Row ${row.row + 1}: ${sampleCells}`);
      });
      
      // Show formulas found
      console.log('\n🧮 Sample Formulas Found:');
      let formulaCount = 0;
      for (const row of sheetData.slice(0, 10)) {
        for (const [columnName, cellInfo] of Object.entries(row.data)) {
          if (cellInfo.formula && formulaCount < 15) {
            console.log(`  ${cellInfo.address} (${columnName}): =${cellInfo.formula} = ${cellInfo.value}`);
            formulaCount++;
          }
        }
        if (formulaCount >= 15) break;
      }
      
      if (formulaCount === 0) {
        console.log('  No formulas found in sample data');
      }
    }
    
    // Process T04 data for database
    const result = await processT04ForDatabase(allData);
    
    return { allData, result };
    
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
    const possibleSheets = ['T04', 'WHBal', 'Sheet1', 'T04_WHBal', 'Sheet4'];
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
    console.log(`Headers available (first 10):`, mainSheet.headers.slice(0, 10));
    console.log(`Total headers: ${mainSheet.headers.length}`);
    console.log(`Data rows available: ${mainSheet.dataRows}`);
    
    // Create mapping from Excel columns to database fields
    const columnMapping = createColumnMapping(mainSheet.headers);
    console.log('\n🔗 Column Mapping (found mappings):');
    Object.entries(columnMapping).forEach(([excelCol, dbField]) => {
      console.log(`  ${excelCol} -> ${dbField}`);
    });
    
    if (Object.keys(columnMapping).length === 0) {
      console.log('❌ No column mappings found. Cannot process data.');
      return;
    }
    
    // Process data rows
    const t04Records = [];
    const dataRows = mainSheet.data; // All data rows (headers already excluded)
    
    console.log(`\n⚙️ Processing ${dataRows.length} data rows...`);
    
    const maxRows = Math.min(dataRows.length, 5000); // Limit for initial processing
    for (let i = 0; i < maxRows; i++) {
      const row = dataRows[i];
      const record = processT04Row(row, columnMapping, mainSheet.headers);
      if (record && record.fg_sku_code && record.fg_sku_code.toString().trim() !== '') { 
        // Clean the SKU code
        record.fg_sku_code = record.fg_sku_code.toString().trim();
        t04Records.push(record);
      }
      
      // Show progress every 500 rows
      if ((i + 1) % 500 === 0) {
        console.log(`  Processed ${i + 1} rows, valid records: ${t04Records.length}`);
      }
    }
    
    console.log(`\n📦 Processed ${t04Records.length} valid T04 records from ${maxRows} rows`);
    
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
      
      return { workbookId, recordCount: insertedRecords.length, stats };
    }
    
  } catch (error) {
    console.error('❌ Error processing T04 for database:', error);
    throw error;
  }
}

function createColumnMapping(headers) {
  const mapping = {};
  
  // Common T04 column mappings (exact matches from Excel headers)
  const columnMappings = {
    // Core identifiers (exact matches from the Excel file)
    'WH': 'wh',
    'FGSKUCode': 'fg_sku_code',
    'MthNum': 'mth_num',
    
    // Demand columns
    'MTO Demand (Next Month)': 'mto_demand_next_month',
    'MTS Demand (Next Month)': 'mts_demand_next_month',
    'MTS Demand (Next 3 Months)': 'mts_demand_next_3_months',
    
    // Inventory columns
    'Inventory Days(Norm)': 'inventory_days_norm',
    'StoreCost': 'store_cost',
    'MinOS': 'min_os',
    'MaxOS': 'max_os',
    'MinCS': 'min_cs',
    'MaxCS': 'max_cs',
    'MaxSupLim': 'max_sup_lim',
    
    // Opening stock columns
    'M1OSGFC': 'm1os_gfc',
    'M1OSKFC': 'm1os_kfc',
    'M1OSNFC': 'm1os_nfc',
    'M1OSX': 'm1os_x',
    
    // Weight and other attributes
    'FGWtPerUnit': 'fg_wt_per_unit',
    'CSNorm': 'cs_norm',
    'NormMarkup': 'norm_markup',
    
    // Stock flow columns for each factory
    'OSGFC': 'os_gfc', 'INGFC': 'in_gfc', 'OUTGFC': 'out_gfc', 'CSGFC': 'cs_gfc',
    'MaxSupplyGFC': 'max_supply_gfc',
    'OSKFC': 'os_kfc', 'INKFC': 'in_kfc', 'OUTKFC': 'out_kfc', 'CSKFC': 'cs_kfc',
    'MaxSupplyKFC': 'max_supply_kfc',
    'OSNFC': 'os_nfc', 'INNFC': 'in_nfc', 'OUTNFC': 'out_nfc', 'CSNFC': 'cs_nfc',
    'MaxSupplyNFC': 'max_supply_nfc',
    'OSX': 'os_x', 'INX': 'in_x', 'OUTX': 'out_x', 'CSX': 'cs_x',
    'MaxSupplyX': 'max_supply_x',
    
    // Total columns
    'OSTot': 'os_tot', 'INTot': 'in_tot', 'OUTTot': 'out_tot', 'CSTot': 'cs_tot',
    'MaxSupplyTot': 'max_supply_tot',
    
    // Weight columns
    'CSWtGFC': 'cs_wt_gfc', 'CSWtKFC': 'cs_wt_kfc', 'CSWtNFC': 'cs_wt_nfc'
  };
  
  // Map headers to database fields
  headers.forEach((header, index) => {
    if (header && columnMappings[header]) {
      mapping[header] = columnMappings[header];
    } else if (header) {
      // Try fuzzy matching for common patterns
      const headerStr = header.toString().trim();
      
      // Try normalized matching (remove spaces, parentheses, etc.)
      const normalized = headerStr.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      for (const [excelCol, dbField] of Object.entries(columnMappings)) {
        const excelNormalized = excelCol.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (normalized === excelNormalized) {
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
      
      // Handle different value types
      if (value !== null && value !== undefined) {
        // Handle string representations of large numbers with commas
        if (typeof value === 'string' && value.includes(',')) {
          // Remove commas and try to parse as number
          const cleanedValue = value.replace(/,/g, '');
          const numValue = parseFloat(cleanedValue);
          if (!isNaN(numValue) && isFinite(numValue)) {
            value = numValue;
          }
        } else if (typeof value === 'string' && value.trim() === '') {
          value = null;
        } else if (typeof value === 'string') {
          // Try to parse as number if it looks like one
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && isFinite(numValue)) {
            value = numValue;
          }
        }
      }
      
      // Handle formulas - use the calculated value
      if (cellInfo.formula) {
        // Store the calculated value from the formula
        record[dbField] = value;
      } else {
        record[dbField] = value;
      }
    }
  });
  
  // Set default values for required fields
  if (!record.wh || record.wh === '') record.wh = 'UNKNOWN';
  if (!record.mth_num) record.mth_num = 1;
  if (!record.fg_wt_per_unit) record.fg_wt_per_unit = 1;
  if (!record.norm_markup) record.norm_markup = 1;
  if (!record.max_sup_lim) record.max_sup_lim = 1;
  if (!record.store_cost) record.store_cost = 0.01;
  
  // Handle large number defaults
  if (!record.max_os) record.max_os = 10000000000;
  if (!record.max_cs) record.max_cs = 10000000000;
  
  return record;
}

// Main execution
if (require.main === module) {
  readT04ExcelFile().then((result) => {
    console.log('\n✅ T04 Excel file processing completed successfully');
    if (result.result) {
      console.log(`📊 Database records inserted: ${result.result.recordCount}`);
      console.log(`🔑 Workbook ID: ${result.result.workbookId}`);
    }
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { readT04ExcelFile, processT04ForDatabase }; 