const { query } = require('../config/database');

class T01Data {
  // Create a new T01 record
  static async create(data) {
    const {
      cty,
      fgsku_code,
      demand_cases,
      month,
      year,
      upload_batch_id,
      source_demand_id,
      source_country_master_id
    } = data;

    const result = await query(
      `INSERT INTO t01_data 
       (cty, fgsku_code, demand_cases, month, year, upload_batch_id, 
        source_demand_id, source_country_master_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        cty, fgsku_code, demand_cases, month, year, upload_batch_id,
        source_demand_id, source_country_master_id
      ]
    );

    return result.rows[0];
  }

  // Create multiple T01 records in batch
  static async createBatch(records) {
    if (records.length === 0) return [];

    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (const record of records) {
      const {
        cty, market, fgsku_code, demand_cases, month, upload_batch_id,
        source_demand_id, source_country_master_id, production_environment, safety_stock_wh, inventory_days_norm, supply, cons
      } = record;

      const rowPlaceholders = [];
      for (let i = 0; i < 13; i++) {
        rowPlaceholders.push(`$${paramIndex++}`);
      }
      placeholders.push(`(${rowPlaceholders.join(', ')})`);

      values.push(
        cty, market, fgsku_code, demand_cases, month, upload_batch_id,
        source_demand_id, source_country_master_id, production_environment, safety_stock_wh, inventory_days_norm, supply, cons
      );
    }

    const result = await query(
      `INSERT INTO t01_data 
       (cty, market, fgsku_code, demand_cases, month, upload_batch_id, 
        source_demand_id, source_country_master_id, production_environment, safety_stock_wh, inventory_days_norm, supply, cons) 
       VALUES ${placeholders.join(', ')} 
       RETURNING *`,
      values
    );

    return result.rows;
  }

  // Get T01 data by upload batch
  static async findByUploadBatch(uploadBatchId) {
    const result = await query(
      'SELECT * FROM t01_data WHERE upload_batch_id = $1 ORDER BY cty, fgsku_code, month',
      [uploadBatchId]
    );
    return result.rows;
  }

  // Get all T01 data
  static async findAll(limit = 1000, offset = 0) {
    const result = await query(
      'SELECT * FROM t01_data ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  // Delete T01 data by upload batch
  static async deleteByUploadBatch(uploadBatchId) {
    const result = await query(
      'DELETE FROM t01_data WHERE upload_batch_id = $1 RETURNING *',
      [uploadBatchId]
    );
    return result.rows;
  }

  // Clear all T01 data
  static async clearAll() {
    const result = await query('DELETE FROM t01_data RETURNING *');
    return result.rows;
  }

  // Get statistics
  static async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT cty) as unique_cty_values,
        COUNT(DISTINCT fgsku_code) as unique_fgsku_codes,
        COUNT(DISTINCT upload_batch_id) as total_upload_batches
      FROM t01_data
    `);
    return result.rows[0];
  }

  // Calculate T01 data from cursor tables
  static async calculateT01Data(uploadBatchId = null) {
    const { pool } = require('../config/database');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Generate a new batch ID if not provided
      const batchId = uploadBatchId || require('uuid').v4();
      
      console.log('🔄 Starting T01 calculation with batch ID:', batchId);

      // Step 1: Get demand data with Geography and Market
      console.log('📊 Step 1: Processing demand data...');
      const demandData = await client.query(`
        SELECT 
          dc.id as demand_id,
          dc.row_index,
          dc.column_index,
          dc.cell_value,
          dc.column_name,
          w.workbook_name,
          ws.sheet_name
        FROM demand_cursor dc
        JOIN workbooks w ON dc.workbook_id = w.id
        JOIN worksheets ws ON dc.worksheet_id = ws.id
        WHERE dc.upload_batch_id = $1
        ORDER BY dc.row_index, dc.column_index
      `, [batchId]);

      console.log(`Found ${demandData.rows.length} demand records`);

      // Step 2: Get country master data
      console.log('📊 Step 2: Processing country master data...');
      const countryMasterData = await client.query(`
        SELECT 
          dcmc.id as country_master_id,
          dcmc.row_index,
          dcmc.column_index,
          dcmc.cell_value,
          dcmc.column_name
        FROM demand_country_master_cursor dcmc
        WHERE dcmc.upload_batch_id = $1
        ORDER BY dcmc.row_index, dcmc.column_index
      `, [batchId]);

      console.log(`Found ${countryMasterData.rows.length} country master records`);

      // Step 3: Process demand data to extract Geography, Market, and FGSKU Code
      const demandRows = new Map();
      const geographyColumnIndex = 0; // Geography is in column 0
      const marketColumnIndex = 1; // Market is in column 1
      const fgskuCodeColumnIndex = 6; // FGSKU Code is in column 6 "Code"
      const unifiedCodeColumnIndex = 5; // Universal codes is in column 5 "Unified code"
      const pdNpdColumnIndex = 3; // PD/NPD is in column 3
      const originColumnIndex = 4; // Origin is in column 4

      console.log('Geography column index:', geographyColumnIndex);
      console.log('Market column index:', marketColumnIndex);
      console.log('FGSKU Code column index:', fgskuCodeColumnIndex);
      console.log('Unified Code column index:', unifiedCodeColumnIndex);
      console.log('PD/NPD column index:', pdNpdColumnIndex);
      console.log('Origin column index:', originColumnIndex);

      // Group demand data by row (skip first 3 rows: 0, 1, 2 are headers)
      for (const cell of demandData.rows) {
        if (cell.row_index < 3) continue; // Skip header rows
        
        if (!demandRows.has(cell.row_index)) {
          demandRows.set(cell.row_index, {});
        }
        demandRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
      }

      // Step 3.5: Filter out NPD and Other rows
      const filteredDemandRows = new Map();
      let filteredOutCount = 0;

      for (const [rowIndex, rowData] of demandRows) {
        const pdNpd = rowData[pdNpdColumnIndex];
        const origin = rowData[originColumnIndex];
        
        // Skip rows where PD/NPD is "NPD" or Origin is "Other"
        if (pdNpd && pdNpd.trim().toLowerCase() === 'npd') {
          console.log(`Filtering out row ${rowIndex}: PD/NPD = "NPD"`);
          filteredOutCount++;
          continue;
        }
        
        if (origin && origin.trim().toLowerCase() === 'other') {
          console.log(`Filtering out row ${rowIndex}: Origin = "Other"`);
          filteredOutCount++;
          continue;
        }
        
        // Keep this row
        filteredDemandRows.set(rowIndex, rowData);
      }

      console.log(`Filtered out ${filteredOutCount} rows (NPD: ${demandRows.size - filteredDemandRows.size - filteredOutCount}, Other: ${filteredOutCount})`);
      console.log(`Remaining rows after filtering: ${filteredDemandRows.size}`);

      // Step 4: Process country master data
      const countryMasterRows = new Map();
      const countryNameColumnIndex = 2; // "Country Name (Raw demand)" is in column 2
      const marketColumnIndexCM = 1; // "Market" is in column 1

      console.log('Country name column index:', countryNameColumnIndex);
      console.log('Market column index (CM):', marketColumnIndexCM);

      // Group country master data by row (skip first row which is header)
      for (const cell of countryMasterData.rows) {
        if (cell.row_index === 0) continue; // Skip header row
        
        if (!countryMasterRows.has(cell.row_index)) {
          countryMasterRows.set(cell.row_index, {});
        }
        countryMasterRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
      }

      // Step 4.5: Process base scenario configuration for month mapping
      console.log('📊 Step 4.5: Processing base scenario configuration for month mapping...');
      const baseScenarioData = await client.query(`
        SELECT 
          bsc.row_index,
          bsc.column_index,
          bsc.cell_value
        FROM base_scenario_configuration_cursor bsc
        WHERE bsc.upload_batch_id = $1
        ORDER BY bsc.row_index, bsc.column_index
      `, [batchId]);

      // Step 4.6: Process capacity data for inventory days lookup
      console.log('📊 Step 4.6: Processing capacity data for inventory days lookup...');
      const capacityData = await client.query(`
        SELECT 
          sd.row_index,
          sd.column_index,
          sd.cell_value
        FROM sheet_data sd
        JOIN worksheets ws ON sd.worksheet_id = ws.id
        JOIN workbooks w ON ws.workbook_id = w.id
        WHERE w.workbook_name = 'Capacity' AND ws.sheet_name = 'Item master'
        ORDER BY sd.row_index, sd.column_index
      `);

      console.log(`Found ${baseScenarioData.rows.length} base scenario configuration records`);
      console.log(`Found ${capacityData.rows.length} capacity records`);

      // Create month mapping from base scenario configuration
      const monthMapping = new Map();
      const baseScenarioRows = new Map();

      // Create capacity lookup map for inventory days
      const capacityRows = new Map();
      const capacityLookup = new Map(); // FGSKUCode + ProductionEnvironment -> InventoryDays

      // Group capacity data by row
      for (const cell of capacityData.rows) {
        if (!capacityRows.has(cell.row_index)) {
          capacityRows.set(cell.row_index, {});
        }
        capacityRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
      }

      // Create lookup map for inventory days (FGSKUCode + ProductionEnvironment -> InventoryDays)
      for (const [rowIndex, rowData] of capacityRows) {
        if (rowIndex < 2) continue; // Skip header rows
        
        const fgskuCode = rowData[1]; // Item column
        const productionEnvironment = rowData[9]; // Production environment column
        const inventoryDays = rowData[13]; // Required opening stock (Days) column
        
        if (fgskuCode && productionEnvironment && inventoryDays) {
          const lookupKey = `${fgskuCode.trim()}_${productionEnvironment.trim()}`;
          capacityLookup.set(lookupKey, parseFloat(inventoryDays) || 0);
          console.log(`Capacity lookup: "${lookupKey}" -> ${inventoryDays}`);
        }
      }

      // Group base scenario data by row
      for (const cell of baseScenarioData.rows) {
        if (!baseScenarioRows.has(cell.row_index)) {
          baseScenarioRows.set(cell.row_index, {});
        }
        baseScenarioRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
      }

      // Create month name to number mapping (with year separation)
      for (const [rowIndex, rowData] of baseScenarioRows) {
        if (rowIndex === 0) continue; // Skip header row
        
        const monthNumber = rowData[0]; // Month number
        const monthName = rowData[1]; // Month name
        const year = rowData[2]; // Year
        
        if (monthNumber && monthName && year) {
          // Create mapping for full month name with year
          const fullMonthKey = `${monthName} ${year}`;
          monthMapping.set(fullMonthKey.trim(), parseInt(monthNumber));
          
          // Create mapping for abbreviated month name with year
          const abbreviatedMonthName = monthName.substring(0, 3);
          const abbreviatedMonthKey = `${abbreviatedMonthName} ${year}`;
          monthMapping.set(abbreviatedMonthKey.trim(), parseInt(monthNumber));
          
          console.log(`Month mapping: "${fullMonthKey.trim()}" -> ${monthNumber}`);
          console.log(`Month mapping: "${abbreviatedMonthKey.trim()}" -> ${monthNumber}`);
        }
      }

      console.log('Month mapping created with', monthMapping.size, 'entries');

      // Step 5: Create lookup map for country master
      const countryLookup = new Map();
      for (const [rowIndex, rowData] of countryMasterRows) {
        const countryName = rowData[countryNameColumnIndex];
        const market = rowData[marketColumnIndexCM];
        
        if (countryName && market) {
          countryLookup.set(countryName.trim(), market.trim());
          console.log(`Mapping: "${countryName.trim()}" -> "${market.trim()}"`);
        }
      }

      console.log('Country lookup map created with', countryLookup.size, 'entries');

      // Step 6: Create FGSKU code lookup map from filtered demand data
      const fgskuLookup = new Map();
      for (const [rowIndex, rowData] of filteredDemandRows) {
        const fgskuCode = rowData[fgskuCodeColumnIndex];
        const unifiedCode = rowData[unifiedCodeColumnIndex];
        
        if (fgskuCode && unifiedCode) {
          fgskuLookup.set(fgskuCode.trim(), unifiedCode.trim());
          console.log(`FGSKU Mapping: "${fgskuCode.trim()}" -> "${unifiedCode.trim()}"`);
        }
      }

      console.log('FGSKU lookup map created with', fgskuLookup.size, 'entries');

      // Step 7: Generate T01 records with aggregation and raw demand lookup
      const t01Records = [];
      let processedRows = 0;

      // Get month columns from demand headers (starting from column 9)
      const monthColumns = [];
      for (const cell of demandData.rows) {
        if (cell.row_index === 2 && cell.column_index >= 9) { // Header row
          const monthHeader = cell.cell_value;
          // Use the full month header with year (e.g., "Jul 2025")
          if (monthHeader && monthMapping.has(monthHeader.trim())) {
            const monthNumber = monthMapping.get(monthHeader.trim());
            // Only include months 5-16 (12 months total)
            if (monthNumber >= 5 && monthNumber <= 16) {
              monthColumns.push({
                columnIndex: cell.column_index,
                monthHeader: monthHeader.trim(),
                monthNumber: monthNumber
              });
            }
          }
        }
      }

      console.log(`Found ${monthColumns.length} month columns to process`);

      // Step 7.5: Create lookup map from raw demand data
      console.log('📊 Step 7.5: Creating raw demand lookup map...');
      const rawDemandLookup = new Map();
      
      // Get all demand data for lookup
      for (const cell of demandData.rows) {
        if (cell.row_index >= 3) { // Skip header rows
          const rowIndex = cell.row_index;
          const colIndex = cell.column_index;
          
          if (!rawDemandLookup.has(rowIndex)) {
            rawDemandLookup.set(rowIndex, {});
          }
          rawDemandLookup.get(rowIndex)[colIndex] = cell.cell_value;
        }
      }

      // Create aggregated demand map to avoid duplicates
      const aggregatedDemand = new Map();
      
      // Process raw demand data directly for lookup
      // First pass: collect all valid combinations with their demand values
      const allCombinations = [];
      
      for (const [rawRowIndex, rawRowData] of rawDemandLookup) {
        const geography = rawRowData[geographyColumnIndex];
        const market = rawRowData[marketColumnIndex];
        const fgskuCode = rawRowData[fgskuCodeColumnIndex];
        const pdNpd = rawRowData[pdNpdColumnIndex];
        const origin = rawRowData[originColumnIndex];
        
        // Apply filtering: skip NPD and Other rows
        if (pdNpd && pdNpd.trim().toLowerCase() === 'npd') {
          continue;
        }
        if (origin && origin.trim().toLowerCase() === 'other') {
          continue;
        }
        
        if (geography && market && fgskuCode) {
          const geographyMarket = `${geography.trim()}_${market.trim()}`;
          const cty = countryLookup.get(geographyMarket);
          
          if (cty) {
            // Look up FGSKU code in universal codes
            const unifiedFgskuCode = fgskuCode ? fgskuLookup.get(fgskuCode.trim()) : '';
            const finalFgskuCode = unifiedFgskuCode || fgskuCode || '';
            
            // For each month, get actual demand values from raw data
            for (const monthCol of monthColumns) {
              const monthNumber = monthCol.monthNumber;
              const rawDemandValue = parseFloat(rawRowData[monthCol.columnIndex]) || 0;
              
              // Set demand to 0 if negative or 0, otherwise use actual value
              const finalDemandValue = rawDemandValue <= 0 ? 0 : rawDemandValue;
              
              // Determine Market value based on CTY
              let marketValue = "Others";
              if (cty === "KSA" || cty === "Kuwait" || cty === "UAE-FS" || cty === "UAE FS") {
                marketValue = cty === "UAE FS" ? "UAE-FS" : cty;
              }
              
              // Determine Production Environment value based on Market
              let productionEnvironmentValue = "MTO"; // Default for Others
              if (marketValue === "KSA" || marketValue === "Kuwait" || marketValue === "UAE-FS") {
                productionEnvironmentValue = "MTS";
              }
              
              // Determine Safety Stock WH value based on Production Environment and Market
              let safetyStockWhValue = "NA-MTO"; // Default for MTO
              if (productionEnvironmentValue === "MTS") {
                if (marketValue === "KSA") {
                  safetyStockWhValue = "NFCM";
                } else if (marketValue === "Kuwait") {
                  safetyStockWhValue = "KFCM";
                } else if (marketValue === "UAE-FS") {
                  safetyStockWhValue = "GFCM";
                }
              }
              
              // Determine Inventory Days (Norm) value
              let inventoryDaysNormValue = 0; // Default for MTO
              if (productionEnvironmentValue === "MTS") {
                // Lookup in capacity data: FGSKUCode + ProductionEnvironment -> InventoryDays
                const capacityLookupKey = `${finalFgskuCode}_${productionEnvironmentValue}`;
                inventoryDaysNormValue = capacityLookup.get(capacityLookupKey) || 0;
              }
              
              // Supply column formula: Sum T02 Qty Total values for matching CTY, FGSKU Code, and Month
              // Supply column formula: Sum T02 Qty Total values for matching CTY, FGSKU Code, and Month
              // Calculate the starting row number for this combination in T02
              // Each CTY/FGSKU/Month combination has 4 T02 records (GFCM, KFCM, NFCM, X)
              // We need to find the position of this combination in the T02 data
              
              // Get the count of T02 records before this combination
              const t02CountBefore = await client.query(`
                SELECT COUNT(*) as count
                FROM t02_data 
                WHERE upload_batch_id = $1 
                AND (
                  (cty < $2) OR 
                  (cty = $2 AND fgsku_code < $3) OR 
                  (cty = $2 AND fgsku_code = $3 AND month < $4)
                )
              `, [batchId, cty, finalFgskuCode, monthNumber.toString().padStart(2, '0')]);
              
              const startingRow = parseInt(t02CountBefore.rows[0].count) + 2; // +2 for Excel row offset
              
              // Generate formula that references the 4 T02 rows for this combination
              const t02RowNumbers = [];
              for (let i = 0; i < 4; i++) { // 4 warehouses: GFCM, KFCM, NFCM, X
                t02RowNumbers.push(`T_02!V${startingRow + i}`);
              }
              
              let supplyValue = t02RowNumbers.join('+'); // Sum the 4 T02 Qty Total cells
              
              // Cons column formula: =@WB(DemandCases,"=",Supply)
              // Generate Excel A1 style formula with actual cell references
              // Demand Cases is column D (4th column), Supply is column I (9th column)
              // Row number will be the current row in Excel (starting from row 2 for data)
              const excelRowNumber = allCombinations.length + 2; // +2 because Excel starts at row 1, and we have headers
              const demandCasesCell = `D${excelRowNumber}`; // Demand Cases column
              const supplyCell = `I${excelRowNumber}`; // Supply column
              let consFormula = `=@WB(${demandCasesCell},"=",${supplyCell})`; // Excel A1 style formula with actual cell references
              
              allCombinations.push({
                cty: cty,
                market: marketValue,
                fgsku_code: finalFgskuCode,
                month: monthNumber.toString().padStart(2, '0'),
                demand_cases: finalDemandValue,
                upload_batch_id: batchId,
                source_demand_id: demandData.rows.find(c => c.row_index === rawRowIndex)?.demand_id,
                source_country_master_id: countryMasterData.rows.find(c => c.row_index === 0)?.country_master_id,
                production_environment: productionEnvironmentValue,
                safety_stock_wh: safetyStockWhValue,
                inventory_days_norm: inventoryDaysNormValue,
                supply: supplyValue,
                cons: consFormula,
                rawRowIndex: rawRowIndex,
                hasValue: finalDemandValue > 0
              });
            }
          }
        }
        
        processedRows++;
      }
      
      // Second pass: create aggregated demand map, summing values for same CTY + Code + Month
      for (const combination of allCombinations) {
        const aggregationKey = `${combination.cty}_${combination.fgsku_code}_${combination.month}`;
        
        if (!aggregatedDemand.has(aggregationKey)) {
          aggregatedDemand.set(aggregationKey, combination);
        } else {
          // Sum the demand values for the same CTY + Code + Month combination
          const existing = aggregatedDemand.get(aggregationKey);
          existing.demand_cases += combination.demand_cases;
        }
      }

      console.log(`Processed ${processedRows} rows and created ${aggregatedDemand.size} aggregated combinations`);

      // Convert aggregated demand to T01 records
      for (const [key, record] of aggregatedDemand) {
        t01Records.push(record);
      }

      console.log(`Generated ${t01Records.length} T01 records from ${processedRows} processed rows`);

      // Step 7.5: No need for additional deduplication since we already aggregated
      const uniqueT01Records = t01Records;
      
      console.log(`Final unique T01 records: ${uniqueT01Records.length}`);

      // Step 8: Insert T01 records in smaller batches
      if (uniqueT01Records.length > 0) {
        const batchSize = 1000; // Insert in batches of 1000
        for (let i = 0; i < uniqueT01Records.length; i += batchSize) {
          const batch = uniqueT01Records.slice(i, i + batchSize);
          await this.createBatch(batch);
          console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueT01Records.length/batchSize)} (${batch.length} records)`);
        }
        console.log('✅ All T01 records inserted successfully');
      }

      await client.query('COMMIT');
      
      return {
        batchId,
        recordsCreated: uniqueT01Records.length,
        records: uniqueT01Records.slice(0, 5) // Return first 5 as sample
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error calculating T01 data:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = T01Data; 