const { pool } = require('../config/database');

class T02Data {
  // Create a new T02 record
  static async create(data) {
    // Insert all columns including the new formula fields
    const result = await pool.query(
      `INSERT INTO t02_data 
       (cty, wh, default_wh_restrictions, sku_specific_restrictions, fgsku_code, trim_sku, rm_sku, month, market, customs, transport_cost_per_case, max_gfc, max_kfc, max_nfc, fgwt_per_unit, custom_cost_per_unit_gfc, custom_cost_per_unit_kfc, custom_cost_per_unit_nfc, max_arbit, d10, qty_gfc, qty_kfc, qty_nfc, qty_x, v05, v06, qty_total, wt_gfc, wt_kfc, wt_nfc, custom_duty, f06, f07, f08, f09, f10, max_gfc_2, max_kfc_2, max_nfc_2, pos_gfc, pos_kfc, pos_nfc, pos_x, max_x, c09, c10, of01, of02, of03, of04, of05, row_cost, upload_batch_id, source_t01_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54) 
       RETURNING *`,
      [
        data.cty,
        data.wh,
        data.default_wh_restrictions,
        data.sku_specific_restrictions,
        data.fgsku_code,
        data.trim_sku,
        data.rm_sku,
        data.month,
        data.market,
        data.customs,
        data.transport_cost_per_case,
        data.max_gfc,
        data.max_kfc,
        data.max_nfc,
        data.fgwt_per_unit,
        data.custom_cost_per_unit_gfc,
        data.custom_cost_per_unit_kfc,
        data.custom_cost_per_unit_nfc,
        data.max_arbit,
        data.d10,
        data.qty_gfc,
        data.qty_kfc,
        data.qty_nfc,
        data.qty_x,
        data.v05,
        data.v06,
        data.qty_total,
        data.wt_gfc,
        data.wt_kfc,
        data.wt_nfc,
        data.custom_duty,
        data.f06,
        data.f07,
        data.f08,
        data.f09,
        data.f10,
        data.max_gfc_2,
        data.max_kfc_2,
        data.max_nfc_2,
        data.pos_gfc,
        data.pos_kfc,
        data.pos_nfc,
        data.pos_x,
        data.max_x,
        data.c09,
        data.c10,
        data.of01,
        data.of02,
        data.of03,
        data.of04,
        data.of05,
        data.row_cost,
        data.upload_batch_id,
        data.source_t01_id
      ]
    );

    return result.rows[0];
  }

  // Create multiple records in batch
  static async createBatch(records) {
    if (records.length === 0) return [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const record of records) {
        const result = await this.create(record);
        results.push(result);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get T02 data by upload batch
  static async findByUploadBatch(uploadBatchId) {
    const result = await pool.query(
      `SELECT * FROM t02_data 
       WHERE upload_batch_id = $1 
       ORDER BY cty, fgsku_code, month, 
               CASE wh 
                 WHEN 'GFCM' THEN 1 
                 WHEN 'KFCM' THEN 2 
                 WHEN 'NFCM' THEN 3 
                 WHEN 'X' THEN 4 
                 ELSE 5 
               END`,
      [uploadBatchId]
    );
    return result.rows;
  }

  // Get T02 data by upload batch with pagination
  static async findByUploadBatchWithPagination(uploadBatchId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM t02_data 
       WHERE upload_batch_id = $1 
       ORDER BY cty, fgsku_code, month, 
               CASE wh 
                 WHEN 'GFCM' THEN 1 
                 WHEN 'KFCM' THEN 2 
                 WHEN 'NFCM' THEN 3 
                 WHEN 'X' THEN 4 
                 ELSE 5 
               END
       LIMIT $2 OFFSET $3`,
      [uploadBatchId, limit, offset]
    );
    return result.rows;
  }

  // Get all T02 data
  static async findAll(limit = 1000, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM t02_data 
       ORDER BY cty, fgsku_code, month, 
               CASE wh 
                 WHEN 'GFCM' THEN 1 
                 WHEN 'KFCM' THEN 2 
                 WHEN 'NFCM' THEN 3 
                 WHEN 'X' THEN 4 
                 ELSE 5 
               END
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  // Get statistics
  static async getStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT cty) as unique_cty_values,
        COUNT(DISTINCT fgsku_code) as unique_fgsku_codes,
        COUNT(DISTINCT upload_batch_id) as total_upload_batches
      FROM t02_data
    `);
    return result.rows[0];
  }

  // Get count by upload batch
  static async getCountByUploadBatch(uploadBatchId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM t02_data WHERE upload_batch_id = $1',
      [uploadBatchId]
    );
    return result.rows[0].count;
  }

  // Clear all T02 data
  static async clearAll() {
    const result = await pool.query('DELETE FROM t02_data RETURNING *');
    return result.rows;
  }

  // Calculate T02 data from T01 data and other sources
  static async calculateT02Data(uploadBatchId) {
    const client = await pool.connect();
    try {
      console.log('Starting T02 calculation for upload batch:', uploadBatchId);

      // Get T01 data for this upload batch
      const T01Data = require('./T01Data');
      const t01Data = await T01Data.findByUploadBatch(uploadBatchId);
      
      if (!t01Data || t01Data.length === 0) {
        throw new Error('No T01 data found for this upload batch');
      }

      console.log(`Found ${t01Data.length} T01 records to process for T02`);

      // Get Demand Country Master cursor data for Default WH lookup
      const DemandCountryMasterCursor = require('./DemandCountryMasterCursor');
      const countryMasterData = await DemandCountryMasterCursor.getStructuredData(uploadBatchId);
      
      if (!countryMasterData || countryMasterData.length === 0) {
        console.log('Warning: No Demand Country Master data found for Default WH lookup');
      } else {
        console.log(`Found ${countryMasterData.length} Demand Country Master records for Default WH lookup`);
      }

      // Get Freight Storage Costs cursor data for Transport Cost calculation
      const FreightStorageCostsCursor = require('./FreightStorageCostsCursor');
      
      // Get all freight data from all upload batches (freight data is reference data)
      const freightUploadBatches = await client.query(`
        SELECT DISTINCT upload_batch_id FROM freight_storage_costs_cursor
      `);

      // Get Item Master data for FGWt per unit lookup from sheet_data table
      let itemMasterData = [];
      try {
        // Get Item Master NFC data from sheet_data table
        const itemMasterResult = await client.query(`
          SELECT 
            sd.row_index,
            sd.column_index,
            sd.cell_value,
            sd.column_name
          FROM sheet_data sd
          JOIN worksheets ws ON sd.worksheet_id = ws.id
          JOIN workbooks w ON ws.workbook_id = w.id
          WHERE w.workbook_name = 'Item_master_NFC' 
            AND ws.sheet_name = 'Sheet1'
            AND sd.column_name IS NOT NULL
          ORDER BY sd.row_index, sd.column_index
        `);
        
        if (itemMasterResult.rows.length > 0) {
          console.log(`Found ${itemMasterResult.rows.length} Item Master NFC records`);
          
          // Group by row to create structured data
          const rowsByIndex = {};
          for (const cell of itemMasterResult.rows) {
            if (!rowsByIndex[cell.row_index]) {
              rowsByIndex[cell.row_index] = {};
            }
            rowsByIndex[cell.row_index][cell.column_index] = cell.cell_value;
            if (cell.column_name) {
              rowsByIndex[cell.row_index][`col_${cell.column_name}`] = cell.cell_value;
            }
          }
          
          // Convert to structured records (skip header row)
          for (let rowIndex = 1; rowIndex < Math.max(...Object.keys(rowsByIndex).map(Number)) + 1; rowIndex++) {
            const row = rowsByIndex[rowIndex] || {};
            if (Object.keys(row).length > 0) {
              itemMasterData.push(row);
            }
          }
          
          console.log(`Converted to ${itemMasterData.length} structured Item Master records`);
          if (itemMasterData.length > 0) {
            console.log('Sample item master record structure:', Object.keys(itemMasterData[0]));
            console.log('Sample item master record:', itemMasterData[0]);
          }
        }
      } catch (error) {
        console.log('Warning: Could not fetch Item Master data:', error.message);
      }
      
      if (!itemMasterData || itemMasterData.length === 0) {
        console.log('Warning: No Item Master data found for FGWt per unit lookup');
      }
      
      let freightData = [];
      if (freightUploadBatches.rows.length > 0) {
        console.log(`Found ${freightUploadBatches.rows.length} freight data upload batches`);
        
        // Combine freight data from all upload batches
        for (const batch of freightUploadBatches.rows) {
          const batchData = await FreightStorageCostsCursor.getStructuredData(batch.upload_batch_id);
          freightData = freightData.concat(batchData);
          console.log(`Added ${batchData.length} records from freight batch: ${batch.upload_batch_id}`);
        }
      }
      
      if (!freightData || freightData.length === 0) {
        console.log('Warning: No Freight Storage Costs data found for Transport Cost lookup');
      } else {
        console.log(`Found ${freightData.length} Freight Storage Costs records for Transport Cost lookup`);
        // Debug: Log first few records to see structure
        if (freightData.length > 0) {
          console.log('Sample freight record structure:', Object.keys(freightData[0]));
          console.log('Sample freight record:', freightData[0]);
        }
      }

      // Create lookup map for Default WH Restrictions from Country Master
      const defaultWhLookup = new Map();
      if (countryMasterData && countryMasterData.length > 0) {
        for (const countryRecord of countryMasterData) {
          const countryName = countryRecord['Country'];
          const defaultWh = countryRecord['Default WH'];
          
          if (countryName && defaultWh) {
            // Map country names to CTY names used in T01
            let ctyName = countryName;
            if (countryName === 'Saudi Arabia') ctyName = 'KSA';
            if (countryName === 'United Arab Emirates') ctyName = 'UAE';
            if (countryName === 'Cote d\'Ivoire') ctyName = 'Cote d\'Ivoire';
            
            defaultWhLookup.set(ctyName, defaultWh);
            console.log(`Added default WH lookup: ${ctyName} -> ${defaultWh}`);
          }
        }
        console.log(`Created Default WH lookup map with ${defaultWhLookup.size} entries`);
      }

      // Create lookup map for Transport Cost Per Case from Freight Storage Costs
      const transportCostLookup = new Map();
      const originDestinationCosts = new Map(); // For average cost calculation
      const averageCosts = new Map(); // Initialize averageCosts outside the block
      
      if (freightData && freightData.length > 0) {
        console.log(`Processing ${freightData.length} Freight Storage Costs records for Transport Cost lookup`);
        console.log(`Total freight records from all batches: ${freightData.length}`);
        
        for (const freightRecord of freightData) {
          // Extract relevant fields from freight data
          const fgskuCode = freightRecord['FG Code'];
          const origin = freightRecord['Origin']; // This is the warehouse (NFC, GFC, KFC)
          const destination = freightRecord['Destination']; // This is the country
          const truckFreight = freightRecord['Truck Freight (USD)/Truckload'];
          const truckLoad = freightRecord['Truck Load (UoM)'];
          
          // Debug: Log first few records to see what we're getting
          if (transportCostLookup.size < 5) {
            console.log('Processing freight record:', {
              fgskuCode,
              origin,
              destination,
              truckFreight,
              truckLoad,
              hasAllFields: !!(fgskuCode && origin && destination && truckFreight !== undefined && truckFreight !== null && truckLoad !== undefined && truckLoad !== null)
            });
          }
          
          if (fgskuCode && origin && destination && truckFreight !== undefined && truckFreight !== null && truckLoad !== undefined && truckLoad !== null) {
            // Skip records with missing or invalid data
            if (truckFreight === 'Missing' || truckLoad === 'Missing' || truckFreight === '' || truckLoad === '') {
              continue;
            }
            
            // Calculate cost per case: Truck Freight / Truck Load
            const freightValue = parseFloat(truckFreight);
            const loadValue = parseFloat(truckLoad);
            
            // Skip if either value is NaN or zero
            if (isNaN(freightValue) || isNaN(loadValue) || loadValue === 0) {
              continue;
            }
            
            const costPerCase = freightValue / loadValue;
            
            // Map origin to warehouse codes
            let wh = origin;
            if (origin === 'NFC') wh = 'NFCM';
            if (origin === 'GFC') wh = 'GFCM';
            if (origin === 'KFC') wh = 'KFCM';
            
            // Create specific lookup key for CTY + WH + FGSKU combination
            const specificKey = `${destination}_${wh}_${fgskuCode}`;
            transportCostLookup.set(specificKey, costPerCase);
            
            // Create origin-destination key for average cost calculation
            const odKey = `${origin}_${destination}`;
            if (!originDestinationCosts.has(odKey)) {
              originDestinationCosts.set(odKey, []);
            }
            originDestinationCosts.get(odKey).push(costPerCase);
            
            console.log(`Added transport cost: ${specificKey} -> ${costPerCase} (${truckFreight}/${truckLoad})`);
          }
        }
        
        // Calculate average costs for origin-destination combinations
        for (const [odKey, costs] of originDestinationCosts) {
          const averageCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
          averageCosts.set(odKey, averageCost);
          console.log(`Average cost for ${odKey}: ${averageCost}`);
        }
        
        console.log(`Created Transport Cost lookup map with ${transportCostLookup.size} specific entries`);
        console.log(`Created Average Cost map with ${averageCosts.size} origin-destination combinations`);
      } else {
        console.log('Warning: No Freight Storage Costs data found for Transport Cost lookup');
      }

      // Create lookup map for FGWt per unit from Item Master
      const fgwtLookup = new Map();
      
      if (itemMasterData && itemMasterData.length > 0) {
        console.log(`Processing ${itemMasterData.length} Item Master records for FGWt per unit lookup`);
        
        for (const itemRecord of itemMasterData) {
          // Extract relevant fields from item master data
          // Look for SKU Code and Weight UOM in the record
          let skuCode = null;
          let weightUom = null;
          
          // Get SKU Code from column 4 and Unit Weight from column 12
          skuCode = itemRecord['4'] || itemRecord['col_4'];
          weightUom = itemRecord['12'] || itemRecord['col_12'];
          
          // Debug: Log first few records to see what we're getting
          if (fgwtLookup.size < 5) {
            console.log('Processing item master record:', {
              skuCode,
              weightUom,
              hasAllFields: !!(skuCode && weightUom),
              recordKeys: Object.keys(itemRecord)
            });
          }
          
          if (skuCode && weightUom) {
            // Skip records with missing or invalid data
            if (weightUom === 'Missing' || weightUom === '' || weightUom === null) {
              continue;
            }
            
            const weightValue = parseFloat(weightUom);
            
            // Skip if weight value is NaN
            if (isNaN(weightValue)) {
              continue;
            }
            
            fgwtLookup.set(skuCode, weightValue);
            
            if (fgwtLookup.size <= 5) {
              console.log(`Added FGWt lookup: ${skuCode} -> ${weightValue}`);
            }
          }
        }
        
        console.log(`Created FGWt lookup map with ${fgwtLookup.size} entries`);
      } else {
        console.log('Warning: No Item Master data found for FGWt per unit lookup');
      }

      // Clear existing T02 data for this upload batch
      await client.query('DELETE FROM t02_data WHERE upload_batch_id = $1', [uploadBatchId]);

      const t02Records = [];
      const whValues = ['GFCM', 'KFCM', 'NFCM', 'X']; // Already in alphabetical order
      const monthValues = ['05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16']; // Months 5 to 16
      let rowNumber = 2; // Start from row 2 in Excel
      
      // Get unique CTY + FGSKU combinations from T01 data
      const uniqueCombinations = new Set();
      for (const t01Record of t01Data) {
        const key = `${t01Record.cty}_${t01Record.fgsku_code}`;
        uniqueCombinations.add(key);
      }
      
      console.log(`Found ${uniqueCombinations.size} unique CTY + FGSKU combinations`);
      
      // Create T02 records for each unique CTY + FGSKU combination
      for (const combination of uniqueCombinations) {
        const [cty, fgskuCode] = combination.split('_');
        console.log(`Processing combination: CTY=${cty}, FGSKU=${fgskuCode}`);
        
        // Create records for each month (5 to 16)
        for (const month of monthValues) {
          // Create 4 T02 records for each month - one for each WH value
          for (const wh of whValues) {
            // Use current row number for this record
            const currentRow = rowNumber;
            rowNumber++; // Increment for next record
            
            // Lookup Default WH Restrictions from Country Master
            const defaultWhRestrictions = defaultWhLookup.get(cty) || 'N/A';
            
            // Calculate Transport Cost Per Case from Freight Storage Costs
            let transportCostPerCase = 0;
            
            // Rule 4: For all combinations to/from factory X, keep the cost as 0
            if (wh === 'X') {
              transportCostPerCase = 0;
            } else {
                                      // Rule 1 & 2: Calculate cost for each CTY + WH + FGSKU combination
            // Map CTY to full country name for freight lookup
            let freightDestination = cty;
            if (cty === 'KSA') freightDestination = 'Saudi Arabia';
            if (cty === 'UAE') freightDestination = 'United Arab Emirates';
            if (cty === 'KSA FS') freightDestination = 'Saudi Arabia';
            if (cty === 'UAE FS') freightDestination = 'United Arab Emirates';
            if (cty === 'Bahrain FS') freightDestination = 'Bahrain';
            if (cty === 'Iraq FS') freightDestination = 'Iraq';
            if (cty === 'Jordan FS') freightDestination = 'Jordan';
            
            const specificKey = `${freightDestination}_${wh}_${fgskuCode}`;
            transportCostPerCase = transportCostLookup.get(specificKey);
            
            // Debug: Log lookup attempts for first few records
            if (t02Records.length < 10) {
              console.log(`Looking up transport cost for key: ${specificKey} (CTY: ${cty} -> Destination: ${freightDestination}), found: ${transportCostPerCase}`);
            }
            
            // Rule 3: If specific cost unavailable, use average transport cost for origin-destination
            if (transportCostPerCase === undefined || transportCostPerCase === null) {
              // Map WH back to origin for lookup
              let origin = wh;
              if (wh === 'NFCM') origin = 'NFC';
              if (wh === 'GFCM') origin = 'GFC';
              if (wh === 'KFCM') origin = 'KFC';
              
              const odKey = `${origin}_${freightDestination}`;
              transportCostPerCase = averageCosts.get(odKey) || 0;
              
              if (t02Records.length < 10) {
                console.log(`Using average cost for ${odKey}: ${transportCostPerCase}`);
              }
            }
            }
            
            // Debug logging for first few records
            if (t02Records.length < 10) {
              console.log(`T02 Record ${t02Records.length + 1} (Excel Row ${currentRow}): CTY=${cty}, WH=${wh}, FGSKU=${fgskuCode}, TransportCost=${transportCostPerCase}, DefaultWH=${defaultWhRestrictions}`);
            }
            
            const t02Record = {
              cty: cty, // From unique combination
              wh: wh, // Set WH value (GFCM, KFCM, NFCM, X)
              default_wh_restrictions: defaultWhRestrictions, // Lookup from Country Master
              sku_specific_restrictions: 'N/A', // Default value
              fgsku_code: fgskuCode, // From unique combination
              trim_sku: 'N/A', // Default value
              rm_sku: 'N/A', // Default value
              month: month, // Month number (05, 06, 07, ..., 16)
              market: cty, // Same as CTY value
              customs: cty === 'KSA' ? 'Yes' : 'No', // Yes if Market=KSA, else No
              transport_cost_per_case: transportCostPerCase, // Calculated from Freight Storage Costs
              
              // Calculate Max_GFC, Max_KFC, Max_NFC based on market and WH
              max_gfc: (() => {
                if (cty === 'UAE' || cty === 'UAE FS') {
                  return wh === 'GFCM' ? Math.pow(10, 10) : 0;
                }
                if (cty === 'Kuwait' || cty === 'Kuwait FS') {
                  return wh === 'KFCM' ? Math.pow(10, 10) : 0;
                }
                return 0;
              })(),
              max_kfc: (() => {
                if (cty === 'UAE' || cty === 'UAE FS') {
                  return wh === 'GFCM' ? Math.pow(10, 10) : 0;
                }
                if (cty === 'Kuwait' || cty === 'Kuwait FS') {
                  return wh === 'KFCM' ? Math.pow(10, 10) : 0;
                }
                if (cty === 'KSA' || cty === 'KSA FS') {
                  return wh === 'NFCM' ? Math.pow(10, 10) : 0;
                }
                return 0;
              })(),
              max_nfc: (() => {
                if (cty === 'UAE' || cty === 'UAE FS') {
                  return wh === 'GFCM' ? Math.pow(10, 10) : 0;
                }
                if (cty === 'Kuwait' || cty === 'Kuwait FS') {
                  return wh === 'KFCM' ? Math.pow(10, 10) : 0;
                }
                if (cty === 'KSA' || cty === 'KSA FS') {
                  return wh === 'NFCM' ? Math.pow(10, 10) : 0;
                }
                return 0;
              })(),
              
              // Lookup FGWt per unit from Item Master
              fgwt_per_unit: fgwtLookup.get(fgskuCode) || 0, // Lookup from Item Master
              custom_cost_per_unit_gfc: 0, // Default value
              custom_cost_per_unit_kfc: 0, // Default value
              custom_cost_per_unit_nfc: 0, // Default value
              max_arbit: wh === 'X' ? Math.pow(10, 10) : 0, // 10^10 for factory X, 0 for others
              d10: 0, // Default value
              qty_gfc: 0, // Set to 0 for now
              qty_kfc: 0, // Set to 0 for now
              qty_nfc: 0, // Set to 0 for now
              qty_x: 0, // Set to 0 for now
              v05: 0, // Default value
              v06: 0, // Default value
              qty_total: `=U${currentRow}+V${currentRow}+W${currentRow}+X${currentRow}`, // Excel formula: Qty_GFC + Qty_KFC + Qty_NFC + Qty_X
              wt_gfc: `=O${currentRow}*U${currentRow}`, // Excel formula: FGWtPerUnit x Qty_GFC
              wt_kfc: `=O${currentRow}*V${currentRow}`, // Excel formula: FGWtPerUnit x Qty_KFC
              wt_nfc: `=O${currentRow}*W${currentRow}`, // Excel formula: FGWtPerUnit x Qty_NFC
              custom_duty: `=(U${currentRow}*P${currentRow})+(V${currentRow}*Q${currentRow})+(W${currentRow}*R${currentRow})`, // Excel formula: (Qty_GFC x Custom Cost/Unit - GFC) + (Qty_KFC x Custom Cost/Unit - KFC) + (Qty_NFC x Custom Cost/Unit - NFC)
              f06: 0, // Default value
              f07: 0, // Default value
              f08: 0, // Default value
              f09: 0, // Default value
              f10: 0, // Default value
              max_gfc_2: `=@WB(U${currentRow},"<=",L${currentRow})`, // Excel formula: @WB(Qty_GFC,"<=",Max_GFC)
              max_kfc_2: `=@WB(V${currentRow},"<=",M${currentRow})`, // Excel formula: @WB(Qty_KFC,"<=",Max_KFC)
              max_nfc_2: `=@WB(W${currentRow},"<=",N${currentRow})`, // Excel formula: @WB(Qty_NFC,"<=",Max_NFC)
              pos_gfc: `=@WB(U${currentRow},">=",0)`, // Excel formula: @WB(Qty_GFC,">=",0)
              pos_kfc: `=@WB(V${currentRow},">=",0)`, // Excel formula: @WB(Qty_KFC,">=",0)
              pos_nfc: `=@WB(W${currentRow},">=",0)`, // Excel formula: @WB(Qty_NFC,">=",0)
              pos_x: `=@WB(X${currentRow},">=",0)`, // Excel formula: @WB(Qty_X,">=",0)
              max_x: `=@WB(X${currentRow},"<=",S${currentRow})`, // Excel formula: @WB(Qty_X,"<=",Max_Arbit)
              c09: 0, // Default value
              c10: 0, // Default value
              of01: 0, // Default value
              of02: 0, // Default value
              of03: 0, // Default value
              of04: 0, // Default value
              of05: 0, // Default value
              row_cost: `=AA${currentRow}*K${currentRow}`, // Excel formula: Qty_Total x TransportCostPerCase
              upload_batch_id: uploadBatchId,
              source_t01_id: null // No direct T01 source since we're creating all months
            };

            t02Records.push(t02Record);
          }
        }
      }

      console.log(`Created ${t02Records.length} T02 records`);

      // Insert T02 records in batches
      const batchSize = 1000;
      for (let i = 0; i < t02Records.length; i += batchSize) {
        const batch = t02Records.slice(i, i + batchSize);
        await this.createBatch(batch);
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(t02Records.length / batchSize)}`);
      }

      console.log('T02 calculation completed successfully');
      return t02Records.length;

    } catch (error) {
      console.error('Error calculating T02 data:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = T02Data; 