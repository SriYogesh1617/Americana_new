const { query } = require('../config/database');

class T03Data {
  // Create the T03_PrimDist table with updated structure
  static async createTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS t03_primdist (
        id SERIAL PRIMARY KEY,
        wh VARCHAR(10) NOT NULL,                    -- Destination warehouse
        plt VARCHAR(10) NOT NULL,                   -- Factory delivering to destination warehouse  
        cty VARCHAR(50),                            -- Country based on warehouse mapping
        fgsku_code VARCHAR(50) NOT NULL,            -- SKU Code
        mth_num INTEGER NOT NULL,                   -- Month (1-12)
        cost_per_unit DECIMAL(15,4),                -- Primary distribution freight cost/unit
        custom_cost_per_unit DECIMAL(15,4),         -- Custom cost per unit SKU for international shipping
        max_qty DECIMAL(15,2) DEFAULT 10000000000,  -- Quantity to enable/disable any primary shipping lane
        fg_wt_per_unit DECIMAL(10,4),               -- Finished good weight per unit
        qty DECIMAL(15,2) DEFAULT 0,                -- Shipped quantity from source factory to destination warehouse
        wt DECIMAL(15,4),                           -- Shipped weight (calculated: Qty x FGWtPerUnit)
        custom_duty DECIMAL(15,4),                  -- Total custom duty cost (calculated: Qty x Custom Cost/Unit)
        poscheck BOOLEAN DEFAULT true,              -- Positive check validation
        qty_lte_max BOOLEAN DEFAULT true,           -- Quantity <= Max quantity check
        row_cost DECIMAL(15,4),                     -- Total primary shipping cost per unit
        upload_batch_id UUID,                       -- Reference to upload batch
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
        'CREATE INDEX IF NOT EXISTS idx_t03_sku_month ON t03_primdist(fgsku_code, mth_num);',
        'CREATE INDEX IF NOT EXISTS idx_t03_warehouse ON t03_primdist(wh);',
        'CREATE INDEX IF NOT EXISTS idx_t03_factory ON t03_primdist(plt);',
        'CREATE INDEX IF NOT EXISTS idx_t03_country ON t03_primdist(cty);',
        'CREATE INDEX IF NOT EXISTS idx_t03_upload_batch ON t03_primdist(upload_batch_id);',
        'CREATE INDEX IF NOT EXISTS idx_t03_sku_factory_wh ON t03_primdist(fgsku_code, plt, wh);'
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
        wh, plt, cty, fgsku_code, mth_num, cost_per_unit, custom_cost_per_unit,
        max_qty, fg_wt_per_unit, qty, wt, custom_duty, poscheck, qty_lte_max, row_cost, upload_batch_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;

    try {
      const result = await query(insertQuery, [
        data.wh,
        data.plt,
        data.cty || null,
        data.fgsku_code,
        data.mth_num,
        data.cost_per_unit || null,
        data.custom_cost_per_unit || null,
        data.max_qty || 10000000000,
        data.fg_wt_per_unit || null,
        data.qty || 0,
        data.wt || null,
        data.custom_duty || null,
        data.poscheck !== undefined ? data.poscheck : true,
        data.qty_lte_max !== undefined ? data.qty_lte_max : true,
        data.row_cost || null,
        data.upload_batch_id || null
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

    // Process data in smaller batches to avoid parameter limit issues
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = dataArray.slice(i, i + batchSize);
      
      const values = batch.map((data, index) => {
        const params = [
          data.wh || null,
          data.plt || null,
          data.cty || null,
          data.fgsku_code || null,
          data.mth_num || null,
          data.cost_per_unit !== undefined && data.cost_per_unit !== null ? data.cost_per_unit : null,
          data.custom_cost_per_unit !== undefined && data.custom_cost_per_unit !== null ? data.custom_cost_per_unit : null,
          data.max_qty !== undefined && data.max_qty !== null ? data.max_qty : 10000000000,
          data.fg_wt_per_unit !== undefined && data.fg_wt_per_unit !== null ? data.fg_wt_per_unit : null,
          data.qty !== undefined && data.qty !== null ? data.qty : 0,
          data.wt !== undefined && data.wt !== null ? data.wt : null,
          data.custom_duty !== undefined && data.custom_duty !== null ? data.custom_duty : null,
          data.poscheck !== undefined ? data.poscheck : true,
          data.qty_lte_max !== undefined ? data.qty_lte_max : true,
          data.row_cost !== undefined && data.row_cost !== null ? data.row_cost : null,
          data.upload_batch_id || null
        ];
        const placeholders = params.map((_, i) => `$${index * 16 + i + 1}`).join(', ');
        return `(${placeholders})`;
      });

      const allParams = batch.flatMap(data => [
        data.wh || null,
        data.plt || null,
        data.cty || null,
        data.fgsku_code || null,
        data.mth_num || null,
        data.cost_per_unit !== undefined && data.cost_per_unit !== null ? data.cost_per_unit : null,
        data.custom_cost_per_unit !== undefined && data.custom_cost_per_unit !== null ? data.custom_cost_per_unit : null,
        data.max_qty !== undefined && data.max_qty !== null ? data.max_qty : 10000000000,
        data.fg_wt_per_unit !== undefined && data.fg_wt_per_unit !== null ? data.fg_wt_per_unit : null,
        data.qty !== undefined && data.qty !== null ? data.qty : 0,
        data.wt !== undefined && data.wt !== null ? data.wt : null,
        data.custom_duty !== undefined && data.custom_duty !== null ? data.custom_duty : null,
        data.poscheck !== undefined ? data.poscheck : true,
        data.qty_lte_max !== undefined ? data.qty_lte_max : true,
        data.row_cost !== undefined && data.row_cost !== null ? data.row_cost : null,
        data.upload_batch_id || null
      ]);

          const insertQuery = `
        INSERT INTO t03_primdist (
          wh, plt, cty, fgsku_code, mth_num, cost_per_unit, custom_cost_per_unit,
          max_qty, fg_wt_per_unit, qty, wt, custom_duty, poscheck, qty_lte_max, row_cost, upload_batch_id
        ) VALUES ${values.join(', ')}
        RETURNING *;
      `;

      try {
        const result = await query(insertQuery, allParams);
        results.push(...result.rows);
      } catch (error) {
        console.error('❌ Error bulk inserting T03 data batch:', error);
        throw error;
      }
    }
    
    return results;
  }

  // Get all T03 data
  static async getAll(filters = {}) {
    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    if (filters.upload_batch_id) {
      whereClause += ` WHERE upload_batch_id = $${paramIndex}`;
      params.push(filters.upload_batch_id);
      paramIndex++;
    }

    if (filters.fgsku_code) {
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` fgsku_code = $${paramIndex}`;
      params.push(filters.fgsku_code);
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
        id, wh, plt, cty, fgsku_code, mth_num, cost_per_unit, custom_cost_per_unit,
        max_qty, fg_wt_per_unit, qty, wt, custom_duty, poscheck, qty_lte_max, row_cost, upload_batch_id,
        created_at, updated_at
      FROM t03_primdist
      ${whereClause}
      ORDER BY fgsku_code, mth_num, plt, wh;
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
        poscheck = (qty >= 0),
        qty_lte_max = (qty <= max_qty),
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

  // Update all calculated fields for an upload batch
  static async updateAllCalculatedFields(uploadBatchId = null) {
    let whereClause = uploadBatchId ? 'WHERE upload_batch_id = $1' : '';
    const params = uploadBatchId ? [uploadBatchId] : [];

    const updateQuery = `
      UPDATE t03_primdist 
      SET 
        wt = qty * COALESCE(fg_wt_per_unit, 0),
        custom_duty = qty * COALESCE(custom_cost_per_unit, 0),
        poscheck = (qty >= 0),
        qty_lte_max = (qty <= max_qty),
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
        poscheck = ($2 >= 0),
        qty_lte_max = ($2 <= max_qty),
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

  // Delete T03 data by upload batch
  static async deleteByUploadBatch(uploadBatchId) {
    const deleteQuery = 'DELETE FROM t03_primdist WHERE upload_batch_id = $1;';
    
    try {
      const result = await query(deleteQuery, [uploadBatchId]);
      console.log(`✅ Deleted ${result.rowCount} T03 records for upload batch ${uploadBatchId}`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error deleting T03 data:', error);
      throw error;
    }
  }

  // Clear all T03 data
  static async clearAll() {
    const result = await query('DELETE FROM t03_primdist RETURNING *');
    return result.rows;
  }

  // Get summary statistics
  static async getSummaryStats(uploadBatchId = null) {
    let whereClause = uploadBatchId ? 'WHERE upload_batch_id = $1' : '';
    const params = uploadBatchId ? [uploadBatchId] : [];

    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT fgsku_code) as unique_skus,
        COUNT(DISTINCT plt) as unique_factories,
        COUNT(DISTINCT wh) as unique_warehouses,
        COUNT(DISTINCT mth_num) as unique_months,
        SUM(qty) as total_quantity,
        SUM(wt) as total_weight,
        SUM(custom_duty) as total_custom_duty,
        SUM(row_cost) as total_row_cost,
        AVG(cost_per_unit) as avg_cost_per_unit,
        COUNT(CASE WHEN poscheck = false THEN 1 END) as negative_quantity_records,
        COUNT(CASE WHEN qty_lte_max = false THEN 1 END) as max_qty_exceeded_records
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
  static async getBySKU(skuCode, uploadBatchId = null) {
    let whereClause = 'WHERE fgsku_code = $1';
    const params = [skuCode];
    
    if (uploadBatchId) {
      whereClause += ' AND upload_batch_id = $2';
      params.push(uploadBatchId);
    }

    const selectQuery = `
      SELECT id, wh, plt, fgsku_code, mth_num, cost_per_unit, custom_cost_per_unit,
             max_qty, fg_wt_per_unit, qty, wt, custom_duty, poscheck, qty_lte_max, row_cost,
             upload_batch_id, created_at, updated_at FROM t03_primdist
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
  static async getByFactory(factory, uploadBatchId = null) {
    let whereClause = 'WHERE plt = $1';
    const params = [factory];
    
    if (uploadBatchId) {
      whereClause += ' AND upload_batch_id = $2';
      params.push(uploadBatchId);
    }

    const selectQuery = `
      SELECT id, wh, plt, fgsku_code, mth_num, cost_per_unit, custom_cost_per_unit,
             max_qty, fg_wt_per_unit, qty, wt, custom_duty, poscheck, qty_lte_max, row_cost,
             upload_batch_id, created_at, updated_at FROM t03_primdist
      ${whereClause}
      ORDER BY fgsku_code, mth_num, wh;
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
  static async getByWarehouse(warehouse, uploadBatchId = null) {
    let whereClause = 'WHERE wh = $1';
    const params = [warehouse];
    
    if (uploadBatchId) {
      whereClause += ' AND upload_batch_id = $2';
      params.push(uploadBatchId);
    }

    const selectQuery = `
      SELECT id, wh, plt, fgsku_code, mth_num, cost_per_unit, custom_cost_per_unit,
             max_qty, fg_wt_per_unit, qty, wt, custom_duty, poscheck, qty_lte_max, row_cost,
             upload_batch_id, created_at, updated_at FROM t03_primdist
      ${whereClause}
      ORDER BY fgsku_code, mth_num, plt;
    `;

    try {
      const result = await query(selectQuery, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting T03 data by warehouse:', error);
      throw error;
    }
  }

  // Update calculated fields with formulas for all records
  static async updateCalculatedFieldsWithFormulas(uploadBatchId = null) {
    try {
      console.log('🧮 Updating T03 calculated fields with formulas...');
      
      let whereClause = '';
      const params = [];
      if (uploadBatchId) {
        whereClause = 'WHERE upload_batch_id = $1';
        params.push(uploadBatchId);
      }
      
      // Update calculated fields with formulas:
      // Wt = Qty × FGWtPerUnit (I × H)
      // Custom Duty = Qty × Custom Cost/Unit (I × F)  
      // Poscheck = Qty >= 0 (I >= 0)
      // Qty<=Max = Qty <= MaxQty (I <= G)
      // Row Cost = Qty × CostPerUnit (I × E)
      const updateQuery = `
        UPDATE t03_primdist 
        SET 
          wt = qty * fg_wt_per_unit,
          custom_duty = qty * custom_cost_per_unit,
          poscheck = (qty >= 0),
          qty_lte_max = (qty <= max_qty),
          row_cost = qty * cost_per_unit,
          updated_at = CURRENT_TIMESTAMP
        ${whereClause}
      `;
      
      const result = await query(updateQuery, params);
      console.log(`✅ Updated calculated fields for ${result.rowCount} T03 records`);
      
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error updating T03 calculated fields:', error);
      throw error;
    }
  }

  // Update custom cost per unit based on warehouse rule
  // NEW RULE: Custom Cost/Unit is calculated ONLY when WH = NFCM
  // For all other warehouses (GFCM, KFCM, X), custom cost per unit = 0
  static async updateCustomCostPerUnit(uploadBatchId = null) {
    try {
      console.log('🔄 Updating T03 custom cost per unit based on warehouse rule...');
      
      let whereClause = '';
      const params = [];
      if (uploadBatchId) {
        whereClause = 'WHERE upload_batch_id = $1';
        params.push(uploadBatchId);
      }
      
      // Update custom cost per unit to 0 for all warehouses except NFCM
      const updateQuery = `
        UPDATE t03_primdist 
        SET 
          custom_cost_per_unit = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE wh != 'NFCM' ${uploadBatchId ? 'AND upload_batch_id = $1' : ''}
      `;
      
      const result = await query(updateQuery, params);
      console.log(`✅ Updated custom cost to 0 for ${result.rowCount} non-NFCM records`);
      
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error updating T03 custom cost per unit:', error);
      throw error;
    }
  }

  // Update max quantity based on warehouse and factory rule
  // UPDATED RULE: MaxQty = 0 for:
  // 1. WH = NFCM AND PLT = GFC
  // Otherwise MaxQty = 10^10 (including WH = X)
  static async updateMaxQuantity(uploadBatchId = null) {
    try {
      console.log('🔄 Updating T03 max quantity based on warehouse and factory rule...');
      
      let whereClause = '';
      const params = [];
      if (uploadBatchId) {
        whereClause = 'WHERE upload_batch_id = $1';
        params.push(uploadBatchId);
      }
      
      // Update max quantity to 0 for WH = NFCM AND PLT = GFC only
      const updateQuery = `
        UPDATE t03_primdist 
        SET 
          max_qty = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE (wh = 'NFCM' AND plt = 'GFC') ${uploadBatchId ? 'AND upload_batch_id = $1' : ''}
      `;
      
      const result = await query(updateQuery, params);
      console.log(`✅ Updated max quantity to 0 for ${result.rowCount} records (WH=NFCM AND PLT=GFC)`);
      
      // Update max quantity to 10^10 for WH = X
      const updateXQuery = `
        UPDATE t03_primdist 
        SET 
          max_qty = 10000000000,
          updated_at = CURRENT_TIMESTAMP
        WHERE wh = 'X' ${uploadBatchId ? 'AND upload_batch_id = $1' : ''}
      `;
      
      const xResult = await query(updateXQuery, params);
      console.log(`✅ Updated max quantity to 10^10 for ${xResult.rowCount} WH=X records`);
      
      return result.rowCount + xResult.rowCount;
    } catch (error) {
      console.error('❌ Error updating T03 max quantity:', error);
      throw error;
    }
  }

  // Update cost per unit with enhanced fallback system
  // Enhanced CostPerUnit logic with fallback system:
  // 1. Cost per Case = Cost of shipping a full truck load / total cartons transported in truck load
  // 2. Calculate for each Factory + WH + FGSKUCode combination from Freight_storage_costs.xlsx
  // 3. Fallback system for missing data
  // 4. Cost for all X warehouse and factory rows is 0
  // 5. Cost for shipping within the same country is 0
  static async updateCostPerUnit(uploadBatchId = null) {
    try {
      console.log('🔄 Updating T03 cost per unit with enhanced fallback system...');
      
      let whereClause = '';
      const params = [];
      if (uploadBatchId) {
        whereClause = 'WHERE upload_batch_id = $1';
        params.push(uploadBatchId);
      }
      
      // Fix same-country shipping violations
      // Rule 5: Cost for shipping within the same country is 0
      // GFC -> GFCM (UAE FS), NFC -> NFCM (KSA), KFC -> KFCM (Kuwait)
      const sameCountryUpdateQuery = `
        UPDATE t03_primdist 
        SET 
          cost_per_unit = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE ((wh = 'GFCM' AND cty = 'UAE FS') OR
               (wh = 'KFCM' AND cty = 'Kuwait') OR
               (wh = 'NFCM' AND cty = 'KSA')) AND
              cost_per_unit > 0 ${uploadBatchId ? 'AND upload_batch_id = $1' : ''}
      `;
      
      const sameCountryResult = await query(sameCountryUpdateQuery, params);
      console.log(`✅ Updated cost to 0 for ${sameCountryResult.rowCount} same-country shipping violations`);
      
      return sameCountryResult.rowCount;
    } catch (error) {
      console.error('❌ Error updating T03 cost per unit:', error);
      throw error;
    }
  }

  // Remove duplicate T03 records and add unique constraint
  static async removeDuplicatesAndAddConstraint(uploadBatchId = null) {
    try {
      console.log('🧹 Removing duplicate T03 records...');
      
      let whereClause = '';
      const params = [];
      if (uploadBatchId) {
        whereClause = 'AND upload_batch_id = $1';
        params.push(uploadBatchId);
      }
      
      // Find duplicates first
      const duplicateCheckQuery = `
        SELECT wh, plt, fgsku_code, mth_num, COUNT(*) as count
        FROM t03_primdist
        WHERE 1=1 ${whereClause}
        GROUP BY wh, plt, fgsku_code, mth_num
        HAVING COUNT(*) > 1
        ORDER BY count DESC
      `;
      
      const duplicateResult = await query(duplicateCheckQuery, params);
      if (duplicateResult.rows.length > 0) {
        console.log(`⚠️  Found ${duplicateResult.rows.length} T03 duplicate combinations:`);
        duplicateResult.rows.slice(0, 5).forEach((row, index) => {
          console.log(`  ${index + 1}. WH: ${row.wh}, PLT: ${row.plt}, FG: ${row.fgsku_code}, Month: ${row.mth_num} (${row.count} duplicates)`);
        });
        
        // Remove duplicates, keeping the latest record
        const removeDuplicatesQuery = `
          DELETE FROM t03_primdist t1
          WHERE t1.id NOT IN (
            SELECT MAX(t2.id) 
            FROM t03_primdist t2 
            WHERE t2.wh = t1.wh 
              AND t2.plt = t1.plt 
              AND t2.fgsku_code = t1.fgsku_code 
              AND t2.mth_num = t1.mth_num
              ${uploadBatchId ? 'AND t2.upload_batch_id = t1.upload_batch_id' : ''}
          ) ${whereClause}
        `;
        
        const removeResult = await query(removeDuplicatesQuery, params);
        console.log(`✅ Removed ${removeResult.rowCount} duplicate T03 records`);
      } else {
        console.log('✅ No T03 duplicates found');
      }
      
      // Try to add unique constraint (will fail silently if already exists)
      try {
        const addConstraintQuery = `
          ALTER TABLE t03_primdist 
          ADD CONSTRAINT uk_t03_unique_combination 
          UNIQUE (wh, plt, fgsku_code, mth_num, upload_batch_id)
        `;
        
        await query(addConstraintQuery);
        console.log('✅ Added unique constraint to prevent future T03 duplicates');
      } catch (constraintError) {
        // Constraint might already exist, that's okay
        if (constraintError.message.includes('already exists')) {
          console.log('✅ Unique constraint already exists');
        } else {
          console.log('⚠️  Could not add unique constraint:', constraintError.message);
        }
      }
      
      return duplicateResult.rows.length;
    } catch (error) {
      console.error('❌ Error removing duplicates:', error);
      throw error;
    }
  }

  // Update CTY values to match freight data destination column
  static async updateCtyMapping(uploadBatchId = null) {
    try {
      console.log('🗺️ Updating CTY mapping to match freight data...');
      
      let whereClause = '';
      const params = [];
      if (uploadBatchId) {
        whereClause = 'AND upload_batch_id = $1';
        params.push(uploadBatchId);
      }
      
      const updateQuery = `
        UPDATE t03_primdist 
        SET cty = CASE 
          WHEN wh = 'NFCM' THEN 'Saudi Arabia'
          WHEN wh = 'GFCM' THEN 'United Arab Emirates' 
          WHEN wh = 'KFCM' THEN 'Kuwait'
          ELSE cty
        END,
        updated_at = CURRENT_TIMESTAMP
        WHERE wh IN ('NFCM', 'GFCM', 'KFCM') ${whereClause}
      `;
      
      const result = await query(updateQuery, params);
      console.log(`✅ Updated CTY mapping for ${result.rowCount} T03 records`);
      console.log('   - NFCM → Saudi Arabia');
      console.log('   - GFCM → United Arab Emirates'); 
      console.log('   - KFCM → Kuwait (unchanged)');
      
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error updating CTY mapping:', error);
      throw error;
    }
  }

  // Update cost per unit using SQL script with freight data
  static async updateCostPerUnitWithSQL(uploadBatchId = null) {
    try {
      console.log('🔄 Updating T03 cost per unit using SQL script...');
      
      let whereClause = '';
      const params = [];
      if (uploadBatchId) {
        whereClause = 'AND t03.upload_batch_id = $1';
        params.push(uploadBatchId);
      }
      
      const updateQuery = `
        UPDATE t03_primdist t03
        SET cost_per_unit = subquery.calculated_cost,
            updated_at = CURRENT_TIMESTAMP
        FROM (
          SELECT 
            TRIM(f.origin::text) as origin,
            TRIM(f.destination::text) as destination,
            TRIM(f.fg_code::text) as fg_code,
            CASE 
              WHEN TRIM(f.truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
                AND TRIM(f.truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
                AND TRIM(f.truck_load_uom::text)::NUMERIC > 0
              THEN TRIM(f.truck_freight_usd_truckload::text)::NUMERIC / TRIM(f.truck_load_uom::text)::NUMERIC
              ELSE 0
            END as calculated_cost
          FROM freight_storage_costs_ii_template_freightrawdata f
          WHERE f.truck_load_uom IS NOT NULL 
            AND f.truck_freight_usd_truckload IS NOT NULL
            AND LOWER(TRIM(f.truck_load_uom::text)) NOT IN ('missing', '')
            AND LOWER(TRIM(f.truck_freight_usd_truckload::text)) NOT IN ('missing', '')
        ) subquery
        WHERE UPPER(TRIM(t03.plt)) = UPPER(subquery.origin)
          AND UPPER(TRIM(t03.cty)) = UPPER(subquery.destination)
          AND TRIM(t03.fgsku_code) = subquery.fg_code
          ${whereClause}
      `;
      
      // First, let's see what freight data we have available
      const freightSampleQuery = `
        SELECT 
          TRIM(f.origin::text) as origin,
          TRIM(f.destination::text) as destination,
          TRIM(f.fg_code::text) as fg_code,
          TRIM(f.truck_load_uom::text) as truck_load,
          TRIM(f.truck_freight_usd_truckload::text) as truck_freight,
          CASE 
            WHEN TRIM(f.truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
              AND TRIM(f.truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
              AND TRIM(f.truck_load_uom::text)::NUMERIC > 0
            THEN TRIM(f.truck_freight_usd_truckload::text)::NUMERIC / TRIM(f.truck_load_uom::text)::NUMERIC
            ELSE 0
          END as calculated_cost
        FROM freight_storage_costs_ii_template_freightrawdata f
        WHERE f.truck_load_uom IS NOT NULL 
          AND f.truck_freight_usd_truckload IS NOT NULL
          AND LOWER(TRIM(f.truck_load_uom::text)) NOT IN ('missing', '')
          AND LOWER(TRIM(f.truck_freight_usd_truckload::text)) NOT IN ('missing', '')
        LIMIT 10
      `;
      
      const freightSample = await query(freightSampleQuery);
      console.log('\n🔍 Sample freight data available:');
      freightSample.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. Origin: ${row.origin}, Destination: ${row.destination}, FG: ${row.fg_code}`);
        console.log(`     Load: ${row.truck_load}, Freight: ${row.truck_freight}, Cost: ${row.calculated_cost}`);
      });

      // Let's see what T03 data we're trying to match, grouped by warehouse
      const t03SampleQuery = `
        SELECT wh, plt, cty, fgsku_code, cost_per_unit
        FROM t03_primdist
        ${uploadBatchId ? 'WHERE upload_batch_id = $1' : ''}
        ORDER BY wh, id
        LIMIT 15
      `;
      
      const t03Sample = await query(t03SampleQuery, params);
      console.log('\n🔍 Sample T03 data to match (by warehouse):');
      t03Sample.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. WH: ${row.wh}, PLT: ${row.plt}, CTY: ${row.cty}, FG: ${row.fgsku_code}, Cost: ${row.cost_per_unit}`);
      });

      // Check if we have freight data for different origins
      const originCheckQuery = `
        SELECT DISTINCT TRIM(f.origin::text) as origin, COUNT(*) as record_count
        FROM freight_storage_costs_ii_template_freightrawdata f
        WHERE f.truck_load_uom IS NOT NULL 
          AND f.truck_freight_usd_truckload IS NOT NULL
          AND LOWER(TRIM(f.truck_load_uom::text)) NOT IN ('missing', '')
          AND LOWER(TRIM(f.truck_freight_usd_truckload::text)) NOT IN ('missing', '')
        GROUP BY TRIM(f.origin::text)
        ORDER BY record_count DESC
      `;
      
      const originCheck = await query(originCheckQuery);
      console.log('\n🔍 Available origins in freight data:');
      originCheck.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. Origin: "${row.origin}" (${row.record_count} records)`);
      });

      // Check available destinations
      const destinationCheckQuery = `
        SELECT DISTINCT TRIM(f.destination::text) as destination, COUNT(*) as record_count
        FROM freight_storage_costs_ii_template_freightrawdata f
        WHERE f.truck_load_uom IS NOT NULL 
          AND f.truck_freight_usd_truckload IS NOT NULL
          AND LOWER(TRIM(f.truck_load_uom::text)) NOT IN ('missing', '')
          AND LOWER(TRIM(f.truck_freight_usd_truckload::text)) NOT IN ('missing', '')
        GROUP BY TRIM(f.destination::text)
        ORDER BY record_count DESC
      `;
      
      const destinationCheck = await query(destinationCheckQuery);
      console.log('\n🔍 Available destinations in freight data:');
      destinationCheck.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. Destination: "${row.destination}" (${row.record_count} records)`);
      });

      // Debug: Check specific freight data for GFC and KFC origins
      const debugFreightQuery = `
        SELECT 
          TRIM(f.origin::text) as origin,
          TRIM(f.destination::text) as destination,
          TRIM(f.fg_code::text) as fg_code,
          TRIM(f.truck_load_uom::text) as truck_load,
          TRIM(f.truck_freight_usd_truckload::text) as truck_freight,
          CASE 
            WHEN TRIM(f.truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
              AND TRIM(f.truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
              AND TRIM(f.truck_load_uom::text)::NUMERIC > 0
            THEN TRIM(f.truck_freight_usd_truckload::text)::NUMERIC / TRIM(f.truck_load_uom::text)::NUMERIC
            ELSE 0
          END as calculated_cost
        FROM freight_storage_costs_ii_template_freightrawdata f
        WHERE TRIM(f.origin::text) IN ('GFC', 'KFC')
          AND TRIM(f.destination::text) IN ('United Arab Emirates', 'Kuwait')
          AND f.truck_load_uom IS NOT NULL 
          AND f.truck_freight_usd_truckload IS NOT NULL
          AND LOWER(TRIM(f.truck_load_uom::text)) NOT IN ('missing', '')
          AND LOWER(TRIM(f.truck_freight_usd_truckload::text)) NOT IN ('missing', '')
        ORDER BY origin, destination, calculated_cost DESC
        LIMIT 10
      `;
      
      const debugFreight = await query(debugFreightQuery);
      console.log('\n🔍 Debug: GFC & KFC freight data for UAE & Kuwait:');
      if (debugFreight.rows.length > 0) {
        debugFreight.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.origin}->${row.destination}, FG: ${row.fg_code}`);
          console.log(`     Load: ${row.truck_load}, Freight: ${row.truck_freight}, Cost: ${row.calculated_cost}`);
        });
      } else {
        console.log('  ❌ No freight data found for GFC->UAE or KFC->Kuwait combinations!');
      }

      // Check for data quality issues
      const dataQualityQuery = `
        SELECT 
          TRIM(f.origin::text) as origin,
          COUNT(*) as total_records,
          COUNT(CASE WHEN TRIM(f.truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' THEN 1 END) as valid_load,
          COUNT(CASE WHEN TRIM(f.truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$' THEN 1 END) as valid_freight,
          AVG(CASE 
            WHEN TRIM(f.truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
              AND TRIM(f.truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
              AND TRIM(f.truck_load_uom::text)::NUMERIC > 0
            THEN TRIM(f.truck_freight_usd_truckload::text)::NUMERIC / TRIM(f.truck_load_uom::text)::NUMERIC
            ELSE NULL
          END) as avg_cost
        FROM freight_storage_costs_ii_template_freightrawdata f
        WHERE TRIM(f.origin::text) IN ('GFC', 'KFC', 'NFC')
        GROUP BY TRIM(f.origin::text)
        ORDER BY total_records DESC
      `;
      
      const dataQuality = await query(dataQualityQuery);
      console.log('\n🔍 Freight data quality by origin:');
      dataQuality.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.origin}: ${row.total_records} total, ${row.valid_load} valid loads, ${row.valid_freight} valid freights, avg cost: ${row.avg_cost || 'N/A'}`);
      });

      // Debug specific SKU: 4001310601 with KFC->Saudi Arabia
      console.log('\n🔍 Debug specific SKU: 4001310601');
      
      // Check freight data for this SKU
      const skuFreightQuery = `
        SELECT 
          TRIM(f.origin::text) as origin,
          TRIM(f.destination::text) as destination,
          TRIM(f.fg_code::text) as fg_code,
          TRIM(f.truck_load_uom::text) as truck_load,
          TRIM(f.truck_freight_usd_truckload::text) as truck_freight,
          CASE 
            WHEN TRIM(f.truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
              AND TRIM(f.truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
              AND TRIM(f.truck_load_uom::text)::NUMERIC > 0
            THEN TRIM(f.truck_freight_usd_truckload::text)::NUMERIC / TRIM(f.truck_load_uom::text)::NUMERIC
            ELSE 0
          END as calculated_cost
        FROM freight_storage_costs_ii_template_freightrawdata f
        WHERE TRIM(f.fg_code::text) = '4001310601'
        ORDER BY origin, destination
      `;
      
      const skuFreight = await query(skuFreightQuery);
      console.log('Freight data for SKU 4001310601:');
      if (skuFreight.rows.length > 0) {
        skuFreight.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.origin}->${row.destination}: Load=${row.truck_load}, Freight=${row.truck_freight}, Cost=${row.calculated_cost}`);
        });
      } else {
        console.log('  ❌ No freight data found for SKU 4001310601');
      }

      // Check T03 data for this SKU
      const skuT03Query = `
        SELECT wh, plt, cty, fgsku_code, cost_per_unit
        FROM t03_primdist
        WHERE fgsku_code = '4001310601'
        ${uploadBatchId ? 'AND upload_batch_id = $1' : ''}
        ORDER BY wh
      `;
      
      const skuT03 = await query(skuT03Query, params);
      console.log('T03 records for SKU 4001310601:');
      if (skuT03.rows.length > 0) {
        skuT03.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. WH=${row.wh}, PLT=${row.plt}, CTY=${row.cty}, Cost=${row.cost_per_unit}`);
        });
      } else {
        console.log('  ❌ No T03 records found for SKU 4001310601');
      }

      // Test if this specific combination should match
      const skuMatchQuery = `
        SELECT 
          t03.wh, t03.plt, t03.cty, 
          f.origin, f.destination,
          f.calculated_cost,
          'MATCH' as status
        FROM t03_primdist t03
        JOIN (
          SELECT 
            TRIM(f.origin::text) as origin,
            TRIM(f.destination::text) as destination,
            TRIM(f.fg_code::text) as fg_code,
            CASE 
              WHEN TRIM(f.truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
                AND TRIM(f.truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
                AND TRIM(f.truck_load_uom::text)::NUMERIC > 0
              THEN TRIM(f.truck_freight_usd_truckload::text)::NUMERIC / TRIM(f.truck_load_uom::text)::NUMERIC
              ELSE 0
            END as calculated_cost
          FROM freight_storage_costs_ii_template_freightrawdata f
          WHERE TRIM(f.fg_code::text) = '4001310601'
        ) f ON (
          UPPER(TRIM(t03.plt)) = UPPER(f.origin)
          AND UPPER(TRIM(t03.cty)) = UPPER(f.destination)
          AND TRIM(t03.fgsku_code) = f.fg_code
        )
        WHERE t03.fgsku_code = '4001310601'
        ${uploadBatchId ? 'AND t03.upload_batch_id = $1' : ''}
      `;
      
      const skuMatch = await query(skuMatchQuery, params);
      console.log('Expected matches for SKU 4001310601:');
      if (skuMatch.rows.length > 0) {
        skuMatch.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. T03(${row.plt}->${row.cty}) matches Freight(${row.origin}->${row.destination}) = Cost: ${row.calculated_cost}`);
        });
      } else {
        console.log('  ❌ No matches found for SKU 4001310601 - check PLT/CTY alignment');
      }

      // Let's test the matching logic before running the actual update
      const matchTestQuery = `
        SELECT 
          t03.wh,
          t03.plt,
          t03.cty, 
          t03.fgsku_code,
          subquery.origin,
          subquery.destination,
          subquery.fg_code,
          subquery.calculated_cost
        FROM t03_primdist t03
        JOIN (
          SELECT 
            TRIM(f.origin::text) as origin,
            TRIM(f.destination::text) as destination,
            TRIM(f.fg_code::text) as fg_code,
            CASE 
              WHEN TRIM(f.truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
                AND TRIM(f.truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
                AND TRIM(f.truck_load_uom::text)::NUMERIC > 0
              THEN TRIM(f.truck_freight_usd_truckload::text)::NUMERIC / TRIM(f.truck_load_uom::text)::NUMERIC
              ELSE 0
            END as calculated_cost
          FROM freight_storage_costs_ii_template_freightrawdata f
          WHERE f.truck_load_uom IS NOT NULL 
            AND f.truck_freight_usd_truckload IS NOT NULL
            AND LOWER(TRIM(f.truck_load_uom::text)) NOT IN ('missing', '')
            AND LOWER(TRIM(f.truck_freight_usd_truckload::text)) NOT IN ('missing', '')
        ) subquery ON (
          UPPER(TRIM(t03.plt)) = UPPER(subquery.origin)
          AND UPPER(TRIM(t03.cty)) = UPPER(subquery.destination)
          AND TRIM(t03.fgsku_code) = subquery.fg_code
        )
        ${uploadBatchId ? 'WHERE t03.upload_batch_id = $1' : ''}
        ORDER BY t03.wh, subquery.calculated_cost DESC
        LIMIT 20
      `;
      
      const matchTest = await query(matchTestQuery, params);
      console.log('\n🔍 Successful matches found (before update):');
      if (matchTest.rows.length > 0) {
        const warehouseCounts = {};
        matchTest.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. WH: ${row.wh}, T03(${row.plt}->${row.cty}), Freight(${row.origin}->${row.destination}), Cost: ${row.calculated_cost}`);
          warehouseCounts[row.wh] = (warehouseCounts[row.wh] || 0) + 1;
        });
        console.log('\n📊 Matches by warehouse:');
        Object.entries(warehouseCounts).forEach(([wh, count]) => {
          console.log(`  ${wh}: ${count} matches`);
        });
      } else {
        console.log('  ❌ No successful matches found! Check origin/destination/fg_code alignment');
      }

      const result = await query(updateQuery, params);
      console.log(`\n✅ Updated cost per unit for ${result.rowCount} T03 records using SQL script`);
      
      // After update, let's see results by warehouse
      const updatedSampleQuery = `
        SELECT wh, plt, cty, fgsku_code, cost_per_unit
        FROM t03_primdist
        WHERE cost_per_unit > 0 ${uploadBatchId ? 'AND upload_batch_id = $1' : ''}
        ORDER BY wh, cost_per_unit DESC
        LIMIT 15
      `;
      
      const updatedSample = await query(updatedSampleQuery, params);
      console.log('\n🔍 Sample T03 records with updated costs (by warehouse):');
      if (updatedSample.rows.length > 0) {
        const warehouseResults = {};
        updatedSample.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. WH: ${row.wh}, PLT: ${row.plt}, CTY: ${row.cty}, FG: ${row.fgsku_code}, Cost: ${row.cost_per_unit}`);
          warehouseResults[row.wh] = (warehouseResults[row.wh] || 0) + 1;
        });
        console.log('\n📊 Updated records by warehouse:');
        Object.entries(warehouseResults).forEach(([wh, count]) => {
          console.log(`  ${wh}: ${count} records with cost > 0`);
        });
      } else {
        console.log('  ❌ No records found with cost_per_unit > 0 after update!');
      }
      
      // COMMENTED OUT: Business rules that were overwriting SQL results
      // Apply business rules: X warehouse should remain 0
      // const xWarehouseUpdate = `
      //   UPDATE t03_primdist 
      //   SET cost_per_unit = 0,
      //       updated_at = CURRENT_TIMESTAMP
      //   WHERE wh = 'X' ${uploadBatchId ? 'AND upload_batch_id = $1' : ''}
      // `;
      // 
      // const xResult = await query(xWarehouseUpdate, params);
      // if (xResult.rowCount > 0) {
      //   console.log(`✅ Applied X warehouse rule: set cost = 0 for ${xResult.rowCount} records`);
      // }
      
      // Apply same factory-warehouse shipping rule: cost = 0
      // const sameFactoryUpdate = `
      //   UPDATE t03_primdist 
      //   SET cost_per_unit = 0,
      //       updated_at = CURRENT_TIMESTAMP
      //   WHERE ((wh = 'GFCM' AND plt = 'GFC') OR
      //          (wh = 'KFCM' AND plt = 'KFC') OR
      //          (wh = 'NFCM' AND plt = 'NFC'))
      //     ${uploadBatchId ? 'AND upload_batch_id = $1' : ''}
      // `;
      // 
      // const sameFactoryResult = await query(sameFactoryUpdate, params);
      // if (sameFactoryResult.rowCount > 0) {
      //   console.log(`✅ Applied same factory-warehouse rule: set cost = 0 for ${sameFactoryResult.rowCount} records`);
      // }
      
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error updating cost per unit with SQL:', error);
      throw error;
    }
  }

  // Get upload batches
  static async getUploadBatches() {
    try {
      const getBatchesQuery = `
        SELECT DISTINCT upload_batch_id, 
               COUNT(*) as record_count,
               MIN(created_at) as first_created,
               MAX(created_at) as last_created
        FROM t03_primdist
        WHERE upload_batch_id IS NOT NULL
        GROUP BY upload_batch_id
        ORDER BY last_created DESC
      `;
      
      const result = await query(getBatchesQuery);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting upload batches:', error);
      throw error;
    }
  }
}

module.exports = T03Data; 