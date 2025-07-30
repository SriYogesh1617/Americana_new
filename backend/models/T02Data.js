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
       ORDER BY cty, wh, default_wh_restrictions, sku_specific_restrictions, fgsku_code, trim_sku, rm_sku, month, market, customs`,
      [uploadBatchId]
    );
    return result.rows;
  }

  // Get T02 data by upload batch with pagination
  static async findByUploadBatchWithPagination(uploadBatchId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM t02_data 
       WHERE upload_batch_id = $1 
       ORDER BY cty, wh, default_wh_restrictions, sku_specific_restrictions, fgsku_code, trim_sku, rm_sku, month, market, customs
       LIMIT $2 OFFSET $3`,
      [uploadBatchId, limit, offset]
    );
    return result.rows;
  }

  // Get all T02 data
  static async findAll(limit = 1000, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM t02_data 
       ORDER BY cty, wh, default_wh_restrictions, sku_specific_restrictions, fgsku_code, trim_sku, rm_sku, month, market, customs 
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
      
      // For freight data, we'll use a different approach since it's in a separate upload batch
      // We'll look for freight data in any available upload batch
      
      if (!t01Data || t01Data.length === 0) {
        throw new Error('No T01 data found for this upload batch');
      }

      console.log(`Found ${t01Data.length} T01 records to process for T02`);

      // Get Demand Country Master cursor data for Default WH lookup
      const DemandCountryMasterCursor = require('./DemandCountryMasterCursor');
      const countryMasterData = await DemandCountryMasterCursor.getStructuredData(uploadBatchId);
      
      // Get Freight Storage Costs cursor data for Transport Cost calculation
      const FreightStorageCostsCursor = require('./FreightStorageCostsCursor');
      // Get all available freight data upload batches
      const freightUploadBatches = await client.query(`
        SELECT DISTINCT upload_batch_id FROM freight_storage_costs_cursor
      `);
      
      let freightData = [];
      if (freightUploadBatches.rows.length > 0) {
        // Use the first available freight data upload batch
        const freightUploadBatchId = freightUploadBatches.rows[0].upload_batch_id;
        console.log(`Using freight data from upload batch: ${freightUploadBatchId}`);
        freightData = await FreightStorageCostsCursor.getStructuredData(freightUploadBatchId);
      }
      
      if (!countryMasterData || countryMasterData.length === 0) {
        console.log('Warning: No Demand Country Master data found for Default WH lookup');
      } else {
        console.log(`Found ${countryMasterData.length} Demand Country Master records for Default WH lookup`);
      }

      // Create lookup map for Default WH Restrictions
      const defaultWhLookup = new Map();
      if (countryMasterData && countryMasterData.length > 0) {
        for (const countryRecord of countryMasterData) {
          // Use Country and Market columns for lookup
          const countryName = countryRecord['Country'] || countryRecord['Country Name (Raw demand)'];
          const market = countryRecord['Market'];
          const defaultWh = countryRecord['Default WH'];
          
          if (countryName && market) {
            const key = `${countryName}_${market}`;
            defaultWhLookup.set(key, defaultWh);
            console.log(`Added lookup key: ${key} -> ${defaultWh}`);
          }
        }
        console.log(`Created Default WH lookup map with ${defaultWhLookup.size} entries`);
      }

      // Create additional lookup map for CTY-based matching (since T01 uses CTY names)
      const ctyLookupMap = new Map();
      if (countryMasterData && countryMasterData.length > 0) {
        for (const countryRecord of countryMasterData) {
          const countryName = countryRecord['Country'] || countryRecord['Country Name (Raw demand)'];
          const market = countryRecord['Market'];
          const defaultWh = countryRecord['Default WH'];
          
          if (countryName && market) {
            // Map country names to CTY names used in T01
            let ctyName = countryName;
            if (countryName === 'Saudi Arabia') ctyName = 'KSA';
            if (countryName === 'United Arab Emirates') ctyName = 'UAE';
            
            const key = `${ctyName}_${market}`;
            ctyLookupMap.set(key, defaultWh);
            console.log(`Added CTY lookup key: ${key} -> ${defaultWh}`);
          }
        }
        console.log(`Created CTY lookup map with ${ctyLookupMap.size} entries`);
      }

      // Create lookup map for Transport Cost Per Case from Freight Storage Costs
      const transportCostLookup = new Map();
      if (freightData && freightData.length > 0) {
        console.log(`Found ${freightData.length} Freight Storage Costs records for Transport Cost lookup`);
        
        for (const freightRecord of freightData) {
          // Extract relevant fields from freight data based on actual column structure
          // Columns: FG Code, FG_Desc, UOM, Origin, Destination, Truck Load, Truck Freight
          const fgskuCode = freightRecord['FG Code'];
          const origin = freightRecord['Origin']; // This is the warehouse (NFC, GFC, KFC)
          const destination = freightRecord['Destination']; // This is the country
          const truckFreight = freightRecord['Truck Freight (USD)/Truckload'];
          const truckLoad = freightRecord['Truck Load (UoM)'];
          
          if (fgskuCode && origin && destination && truckFreight !== undefined && truckFreight !== null) {
            // Calculate cost per case: Truck Freight / Truck Load
            const costPerCase = parseFloat(truckFreight) / parseFloat(truckLoad || 1);
            
            // Map origin to warehouse codes
            let wh = origin;
            if (origin === 'NFC') wh = 'NFCM';
            if (origin === 'GFC') wh = 'GFCM';
            if (origin === 'KFC') wh = 'KFCM';
            
            const key = `${destination}_${wh}_${fgskuCode}`;
            transportCostLookup.set(key, costPerCase);
            console.log(`Added transport cost lookup: ${key} -> ${costPerCase} (${truckFreight}/${truckLoad})`);
          }
        }
        console.log(`Created Transport Cost lookup map with ${transportCostLookup.size} entries`);
      } else {
        console.log('Warning: No Freight Storage Costs data found for Transport Cost lookup');
      }

      // Clear existing T02 data for this upload batch
      await client.query('DELETE FROM t02_data WHERE upload_batch_id = $1', [uploadBatchId]);

      const t02Records = [];
      const whValues = ['GFCM', 'KFCM', 'NFCM', 'X']; // Already in alphabetical order
      let recordCount = 0; // Counter for generating sequential row numbers in Excel formulas
      
      for (const t01Record of t01Data) {
        console.log(`Processing T01 record: CTY=${t01Record.cty}, FGSKU=${t01Record.fgsku_code}, Month=${t01Record.month}`);
        
        // Create 4 T02 records for each T01 record - one for each WH value
        for (const wh of whValues) {
          // Lookup Default WH Restrictions from Country Master
          const lookupKey = `${t01Record.cty}_${t01Record.market}`;
          let defaultWhRestrictions = defaultWhLookup.get(lookupKey) || ctyLookupMap.get(lookupKey) || 'NA';
          
          // Debug logging for first few records
          if (t02Records.length < 10) {
            console.log(`T02 Record ${t02Records.length + 1}: CTY=${t01Record.cty}, Market=${t01Record.market}, LookupKey=${lookupKey}, DefaultWH=${defaultWhRestrictions}`);
          }
          
          // Calculate Transport Cost Per Case from Freight Storage Costs
          const transportCostKey = `${t01Record.cty}_${wh}_${t01Record.fgsku_code}`;
          const transportCostPerCase = transportCostLookup.get(transportCostKey) || 0;
          
          // Calculate Max_GFC based on CTY and WH
          let maxGfc = 0;
          if (t01Record.cty === 'KSA' && wh === 'NFCM') {
            maxGfc = Math.pow(10, 10); // 10^10 = 10,000,000,000
          }
          
          // Calculate Max_KFC based on CTY and WH
          let maxKfc = 0;
          if ((t01Record.cty === 'Kuwait' || t01Record.cty === 'Kuwait FS') && wh === 'KFCM') {
            maxKfc = Math.pow(10, 10); // 10^10 = 10,000,000,000
          }
          
          // Calculate Max_NFC based on CTY and WH
          let maxNfc = 0;
          if ((t01Record.cty === 'UAE' || t01Record.cty === 'UAE FS') && wh === 'GFCM') {
            maxNfc = Math.pow(10, 10); // 10^10 = 10,000,000,000
          }
          
          recordCount++; // Increment counter for each record
          
          const t02Record = {
            cty: t01Record.cty, // Lookup from T_01
            wh: wh, // Set WH value (GFCM, KFCM, NFCM, X)
            default_wh_restrictions: defaultWhRestrictions, // Lookup from Country Master
            sku_specific_restrictions: 'N/A', // Default value
            fgsku_code: t01Record.fgsku_code, // Lookup from T_01
            trim_sku: 'N/A', // Default value
            rm_sku: 'N/A', // Default value
            month: t01Record.month, // From T_01
            market: t01Record.market, // From T_01
            customs: 'No', // Default value
            transport_cost_per_case: transportCostPerCase, // Calculated from Freight Storage Costs
            max_gfc: maxGfc, // Calculated based on CTY and WH
            max_kfc: maxKfc, // Calculated based on CTY and WH
            max_nfc: maxNfc, // Calculated based on CTY and WH
            fgwt_per_unit: 0, // TODO: Add logic
            custom_cost_per_unit_gfc: 0, // TODO: Add logic
            custom_cost_per_unit_kfc: 0, // TODO: Add logic
            custom_cost_per_unit_nfc: 0, // TODO: Add logic
            max_arbit: 0, // TODO: Add logic
            d10: 0, // TODO: Add logic
            qty_gfc: 0, // TODO: Add logic
            qty_kfc: 0, // TODO: Add logic
            qty_nfc: 0, // TODO: Add logic
            qty_x: 0, // TODO: Add logic
            v05: 0, // TODO: Add logic
            v06: 0, // TODO: Add logic
            qty_total: 0, // TODO: Add logic
            wt_gfc: 0, // TODO: Add logic
            wt_kfc: 0, // TODO: Add logic
            wt_nfc: 0, // TODO: Add logic
            custom_duty: 0, // TODO: Add logic
            f06: 0, // TODO: Add logic
            f07: 0, // TODO: Add logic
            f08: 0, // TODO: Add logic
            f09: 0, // TODO: Add logic
            f10: 0, // TODO: Add logic
            max_gfc_2: (() => {
              // Calculate the current row number (starting from row 2 in Excel)
              const currentRow = recordCount + 1; // recordCount starts at 1, so this gives us row 2, 3, 4, etc.
              
              // Calculate column letters for Qty GFC and Max GFC
              // Based on the actual Excel column order: Qty GFC is column S, Max GFC is column L
              const qtyGfcCol = 'S';
              const maxGfcCol = 'L';
              
              return `=@WB(${qtyGfcCol}${currentRow},"<=",${maxGfcCol}${currentRow})`;
            })(), // Dynamic Excel constraint formula: Qty GFC <= Max GFC
            max_kfc_2: (() => {
              // Calculate the current row number (starting from row 2 in Excel)
              const currentRow = recordCount + 1; // recordCount starts at 1, so this gives us row 2, 3, 4, etc.
              
              // Calculate column letters for Qty KFC and Max KFC
              // Based on the actual Excel column order: Qty KFC is column T, Max KFC is column M
              const qtyKfcCol = 'T';
              const maxKfcCol = 'M';
              
              return `=@WB(${qtyKfcCol}${currentRow},"<=",${maxKfcCol}${currentRow})`;
            })(), // Dynamic Excel constraint formula: Qty KFC <= Max KFC
            max_nfc_2: (() => {
              // Calculate the current row number (starting from row 2 in Excel)
              const currentRow = recordCount + 1; // recordCount starts at 1, so this gives us row 2, 3, 4, etc.
              
              // Calculate column letters for Qty NFC and Max NFC
              // Based on the actual Excel column order: Qty NFC is column U, Max NFC is column N
              const qtyNfcCol = 'U';
              const maxNfcCol = 'N';
              
              return `=@WB(${qtyNfcCol}${currentRow},"<=",${maxNfcCol}${currentRow})`;
            })(), // Dynamic Excel constraint formula: Qty NFC <= Max NFC
            pos_gfc: (() => {
              // Calculate the current row number (starting from row 2 in Excel)
              const currentRow = recordCount + 1; // recordCount starts at 1, so this gives us row 2, 3, 4, etc.
              
              // Calculate column letters for Qty GFC
              // Based on the actual Excel column order: Qty GFC is column S
              const qtyGfcCol = 'S';
              
              return `=@WB(${qtyGfcCol}${currentRow},">=",0)`;
            })(), // Dynamic Excel constraint formula: Qty GFC >= 0
            pos_kfc: (() => {
              // Calculate the current row number (starting from row 2 in Excel)
              const currentRow = recordCount + 1; // recordCount starts at 1, so this gives us row 2, 3, 4, etc.
              
              // Calculate column letters for Qty KFC
              // Based on the actual Excel column order: Qty KFC is column T
              const qtyKfcCol = 'T';
              
              return `=@WB(${qtyKfcCol}${currentRow},">=",0)`;
            })(), // Dynamic Excel constraint formula: Qty KFC >= 0
            pos_nfc: (() => {
              // Calculate the current row number (starting from row 2 in Excel)
              const currentRow = recordCount + 1; // recordCount starts at 1, so this gives us row 2, 3, 4, etc.
              
              // Calculate column letters for Qty NFC
              // Based on the actual Excel column order: Qty NFC is column U
              const qtyNfcCol = 'U';
              
              return `=@WB(${qtyNfcCol}${currentRow},">=",0)`;
            })(), // Dynamic Excel constraint formula: Qty NFC >= 0
            pos_x: (() => {
              // Calculate the current row number (starting from row 2 in Excel)
              const currentRow = recordCount + 1; // recordCount starts at 1, so this gives us row 2, 3, 4, etc.
              
              // Calculate column letters for Qty X
              // Based on the actual Excel column order: Qty X is column W
              const qtyXCol = 'W';
              
              return `=@WB(${qtyXCol}${currentRow},">=",0)`;
            })(), // Dynamic Excel constraint formula: Qty X >= 0
            max_x: (() => {
              // Calculate the current row number (starting from row 2 in Excel)
              const currentRow = recordCount + 1; // recordCount starts at 1, so this gives us row 2, 3, 4, etc.
              
              // Calculate column letters for Qty X and Max Arbit
              // Based on the actual Excel column order: Qty X is column W, Max Arbit is column T
              const qtyXCol = 'W';
              const maxArbitCol = 'T';
              
              return `=@WB(${qtyXCol}${currentRow},"<=",${maxArbitCol}${currentRow})`;
            })(), // Dynamic Excel constraint formula: Qty X <= Max Arbit
            c09: 0, // TODO: Add logic
            c10: 0, // TODO: Add logic
            of01: 0, // TODO: Add logic
            of02: 0, // TODO: Add logic
            of03: 0, // TODO: Add logic
            of04: 0, // TODO: Add logic
            of05: 0, // TODO: Add logic
            row_cost: (() => {
              // Calculate the current row number (starting from row 2 in Excel)
              const currentRow = recordCount + 1; // recordCount starts at 1, so this gives us row 2, 3, 4, etc.
              
              // Calculate column letters for Qty Total and Transport Cost Per Case
              // Based on the actual Excel column order: Qty Total is column V, Transport Cost Per Case is column K
              const qtyTotalCol = 'V';
              const transportCostCol = 'K';
              
              return `=${qtyTotalCol}${currentRow}*${transportCostCol}${currentRow}`;
            })(), // Dynamic Excel formula: Qty Total * Transport Cost Per Case
            upload_batch_id: uploadBatchId,
            source_t01_id: t01Record.id
          };

          t02Records.push(t02Record);
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