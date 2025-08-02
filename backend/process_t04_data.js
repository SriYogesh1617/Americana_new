const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const T04Data = require('./models/T04Data');
const { query } = require('./config/database');

async function processT04ToDatabase() {
  try {
    console.log('📊 Processing T04.xlsx file to database...');
    
    const filePath = path.join(__dirname, '..', 'samples', 'T04.xlsx');
    
    // Read the workbook with formulas
    const workbook = XLSX.readFile(filePath, { cellFormula: true, cellDates: true });
    const worksheet = workbook.Sheets['Sheet4'];
    
    if (!worksheet['!ref']) {
      throw new Error('Empty worksheet');
    }
    
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(`📋 Processing ${range.e.r + 1} rows and ${range.e.c + 1} columns`);
    
    // Extract headers from row 3 (index 2)
    const headerRow = 2;
    const headers = [];
    
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
      const cell = worksheet[cellAddress];
      headers[col] = cell ? cell.v : `Column_${XLSX.utils.encode_col(col)}`;
    }
    
    console.log('📋 Headers found:', headers.slice(0, 10), '...');
    
    // Create column mapping
    const columnMapping = {
      'WH': 'wh',
      'FGSKUCode': 'fg_sku_code',
      'MthNum': 'mth_num',
      'MTO Demand (Next Month)': 'mto_demand_next_month',
      'MTS Demand (Next Month)': 'mts_demand_next_month',
      'Inventory Days(Norm)': 'inventory_days_norm',
      'StoreCost': 'store_cost',
      'MTS Demand (Next 3 Months)': 'mts_demand_next_3_months',
      'MinOS': 'min_os',
      'MaxOS': 'max_os',
      'MinCS': 'min_cs',
      'MaxCS': 'max_cs',
      'MaxSupLim': 'max_sup_lim',
      'M1OSGFC': 'm1os_gfc',
      'M1OSKFC': 'm1os_kfc',
      'M1OSNFC': 'm1os_nfc',
      'FGWtPerUnit': 'fg_wt_per_unit',
      'CSNorm': 'cs_norm',
      'NormMarkup': 'norm_markup',
      'M1OSX': 'm1os_x'
    };
    
    // Create mapping from column index to database field
    const indexToField = {};
    headers.forEach((header, index) => {
      if (columnMapping[header]) {
        indexToField[index] = columnMapping[header];
      }
    });
    
    console.log('🔗 Column mappings:', Object.keys(columnMapping).length);
    
    // Process data rows
    const t04Records = [];
    const maxRows = Math.min(range.e.r, 1000); // Process first 1000 rows
    
    console.log(`⚙️ Processing ${maxRows - headerRow} data rows...`);
    
    for (let row = headerRow + 1; row <= maxRows; row++) {
      const record = {};
      let hasValidData = false;
      
      for (let col = 0; col <= range.e.c; col++) {
        const fieldName = indexToField[col];
        if (!fieldName) continue;
        
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          let value = cell.v;
          
          // Clean and validate the value
          value = cleanValue(value, fieldName);
          record[fieldName] = value;
          
          if (fieldName === 'fg_sku_code' && value) {
            hasValidData = true;
          }
        }
      }
      
      // Set default values
      setDefaults(record);
      
      if (hasValidData && record.fg_sku_code) {
        t04Records.push(record);
      }
      
      if ((row - headerRow) % 200 === 0) {
        console.log(`  Processed ${row - headerRow} rows, valid records: ${t04Records.length}`);
      }
    }
    
    console.log(`📦 Total valid records: ${t04Records.length}`);
    
    if (t04Records.length > 0) {
      // Show sample record
      console.log('\n📄 Sample record:');
      console.log(JSON.stringify(t04Records[0], null, 2));
      
      // Create table
      await T04Data.createTable();
      
      // Insert in smaller batches to avoid parameter limit
      const batchSize = 100;
      const workbookId = require('crypto').randomUUID();
      let totalInserted = 0;
      
      console.log('\n💾 Inserting data in batches...');
      
      for (let i = 0; i < t04Records.length; i += batchSize) {
        const batch = t04Records.slice(i, i + batchSize);
        
        // Add workbook ID to each record
        batch.forEach(record => {
          record.workbook_id = workbookId;
        });
        
        try {
          const insertedBatch = await T04Data.bulkInsert(batch);
          totalInserted += insertedBatch.length;
          console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${insertedBatch.length} records inserted`);
        } catch (error) {
          console.error(`  Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
        }
      }
      
      console.log(`\n✅ Total inserted: ${totalInserted} records`);
      console.log(`🔑 Workbook ID: ${workbookId}`);
      
      // Update calculated fields
      if (totalInserted > 0) {
        console.log('\n🧮 Updating calculated fields...');
        await T04Data.updateAllCalculatedFields(workbookId);
        
        console.log('\n📊 Summary statistics:');
        const stats = await T04Data.getSummaryStats(workbookId);
        console.log(stats);
      }
      
      return {
        workbookId,
        totalRecords: totalInserted,
        originalRecords: t04Records.length
      };
    }
    
  } catch (error) {
    console.error('❌ Error processing T04:', error);
    throw error;
  }
}

function cleanValue(value, fieldName) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Handle string values
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Skip formula references that couldn't be calculated
    if (trimmed.startsWith('=') || trimmed.includes('!')) {
      return null;
    }
    
    // Handle empty strings
    if (trimmed === '') {
      return null;
    }
    
    // Handle numbers with commas
    if (trimmed.includes(',')) {
      const cleaned = trimmed.replace(/,/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && isFinite(num)) {
        return num;
      }
    }
    
    // Try to parse as number for numeric fields
    const numericFields = [
      'mth_num', 'mto_demand_next_month', 'mts_demand_next_month',
      'inventory_days_norm', 'store_cost', 'mts_demand_next_3_months',
      'min_os', 'max_os', 'min_cs', 'max_cs', 'max_sup_lim',
      'm1os_gfc', 'm1os_kfc', 'm1os_nfc', 'fg_wt_per_unit',
      'cs_norm', 'norm_markup', 'm1os_x'
    ];
    
    if (numericFields.includes(fieldName)) {
      const num = parseFloat(trimmed);
      if (!isNaN(num) && isFinite(num)) {
        return num;
      }
      return 0; // Default to 0 for numeric fields
    }
    
    return trimmed;
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return null;
    }
    return value;
  }
  
  return value;
}

function setDefaults(record) {
  // Set required defaults
  if (!record.wh) record.wh = 'UNKNOWN';
  if (!record.mth_num) record.mth_num = 1;
  if (!record.fg_wt_per_unit) record.fg_wt_per_unit = 1;
  if (!record.norm_markup) record.norm_markup = 1;
  if (!record.max_sup_lim) record.max_sup_lim = 1;
  if (!record.store_cost) record.store_cost = 0.01;
  
  // Handle large number defaults
  if (!record.max_os) record.max_os = 10000000000;
  if (!record.max_cs) record.max_cs = 10000000000;
  
  // Default numeric fields to 0
  const numericFields = [
    'mto_demand_next_month', 'mts_demand_next_month', 'inventory_days_norm',
    'mts_demand_next_3_months', 'min_os', 'min_cs', 'm1os_gfc', 'm1os_kfc',
    'm1os_nfc', 'cs_norm', 'm1os_x'
  ];
  
  numericFields.forEach(field => {
    if (record[field] === null || record[field] === undefined) {
      record[field] = 0;
    }
  });
}

// Run if called directly
if (require.main === module) {
  processT04ToDatabase().then((result) => {
    console.log('\n✅ T04 processing completed successfully');
    if (result) {
      console.log(`📊 Records processed: ${result.originalRecords}`);
      console.log(`💾 Records inserted: ${result.totalRecords}`);
      console.log(`🔑 Workbook ID: ${result.workbookId}`);
    }
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
}

module.exports = { processT04ToDatabase }; 