const { query } = require('../config/database');

class T04Data {
  // Create the T04_WHBal table
  static async createTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS t04_whbal (
        id SERIAL PRIMARY KEY,
        wh VARCHAR(10) NOT NULL,                           -- Warehouse Code (GFCM/KFCM/NFCM/X)
        fg_sku_code VARCHAR(50) NOT NULL,                  -- SKU Code
        mth_num INTEGER NOT NULL,                          -- Month (1-12)
        mto_demand_next_month DECIMAL(15,2) DEFAULT 0,     -- MTO demand next month
        mts_demand_next_month DECIMAL(15,2) DEFAULT 0,     -- MTS demand next month
        inventory_days_norm INTEGER DEFAULT 0,             -- Inventory days norm
        store_cost DECIMAL(15,4) DEFAULT 0,                -- Store cost
        mts_demand_next_3_months DECIMAL(15,2) DEFAULT 0,  -- MTS demand next 3 months
        min_os DECIMAL(15,2) DEFAULT 0,                    -- Min opening stock
        max_os DECIMAL(15,2) DEFAULT 10000000000,          -- Max opening stock
        min_cs DECIMAL(15,2) DEFAULT 0,                    -- Min closing stock
        max_cs DECIMAL(15,2) DEFAULT 10000000000,          -- Max closing stock
        max_sup_lim DECIMAL(8,2) DEFAULT 1,                -- Max supply limit multiplier
        m1os_gfc DECIMAL(15,2) DEFAULT 0,                  -- M1 opening stock GFC
        m1os_kfc DECIMAL(15,2) DEFAULT 0,                  -- M1 opening stock KFC
        m1os_nfc DECIMAL(15,2) DEFAULT 0,                  -- M1 opening stock NFC
        fg_wt_per_unit DECIMAL(10,4) DEFAULT 1,            -- FG weight per unit
        cs_norm DECIMAL(15,2) DEFAULT 0,                   -- CS norm
        norm_markup DECIMAL(8,2) DEFAULT 1,                -- Norm markup
        m1os_x DECIMAL(15,2) DEFAULT 0,                    -- M1 opening stock X
        next_3_months_demand_total DECIMAL(15,2) DEFAULT 0, -- Next 3 months total demand
        
        -- Stock columns for each factory
        os_gfc DECIMAL(15,2) DEFAULT 0,                    -- Opening stock GFC
        in_gfc DECIMAL(15,2) DEFAULT 0,                    -- In GFC (produced)
        out_gfc DECIMAL(15,2) DEFAULT 0,                   -- Out GFC (shipped)
        cs_gfc DECIMAL(15,2) DEFAULT 0,                    -- Closing stock GFC
        max_supply_gfc DECIMAL(15,2) DEFAULT 0,            -- Max supply GFC
        
        os_kfc DECIMAL(15,2) DEFAULT 0,                    -- Opening stock KFC
        in_kfc DECIMAL(15,2) DEFAULT 0,                    -- In KFC (produced)
        out_kfc DECIMAL(15,2) DEFAULT 0,                   -- Out KFC (shipped)
        cs_kfc DECIMAL(15,2) DEFAULT 0,                    -- Closing stock KFC
        max_supply_kfc DECIMAL(15,2) DEFAULT 0,            -- Max supply KFC
        
        os_nfc DECIMAL(15,2) DEFAULT 0,                    -- Opening stock NFC
        in_nfc DECIMAL(15,2) DEFAULT 0,                    -- In NFC (produced)
        out_nfc DECIMAL(15,2) DEFAULT 0,                   -- Out NFC (shipped)
        cs_nfc DECIMAL(15,2) DEFAULT 0,                    -- Closing stock NFC
        max_supply_nfc DECIMAL(15,2) DEFAULT 0,            -- Max supply NFC
        
        os_x DECIMAL(15,2) DEFAULT 0,                      -- Opening stock X
        in_x DECIMAL(15,2) DEFAULT 0,                      -- In X (produced)
        out_x DECIMAL(15,2) DEFAULT 0,                     -- Out X (shipped)
        cs_x DECIMAL(15,2) DEFAULT 0,                      -- Closing stock X
        max_supply_x DECIMAL(15,2) DEFAULT 0,              -- Max supply X
        
        -- Total columns
        os_tot DECIMAL(15,2) DEFAULT 0,                    -- Total opening stock
        in_tot DECIMAL(15,2) DEFAULT 0,                    -- Total in (produced)
        out_tot DECIMAL(15,2) DEFAULT 0,                   -- Total out (shipped)
        cs_tot DECIMAL(15,2) DEFAULT 0,                    -- Total closing stock
        max_supply_tot DECIMAL(15,2) DEFAULT 0,            -- Max supply total
        
        -- Weight columns
        cs_wt_gfc DECIMAL(15,4) DEFAULT 0,                 -- Closing stock weight GFC
        cs_wt_kfc DECIMAL(15,4) DEFAULT 0,                 -- Closing stock weight KFC
        cs_wt_nfc DECIMAL(15,4) DEFAULT 0,                 -- Closing stock weight NFC
        
        -- Additional calculated columns
        final_norm DECIMAL(15,2) DEFAULT 0,                -- Final norm
        avg_stock DECIMAL(15,2) DEFAULT 0,                 -- Average stock
        
        -- Supply constraint columns
        supply_gfc DECIMAL(15,2) DEFAULT 0,                -- Supply GFC (constrained)
        supply_kfc DECIMAL(15,2) DEFAULT 0,                -- Supply KFC (constrained)
        supply_nfc DECIMAL(15,2) DEFAULT 0,                -- Supply NFC (constrained)
        supply_x DECIMAL(15,2) DEFAULT 0,                  -- Supply X (constrained)
        
        -- Constraint validation columns
        os_ge_min BOOLEAN DEFAULT TRUE,                    -- OS >= Min
        os_le_max BOOLEAN DEFAULT TRUE,                    -- OS <= Max  
        cs_ge_min BOOLEAN DEFAULT TRUE,                    -- CS >= Min
        cs_le_max BOOLEAN DEFAULT TRUE,                    -- CS <= Max
        
        -- Cost columns
        storage_cost DECIMAL(15,4) DEFAULT 0,              -- Storage cost
        icc DECIMAL(15,4) DEFAULT 0,                       -- ICC
        row_cost DECIMAL(15,4) DEFAULT 0,                  -- Row cost
        storage_cost_v2 DECIMAL(15,4) DEFAULT 0,           -- Storage cost V2
        
        workbook_id UUID,                                  -- Reference to source workbook
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        CONSTRAINT t04_qty_positive CHECK (mto_demand_next_month >= 0),
        CONSTRAINT t04_mts_positive CHECK (mts_demand_next_month >= 0),
        CONSTRAINT t04_wh_valid CHECK (wh IN ('GFCM', 'KFCM', 'NFCM', 'X'))
      );
    `;
    
    try {
      await query(createTableQuery);
      
      // Create indexes separately
      const createIndexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_t04_sku_month ON t04_whbal(fg_sku_code, mth_num);',
        'CREATE INDEX IF NOT EXISTS idx_t04_warehouse ON t04_whbal(wh);',
        'CREATE INDEX IF NOT EXISTS idx_t04_workbook ON t04_whbal(workbook_id);',
        'CREATE INDEX IF NOT EXISTS idx_t04_sku_wh_month ON t04_whbal(fg_sku_code, wh, mth_num);'
      ];
      
      for (const indexQuery of createIndexQueries) {
        await query(indexQuery);
      }
      
      console.log('✅ T04_WHBal table and indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating T04_WHBal table:', error);
      throw error;
    }
  }

  // Insert T04 data
  static async insert(data) {
    const insertQuery = `
      INSERT INTO t04_whbal (
        wh, fg_sku_code, mth_num, mto_demand_next_month, mts_demand_next_month,
        inventory_days_norm, store_cost, mts_demand_next_3_months, min_os, max_os,
        min_cs, max_cs, max_sup_lim, m1os_gfc, m1os_kfc, m1os_nfc, fg_wt_per_unit,
        cs_norm, norm_markup, m1os_x, next_3_months_demand_total, workbook_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *;
    `;

    try {
      const result = await query(insertQuery, [
        data.wh,
        data.fg_sku_code,
        data.mth_num,
        data.mto_demand_next_month || 0,
        data.mts_demand_next_month || 0,
        data.inventory_days_norm || 0,
        data.store_cost || 0,
        data.mts_demand_next_3_months || 0,
        data.min_os || 0,
        data.max_os || 10000000000,
        data.min_cs || 0,
        data.max_cs || 10000000000,
        data.max_sup_lim || 1,
        data.m1os_gfc || 0,
        data.m1os_kfc || 0,
        data.m1os_nfc || 0,
        data.fg_wt_per_unit || 1,
        data.cs_norm || 0,
        data.norm_markup || 1,
        data.m1os_x || 0,
        data.next_3_months_demand_total || 0,
        data.workbook_id || null
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error inserting T04 data:', error);
      throw error;
    }
  }

  // Bulk insert T04 data
  static async bulkInsert(dataArray) {
    if (!dataArray || dataArray.length === 0) return [];

    const values = dataArray.map((data, index) => {
      const params = [
        data.wh,
        data.fg_sku_code,
        data.mth_num,
        data.mto_demand_next_month || 0,
        data.mts_demand_next_month || 0,
        data.inventory_days_norm || 0,
        data.store_cost || 0,
        data.mts_demand_next_3_months || 0,
        data.min_os || 0,
        data.max_os || 10000000000,
        data.min_cs || 0,
        data.max_cs || 10000000000,
        data.max_sup_lim || 1,
        data.m1os_gfc || 0,
        data.m1os_kfc || 0,
        data.m1os_nfc || 0,
        data.fg_wt_per_unit || 1,
        data.cs_norm || 0,
        data.norm_markup || 1,
        data.m1os_x || 0,
        data.next_3_months_demand_total || 0,
        data.workbook_id || null
      ];
      const placeholders = params.map((_, i) => `$${index * 22 + i + 1}`).join(', ');
      return `(${placeholders})`;
    });

    const allParams = dataArray.flatMap(data => [
      data.wh,
      data.fg_sku_code,
      data.mth_num,
      data.mto_demand_next_month || 0,
      data.mts_demand_next_month || 0,
      data.inventory_days_norm || 0,
      data.store_cost || 0,
      data.mts_demand_next_3_months || 0,
      data.min_os || 0,
      data.max_os || 10000000000,
      data.min_cs || 0,
      data.max_cs || 10000000000,
      data.max_sup_lim || 1,
      data.m1os_gfc || 0,
      data.m1os_kfc || 0,
      data.m1os_nfc || 0,
      data.fg_wt_per_unit || 1,
      data.cs_norm || 0,
      data.norm_markup || 1,
      data.m1os_x || 0,
      data.next_3_months_demand_total || 0,
      data.workbook_id || null
    ]);

    const insertQuery = `
      INSERT INTO t04_whbal (
        wh, fg_sku_code, mth_num, mto_demand_next_month, mts_demand_next_month,
        inventory_days_norm, store_cost, mts_demand_next_3_months, min_os, max_os,
        min_cs, max_cs, max_sup_lim, m1os_gfc, m1os_kfc, m1os_nfc, fg_wt_per_unit,
        cs_norm, norm_markup, m1os_x, next_3_months_demand_total, workbook_id
      ) VALUES ${values.join(', ')}
      RETURNING *;
    `;

    try {
      const result = await query(insertQuery, allParams);
      return result.rows;
    } catch (error) {
      console.error('❌ Error bulk inserting T04 data:', error);
      throw error;
    }
  }

  // Get all T04 data
  static async getAll(filters = {}) {
    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (filters.workbook_id) {
      whereClause += ` WHERE workbook_id = $${paramIndex}`;
      params.push(filters.workbook_id);
      paramIndex++;
    }

    if (filters.fg_sku_code) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` fg_sku_code = $${paramIndex}`;
      params.push(filters.fg_sku_code);
      paramIndex++;
    }

    if (filters.wh) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` wh = $${paramIndex}`;
      params.push(filters.wh);
      paramIndex++;
    }

    if (filters.mth_num) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` mth_num = $${paramIndex}`;
      params.push(filters.mth_num);
      paramIndex++;
    }

    const selectQuery = `
      SELECT * FROM t04_whbal
      ${whereClause}
      ORDER BY fg_sku_code, wh, mth_num;
    `;

    try {
      const result = await query(selectQuery, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting T04 data:', error);
      throw error;
    }
  }

  // Update all calculated fields for T04 records
  static async updateAllCalculatedFields(workbookId = null) {
    let whereClause = workbookId ? 'WHERE workbook_id = $1' : '';
    const params = workbookId ? [workbookId] : [];

    const updateQuery = `
      UPDATE t04_whbal 
      SET 
        -- Opening stock calculations (first month uses M1OS values, others calculated)
        os_gfc = CASE WHEN mth_num = 1 THEN m1os_gfc ELSE 0 END,
        os_kfc = CASE WHEN mth_num = 1 THEN m1os_kfc ELSE 0 END,
        os_nfc = CASE WHEN mth_num = 1 THEN m1os_nfc ELSE 0 END,
        os_x = CASE WHEN mth_num = 1 THEN m1os_x ELSE 0 END,
        
        -- Total opening stock
        os_tot = (CASE WHEN mth_num = 1 THEN m1os_gfc ELSE 0 END) +
                 (CASE WHEN mth_num = 1 THEN m1os_kfc ELSE 0 END) +
                 (CASE WHEN mth_num = 1 THEN m1os_nfc ELSE 0 END) +
                 (CASE WHEN mth_num = 1 THEN m1os_x ELSE 0 END),
        
        -- Closing stock weight calculations
        cs_wt_gfc = cs_gfc * fg_wt_per_unit,
        cs_wt_kfc = cs_kfc * fg_wt_per_unit,
        cs_wt_nfc = cs_nfc * fg_wt_per_unit,
        
        -- Total calculations
        in_tot = in_gfc + in_kfc + in_nfc + in_x,
        out_tot = out_gfc + out_kfc + out_nfc + out_x,
        cs_tot = cs_gfc + cs_kfc + cs_nfc + cs_x,
        max_supply_tot = max_supply_gfc + max_supply_kfc + max_supply_nfc + max_supply_x,
        
        -- Average stock calculation
        avg_stock = (os_tot + cs_tot) / 2,
        
        -- Supply constraints (min of out and max_supply)
        supply_gfc = LEAST(out_gfc, max_supply_gfc),
        supply_kfc = LEAST(out_kfc, max_supply_kfc),
        supply_nfc = LEAST(out_nfc, max_supply_nfc),
        supply_x = out_x, -- For X, supply equals max_supply
        
        -- Constraint validations
        os_ge_min = (os_tot >= min_os),
        os_le_max = (os_tot <= max_os),
        cs_ge_min = (cs_tot >= min_cs),
        cs_le_max = (cs_tot <= max_cs),
        
        -- Storage cost calculation (simplified)
        storage_cost = avg_stock * store_cost,
        storage_cost_v2 = avg_stock * store_cost * 0.5, -- Example calculation
        
        updated_at = CURRENT_TIMESTAMP
      ${whereClause}
      RETURNING id;
    `;

    try {
      const result = await query(updateQuery, params);
      console.log(`✅ Updated calculated fields for ${result.rows.length} T04 records`);
      return result.rows.length;
    } catch (error) {
      console.error('❌ Error updating all calculated fields:', error);
      throw error;
    }
  }

  // Get summary statistics
  static async getSummaryStats(workbookId = null) {
    let whereClause = workbookId ? 'WHERE workbook_id = $1' : '';
    const params = workbookId ? [workbookId] : [];

    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT fg_sku_code) as unique_skus,
        COUNT(DISTINCT wh) as unique_warehouses,
        COUNT(DISTINCT mth_num) as unique_months,
        SUM(mto_demand_next_month) as total_mto_demand,
        SUM(mts_demand_next_month) as total_mts_demand,
        SUM(os_tot) as total_opening_stock,
        SUM(cs_tot) as total_closing_stock,
        SUM(storage_cost) as total_storage_cost,
        AVG(avg_stock) as avg_stock_all
      FROM t04_whbal
      ${whereClause};
    `;

    try {
      const result = await query(statsQuery, params);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting T04 summary stats:', error);
      throw error;
    }
  }

  // Delete T04 data by workbook
  static async deleteByWorkbook(workbookId) {
    const deleteQuery = 'DELETE FROM t04_whbal WHERE workbook_id = $1;';
    
    try {
      const result = await query(deleteQuery, [workbookId]);
      console.log(`✅ Deleted ${result.rowCount} T04 records for workbook ${workbookId}`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error deleting T04 data:', error);
      throw error;
    }
  }

  // Get T04 data by SKU
  static async getBySKU(skuCode, workbookId = null) {
    let whereClause = 'WHERE fg_sku_code = $1';
    const params = [skuCode];
    
    if (workbookId) {
      whereClause += ' AND workbook_id = $2';
      params.push(workbookId);
    }

    const selectQuery = `
      SELECT * FROM t04_whbal
      ${whereClause}
      ORDER BY mth_num, wh;
    `;

    try {
      const result = await query(selectQuery, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting T04 data by SKU:', error);
      throw error;
    }
  }

  // Get T04 data by warehouse
  static async getByWarehouse(warehouse, workbookId = null) {
    let whereClause = 'WHERE wh = $1';
    const params = [warehouse];
    
    if (workbookId) {
      whereClause += ' AND workbook_id = $2';
      params.push(workbookId);
    }

    const selectQuery = `
      SELECT * FROM t04_whbal
      ${whereClause}
      ORDER BY fg_sku_code, mth_num;
    `;

    try {
      const result = await query(selectQuery, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting T04 data by warehouse:', error);
      throw error;
    }
  }
}

module.exports = T04Data; 