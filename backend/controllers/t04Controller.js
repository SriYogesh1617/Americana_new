const T04Data = require('../models/T04Data');
const DemandCursor = require('../models/DemandCursor');
const FreightStorageCostsCursor = require('../models/FreightStorageCostsCursor');
const CapacityCursor = require('../models/CapacityCursor');
const BaseScenarioConfigurationCursor = require('../models/BaseScenarioConfigurationCursor');
const db = require('../config/database');
const query = db.query;

class T04Controller {
  // Get all T04 data
  static async getAllT04Data(req, res) {
    try {
      const { workbook_id, fg_sku_code, wh, mth_num } = req.query;
      
      const filters = {};
      if (workbook_id) filters.workbook_id = workbook_id;
      if (fg_sku_code) filters.fg_sku_code = fg_sku_code;
      if (wh) filters.wh = wh;
      if (mth_num) filters.mth_num = parseInt(mth_num);

      const t04Data = await T04Data.getAll(filters);
      
      res.json({
        success: true,
        data: t04Data,
        count: t04Data.length
      });
    } catch (error) {
      console.error('Error getting T04 data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T04 data',
        details: error.message
      });
    }
  }

  // Get T04 data with formulas
  static async getT04DataWithFormulas(req, res) {
    try {
      const { workbook_id, fg_sku_code, wh, mth_num } = req.query;
      
      let whereClause = '';
      const params = [];
      let paramIndex = 1;

      if (workbook_id) {
        whereClause += ` WHERE workbook_id = $${paramIndex}`;
        params.push(workbook_id);
        paramIndex++;
      }

      if (fg_sku_code) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` fg_sku_code = $${paramIndex}`;
        params.push(fg_sku_code);
        paramIndex++;
      }

      if (wh) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` wh = $${paramIndex}`;
        params.push(wh);
        paramIndex++;
      }

      if (mth_num) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` mth_num = $${paramIndex}`;
        params.push(parseInt(mth_num));
        paramIndex++;
      }

      const selectQuery = `
        SELECT 
          id, wh, fg_sku_code, mth_num,
          -- Basic data columns
          mto_demand_next_month, mts_demand_next_month, inventory_days_norm,
          store_cost, min_os, max_os, min_cs, max_cs,
          
          -- Stock flow data
          os_gfc, in_gfc, out_gfc, cs_gfc,
          os_kfc, in_kfc, out_kfc, cs_kfc,
          os_nfc, in_nfc, out_nfc, cs_nfc,
          os_x, in_x, out_x, cs_x,
          
          -- Totals
          os_tot, in_tot, out_tot, cs_tot,
          avg_stock, storage_cost, storage_cost_v2,
          
          -- Formulas
          os_gfc_formula, in_gfc_formula, out_gfc_formula, cs_gfc_formula,
          os_kfc_formula, in_kfc_formula, out_kfc_formula, cs_kfc_formula,
          os_nfc_formula, in_nfc_formula, out_nfc_formula, cs_nfc_formula,
          os_x_formula, in_x_formula, out_x_formula, cs_x_formula,
          os_tot_formula, in_tot_formula, out_tot_formula, cs_tot_formula,
          storage_cost_formula, storage_cost_v2_formula, avg_stock_formula,
          
          workbook_id, created_at, updated_at
        FROM t04_whbal
        ${whereClause}
        ORDER BY fg_sku_code, wh, mth_num;
      `;

      const result = await query(selectQuery, params);
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        columns: {
          data_columns: ['os_gfc', 'in_gfc', 'out_gfc', 'cs_gfc', 'os_tot', 'storage_cost_v2'],
          formula_columns: ['os_gfc_formula', 'in_gfc_formula', 'out_gfc_formula', 'cs_gfc_formula', 'storage_cost_v2_formula']
        }
      });
    } catch (error) {
      console.error('Error getting T04 data with formulas:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T04 data with formulas',
        details: error.message
      });
    }
  }

  // Get T04 data with dynamic os_gfc calculation (M5 uses m1os, M6-16 uses previous month's cs_gfc)
  static async getT04WithDynamicOS(req, res) {
    try {
      const { fg_sku_code, wh, workbook_id } = req.query;
      
      let whereClause = '';
      const params = [];
      let paramIndex = 1;

      if (workbook_id) {
        whereClause += ` WHERE workbook_id = $${paramIndex}`;
        params.push(workbook_id);
        paramIndex++;
      }

      if (fg_sku_code) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` fg_sku_code = $${paramIndex}`;
        params.push(fg_sku_code);
        paramIndex++;
      }

      if (wh) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` wh = $${paramIndex}`;
        params.push(wh);
        paramIndex++;
      }

      // Add month filter for 5-16
      whereClause += whereClause ? ' AND' : ' WHERE';
      whereClause += ` mth_num BETWEEN 5 AND 16`;

      const selectQuery = `
        WITH t04_with_prev_cs AS (
          SELECT 
            t1.*,
            LAG(t1.cs_gfc) OVER (
              PARTITION BY t1.fg_sku_code, t1.wh 
              ORDER BY t1.mth_num
            ) as prev_month_cs_gfc
          FROM t04_whbal t1
          ${whereClause}
        )
        SELECT 
          id,
          fg_sku_code,
          wh,
          mth_num,
          -- Dynamic os_gfc calculation
          CASE 
            WHEN mth_num = 5 THEN m1os_gfc
            WHEN mth_num BETWEEN 6 AND 16 THEN prev_month_cs_gfc
            ELSE os_gfc
          END as calculated_os_gfc,
          -- Original values for reference
          m1os_gfc,
          os_gfc,
          cs_gfc,
          prev_month_cs_gfc,
          -- Other relevant columns
          in_gfc,
          out_gfc,
          storage_cost_v2,
          -- Formulas
          os_gfc_formula,
          cs_gfc_formula,
          storage_cost_v2_formula,
          workbook_id
        FROM t04_with_prev_cs
        ORDER BY fg_sku_code, wh, mth_num;
      `;

      const result = await query(selectQuery, params);
      
      // Add calculation explanation
      const calculationLogic = {
        month_5: "Uses m1os_gfc value",
        months_6_to_16: "Uses previous month's cs_gfc value",
        calculation_example: {
          month_5: "os_gfc = m1os_gfc",
          month_6: "os_gfc = cs_gfc from month 5",
          month_7: "os_gfc = cs_gfc from month 6",
          month_8: "os_gfc = cs_gfc from month 7"
        }
      };
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        calculationLogic: calculationLogic,
        filters: {
          fg_sku_code: fg_sku_code || 'all',
          wh: wh || 'all',
          workbook_id: workbook_id || 'all',
          month_range: '5-16'
        }
      });
    } catch (error) {
      console.error('Error getting T04 with dynamic OS:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T04 data with dynamic OS calculation',
        details: error.message
      });
    }
  }

  // Get specific T04 columns (including os_gfc)
  static async getT04Columns(req, res) {
    try {
      const { columns, workbook_id, fg_sku_code, wh, mth_num } = req.query;
      
      // Default columns if none specified
      const defaultColumns = ['id', 'wh', 'fg_sku_code', 'mth_num', 'os_gfc', 'os_gfc_formula'];
      const selectedColumns = columns ? columns.split(',') : defaultColumns;
      
      // Validate column names to prevent SQL injection
      const allowedColumns = [
        'id', 'wh', 'fg_sku_code', 'mth_num',
        'os_gfc', 'in_gfc', 'out_gfc', 'cs_gfc',
        'os_kfc', 'in_kfc', 'out_kfc', 'cs_kfc',
        'os_nfc', 'in_nfc', 'out_nfc', 'cs_nfc',
        'os_x', 'in_x', 'out_x', 'cs_x',
        'os_tot', 'in_tot', 'out_tot', 'cs_tot',
        'storage_cost', 'storage_cost_v2', 'avg_stock',
        'os_gfc_formula', 'in_gfc_formula', 'out_gfc_formula', 'cs_gfc_formula',
        'os_kfc_formula', 'in_kfc_formula', 'out_kfc_formula', 'cs_kfc_formula',
        'os_nfc_formula', 'in_nfc_formula', 'out_nfc_formula', 'cs_nfc_formula',
        'os_x_formula', 'in_x_formula', 'out_x_formula', 'cs_x_formula',
        'storage_cost_v2_formula', 'workbook_id'
      ];
      
      const validColumns = selectedColumns.filter(col => allowedColumns.includes(col.trim()));
      
      if (validColumns.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid columns specified',
          allowedColumns: allowedColumns
        });
      }

      let whereClause = '';
      const params = [];
      let paramIndex = 1;

      if (workbook_id) {
        whereClause += ` WHERE workbook_id = $${paramIndex}`;
        params.push(workbook_id);
        paramIndex++;
      }

      if (fg_sku_code) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` fg_sku_code = $${paramIndex}`;
        params.push(fg_sku_code);
        paramIndex++;
      }

      if (wh) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` wh = $${paramIndex}`;
        params.push(wh);
        paramIndex++;
      }

      if (mth_num) {
        whereClause += whereClause ? ' AND' : ' WHERE';
        whereClause += ` mth_num = $${paramIndex}`;
        params.push(parseInt(mth_num));
        paramIndex++;
      }

      const selectQuery = `
        SELECT ${validColumns.join(', ')}
        FROM t04_whbal
        ${whereClause}
        ORDER BY fg_sku_code, wh, mth_num;
      `;

      const result = await query(selectQuery, params);
      
      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
        selectedColumns: validColumns
      });
    } catch (error) {
      console.error('Error getting T04 columns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T04 columns',
        details: error.message
      });
    }
  }

  // Get T04 summary statistics
  static async getT04Summary(req, res) {
    try {
      const { workbook_id } = req.query;
      const stats = await T04Data.getSummaryStats(workbook_id);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting T04 summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T04 summary',
        details: error.message
      });
    }
  }

  // Process and generate T04 data from raw sources
  static async processT04Data(req, res) {
    try {
      const { sourceWorkbooks } = req.body;
      
      if (!sourceWorkbooks || sourceWorkbooks.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Source workbooks are required'
        });
      }

      console.log('🚀 Starting T04 WHBal data processing...');
      const result = await T04Controller.generateT04Data(sourceWorkbooks);
      
      res.json({
        success: true,
        message: 'T04 WHBal data processed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error processing T04 data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process T04 data',
        details: error.message
      });
    }
  }

  // Generate T04 WHBal data from multiple sources
  static async generateT04Data(sourceWorkbooks) {
    try {
      console.log('📊 Generating T04_WHBal data from sources...');
      
      // Step 1: Get demand data from T01
      console.log('🔍 Fetching demand data from T01...');
      const demandData = await T04Controller.getDemandDataFromT01(sourceWorkbooks);
      console.log(`Found ${demandData.length} demand records`);

      // Step 2: Get capacity data for inventory days
      console.log('🔍 Fetching capacity data...');
      const capacityData = await T04Controller.getCapacityData(sourceWorkbooks);
      console.log(`Found ${capacityData.length} capacity records`);

      // Step 3: Get item master data for weights and opening stock
      console.log('🔍 Fetching item master data...');
      const itemMasterData = await T04Controller.getItemMasterData(sourceWorkbooks);
      console.log(`Found ${itemMasterData.length} item master records`);

      // Step 4: Get opening stock data
      console.log('🔍 Fetching opening stock data...');
      const openingStockData = await T04Controller.getOpeningStockData(sourceWorkbooks);
      console.log(`Found ${openingStockData.length} opening stock records`);

      // Step 5: Process and create T04 records
      console.log('⚙️ Processing T04 WHBal data...');
      const t04Records = await T04Controller.createT04Records(
        demandData, 
        capacityData, 
        itemMasterData, 
        openingStockData
      );

      // Step 6: Bulk insert T04 data
      console.log('💾 Inserting T04 data...');
      const insertedRecords = await T04Data.bulkInsert(t04Records);

      // Step 7: Update calculated fields and formulas
      console.log('🧮 Updating calculated fields and formulas...');
      await T04Data.updateAllCalculatedFields();

      console.log(`✅ Successfully generated ${insertedRecords.length} T04 WHBal records`);
      
      return {
        totalRecords: insertedRecords.length,
        summary: await T04Data.getSummaryStats()
      };
    } catch (error) {
      console.error('❌ Error generating T04 data:', error);
      throw error;
    }
  }

  // Get demand data from T01 table for MTO/MTS calculations
  static async getDemandDataFromT01(sourceWorkbooks) {
    try {
      // Get demand data from T01 (assuming we have t01_data table)
      const demandQuery = `
        SELECT DISTINCT 
          t.fg_sku_code,
          t.safety_stock_wh as wh,
          t.mth_num,
          t.next_month_code,
          t.sku_type,
          SUM(t.demand_qty) as demand_qty,
          t.workbook_id
        FROM t01_data t
        WHERE t.fg_sku_code IS NOT NULL
        AND t.fg_sku_code != ''
        AND t.safety_stock_wh IN ('GFCM', 'KFCM', 'NFCM')
        GROUP BY t.fg_sku_code, t.safety_stock_wh, t.mth_num, t.next_month_code, t.sku_type, t.workbook_id
        ORDER BY t.fg_sku_code, t.safety_stock_wh, t.mth_num;
      `;
      
      const result = await query(demandQuery);
      return result.rows;
    } catch (error) {
      console.error('Error getting T01 demand data:', error);
      // If T01 table doesn't exist, get from demand_cursor as fallback
      return await T04Controller.getDemandDataFallback(sourceWorkbooks);
    }
  }

  // Fallback method to get demand data from demand_cursor
  static async getDemandDataFallback(sourceWorkbooks) {
    try {
      const demandQuery = `
        SELECT DISTINCT 
          d.fg_sku_code,
          'GFCM' as wh,
          d.mth_num,
          d.mth_num + 1 as next_month_code,
          'MTS' as sku_type,
          SUM(d.demand_qty) as demand_qty,
          d.workbook_id
        FROM demand_cursor d
        WHERE d.fg_sku_code IS NOT NULL
        AND d.fg_sku_code != ''
        GROUP BY d.fg_sku_code, d.mth_num, d.workbook_id
        ORDER BY d.fg_sku_code, d.mth_num;
      `;
      
      const result = await query(demandQuery);
      
      // Expand to include all warehouses
      const expandedData = [];
      const warehouses = ['GFCM', 'KFCM', 'NFCM'];
      
      result.rows.forEach(row => {
        warehouses.forEach(warehouse => {
          expandedData.push({
            ...row,
            wh: warehouse
          });
        });
      });
      
      return expandedData;
    } catch (error) {
      console.error('Error getting demand data fallback:', error);
      return [];
    }
  }

  // Get capacity data for inventory days lookup
  static async getCapacityData(sourceWorkbooks) {
    try {
      const capacityQuery = `
        SELECT DISTINCT 
          c.fg_sku_code,
          c.plt as factory,
          c.inventory_days,
          c.workbook_id
        FROM capacity_cursor c
        WHERE c.fg_sku_code IS NOT NULL
        AND c.plt IS NOT NULL
        AND c.inventory_days IS NOT NULL
        ORDER BY c.fg_sku_code, c.plt;
      `;
      
      const result = await query(capacityQuery);
      return result.rows;
    } catch (error) {
      console.error('Error getting capacity data:', error);
      return [];
    }
  }

  // Get item master data for weights
  static async getItemMasterData(sourceWorkbooks) {
    try {
      const itemQuery = `
        SELECT DISTINCT 
          d.fg_sku_code,
          d.fg_wt_per_unit,
          d.workbook_id
        FROM demand_cursor d
        WHERE d.fg_sku_code IS NOT NULL
        AND d.fg_wt_per_unit IS NOT NULL
        ORDER BY d.fg_sku_code;
      `;
      
      const result = await query(itemQuery);
      return result.rows;
    } catch (error) {
      console.error('Error getting item master data:', error);
      return [];
    }
  }

  // Get opening stock data (simulated for now)
  static async getOpeningStockData(sourceWorkbooks) {
    try {
      // This would come from inventory data in real implementation
      // For now, we'll simulate some opening stock data
      const openingStockQuery = `
        SELECT DISTINCT 
          d.fg_sku_code,
          'GFCM' as factory,
          COALESCE(d.demand_qty * 0.1, 0) as qty_on_hand,
          d.workbook_id
        FROM demand_cursor d
        WHERE d.fg_sku_code IS NOT NULL
        ORDER BY d.fg_sku_code;
      `;
      
      const result = await query(openingStockQuery);
      
      // Expand to include all factories
      const expandedData = [];
      const factories = ['GFCM', 'KFCM', 'NFCM', 'X'];
      
      result.rows.forEach(row => {
        factories.forEach(factory => {
          expandedData.push({
            ...row,
            factory: factory,
            qty_on_hand: factory === 'X' ? 0 : row.qty_on_hand // X factory starts with 0
          });
        });
      });
      
      return expandedData;
    } catch (error) {
      console.error('Error getting opening stock data:', error);
      return [];
    }
  }

  // Create T04 WHBal records with transformation logic
  static async createT04Records(demandData, capacityData, itemMasterData, openingStockData) {
    try {
      const t04Records = [];
      
      // Warehouses as per transformation logic: GFCM, NFCM, KFCM, and X
      const warehouses = ['GFCM', 'KFCM', 'NFCM', 'X'];
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      
      // Create lookup maps for faster processing
      const demandMap = new Map();
      demandData.forEach(demand => {
        const key = `${demand.fg_sku_code}_${demand.wh}_${demand.mth_num}_${demand.sku_type}`;
        if (!demandMap.has(key)) {
          demandMap.set(key, 0);
        }
        demandMap.set(key, demandMap.get(key) + (parseFloat(demand.demand_qty) || 0));
      });
      
      const capacityMap = new Map();
      capacityData.forEach(cap => {
        const key = `${cap.fg_sku_code}_${cap.factory}`;
        capacityMap.set(key, cap);
      });
      
      const itemMasterMap = new Map();
      itemMasterData.forEach(item => {
        itemMasterMap.set(item.fg_sku_code, item);
      });
      
      const openingStockMap = new Map();
      openingStockData.forEach(stock => {
        const key = `${stock.fg_sku_code}_${stock.factory}`;
        openingStockMap.set(key, stock);
      });

      // Get unique SKUs from demand data
      const uniqueSKUs = [...new Set(demandData.map(d => d.fg_sku_code))];
      
      // For each SKU, create records for all warehouse-month combinations
      for (const skuCode of uniqueSKUs) {
        for (const warehouse of warehouses) {
          for (const month of months) {
            
            const workbookId = demandData.find(d => d.fg_sku_code === skuCode)?.workbook_id;
            
            // Calculate MTO and MTS demands for next month
            const nextMonth = month === 12 ? 1 : month + 1;
            const mtoKey = `${skuCode}_${warehouse}_${nextMonth}_MTO`;
            const mtsKey = `${skuCode}_${warehouse}_${nextMonth}_MTS`;
            
            const mtoNextMonth = demandMap.get(mtoKey) || 0;
            const mtsNextMonth = demandMap.get(mtsKey) || 0;
            
            // Calculate MTS demand for next 3 months
            let mtsNext3Months = 0;
            for (let i = 1; i <= 3; i++) {
              const futureMonth = month + i > 12 ? (month + i - 12) : month + i;
              const futureKey = `${skuCode}_${warehouse}_${futureMonth}_MTS`;
              mtsNext3Months += demandMap.get(futureKey) || 0;
            }
            
            // Get inventory days from capacity data
            const capacityKey = `${skuCode}_${warehouse}`;
            const capacity = capacityMap.get(capacityKey);
            const inventoryDays = capacity?.inventory_days || 0;
            
            // Get item master data
            const itemMaster = itemMasterMap.get(skuCode);
            const fgWtPerUnit = itemMaster?.fg_wt_per_unit || 1;
            
            // Get opening stock for each factory
            const m1osGfc = openingStockMap.get(`${skuCode}_GFCM`)?.qty_on_hand || 0;
            const m1osKfc = openingStockMap.get(`${skuCode}_KFCM`)?.qty_on_hand || 0;
            const m1osNfc = openingStockMap.get(`${skuCode}_NFCM`)?.qty_on_hand || 0;
            const m1osX = openingStockMap.get(`${skuCode}_X`)?.qty_on_hand || 0;
            
            // Calculate MinCS based on demand and inventory days
            const minCs = (mtsNextMonth + mtoNextMonth) * (inventoryDays / 30) || 0;
            
            const t04Record = {
              wh: warehouse,
              fg_sku_code: skuCode,
              mth_num: month,
              mto_demand_next_month: mtoNextMonth,
              mts_demand_next_month: mtsNextMonth,
              inventory_days_norm: inventoryDays,
              store_cost: 0.01, // Example store cost
              mts_demand_next_3_months: mtsNext3Months,
              min_os: 0, // Set as per requirement
              max_os: warehouse === 'X' ? 0 : 10000000000, // 10^10 except for X
              min_cs: minCs,
              max_cs: warehouse === 'X' ? 0 : 10000000000, // 10^10 except for X
              max_sup_lim: 1, // Set as per requirement
              m1os_gfc: m1osGfc,
              m1os_kfc: m1osKfc,
              m1os_nfc: m1osNfc,
              fg_wt_per_unit: fgWtPerUnit,
              cs_norm: 0,
              norm_markup: 1, // Set as per requirement
              m1os_x: m1osX,
              next_3_months_demand_total: mtsNext3Months + mtoNextMonth,
              workbook_id: workbookId
            };
            
            t04Records.push(t04Record);
          }
        }
      }
      
      console.log(`✅ Created ${t04Records.length} T04 WHBal records`);
      return t04Records;
    } catch (error) {
      console.error('Error creating T04 records:', error);
      throw error;
    }
  }

  // Get T04 data by SKU
  static async getT04BySKU(req, res) {
    try {
      const { skuCode } = req.params;
      const { workbook_id } = req.query;
      
      const t04Data = await T04Data.getBySKU(skuCode, workbook_id);
      
      res.json({
        success: true,
        data: t04Data,
        count: t04Data.length
      });
    } catch (error) {
      console.error('Error getting T04 data by SKU:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T04 data by SKU',
        details: error.message
      });
    }
  }

  // Get T04 data by warehouse
  static async getT04ByWarehouse(req, res) {
    try {
      const { warehouse } = req.params;
      const { workbook_id } = req.query;
      
      const t04Data = await T04Data.getByWarehouse(warehouse, workbook_id);
      
      res.json({
        success: true,
        data: t04Data,
        count: t04Data.length
      });
    } catch (error) {
      console.error('Error getting T04 data by warehouse:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T04 data by warehouse',
        details: error.message
      });
    }
  }

  // Delete T04 data by workbook
  static async deleteT04Data(req, res) {
    try {
      const { workbook_id } = req.params;
      
      const deletedCount = await T04Data.deleteByWorkbook(workbook_id);
      
      res.json({
        success: true,
        message: `Deleted ${deletedCount} T04 records`,
        deletedCount
      });
    } catch (error) {
      console.error('Error deleting T04 data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete T04 data',
        details: error.message
      });
    }
  }

  // Recalculate all T04 formulas
  static async recalculateT04(req, res) {
    try {
      const { workbook_id } = req.query;
      
      const updatedCount = await T04Data.updateAllCalculatedFields(workbook_id);
      
      res.json({
        success: true,
        message: `Recalculated formulas for ${updatedCount} T04 records`,
        updatedCount
      });
    } catch (error) {
      console.error('Error recalculating T04:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to recalculate T04 formulas',
        details: error.message
      });
    }
  }

  // Update specific T04 field (for interactive modifications)
  static async updateT04Field(req, res) {
    try {
      const { id } = req.params;
      const { field, value } = req.body;
      
      // Validate field name to prevent SQL injection
      const allowedFields = [
        'in_gfc', 'in_kfc', 'in_nfc', 'in_x',
        'out_gfc', 'out_kfc', 'out_nfc', 'out_x',
        'max_supply_gfc', 'max_supply_kfc', 'max_supply_nfc', 'max_supply_x'
      ];
      
      if (!allowedFields.includes(field)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid field name'
        });
      }
      
      const updateQuery = `
        UPDATE t04_whbal 
        SET ${field} = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
      `;
      
      const result = await query(updateQuery, [value, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'T04 record not found'
        });
      }
      
      // Trigger recalculation of dependent fields
      await T04Data.updateAllCalculatedFields();
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating T04 field:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update T04 field',
        details: error.message
      });
    }
  }
}

module.exports = T04Controller; 