const T03Data = require('../models/T03Data');
const DemandCursor = require('../models/DemandCursor');
const FreightStorageCostsCursor = require('../models/FreightStorageCostsCursor');
const CapacityCursor = require('../models/CapacityCursor');
const BaseScenarioConfigurationCursor = require('../models/BaseScenarioConfigurationCursor');
const { query } = require('../config/database');

class T03Controller {
  // Get all T03 data
  static async getAllT03Data(req, res) {
    try {
      const { workbook_id, fg_sku_code, mth_num } = req.query;
      
      const filters = {};
      if (workbook_id) filters.workbook_id = workbook_id;
      if (fg_sku_code) filters.fg_sku_code = fg_sku_code;
      if (mth_num) filters.mth_num = parseInt(mth_num);

      const t03Data = await T03Data.getAll(filters);
      
      res.json({
        success: true,
        data: t03Data,
        count: t03Data.length
      });
    } catch (error) {
      console.error('Error getting T03 data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T03 data',
        details: error.message
      });
    }
  }

  // Get T03 summary statistics
  static async getT03Summary(req, res) {
    try {
      const { workbook_id } = req.query;
      const stats = await T03Data.getSummaryStats(workbook_id);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting T03 summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T03 summary',
        details: error.message
      });
    }
  }

  // Process and generate T03 data from raw sources
  static async processT03Data(req, res) {
    try {
      const { sourceWorkbooks } = req.body;
      
      if (!sourceWorkbooks || sourceWorkbooks.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Source workbooks are required'
        });
      }

      console.log('🚀 Starting T03 data processing...');
      const result = await T03Controller.generateT03Data(sourceWorkbooks);
      
      res.json({
        success: true,
        message: 'T03 data processed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error processing T03 data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process T03 data',
        details: error.message
      });
    }
  }

  // Generate T03 data from multiple sources
  static async generateT03Data(sourceWorkbooks) {
    try {
      console.log('📊 Generating T03_PrimDist data from sources...');
      
      // Step 1: Get demand data
      console.log('🔍 Fetching demand data...');
      const demandData = await T03Controller.getDemandData(sourceWorkbooks);
      console.log(`Found ${demandData.length} demand records`);

      // Step 2: Get capacity data to find factories with capacity > 0
      console.log('🔍 Fetching capacity data...');
      const capacityData = await T03Controller.getCapacityData(sourceWorkbooks);
      console.log(`Found ${capacityData.length} capacity records`);

      // Step 3: Get freight costs
      console.log('🔍 Fetching freight costs...');
      const freightData = await T03Controller.getFreightData(sourceWorkbooks);
      console.log(`Found ${freightData.length} freight records`);

      // Step 4: Get item master data for weights
      console.log('🔍 Fetching item master data...');
      const itemMasterData = await T03Controller.getItemMasterData(sourceWorkbooks);
      console.log(`Found ${itemMasterData.length} item master records`);

      // Step 5: Process and create T03 records
      console.log('⚙️ Processing T03 data...');
      const t03Records = await T03Controller.createT03Records(
        demandData, 
        capacityData, 
        freightData, 
        itemMasterData
      );

      // Step 6: Bulk insert T03 data
      console.log('💾 Inserting T03 data...');
      const insertedRecords = await T03Data.bulkInsert(t03Records);

      // Step 7: Update calculated fields
      console.log('🧮 Updating calculated fields...');
      await T03Data.updateAllCalculatedFields();

      console.log(`✅ Successfully generated ${insertedRecords.length} T03 records`);
      
      return {
        totalRecords: insertedRecords.length,
        summary: await T03Data.getSummaryStats()
      };
    } catch (error) {
      console.error('❌ Error generating T03 data:', error);
      throw error;
    }
  }

  // Get demand data from demand cursor
  static async getDemandData(sourceWorkbooks) {
    try {
      // Get all demand data from demand_cursor table
      const demandQuery = `
        SELECT DISTINCT 
          d.fg_sku_code,
          d.mth_num,
          d.workbook_id
        FROM demand_cursor d
        WHERE d.fg_sku_code IS NOT NULL
        AND d.fg_sku_code != ''
        ORDER BY d.fg_sku_code, d.mth_num;
      `;
      
      const result = await query(demandQuery);
      return result.rows;
    } catch (error) {
      console.error('Error getting demand data:', error);
      throw error;
    }
  }

  // Get capacity data to determine which factories can produce which SKUs
  static async getCapacityData(sourceWorkbooks) {
    try {
      // Get capacity data where capacity > 0
      const capacityQuery = `
        SELECT DISTINCT 
          c.fg_sku_code,
          c.plt as factory,
          c.mth_num,
          c.capacity,
          c.workbook_id
        FROM capacity_cursor c
        WHERE c.capacity > 0
        AND c.fg_sku_code IS NOT NULL
        AND c.plt IS NOT NULL
        ORDER BY c.fg_sku_code, c.plt, c.mth_num;
      `;
      
      const result = await query(capacityQuery);
      return result.rows;
    } catch (error) {
      console.error('Error getting capacity data:', error);
      return []; // Return empty array if capacity table doesn't exist yet
    }
  }

  // Get freight and storage costs
  static async getFreightData(sourceWorkbooks) {
    try {
      // Get freight costs from freight_storage_costs_cursor
      const freightQuery = `
        SELECT DISTINCT 
          f.plt as source_factory,
          f.wh as destination_warehouse,
          f.cost_per_unit,
          f.workbook_id
        FROM freight_storage_costs_cursor f
        WHERE f.cost_per_unit IS NOT NULL
        AND f.plt IS NOT NULL
        AND f.wh IS NOT NULL
        ORDER BY f.plt, f.wh;
      `;
      
      const result = await query(freightQuery);
      return result.rows;
    } catch (error) {
      console.error('Error getting freight data:', error);
      return []; // Return empty array if freight table doesn't exist yet
    }
  }

  // Get item master data for weights
  static async getItemMasterData(sourceWorkbooks) {
    try {
      // Try to get from demand_cursor which might have item master data
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
      return []; // Return empty array if data not available
    }
  }

  // Create T03 records based on transformation logic
  static async createT03Records(demandData, capacityData, freightData, itemMasterData) {
    try {
      const t03Records = [];
      
      // Standard warehouses as per transformation logic
      const warehouses = ['GFCM', 'KFCM', 'NFCM'];
      
      // Create lookup maps for faster processing
      const capacityMap = new Map();
      capacityData.forEach(cap => {
        const key = `${cap.fg_sku_code}_${cap.factory}_${cap.mth_num}`;
        capacityMap.set(key, cap);
      });
      
      const freightMap = new Map();
      freightData.forEach(freight => {
        const key = `${freight.source_factory}_${freight.destination_warehouse}`;
        freightMap.set(key, freight);
      });
      
      const itemMasterMap = new Map();
      itemMasterData.forEach(item => {
        itemMasterMap.set(item.fg_sku_code, item);
      });

      // Process each demand record
      for (const demand of demandData) {
        const { fg_sku_code, mth_num, workbook_id } = demand;
        
        // Find all factories that can produce this SKU in this month
        const availableFactories = [];
        for (const [key, capacity] of capacityMap.entries()) {
          if (key.startsWith(`${fg_sku_code}_`) && key.endsWith(`_${mth_num}`)) {
            availableFactories.push(capacity.factory);
          }
        }
        
        // If no factories found in capacity data, use default factories
        if (availableFactories.length === 0) {
          availableFactories.push('GFCM', 'KFCM', 'NFCM'); // Default factories
        }
        
        // For each factory-warehouse combination, create a T03 record
        for (const factory of availableFactories) {
          for (const warehouse of warehouses) {
            const freightKey = `${factory}_${warehouse}`;
            const freight = freightMap.get(freightKey);
            const itemMaster = itemMasterMap.get(fg_sku_code);
            
            const t03Record = {
              wh: warehouse,
              plt: factory,
              fg_sku_code: fg_sku_code,
              mth_num: mth_num,
              cost_per_unit: freight?.cost_per_unit || 0,
              custom_cost_per_unit: 0, // Will be calculated from customs data later
              max_qty: 10000000000, // Set as per requirement
              fg_wt_per_unit: itemMaster?.fg_wt_per_unit || 1,
              qty: 0, // Default quantity
              workbook_id: workbook_id
            };
            
            t03Records.push(t03Record);
          }
        }
      }
      
      console.log(`✅ Created ${t03Records.length} T03 records`);
      return t03Records;
    } catch (error) {
      console.error('Error creating T03 records:', error);
      throw error;
    }
  }

  // Update T03 quantity
  static async updateT03Quantity(req, res) {
    try {
      const { id } = req.params;
      const { qty } = req.body;
      
      if (qty < 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity cannot be negative'
        });
      }
      
      const updatedRecord = await T03Data.updateQuantity(id, qty);
      
      if (!updatedRecord) {
        return res.status(404).json({
          success: false,
          error: 'T03 record not found'
        });
      }
      
      res.json({
        success: true,
        data: updatedRecord
      });
    } catch (error) {
      console.error('Error updating T03 quantity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update T03 quantity',
        details: error.message
      });
    }
  }

  // Get T03 data by SKU
  static async getT03BySKU(req, res) {
    try {
      const { skuCode } = req.params;
      const { workbook_id } = req.query;
      
      const t03Data = await T03Data.getBySKU(skuCode, workbook_id);
      
      res.json({
        success: true,
        data: t03Data,
        count: t03Data.length
      });
    } catch (error) {
      console.error('Error getting T03 data by SKU:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T03 data by SKU',
        details: error.message
      });
    }
  }

  // Get T03 data by factory
  static async getT03ByFactory(req, res) {
    try {
      const { factory } = req.params;
      const { workbook_id } = req.query;
      
      const t03Data = await T03Data.getByFactory(factory, workbook_id);
      
      res.json({
        success: true,
        data: t03Data,
        count: t03Data.length
      });
    } catch (error) {
      console.error('Error getting T03 data by factory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T03 data by factory',
        details: error.message
      });
    }
  }

  // Get T03 data by warehouse
  static async getT03ByWarehouse(req, res) {
    try {
      const { warehouse } = req.params;
      const { workbook_id } = req.query;
      
      const t03Data = await T03Data.getByWarehouse(warehouse, workbook_id);
      
      res.json({
        success: true,
        data: t03Data,
        count: t03Data.length
      });
    } catch (error) {
      console.error('Error getting T03 data by warehouse:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T03 data by warehouse',
        details: error.message
      });
    }
  }

  // Delete T03 data by workbook
  static async deleteT03Data(req, res) {
    try {
      const { workbook_id } = req.params;
      
      const deletedCount = await T03Data.deleteByWorkbook(workbook_id);
      
      res.json({
        success: true,
        message: `Deleted ${deletedCount} T03 records`,
        deletedCount
      });
    } catch (error) {
      console.error('Error deleting T03 data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete T03 data',
        details: error.message
      });
    }
  }

  // Recalculate all T03 formulas
  static async recalculateT03(req, res) {
    try {
      const { workbook_id } = req.query;
      
      const updatedCount = await T03Data.updateAllCalculatedFields(workbook_id);
      
      res.json({
        success: true,
        message: `Recalculated formulas for ${updatedCount} T03 records`,
        updatedCount
      });
    } catch (error) {
      console.error('Error recalculating T03:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to recalculate T03 formulas',
        details: error.message
      });
    }
  }
}

module.exports = T03Controller; 