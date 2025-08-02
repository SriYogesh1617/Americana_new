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
      
      // Extract headers from row 4 (index 3)
      const headerRow = 3; // Row 4 (0-indexed)
      const headers = [];
      
      console.log('\n📋 Reading headers from row 4:');
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
        const cell = worksheet[cellAddress];
        const headerValue = cell ? (cell.v || `Column_${XLSX.utils.encode_col(col)}`) : `Column_${XLSX.utils.encode_col(col)}`;
        headers[col] = headerValue;
        if (col < 20) { // Show first 20 headers
          console.log(`  Column ${XLSX.utils.encode_col(col)}: ${headerValue}`);
        }
      }
      
      // Extract all cell data including formulas
      const sheetData = [];
      
      // Start from row 5 (index 4) for data, since headers are in row 4
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
        console.log(`Row ${row.row}: ${sampleCells}`);
      });
      
      // Show formulas found
      console.log('\n🧮 Sample Formulas Found:');
      let formulaCount = 0;
      for (const row of sheetData.slice(0, 10)) {
        for (const [columnName, cellInfo] of Object.entries(row.data)) {
          if (cellInfo.formula && formulaCount < 10) {
            console.log(`  ${cellInfo.address} (${columnName}): =${cellInfo.formula} = ${cellInfo.value}`);
            formulaCount++;
          }
        }
        if (formulaCount >= 10) break;
      }
      
      if (formulaCount === 0) {
        console.log('  No formulas found in sample data');
      }
    }
    
    // Save detailed analysis to JSON file (but limit the size)
    const outputPath = path.join(__dirname, 't04_structure_analysis.json');
    const summaryData = {};
    
    // Create a summary version to avoid huge files
    Object.keys(allData).forEach(sheetName => {
      summaryData[sheetName] = {
        range: allData[sheetName].range,
        headers: allData[sheetName].headers,
        headerRow: allData[sheetName].headerRow,
        totalRows: allData[sheetName].totalRows,
        totalColumns: allData[sheetName].totalColumns,
        dataRows: allData[sheetName].dataRows,
        sampleData: allData[sheetName].data.slice(0, 5) // Only first 5 rows for sample
      };
    });
    
    fs.writeFileSync(outputPath, JSON.stringify(summaryData, null, 2));
    console.log(`\n💾 Structure analysis saved to: ${outputPath}`);
    
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
    
    // Process data rows
    const t04Records = [];
    const dataRows = mainSheet.data; // All data rows (headers already excluded)
    
    console.log(`\n⚙️ Processing ${dataRows.length} data rows...`);
    
    for (let i = 0; i < Math.min(dataRows.length, 1000); i++) { // Limit to first 1000 rows for testing
      const row = dataRows[i];
      const record = processT04Row(row, columnMapping, mainSheet.headers);
      if (record && record.fg_sku_code && record.fg_sku_code.toString().trim() !== '') { 
        t04Records.push(record);
      }
      
      // Show progress every 100 rows
      if ((i + 1) % 100 === 0) {
        console.log(`  Processed ${i + 1} rows, valid records: ${t04Records.length}`);
      }
    }
    
    console.log(`\n📦 Processed ${t04Records.length} valid T04 records`);
    
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
  
  // Common T04 column mappings (more flexible matching)
  const columnMappings = {
    // Core identifiers
    'WH': 'wh',
    'Warehouse': 'wh', 
    'FGSKUCode': 'fg_sku_code',
    'FG_SKU_CODE': 'fg_sku_code',
    'SKU': 'fg_sku_code',
    'Product': 'fg_sku_code',
    'MthNum': 'mth_num',
    'MTH_NUM': 'mth_num',
    'Month': 'mth_num',
    'Mth': 'mth_num',
    
    // Demand columns
    'MTO Demand (Next Month)': 'mto_demand_next_month',
    'MTO_Demand_Next_Month': 'mto_demand_next_month',
    'MTS Demand (Next Month)': 'mts_demand_next_month',
    'MTS_Demand_Next_Month': 'mts_demand_next_month',
    'MTS Demand (Next 3 Months)': 'mts_demand_next_3_months',
    'MTS_Demand_Next_3_Months': 'mts_demand_next_3_months',
    
    // Inventory columns
    'Inventory Days (Norm)': 'inventory_days_norm',
    'Inventory_Days_Norm': 'inventory_days_norm',
    'Store Cost': 'store_cost',
    'Store_Cost': 'store_cost',
    'Min OS': 'min_os',
    'Min_OS': 'min_os',
    'Max OS': 'max_os',
    'Max_OS': 'max_os',
    'Min CS': 'min_cs',
    'Min_CS': 'min_cs',
    'Max CS': 'max_cs',
    'Max_CS': 'max_cs',
    
    // Opening stock columns
    'M1OS GFC': 'm1os_gfc',
    'M1OS_GFC': 'm1os_gfc',
    'M1OS KFC': 'm1os_kfc',
    'M1OS_KFC': 'm1os_kfc',
    'M1OS NFC': 'm1os_nfc',
    'M1OS_NFC': 'm1os_nfc',
    'M1OS X': 'm1os_x',
    'M1OS_X': 'm1os_x',
    
    // Weight and other attributes
    'FG Wt per Unit': 'fg_wt_per_unit',
    'FG_Wt_Per_Unit': 'fg_wt_per_unit',
    'CS Norm': 'cs_norm',
    'CS_Norm': 'cs_norm',
    'Norm Markup': 'norm_markup',
    'Norm_Markup': 'norm_markup',
    
    // Stock flow columns for each factory
    'OS GFC': 'os_gfc', 'IN GFC': 'in_gfc', 'OUT GFC': 'out_gfc', 'CS GFC': 'cs_gfc',
    'Max Supply GFC': 'max_supply_gfc',
    'OS KFC': 'os_kfc', 'IN KFC': 'in_kfc', 'OUT KFC': 'out_kfc', 'CS KFC': 'cs_kfc',
    'Max Supply KFC': 'max_supply_kfc',
    'OS NFC': 'os_nfc', 'IN NFC': 'in_nfc', 'OUT NFC': 'out_nfc', 'CS NFC': 'cs_nfc',
    'Max Supply NFC': 'max_supply_nfc',
    'OS X': 'os_x', 'IN X': 'in_x', 'OUT X': 'out_x', 'CS X': 'cs_x',
    'Max Supply X': 'max_supply_x'
  };
  
  // Map headers to database fields
  headers.forEach((header, index) => {
    if (header && columnMappings[header]) {
      mapping[header] = columnMappings[header];
    } else if (header) {
      // Try fuzzy matching for common patterns
      const headerStr = header.toString().trim();
      
      // Direct lookup in columnMappings
      for (const [excelCol, dbField] of Object.entries(columnMappings)) {
        if (headerStr === excelCol) {
          mapping[header] = dbField;
          break;
        }
      }
      
      // If not found, try normalized matching
      if (!mapping[header]) {
        const normalized = headerStr.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        for (const [excelCol, dbField] of Object.entries(columnMappings)) {
          const excelNormalized = excelCol.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          if (normalized === excelNormalized) {
            mapping[header] = dbField;
            break;
          }
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
        // Convert to appropriate type
        if (typeof value === 'string' && value.trim() === '') {
          value = null;
        } else if (typeof value === 'number') {
          // Keep numbers as is
        } else if (typeof value === 'string') {
          // Try to parse as number if it looks like one
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && isFinite(numValue)) {
            value = numValue;
          }
        }
      }
      
      // Handle formulas - store both the formula and calculated value
      if (cellInfo.formula) {
        console.log(`Formula found in ${columnName}: =${cellInfo.formula} = ${value}`);
        record[dbField] = value;
        // Could store formulas in a separate table if needed
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
  
  return record;
}

// Main execution
if (require.main === module) {
  readT04ExcelFile().then((result) => {
    console.log('\n✅ T04 Excel file processing completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { readT04ExcelFile, processT04ForDatabase }; 