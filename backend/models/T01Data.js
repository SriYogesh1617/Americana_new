const { query } = require('../config/database');

class T01Data {
  // Create a new T01 record
  static async create(data) {
    const {
      cty,
      fgsku_code,
      demand_cases,
      month,
      upload_batch_id,
      source_demand_id,
      source_country_master_id
    } = data;

    const result = await query(
      `INSERT INTO t01_data 
       (cty, fgsku_code, demand_cases, month, upload_batch_id, 
        source_demand_id, source_country_master_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        cty, fgsku_code, demand_cases, month, upload_batch_id,
        source_demand_id, source_country_master_id
      ]
    );

    return result.rows[0];
  }

  // Create multiple T01 records in batch (optimized)
  static async batchCreate(records) {
    if (records.length === 0) return [];

    const batchSize = 5000; // Larger batch size for better performance
    const results = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const placeholders = [];
      const values = [];
      let paramIndex = 1;

      for (const record of batch) {
        const {
          cty, market, fgsku_code, demand_cases, month, upload_batch_id,
          source_demand_id, source_country_master_id, production_environment, safety_stock_wh, inventory_days_norm, supply, cons
        } = record;

        const rowPlaceholders = [];
        for (let j = 0; j < 13; j++) {
          rowPlaceholders.push(`$${paramIndex++}`);
        }
        placeholders.push(`(${rowPlaceholders.join(', ')})`);

        values.push(
          cty, market, fgsku_code, demand_cases, month, upload_batch_id,
          source_demand_id, source_country_master_id, production_environment, safety_stock_wh, inventory_days_norm, supply, cons
        );
      }

      const query = `
        INSERT INTO t01_data 
        (cty, market, fgsku_code, demand_cases, month, upload_batch_id, 
         source_demand_id, source_country_master_id, production_environment, 
         safety_stock_wh, inventory_days_norm, supply, cons)
        VALUES ${placeholders.join(', ')}
        RETURNING *
      `;

      const result = await query(query, values);
      results.push(...result.rows);
      
      console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)} (${batch.length} records)`);
    }

    return results;
  }

  // Create multiple T01 records in batch with client (for transaction)
  static async batchCreateWithClient(client, records) {
    if (records.length === 0) return [];

    const batchSize = 5000; // Larger batch size for better performance
    const results = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const placeholders = [];
      const values = [];
      let paramIndex = 1;

      for (const record of batch) {
        const {
          cty, market, fgsku_code, demand_cases, month, upload_batch_id,
          source_demand_id, source_country_master_id, production_environment, safety_stock_wh, inventory_days_norm, supply, cons
        } = record;

        const rowPlaceholders = [];
        for (let j = 0; j < 13; j++) {
          rowPlaceholders.push(`$${paramIndex++}`);
        }
        placeholders.push(`(${rowPlaceholders.join(', ')})`);

        values.push(
          cty, market, fgsku_code, demand_cases, month, upload_batch_id,
          source_demand_id, source_country_master_id, production_environment, safety_stock_wh, inventory_days_norm, supply, cons
        );
      }

      const query = `
        INSERT INTO t01_data 
        (cty, market, fgsku_code, demand_cases, month, upload_batch_id, 
         source_demand_id, source_country_master_id, production_environment, 
         safety_stock_wh, inventory_days_norm, supply, cons)
        VALUES ${placeholders.join(', ')}
        RETURNING *
      `;

      const result = await client.query(query, values);
      results.push(...result.rows);
      
      console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)} (${batch.length} records)`);
    }

    return results;
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

  // Calculate T01 data with optimized performance
  static async calculateT01Data(uploadBatchId) {
    const { pool } = require('../config/database');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      console.log('🚀 Starting optimized T01 calculation...');
      
      // Step 1: Get demand data with optimized query
      console.log('📊 Step 1: Fetching demand data...');
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
      `, [uploadBatchId]);

      console.log(`Found ${demandData.rows.length} demand records`);

      // Step 2: Get country master data
      console.log('📊 Step 2: Fetching country master data...');
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
      `, [uploadBatchId]);

      console.log(`Found ${countryMasterData.rows.length} country master records`);

      // Step 3: Get capacity data for production environment lookup
      console.log('📊 Step 3: Fetching capacity data...');
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

      console.log(`Found ${capacityData.rows.length} capacity records`);

      // Step 4: Process data in memory (much faster)
      console.log('📊 Step 4: Processing data in memory...');
      
      // Create lookup maps
      const productionEnvironmentLookup = new Map();
      const capacityRows = new Map();
      
      // Process capacity data
      for (const cell of capacityData.rows) {
        if (!capacityRows.has(cell.row_index)) {
          capacityRows.set(cell.row_index, {});
        }
        capacityRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
      }
      
      // Create production environment lookup
      for (const [rowIndex, rowData] of capacityRows) {
        if (rowIndex < 2) continue; // Skip header rows
        
        const fgskuCode = rowData[1]; // Item column
        const productionEnvironment = rowData[9]; // Production environment column
        
        if (fgskuCode && productionEnvironment) {
          productionEnvironmentLookup.set(fgskuCode.trim(), productionEnvironment.trim());
        }
      }

      // Process demand data
      const demandRows = new Map();
      const geographyColumnIndex = 0;
      const marketColumnIndex = 1;
      const fgskuCodeColumnIndex = 6;
      const pdNpdColumnIndex = 3;
      const originColumnIndex = 4;

      // Group demand data by row
      for (const cell of demandData.rows) {
        if (cell.row_index < 3) continue; // Skip header rows
        
        if (!demandRows.has(cell.row_index)) {
          demandRows.set(cell.row_index, {});
        }
        demandRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
      }

      // Filter out NPD and Other rows
      const filteredDemandRows = new Map();
      for (const [rowIndex, rowData] of demandRows) {
        const pdNpd = rowData[pdNpdColumnIndex];
        const origin = rowData[originColumnIndex];
        
        if (pdNpd && pdNpd.trim().toLowerCase() === 'npd') continue;
        if (origin && origin.trim().toLowerCase() === 'other') continue;
        
        filteredDemandRows.set(rowIndex, rowData);
      }

      // Process country master data
      const countryLookup = new Map();
      const countryMasterRows = new Map();
      const countryNameColumnIndex = 2;
      const marketColumnIndexCM = 1;

      for (const cell of countryMasterData.rows) {
        if (cell.row_index === 0) continue; // Skip header row
        
        if (!countryMasterRows.has(cell.row_index)) {
          countryMasterRows.set(cell.row_index, {});
        }
        countryMasterRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
      }

      for (const [rowIndex, rowData] of countryMasterRows) {
        const countryName = rowData[countryNameColumnIndex];
        const market = rowData[marketColumnIndexCM];
        
        if (countryName && market) {
          countryLookup.set(countryName.trim(), market.trim());
        }
      }

                    // Step 5: Generate T01 records efficiently
       console.log('📊 Step 5: Generating T01 records...');
       const allCombinations = [];
       let recordCounter = 0; // Reset counter for each calculation

       // Get month columns from demand headers
       const monthColumns = [];
       console.log('🔍 Analyzing month headers from row 2...');
       
       for (const cell of demandData.rows) {
         if (cell.row_index === 2 && cell.column_index >= 9) {
           const monthHeader = cell.cell_value;
           console.log(`Column ${cell.column_index}: "${monthHeader}"`);
           
           if (monthHeader) {
             // Custom month mapping for planning period (Month 5-16)
             // Month 5 = June 2025, Month 6 = July 2025, ..., Month 16 = May 2026
             const monthMatch = monthHeader.match(/^([A-Za-z]{3})\s+(\d{4})$/);
             if (monthMatch) {
               const monthName = monthMatch[1];
               const year = monthMatch[2];
               
               // Create custom mapping for planning period (ONLY 12 months)
               const planningMonthMap = {
                 'Jun': { month: 5, year: '2025' },
                 'Jul': { month: 6, year: '2025' },
                 'Aug': { month: 7, year: '2025' },
                 'Sep': { month: 8, year: '2025' },
                 'Oct': { month: 9, year: '2025' },
                 'Nov': { month: 10, year: '2025' },
                 'Dec': { month: 11, year: '2025' },
                 'Jan': { month: 12, year: '2026' },
                 'Feb': { month: 13, year: '2026' },
                 'Mar': { month: 14, year: '2026' },
                 'Apr': { month: 15, year: '2026' },
                 'May': { month: 16, year: '2026' }
               };
               
               const planningMonth = planningMonthMap[monthName];
               // Only process months that are in our planning period (12 months total)
               if (planningMonth && planningMonth.year === year) {
                 console.log(`  Found month: ${monthName} ${year} -> Month ${planningMonth.month}`);
                 
                 monthColumns.push({
                   columnIndex: cell.column_index,
                   monthNumber: planningMonth.month
                 });
                 console.log(`  ✅ Added month ${planningMonth.month} at column ${cell.column_index}`);
               } else {
                 console.log(`  ⚠️ Skipping month: ${monthName} ${year} (outside planning period)`);
               }
             }
           }
         }
       }
       
       console.log(`📊 Found ${monthColumns.length} month columns:`, monthColumns.map(m => `Month ${m.monthNumber} at column ${m.columnIndex}`));

       // First pass: Collect unique CTY+SKU combinations and aggregate demand data
       const uniqueCombinations = new Map();
       const demandDataByCombination = new Map(); // Track demand by CTY+SKU+Month
       
       for (const [rowIndex, rowData] of filteredDemandRows) {
         const geography = rowData[geographyColumnIndex];
         const market = rowData[marketColumnIndex];
         const fgskuCode = rowData[fgskuCodeColumnIndex];
         
         if (geography && market && fgskuCode) {
           const geographyMarket = `${geography.trim()}_${market.trim()}`;
           const cty = countryLookup.get(geographyMarket);
           
           if (cty) {
             const key = `${cty}_${fgskuCode.trim()}`;
             
             // Store unique combination (only store once per unique combination)
             if (!uniqueCombinations.has(key)) {
               uniqueCombinations.set(key, {
                 cty,
                 fgskuCode: fgskuCode.trim(),
                 rowData,
                 rowIndex
               });
             }
             
             // Aggregate demand data for each month (sum all rows for the same combination)
             for (const monthCol of monthColumns) {
               const monthKey = `${key}_${monthCol.monthNumber.toString().padStart(2, '0')}`;
               const demandValue = parseFloat(rowData[monthCol.columnIndex]) || 0;
               
               console.log(`  📊 ${cty}_${fgskuCode} Month ${monthCol.monthNumber}: Column ${monthCol.columnIndex} = ${rowData[monthCol.columnIndex]} -> ${demandValue}`);
               
               if (!demandDataByCombination.has(monthKey)) {
                 demandDataByCombination.set(monthKey, 0);
               }
               demandDataByCombination.set(monthKey, demandDataByCombination.get(monthKey) + demandValue);
             }
           }
         }
       }

       console.log(`Found ${uniqueCombinations.size} unique CTY+SKU combinations`);

       // Second pass: Generate records for each unique combination
       let rowCounter = 2; // Start from 2 (Excel row 2 is first data row)
       
       for (const [key, combination] of uniqueCombinations) {
         const { cty, fgskuCode, rowData, rowIndex } = combination;
         
         // Determine market value
         let marketValue = "Others";
         if (cty === "KSA" || cty === "Kuwait" || cty === "UAE-FS" || cty === "UAE FS") {
           marketValue = cty === "UAE FS" ? "UAE-FS" : cty;
         }
         
         // Determine production environment
         let productionEnvironmentValue = "MTO";
         if (marketValue === "KSA" || marketValue === "Kuwait" || marketValue === "UAE-FS") {
           productionEnvironmentValue = productionEnvironmentLookup.get(fgskuCode) || "MTS";
         }
         
         // Generate records for all detected months
         for (const monthCol of monthColumns) {
           recordCounter++;
           
           const monthStr = monthCol.monthNumber.toString().padStart(2, '0');
           
           // Get aggregated demand value for this month
           const monthKey = `${cty}_${fgskuCode}_${monthStr}`;
           const demandValue = demandDataByCombination.get(monthKey) || 0;
           
           // Calculate safety stock and inventory days
           let safetyStockWh = 'NA-MTO'; // Default for others
           if (cty === 'KSA') {
             safetyStockWh = 'NFCM';
           } else if (cty === 'Kuwait') {
             safetyStockWh = 'KFCM';
           } else if (cty === 'UAE-FS' || cty === 'UAE FS') {
             safetyStockWh = 'GFCM';
           }
           const inventoryDaysNorm = 0.00;
           
           // Calculate supply (T02 formula) - using correct row numbers starting from 2
           const excelRowNumber = rowCounter; // Use rowCounter for row numbering
           const supply = `T_02!V${164000 + excelRowNumber * 12}+T_02!V${164001 + excelRowNumber * 12}+T_02!V${164002 + excelRowNumber * 12}+T_02!V${164003 + excelRowNumber * 12}`;
           
           // Calculate Cons formula with correct row numbers starting from row 2
           const demandCasesCell = `D${excelRowNumber}`;
           const supplyCell = `I${excelRowNumber}`;
           const consFormula = `=@WB(${demandCasesCell},"=",${supplyCell})`;
           
           allCombinations.push({
             cty,
             market: marketValue,
             fgsku_code: fgskuCode,
             demand_cases: demandValue.toString(),
             month: monthStr,
             upload_batch_id: uploadBatchId,
             source_demand_id: demandData.rows.find(c => c.row_index === rowIndex)?.demand_id,
             source_country_master_id: countryMasterData.rows.find(c => c.row_index === 0)?.country_master_id,
             production_environment: productionEnvironmentValue,
             safety_stock_wh: safetyStockWh,
             inventory_days_norm: inventoryDaysNorm,
             supply,
             cons: consFormula
           });
           rowCounter++; // Increment for every record (every month of every SKU)
         }
       }

       console.log(`Generated ${allCombinations.length} records`);

      // Step 6: Batch insert all records
      console.log('📊 Step 6: Batch inserting records...');
      if (allCombinations.length > 0) {
        await this.batchCreateWithClient(client, allCombinations);
      }

      await client.query('COMMIT');
      
      console.log('✅ T01 calculation completed successfully!');
      return {
        success: true,
        recordsCreated: allCombinations.length,
        message: 'T01 data calculated and saved successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error in T01 calculation:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = T01Data; 