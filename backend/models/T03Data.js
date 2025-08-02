const { query } = require('../config/database');

class T03Data {
  // Create the T03_PrimDist table
  static async createTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS t03_primdist (
        id SERIAL PRIMARY KEY,
        wh VARCHAR(10) NOT NULL,                    -- Destination warehouse
        plt VARCHAR(10) NOT NULL,                   -- Factory delivering to destination warehouse  
        fg_sku_code VARCHAR(50) NOT NULL,           -- SKU Code
        mth_num INTEGER NOT NULL,                   -- Month (1-12)
        cost_per_unit DECIMAL(15,4),                -- Primary distribution freight cost/unit
        custom_cost_per_unit DECIMAL(15,4),         -- Custom cost per unit SKU for international shipping
        max_qty DECIMAL(15,2) DEFAULT 10000000000,  -- Quantity to enable/disable any primary shipping lane
        fg_wt_per_unit DECIMAL(10,4),               -- Finished good weight per unit
        qty DECIMAL(15,2) DEFAULT 0,                -- Shipped quantity from source factory to destination warehouse
        wt DECIMAL(15,4),                           -- Shipped weight (calculated: Qty x FGWtPerUnit)
        custom_duty DECIMAL(15,4),                  -- Total custom duty cost (calculated: Qty x Custom Cost/Unit)
        row_cost DECIMAL(15,4),                     -- Total primary shipping cost per unit
        workbook_id UUID,                           -- Reference to source workbook
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        CONSTRAINT t03_qty_positive CHECK (qty >= 0),
        CONSTRAINT t03_qty_max CHECK (qty <= max_qty)
      );
    `;
    
    try {
      await query(createTableQuery);
      
      // Create indexes separately
      const createIndexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_t03_sku_month ON t03_primdist(fg_sku_code, mth_num);',
        'CREATE INDEX IF NOT EXISTS idx_t03_warehouse ON t03_primdist(wh);',
        'CREATE INDEX IF NOT EXISTS idx_t03_factory ON t03_primdist(plt);',
        'CREATE INDEX IF NOT EXISTS idx_t03_workbook ON t03_primdist(workbook_id);',
        'CREATE INDEX IF NOT EXISTS idx_t03_sku_factory_wh ON t03_primdist(fg_sku_code, plt, wh);'
      ];
      
      for (const indexQuery of createIndexQueries) {
        await query(indexQuery);
      }
      
      console.log('✅ T03_PrimDist table and indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating T03_PrimDist table:', error);
      throw error;
    }
  }

  // Insert T03 data
  static async insert(data) {
    const insertQuery = `
      INSERT INTO t03_primdist (
        wh, plt, fg_sku_code, mth_num, cost_per_unit, custom_cost_per_unit,
        max_qty, fg_wt_per_unit, qty, wt, custom_duty, row_cost, workbook_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    try {
      const result = await query(insertQuery, [
        data.wh,
        data.plt,
        data.fg_sku_code,
        data.mth_num,
        data.cost_per_unit || null,
        data.custom_cost_per_unit || null,
        data.max_qty || 10000000000,
        data.fg_wt_per_unit || null,
        data.qty || 0,
        data.wt || null,
        data.custom_duty || null,
        data.row_cost || null,
        data.workbook_id || null
      ]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error inserting T03 data:', error);
      throw error;
    }
  }

  // Bulk insert T03 data
  static async bulkInsert(dataArray) {
    if (!dataArray || dataArray.length === 0) return [];

    const values = dataArray.map((data, index) => {
      const params = [
        data.wh,
        data.plt,
        data.fg_sku_code,
        data.mth_num,
        data.cost_per_unit || null,
        data.custom_cost_per_unit || null,
        data.max_qty || 10000000000,
        data.fg_wt_per_unit || null,
        data.qty || 0,
        data.wt || null,
        data.custom_duty || null,
        data.row_cost || null,
        data.workbook_id || null
      ];
      const placeholders = params.map((_, i) => `$${index * 13 + i + 1}`).join(', ');
      return `(${placeholders})`;
    });

    const allParams = dataArray.flatMap(data => [
      data.wh,
      data.plt,
      data.fg_sku_code,
      data.mth_num,
      data.cost_per_unit || null,
      data.custom_cost_per_unit || null,
      data.max_qty || 10000000000,
      data.fg_wt_per_unit || null,
      data.qty || 0,
      data.wt || null,
      data.custom_duty || null,
      data.row_cost || null,
      data.workbook_id || null
    ]);

    const insertQuery = `
      INSERT INTO t03_primdist (
        wh, plt, fg_sku_code, mth_num, cost_per_unit, custom_cost_per_unit,
        max_qty, fg_wt_per_unit, qty, wt, custom_duty, row_cost, workbook_id
      ) VALUES ${values.join(', ')}
      RETURNING *;
    `;

    try {
      const result = await query(insertQuery, allParams);
      return result.rows;
    } catch (error) {
      console.error('❌ Error bulk inserting T03 data:', error);
      throw error;
    }
  }

  // Get all T03 data
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

    if (filters.mth_num) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` mth_num = $${paramIndex}`;
      params.push(filters.mth_num);
      paramIndex++;
    }

    const selectQuery = `
      SELECT 
        id, wh, plt, fg_sku_code, mth_num, cost_per_unit, custom_cost_per_unit,
        max_qty, fg_wt_per_unit, qty, wt, custom_duty, row_cost, workbook_id,
        created_at, updated_at
      FROM t03_primdist
      ${whereClause}
      ORDER BY fg_sku_code, mth_num, plt, wh;
    `;

    try {
      const result = await query(selectQuery, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting T03 data:', error);
      throw error;
    }
  }

  // Update T03 record with calculated fields
  static async updateCalculatedFields(id) {
    const updateQuery = `
      UPDATE t03_primdist 
      SET 
        wt = qty * COALESCE(fg_wt_per_unit, 0),
        custom_duty = qty * COALESCE(custom_cost_per_unit, 0),
        row_cost = qty * COALESCE(cost_per_unit, 0),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;

    try {
      const result = await query(updateQuery, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating calculated fields:', error);
      throw error;
    }
  }

  // Update all calculated fields for a workbook
  static async updateAllCalculatedFields(workbookId = null) {
    let whereClause = workbookId ? 'WHERE workbook_id = $1' : '';
    const params = workbookId ? [workbookId] : [];

    const updateQuery = `
      UPDATE t03_primdist 
      SET 
        wt = qty * COALESCE(fg_wt_per_unit, 0),
        custom_duty = qty * COALESCE(custom_cost_per_unit, 0),
        row_cost = qty * COALESCE(cost_per_unit, 0),
        updated_at = CURRENT_TIMESTAMP
      ${whereClause}
      RETURNING id;
    `;

    try {
      const result = await query(updateQuery, params);
      console.log(`✅ Updated calculated fields for ${result.rows.length} T03 records`);
      return result.rows.length;
    } catch (error) {
      console.error('❌ Error updating all calculated fields:', error);
      throw error;
    }
  }

  // Update quantity for a specific record
  static async updateQuantity(id, newQty) {
    const updateQuery = `
      UPDATE t03_primdist 
      SET 
        qty = $2,
        wt = $2 * COALESCE(fg_wt_per_unit, 0),
        custom_duty = $2 * COALESCE(custom_cost_per_unit, 0),
        row_cost = $2 * COALESCE(cost_per_unit, 0),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `;

    try {
      const result = await query(updateQuery, [id, newQty]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating quantity:', error);
      throw error;
    }
  }

  // Delete T03 data by workbook
  static async deleteByWorkbook(workbookId) {
    const deleteQuery = 'DELETE FROM t03_primdist WHERE workbook_id = $1;';
    
    try {
      const result = await query(deleteQuery, [workbookId]);
      console.log(`✅ Deleted ${result.rowCount} T03 records for workbook ${workbookId}`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error deleting T03 data:', error);
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
        COUNT(DISTINCT plt) as unique_factories,
        COUNT(DISTINCT wh) as unique_warehouses,
        COUNT(DISTINCT mth_num) as unique_months,
        SUM(qty) as total_quantity,
        SUM(wt) as total_weight,
        SUM(custom_duty) as total_custom_duty,
        SUM(row_cost) as total_row_cost,
        AVG(cost_per_unit) as avg_cost_per_unit
      FROM t03_primdist
      ${whereClause};
    `;

    try {
      const result = await query(statsQuery, params);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting T03 summary stats:', error);
      throw error;
    }
  }

  // Get T03 data by SKU
  static async getBySKU(skuCode, workbookId = null) {
    let whereClause = 'WHERE fg_sku_code = $1';
    const params = [skuCode];
    
    if (workbookId) {
      whereClause += ' AND workbook_id = $2';
      params.push(workbookId);
    }

    const selectQuery = `
      SELECT * FROM t03_primdist
      ${whereClause}
      ORDER BY mth_num, plt, wh;
    `;

    try {
      const result = await query(selectQuery, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting T03 data by SKU:', error);
      throw error;
    }
  }

  // Get T03 data by factory
  static async getByFactory(factory, workbookId = null) {
    let whereClause = 'WHERE plt = $1';
    const params = [factory];
    
    if (workbookId) {
      whereClause += ' AND workbook_id = $2';
      params.push(workbookId);
    }

    const selectQuery = `
      SELECT * FROM t03_primdist
      ${whereClause}
      ORDER BY fg_sku_code, mth_num, wh;
    `;

    try {
      const result = await query(selectQuery, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting T03 data by factory:', error);
      throw error;
    }
  }

  // Get T03 data by warehouse
  static async getByWarehouse(warehouse, workbookId = null) {
    let whereClause = 'WHERE wh = $1';
    const params = [warehouse];
    
    if (workbookId) {
      whereClause += ' AND workbook_id = $2';
      params.push(workbookId);
    }

    const selectQuery = `
      SELECT * FROM t03_primdist
      ${whereClause}
      ORDER BY fg_sku_code, mth_num, plt;
    `;

    try {
      const result = await query(selectQuery, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting T03 data by warehouse:', error);
      throw error;
    }
  }
}

module.exports = T03Data; 