const { pool } = require('../config/database');
const CustomCostLookup = require('./CustomCostLookup');
const TransportCostCalculator = require('./TransportCostCalculator');
const ItemMasterLookup = require('./ItemMasterLookup');
const ExportRestrictionsLookup = require('./ExportRestrictionsLookup');

class T02Data {
  // Create a new T02 record
  static async create(data) {
    // Insert all columns including the new formula fields
    const result = await pool.query(
      `INSERT INTO t02_data 
       (cty, wh, default_wh_restrictions, sku_specific_restrictions, fgsku_code, trim_sku, rm_sku, month, market, customs, transport_cost_per_case, max_gfc, max_kfc, max_nfc, fgwt_per_unit, custom_cost_per_unit_gfc, custom_cost_per_unit_kfc, custom_cost_per_unit_nfc, max_arbit, qty_gfc, qty_kfc, qty_nfc, qty_x, qty_total, wt_gfc, wt_kfc, wt_nfc, custom_duty, max_gfc_2, max_kfc_2, max_nfc_2, pos_gfc, pos_kfc, pos_nfc, pos_x, max_x, row_cost, upload_batch_id, source_t01_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39) 
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
        data.qty_gfc,
        data.qty_kfc,
        data.qty_nfc,
        data.qty_x,
        data.qty_total,
        data.wt_gfc,
        data.wt_kfc,
        data.wt_nfc,
        data.custom_duty,
        data.max_gfc_2,
        data.max_kfc_2,
        data.max_nfc_2,
        data.pos_gfc,
        data.pos_kfc,
        data.pos_nfc,
        data.pos_x,
        data.max_x,
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
       ORDER BY 
               CASE wh 
                 WHEN 'GFCM' THEN 1 
                 WHEN 'KFCM' THEN 2 
                 WHEN 'NFCM' THEN 3 
                 WHEN 'X' THEN 4 
                 ELSE 5 
               END,
               cty, fgsku_code, month`,
      [uploadBatchId]
    );
    return result.rows;
  }

  // Get T02 data by upload batch with pagination
  static async findByUploadBatchWithPagination(uploadBatchId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM t02_data 
       WHERE upload_batch_id = $1 
       ORDER BY 
               CASE wh 
                 WHEN 'GFCM' THEN 1 
                 WHEN 'KFCM' THEN 2 
                 WHEN 'NFCM' THEN 3 
                 WHEN 'X' THEN 4 
                 ELSE 5 
               END,
               cty, fgsku_code, month
       LIMIT $2 OFFSET $3`,
      [uploadBatchId, limit, offset]
    );
    return result.rows;
  }

  // Get all T02 data
  static async findAll(limit = 1000, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM t02_data 
       ORDER BY 
               CASE wh 
                 WHEN 'GFCM' THEN 1 
                 WHEN 'KFCM' THEN 2 
                 WHEN 'NFCM' THEN 3 
                 WHEN 'X' THEN 4 
                 ELSE 5 
               END,
               cty, fgsku_code, month
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

      // Load enhanced freight data using the new TransportCostCalculator
      const transportFreightData = await TransportCostCalculator.loadFreightData();
      const freightSummary = await TransportCostCalculator.getCalculationSummary(transportFreightData);
      console.log('📊 Freight Data Summary:', freightSummary);

      // Load combined item master data from all factories (GFC, KFC, NFC)
      const combinedItemMaster = await ItemMasterLookup.loadCombinedItemMasterData();
      const itemMasterStats = ItemMasterLookup.getStatistics(combinedItemMaster);
      console.log('📦 Combined Item Master Statistics:', itemMasterStats);

      // Load export restrictions from Base Scenario Configuration
      const exportRestrictions = await ExportRestrictionsLookup.loadExportRestrictions();
      const exportRestrictionsStats = ExportRestrictionsLookup.getStatistics(exportRestrictions);
      console.log('🚫 Export Restrictions Statistics:', exportRestrictionsStats);

      // Item Master data is now loaded using the combined approach above

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

      // Transport cost calculation will now use the new TransportCostCalculator
      // FGWt per unit lookup will now use the combined item master data

      // Clear existing T02 data for this upload batch
      await client.query('DELETE FROM t02_data WHERE upload_batch_id = $1', [uploadBatchId]);

      const t02Records = [];
      const whValues = ['GFCM', 'KFCM', 'NFCM', 'X']; // Already in alphabetical order
      const monthValues = ['05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16']; // Months 5 to 16
      
      // Get unique CTY + FGSKU combinations from T01 data
      const uniqueCombinations = new Set();
      for (const t01Record of t01Data) {
        const key = `${t01Record.cty}_${t01Record.fgsku_code}`;
        uniqueCombinations.add(key);
      }
      
      console.log(`Found ${uniqueCombinations.size} unique CTY + FGSKU combinations`);
      
      // Calculate total records per WH group for proper row numbering
      const recordsPerWH = uniqueCombinations.size * monthValues.length;
      console.log(`Records per WH group: ${recordsPerWH}`);
      
      // Create T02 records organized by WH first, then by CTY+SKU combinations, then by months
      for (let whIndex = 0; whIndex < whValues.length; whIndex++) {
        const wh = whValues[whIndex];
        console.log(`Processing WH: ${wh} (index: ${whIndex})`);
        
        // Calculate starting row for this WH group
        const whStartRow = 2 + (whIndex * recordsPerWH);
        console.log(`WH ${wh} starts at row: ${whStartRow}`);
        
        // For each WH, process all CTY + FGSKU combinations
        for (const combination of uniqueCombinations) {
          const [cty, fgskuCode] = combination.split('_');
          console.log(`Processing combination: CTY=${cty}, FGSKU=${fgskuCode} for WH=${wh}`);
          
          // Create records for each month (5 to 16) for this WH
          for (let monthIndex = 0; monthIndex < monthValues.length; monthIndex++) {
            const month = monthValues[monthIndex];
            
            // Calculate the correct row number for this record
            const combinationIndex = Array.from(uniqueCombinations).indexOf(combination);
            const currentRow = whStartRow + (combinationIndex * monthValues.length) + monthIndex;
            
            // Lookup Default WH Restrictions from Country Master
            const defaultWhRestrictions = defaultWhLookup.get(cty) || 'N/A';
            
            // Calculate Transport Cost Per Case using enhanced TransportCostCalculator
            const transportCostPerCase = TransportCostCalculator.calculateTransportCost(
              cty, wh, fgskuCode, transportFreightData
            );
            
            // Debug: Log transport cost for first few records
            if (t02Records.length < 10) {
              console.log(`Transport cost for ${cty}_${wh}_${fgskuCode}: ${transportCostPerCase}`);
            }
            
            // Calculate custom costs for this record
            const isCustomsRequired = (cty === 'KSA' || cty === 'KSA FS') ? 'Yes' : 'No';
            const customCostGFC = await CustomCostLookup.calculateCustomCostPerUnit(
              fgskuCode, 'GFC', transportCostPerCase, cty, isCustomsRequired
            );
            const customCostKFC = await CustomCostLookup.calculateCustomCostPerUnit(
              fgskuCode, 'KFC', transportCostPerCase, cty, isCustomsRequired
            );
            const customCostNFC = await CustomCostLookup.calculateCustomCostPerUnit(
              fgskuCode, 'NFC', transportCostPerCase, cty, isCustomsRequired
            );

            // Debug logging for first few records
            if (t02Records.length < 10) {
              console.log(`T02 Record ${t02Records.length + 1} (Excel Row ${currentRow}): CTY=${cty}, WH=${wh}, FGSKU=${fgskuCode}, TransportCost=${transportCostPerCase}, DefaultWH=${defaultWhRestrictions}`);
              console.log(`  Custom Costs: GFC=${customCostGFC}, KFC=${customCostKFC}, NFC=${customCostNFC}`);
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
              customs: isCustomsRequired, // Yes if Market=KSA or KSA FS, else No
              transport_cost_per_case: transportCostPerCase, // Calculated from Freight Storage Costs
              
              // Calculate Max_GFC, Max_KFC, Max_NFC using enhanced conditions and Export Restrictions
              ...(() => {
                // Start with default values for all factories
                let maxGFC = wh === 'X' ? 0 : Math.pow(10, 10);  // Condition 1
                let maxKFC = wh === 'X' ? 0 : Math.pow(10, 10);  // Condition 1  
                let maxNFC = wh === 'X' ? 0 : Math.pow(10, 10);  // Condition 1
                
                // Condition 2: UAE/UAE FS restrictions
                if ((cty === 'UAE' || cty === 'UAE FS') && wh !== 'GFCM') {
                  maxGFC = 0;
                  maxKFC = 0;
                  maxNFC = 0;
                }
                
                // Condition 3: Kuwait/Kuwait FS restrictions
                if ((cty === 'Kuwait' || cty === 'Kuwait FS') && wh !== 'KFCM') {
                  maxGFC = 0;
                  maxKFC = 0;
                  maxNFC = 0;
                }
                
                // Condition 4: KSA/KSA FS restrictions  
                if ((cty === 'KSA' || cty === 'KSA FS') && wh !== 'NFCM') {
                  maxGFC = 0;
                  maxKFC = 0;
                  maxNFC = 0;
                }
                
                // Condition 5: KSA/KSA FS - Max_GFC always 0
                if (cty === 'KSA' || cty === 'KSA FS') {
                  maxGFC = 0;
                }
                
                // Condition 6: Apply Export Restrictions
                const restrictedValues = ExportRestrictionsLookup.applyExportRestrictions(
                  fgskuCode, wh, cty, month, maxGFC, maxKFC, maxNFC, exportRestrictions
                );
                
                return {
                  max_gfc: restrictedValues.maxGFC,
                  max_kfc: restrictedValues.maxKFC,
                  max_nfc: restrictedValues.maxNFC
                };
              })(),
              
              // Lookup FGWt per unit from Combined Item Master (GFC, KFC, NFC)
              fgwt_per_unit: ItemMasterLookup.getFGWtPerUnit(fgskuCode, combinedItemMaster), // Lookup from combined item master
              custom_cost_per_unit_gfc: customCostGFC, // Calculated using custom cost formula
              custom_cost_per_unit_kfc: customCostKFC, // Calculated using custom cost formula
              custom_cost_per_unit_nfc: customCostNFC, // Calculated using custom cost formula (always 0)
              max_arbit: wh === 'X' ? Math.pow(10, 10) : 0, // 10^10 for factory X, 0 for others
              qty_gfc: 0, // Set to 0 for now
              qty_kfc: 0, // Set to 0 for now
              qty_nfc: 0, // Set to 0 for now
              qty_x: 0, // Set to 0 for now
              qty_total: `=T${currentRow}+U${currentRow}+V${currentRow}+W${currentRow}`, // Excel formula: Qty_GFC + Qty_KFC + Qty_NFC + Qty_X
              wt_gfc: `=O${currentRow}*T${currentRow}`, // Excel formula: FGWtPerUnit x Qty_GFC
              wt_kfc: `=O${currentRow}*U${currentRow}`, // Excel formula: FGWtPerUnit x Qty_KFC
              wt_nfc: `=O${currentRow}*V${currentRow}`, // Excel formula: FGWtPerUnit x Qty_NFC
              custom_duty: `=(T${currentRow}*P${currentRow})+(U${currentRow}*Q${currentRow})+(V${currentRow}*R${currentRow})`, // Excel formula: (Qty_GFC x Custom Cost/Unit - GFC) + (Qty_KFC x Custom Cost/Unit - KFC) + (Qty_NFC x Custom Cost/Unit - NFC)
              max_gfc_2: `=@WB(T${currentRow},"<=",L${currentRow})`, // Excel formula: @WB(Qty_GFC,"<=",Max_GFC)
              max_kfc_2: `=@WB(U${currentRow},"<=",M${currentRow})`, // Excel formula: @WB(Qty_KFC,"<=",Max_KFC)
              max_nfc_2: `=@WB(V${currentRow},"<=",N${currentRow})`, // Excel formula: @WB(Qty_NFC,"<=",Max_NFC)
              pos_gfc: `=@WB(T${currentRow},">=",0)`, // Excel formula: @WB(Qty_GFC,">=",0)
              pos_kfc: `=@WB(U${currentRow},">=",0)`, // Excel formula: @WB(Qty_KFC,">=",0)
              pos_nfc: `=@WB(V${currentRow},">=",0)`, // Excel formula: @WB(Qty_NFC,">=",0)
              pos_x: `=@WB(W${currentRow},">=",0)`, // Excel formula: @WB(Qty_X,">=",0)
              max_x: `=@WB(W${currentRow},"<=",S${currentRow})`, // Excel formula: @WB(Qty_X,"<=",Max_Arbit)
              row_cost: `=X${currentRow}*K${currentRow}`, // Excel formula: Qty_Total x TransportCostPerCase
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