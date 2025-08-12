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

  // Calculate T01 data from cursor tables with ALL months (5-16) for each SKU
  static async calculateT01Data(uploadBatchId = null) {
    const { pool } = require('../config/database');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Generate a new batch ID if not provided
      const batchId = uploadBatchId || require('uuid').v4();
      
      console.log('🔄 Starting T01 calculation with batch ID:', batchId);

      // Step 1: Get demand data
      console.log('📊 Step 1: Processing demand data...');
      const demandData = await client.query(`
        SELECT 
          dc.id as demand_id,
          dc.row_index,
          dc.column_index,
          dc.cell_value,
          dc.column_name
        FROM demand_cursor dc
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

      // Step 3: Get capacity data for production environment lookup
      console.log('📊 Step 3: Processing capacity data...');
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

      // Step 4: Process capacity data for production environment lookup
      const productionEnvironmentLookup = new Map();
      const capacityLookup = new Map();

      const capacityRows = new Map();
      for (const cell of capacityData.rows) {
        if (!capacityRows.has(cell.row_index)) {
          capacityRows.set(cell.row_index, {});
        }
        capacityRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
      }

      for (const [rowIndex, rowData] of capacityRows) {
        if (rowIndex < 2) continue; // Skip header rows
        
        const fgskuCode = rowData[1]; // Item column
        const productionEnvironment = rowData[9]; // Production environment column
        const inventoryDays = rowData[13]; // Required opening stock (Days) column
        
        if (fgskuCode && productionEnvironment) {
          productionEnvironmentLookup.set(fgskuCode.trim(), productionEnvironment.trim());
          
          if (inventoryDays) {
            const lookupKey = `${fgskuCode.trim()}_${productionEnvironment.trim()}`;
            capacityLookup.set(lookupKey, parseFloat(inventoryDays) || 0);
          }
        }
      }

      // Step 5: Process demand data
      const demandRows = new Map();
      const geographyColumnIndex = 0;
      const marketColumnIndex = 1;
      const fgskuCodeColumnIndex = 5; // Unified code column (Column 6 in Excel, index 5)
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

      // Step 6: Process country master data
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

      // Step 7: Collect unique combinations and demand data
      const uniqueCombinations = new Set();
      const demandDataByCombination = new Map();
      
      console.log('📊 Step 7: Collecting unique CTY + SKU combinations...');
      
      for (const [rowIndex, rowData] of demandRows) {
        const geography = rowData[geographyColumnIndex];
        const market = rowData[marketColumnIndex];
        const fgskuCode = rowData[fgskuCodeColumnIndex];
        const pdNpd = rowData[pdNpdColumnIndex];
        const origin = rowData[originColumnIndex];
        
        // Apply filtering
        if (pdNpd && pdNpd.trim().toLowerCase() === 'npd') continue;
        if (origin && origin.trim().toLowerCase() === 'other') continue;
        
        if (geography && market && fgskuCode) {
          const geographyMarket = `${geography.trim()}_${market.trim()}`;
          const cty = countryLookup.get(geographyMarket);
          
          if (cty) {
            const finalFgskuCode = fgskuCode.trim();
            uniqueCombinations.add(`${cty}_${finalFgskuCode}`);
            
            // Collect demand data for months 5-16
            for (let monthNum = 5; monthNum <= 16; monthNum++) {
              const month = monthNum.toString().padStart(2, '0');
              const demandKey = `${cty}_${finalFgskuCode}_${month}`;
              
              // Get demand value from the appropriate column (column 9 + month offset)
              const demandColumnIndex = 8 + (monthNum - 5); // Start from column 9 for month 5
              const rawDemandValue = parseFloat(rowData[demandColumnIndex]) || 0;
              const finalDemandValue = rawDemandValue <= 0 ? 0 : rawDemandValue;
              
              if (!demandDataByCombination.has(demandKey)) {
                demandDataByCombination.set(demandKey, finalDemandValue);
              } else {
                demandDataByCombination.set(demandKey, demandDataByCombination.get(demandKey) + finalDemandValue);
              }
            }
          }
        }
      }
      
      console.log(`Found ${uniqueCombinations.size} unique CTY + SKU combinations`);
      
             // Step 8: Create final records for ALL months (5-16) for each combination
       const allCombinations = [];
       let recordCounter = 0; // Counter for Excel row numbers
       
       console.log('📊 Step 8: Creating records for all months (5-16) for each combination...');
       
       for (const combination of uniqueCombinations) {
        const [cty, fgskuCode] = combination.split('_');
        
        // Determine Market value based on CTY
        let marketValue = "Others";
        if (cty === "KSA" || cty === "Kuwait" || cty === "UAE-FS" || cty === "UAE FS") {
          marketValue = cty === "UAE FS" ? "UAE-FS" : cty;
        }
        
        // Determine Production Environment value based on Market and SKU lookup
        let productionEnvironmentValue = "MTO"; // Default for Others
        if (marketValue === "KSA" || marketValue === "Kuwait" || marketValue === "UAE-FS") {
          const lookupProductionEnvironment = productionEnvironmentLookup.get(fgskuCode);
          if (lookupProductionEnvironment) {
            productionEnvironmentValue = lookupProductionEnvironment;
          } else {
            productionEnvironmentValue = "N/A";
          }
        }
        
        // Create records for ALL months (5-16)
        for (let monthNum = 5; monthNum <= 16; monthNum++) {
          const month = monthNum.toString().padStart(2, '0');
          const demandKey = `${cty}_${fgskuCode}_${month}`;
          const totalDemand = demandDataByCombination.get(demandKey) || 0;
          
          // Determine Safety Stock WH value
          let safetyStockWhValue = "NA-MTO";
          if (productionEnvironmentValue === "MTS") {
            if (marketValue === "KSA") {
              safetyStockWhValue = "NFCM";
            } else if (marketValue === "Kuwait") {
              safetyStockWhValue = "KFCM";
            } else if (marketValue === "UAE-FS") {
              safetyStockWhValue = "GFCM";
            }
          }
          
          // Determine Inventory Days value
          let inventoryDaysNormValue = 0;
          if (productionEnvironmentValue === "MTS") {
            const capacityLookupKey = `${fgskuCode}_${productionEnvironmentValue}`;
            inventoryDaysNormValue = capacityLookup.get(capacityLookupKey) || 0;
          } else if (productionEnvironmentValue === "N/A") {
            // For N/A production environment, set inventory days to 0
            inventoryDaysNormValue = 0;
          }
          
          // Create T02 formula - Get actual T02 row numbers for this CTY/SKU/Month combination
          const t02Rows = await client.query(`
            SELECT ROW_NUMBER() OVER (ORDER BY id) + 1 as excel_row_number
            FROM t02_data 
            WHERE upload_batch_id = $1 
              AND cty = $2 
              AND fgsku_code = $3 
              AND month = $4
            ORDER BY id
            LIMIT 4
          `, [batchId, cty, fgskuCode, month]);
          
          let supplyValue = '0';
          if (t02Rows.rows.length > 0) {
            const t02RowNumbers = t02Rows.rows.map(row => `T_02!X${row.excel_row_number}`);
            supplyValue = t02RowNumbers.join('+');
          }
          
          // Cons formula - calculate correct Excel row number
          recordCounter++;
          const excelRowNumber = recordCounter + 1; // Start from row 2 for first data row
          const demandCasesCell = `D${excelRowNumber}`;
          const supplyCell = `I${excelRowNumber}`;
          let consFormula = `=@WB(${demandCasesCell},"=",${supplyCell})`;
          
          allCombinations.push({
            cty: cty,
            market: marketValue,
            fgsku_code: fgskuCode,
            month: month,
            demand_cases: totalDemand,
            upload_batch_id: batchId,
            source_demand_id: null,
            source_country_master_id: countryMasterData.rows.find(c => c.row_index === 0)?.country_master_id,
            production_environment: productionEnvironmentValue,
            safety_stock_wh: safetyStockWhValue,
            inventory_days_norm: inventoryDaysNormValue,
            supply: supplyValue,
            cons: consFormula,
            hasValue: totalDemand > 0
          });
        }
      }
      
      console.log(`Created ${allCombinations.length} final T01 records`);
      
      // Step 9: Insert records
      if (allCombinations.length > 0) {
        const batchSize = 1000;
        for (let i = 0; i < allCombinations.length; i += batchSize) {
          const batch = allCombinations.slice(i, i + batchSize);
          await this.createBatch(batch);
          console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allCombinations.length/batchSize)} (${batch.length} records)`);
        }
        console.log('✅ All T01 records inserted successfully');
      }

      await client.query('COMMIT');
      
      return {
        batchId,
        recordsCreated: allCombinations.length,
        records: allCombinations.slice(0, 5) // Return first 5 as sample
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