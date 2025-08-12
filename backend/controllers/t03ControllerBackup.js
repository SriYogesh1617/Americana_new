const T03Data = require('../models/T03Data');
const DemandCursor = require('../models/DemandCursor');
const FreightStorageCostsCursor = require('../models/FreightStorageCostsCursor');
const CapacityCursor = require('../models/CapacityCursor');
const BaseScenarioConfigurationCursor = require('../models/BaseScenarioConfigurationCursor');
const { query } = require('../config/database');
const CustomCostLookup = require('../models/CustomCostLookup');
const TransportCostCalculator = require('../models/TransportCostCalculator');

class T03Controller {
  // Get all T03 data with pagination
  static async getAllT03Data(req, res) {
    try {
      const { upload_batch_id, page = 1, limit = 1000, sort_by = 'id', sort_order = 'asc' } = req.query;
      
      // Validate pagination parameters
      const pageNum = parseInt(page) || 1;
      const limitNum = Math.min(parseInt(limit) || 1000, 5000); // Max 5000 records per page
      const offset = (pageNum - 1) * limitNum;
      
      // Build the base query
      let baseQuery = 'FROM t03_primdist WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM t03_primdist WHERE 1=1';
      const queryParams = [];
      let paramIndex = 1;
      
      // Add upload batch filter if provided
      if (upload_batch_id) {
        baseQuery += ` AND upload_batch_id = $${paramIndex}`;
        countQuery += ` AND upload_batch_id = $${paramIndex}`;
        queryParams.push(upload_batch_id);
        paramIndex++;
      }
      
      // Get total count
      const countResult = await query(countQuery, queryParams);
      const totalRecords = parseInt(countResult.rows[0].total);
      
      // Build the main query with pagination and sorting
      const mainQuery = `
        SELECT id, wh, plt, fgsku_code, mth_num, cost_per_unit, custom_cost_per_unit,
               max_qty, fg_wt_per_unit, qty, wt, custom_duty, poscheck, qty_lte_max, row_cost,
               upload_batch_id, created_at, updated_at ${baseQuery}
        ORDER BY ${sort_by} ${sort_order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limitNum, offset);
      
      const result = await query(mainQuery, queryParams);
      
      // Calculate pagination info
      const totalPages = Math.ceil(totalRecords / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;
      
      res.json({
        success: true,
        data: result.rows,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalRecords: totalRecords,
          recordsPerPage: limitNum,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage,
          startRecord: offset + 1,
          endRecord: Math.min(offset + limitNum, totalRecords)
        }
      });
    } catch (error) {
      console.error('Error getting T03 data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get T03 data',
        details: error.message
      });
    }
  }

  // Get T03 summary statistics
  static async getT03Summary(req, res) {
    try {
      const { upload_batch_id } = req.query;
      const stats = await T03Data.getSummaryStats(upload_batch_id);
      
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
      const { uploadBatchId } = req.body;
      
      if (!uploadBatchId) {
        return res.status(400).json({
          success: false,
          error: 'Upload batch ID is required'
        });
      }

      console.log('🚀 Starting T03 data processing...');
      const result = await T03Controller.generateT03FromT02(uploadBatchId);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: {
            totalRecords: result.totalRecords
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message
        });
      }
    } catch (error) {
      console.error('Error processing T03 data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process T03 data',
        details: error.message
      });
    }
  }

  // Generate T03 data from multiple sources with proper SKU filtration
  static async generateT03Data(sourceWorkbooks) {
    try {
      console.log('📊 Generating T03_PrimDist data with SKU filtration...');
      
      // Step 1: Get filtered SKUs (capacity > 0 and opening stock > 0)
      console.log('🔍 Step 1: Getting filtered SKUs...');
      const filteredSkus = await T03Controller.getFilteredSkus(sourceWorkbooks);
      console.log(`Found ${filteredSkus.length} valid SKU-month combinations`);



      // Step 2: Get freight costs (load once for optimization)
      console.log('🔍 Step 2: Fetching freight costs...');
      const TransportCostCalculator = require('../models/TransportCostCalculator');
      const freightData = await TransportCostCalculator.loadFreightData();
      console.log(`Found ${freightData.specificCosts.size} specific freight costs and ${freightData.fallbackStructure.originDestinationAvg.size} origin-destination averages`);

      // Step 3: Get item master data for weights
      console.log('🔍 Step 3: Fetching item master data...');
      const ItemMasterLookup = require('../models/ItemMasterLookup');
      const itemMasterData = await ItemMasterLookup.loadCombinedItemMasterData();
      console.log(`Found ${itemMasterData.size} item master records`);

      // Step 4: Get capacity data for PLT assignment
      console.log('🔍 Step 4: Loading capacity data for PLT assignment...');
      const CapacityLookup = require('../models/CapacityLookup');
      const capacityData = await CapacityLookup.loadCapacityData();
      const capacityStats = CapacityLookup.getCapacityStatistics(capacityData);
      console.log('Capacity statistics:', capacityStats);

      // Step 5: Process and create T03 records
      console.log('⚙️ Step 5: Processing T03 data...');
      const t03Records = await T03Controller.createT03RecordsWithFiltration(
        filteredSkus, 
        freightData,
        itemMasterData,
        capacityData
      );

      // Step 6: Bulk insert T03 data
      console.log('💾 Step 6: Inserting T03 data...');
      const insertedRecords = await T03Data.bulkInsert(t03Records);

      // Step 7: Update cost per unit from T02 data
      console.log('💰 Step 7: Updating cost per unit from T02 data...');
      await T03Controller.updateCostPerUnitFromT02();

      // Step 8: Update calculated fields
      console.log('🧮 Step 8: Updating calculated fields...');
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

  // Generate T03 data from T02 data (new method for automatic calculation)
  static async generateT03FromT02(uploadBatchId) {
    try {
      console.log('🚀 Starting T03 generation from T02 data...');
      
      // First, clear existing T03 data for this upload batch
      console.log('🧹 Clearing existing T03 data for upload batch...');
      await T03Data.deleteByUploadBatch(uploadBatchId);
      
      // Get T02 data with all required fields for custom cost calculation
      console.log('📊 Fetching T02 data...');
      const t02Query = `
        SELECT 
          wh,
          cty,
          fgsku_code,
          month,
          transport_cost_per_case,
          fgwt_per_unit,
          customs,
          custom_cost_per_unit_gfc,
          custom_cost_per_unit_kfc,
          custom_cost_per_unit_nfc,
          upload_batch_id
        FROM t02_data 
        WHERE upload_batch_id = $1
          AND wh IS NOT NULL 
          AND cty IS NOT NULL
          AND fgsku_code IS NOT NULL 
          AND month IS NOT NULL
        ORDER BY wh, fgsku_code, month
      `;
      
      const t02Result = await query(t02Query, [uploadBatchId]);
      console.log(`Found ${t02Result.rows.length} T02 records to process (1:1 mapping)`);
      
      if (t02Result.rows.length === 0) {
        console.log('❌ No T02 data found for this upload batch');
        return {
          success: false,
          message: 'No T02 data found for this upload batch. Please calculate T02 first.',
          totalRecords: 0
        };
      }

      // Get demand data for PLT matching
      console.log('📊 Fetching demand data for PLT matching...');
      const demandQuery = `
        SELECT DISTINCT 
          market,
          fgsku_code,
          origin
        FROM processed_demand_data 
        WHERE origin IS NOT NULL 
          AND origin != 'Other'
          AND origin != 'Remove "Other"'
          AND market IS NOT NULL
          AND fgsku_code IS NOT NULL
          AND fgsku_code != 'Old - not to be used'
      `;
      
      const demandResult = await query(demandQuery);
      console.log(`Found ${demandResult.rows.length} demand records for PLT matching`);
      
      // Create a lookup map for demand data: market + fgsku_code -> origin
      const demandLookup = new Map();
      demandResult.rows.forEach(row => {
        const key = `${row.market}|${row.fgsku_code}`;
        demandLookup.set(key, row.origin);
      });
      
      // Transform T02 data to T03 format with proper custom cost logic
      console.log('🔄 Transforming T02 data to T03 format with custom cost logic...');
      const t03Records = [];
      
      for (const t02Row of t02Result.rows) {
        // Skip SKUs with less than 10 digits
        if (!t02Row.fgsku_code || t02Row.fgsku_code.toString().length < 10) {
          continue;
        }
        
        // Use the actual warehouse from T02 data
        const warehouse = t02Row.wh;
        
        // Map warehouse to correct country based on T03 requirements
        let cty;
        switch (warehouse) {
          case 'GFCM':
            cty = 'UAE FS';
            break;
          case 'KFCM':
            cty = 'Kuwait';
            break;
          case 'NFCM':
            cty = 'KSA';
            break;
          case 'X':
            cty = 'X'; // For X warehouse, keep X as country
            break;
          default:
            cty = 'Unknown';
        }
        
        // Get PLT by matching T02 cty (market) + fgsku_code with demand data
        let plt = 'Unknown';
        
        // Try exact match first
        const demandKey = `${t02Row.cty}|${t02Row.fgsku_code}`;
        plt = demandLookup.get(demandKey);
        
        // If not found, try without FS suffix
        if (!plt) {
          const ctyWithoutFS = t02Row.cty.replace(' FS', '');
          const demandKeyWithoutFS = `${ctyWithoutFS}|${t02Row.fgsku_code}`;
          plt = demandLookup.get(demandKeyWithoutFS);
        }
        
        // For WH = X, set PLT = X
        if (warehouse === 'X') {
          plt = 'X';
        }
        
        // Ensure plt is never null or undefined
        if (!plt || plt === 'Unknown') {
          // Set default PLT based on warehouse
          if (warehouse === 'GFCM') {
            plt = 'GFC';
          } else if (warehouse === 'KFCM') {
            plt = 'KFC';
          } else if (warehouse === 'NFCM') {
            plt = 'NFC';
          } else {
            plt = 'Unknown';
          }
        }
        
        // Debug logging for SKU 4001100156
        if (t02Row.fgsku_code === '4001100156' && t03Records.length < 10) {
          console.log(`🔍 T03 Debug: CTY=${t02Row.cty}, WH=${warehouse}, DemandKey=${demandKey}, InitialPLT=${plt}`);
        }
        
        // Convert month from string (e.g., "05") to integer
        const mthNum = parseInt(t02Row.month);
        
        // Enhanced CostPerUnit logic with fallback system
        // 1. Cost per Case = Cost of shipping a full truck load / total cartons transported in truck load
        // 2. Calculate for each Factory + WH + FGSKUCode combination from Freight_storage_costs.xlsx
        // 3. Fallback system for missing data
        // 4. Cost for all X warehouse and factory rows is 0
        // 5. Cost for shipping within the same country is 0
        // 6. Cost for same factory-warehouse shipping is 0
        
        let costPerUnit = 0;
        
        // Rule 4: Cost for all X warehouse and factory rows is 0
        if (warehouse === 'X') {
          costPerUnit = 0;
        } else {
          // Get freight data for enhanced cost calculation
          const freightData = await TransportCostCalculator.loadFreightData();
          
          // Calculate cost using the enhanced TransportCostCalculator
          costPerUnit = TransportCostCalculator.calculateTransportCost(
            cty, // country (cty)
            warehouse, // warehouse (wh)
            t02Row.fgsku_code, // fgsku code
            freightData // processed freight data
          );
        }
        
        // NEW RULE 6: Cost = 0 for same factory-warehouse shipping
        // GFCM -> GFC, KFCM -> KFC, NFCM -> NFC should have cost = 0
        if ((warehouse === 'GFCM' && plt === 'GFC') ||
            (warehouse === 'KFCM' && plt === 'KFC') ||
            (warehouse === 'NFCM' && plt === 'NFC')) {
          costPerUnit = 0;
        }
        
        // Use fgwt_per_unit from T02 (handle null/undefined)
        const fgWtPerUnit = t02Row.fgwt_per_unit != null ? parseFloat(t02Row.fgwt_per_unit) : 0;
        
        // Custom Cost/Unit logic - NEW RULE:
        // Custom Cost/Unit is calculated ONLY when WH = NFCM
        // For all other warehouses (GFCM, KFCM, X), custom cost per unit = 0
        
        const isCustomsRequired = t02Row.customs === 'Yes';
        const country = t02Row.cty;
        
        let customCostPerUnit = 0;
        
        // NEW LOGIC: Only calculate custom cost when warehouse is NFCM
        if (warehouse === 'NFCM') {
          // For NFCM warehouse, calculate custom cost based on PLT
          if (plt === 'GFC') {
            customCostPerUnit = await CustomCostLookup.calculateCustomCostPerUnit(
              t02Row.fgsku_code, 'GFC', costPerUnit, country, isCustomsRequired
            );
          } else if (plt === 'KFC') {
            customCostPerUnit = await CustomCostLookup.calculateCustomCostPerUnit(
              t02Row.fgsku_code, 'KFC', costPerUnit, country, isCustomsRequired
            );
          } else if (plt === 'NFC') {
            customCostPerUnit = 0; // NFC is always 0
          } else {
            // For Unknown PLT with NFCM warehouse, determine PLT and calculate
            plt = 'NFC'; // Default to NFC for NFCM warehouse
            customCostPerUnit = 0; // NFC always 0
          }
        } else {
          // For all other warehouses (GFCM, KFCM, X), custom cost = 0
          customCostPerUnit = 0;
          
          // Update PLT based on warehouse for consistency
          if (warehouse === 'GFCM') {
            plt = 'GFC';
          } else if (warehouse === 'KFCM') {
            plt = 'KFC';
          } else if (warehouse === 'X') {
            plt = 'Unknown';
          }
        }
        
        // Debug logging for warehouse-based custom cost
        if (t02Row.fgsku_code === '4001100156' && t03Records.length < 10) {
          console.log(`🔍 T03 Debug: WH=${warehouse}, PLT=${plt}, CustomCost=${customCostPerUnit}`);
        }
        
        // MaxQty rule: UPDATED LOGIC
        // MaxQty = 0 for:
        // 1. WH = NFCM AND PLT = GFC
        // Otherwise MaxQty = 10^10 (including WH = X)
        let maxQty = 10000000000; // Default value (10^10)
        
        if (warehouse === 'NFCM' && plt === 'GFC') {
          maxQty = 0; // WH = NFCM AND PLT = GFC gets 0
        }
        // WH = X keeps maxQty = 10^10
        
        // Set default values for calculated fields - CLEARED calculated columns
        const qty = 0; // CLEARED - Empty calculated column (default 0)
        const wt = 0; // CLEARED - Empty calculated column  
        const customDuty = 0; // CLEARED - Empty calculated column
        const poscheck = true; // Default validation
        const qtyLteMax = true; // Default validation
        const rowCost = 0; // CLEARED - Empty calculated column
        
        t03Records.push({
          wh: warehouse, // Use actual warehouse from T02
          plt: plt, // Use origin from demand data lookup
          cty: cty, // Country based on warehouse mapping
          fgsku_code: t02Row.fgsku_code, // Use actual FGSKU from T02
          mth_num: mthNum,
          cost_per_unit: costPerUnit, // 0 if WH=X, otherwise transport_cost_per_case from T02
          custom_cost_per_unit: customCostPerUnit, // Calculated using T02 formula
          max_qty: maxQty,
          fg_wt_per_unit: fgWtPerUnit, // Use actual weight from T02
          qty: qty, // CLEARED (default 0)
          wt: wt, // CLEARED
          custom_duty: customDuty, // CLEARED
          poscheck: poscheck,
          qty_lte_max: qtyLteMax,
          row_cost: rowCost, // CLEARED
          upload_batch_id: uploadBatchId
        });
      }
      
      console.log(`Created ${t03Records.length} T03 records from ${t02Result.rows.length} T02 records`);
      
      // Insert T03 records in batches
      console.log('💾 Inserting T03 records...');
      const batchSize = 1000;
      let insertedCount = 0;
      
      for (let i = 0; i < t03Records.length; i += batchSize) {
        const batch = t03Records.slice(i, i + batchSize);
        const result = await T03Data.bulkInsert(batch);
        insertedCount += result.length;
        
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(t03Records.length/batchSize)} (${result.length} records)`);
      }
      
      // Update calculated fields
      console.log('🧮 Updating calculated fields...');
      await T03Data.updateAllCalculatedFields(uploadBatchId);
      
      console.log(`🎉 Successfully generated ${insertedCount} T03 records from T02 data!`);
      
      return {
        success: true,
        message: `Successfully generated ${insertedCount} T03 records from T02 data`,
        totalRecords: insertedCount
      };
      
    } catch (error) {
      console.error('❌ Error generating T03 from T02:', error);
      throw error;
    }
  }

  // Get filtered SKUs based on capacity and opening stock
  static async getFilteredSkus(sourceWorkbooks) {
    try {
      console.log('🔍 Getting filtered SKUs from T01 with capacity > 0...');
      
      // Step 1: Get SKUs from T01 data
      console.log('📊 Step 1: Getting SKUs from T01 data...');
      const t01Skus = await query(`
        SELECT DISTINCT fgsku_code, month 
        FROM t01_data 
        WHERE fgsku_code IS NOT NULL 
        AND fgsku_code != ''
        AND month IS NOT NULL
        AND fgsku_code NOT LIKE '%Old%'
        AND fgsku_code NOT LIKE '%not to be used%'
        ORDER BY fgsku_code, month
      `);
      
      console.log(`Found ${t01Skus.rows.length} SKU-month combinations in T01 data`);
      
      // Step 2: Load capacity data and filter SKUs with capacity > 0
      console.log('\n📊 Step 2: Loading capacity data and filtering SKUs with capacity > 0...');
      const CapacityLookup = require('../models/CapacityLookup');
      const capacityData = await CapacityLookup.loadCapacityData();
      
      // Filter SKUs that have capacity > 0 in at least one factory
      const filteredSkus = [];
      for (const skuRow of t01Skus.rows) {
        const { fgsku_code, month } = skuRow;
        const availableFactories = CapacityLookup.getAvailableFactories(fgsku_code, capacityData);
        
        // Only include SKUs that have capacity > 0 in at least one factory
        if (availableFactories.length > 0) {
          filteredSkus.push({ fgsku_code, month_num: month, availableFactories });
        }
      }
      
      console.log(`After capacity filter: ${filteredSkus.length} SKU-month combinations with capacity > 0`);
      
      return filteredSkus;
    } catch (error) {
      console.error('❌ Error getting filtered SKUs:', error);
      throw error;
    }
  }

  // Create T03 records following the correct business rules
  static async createT03RecordsWithFiltration(filteredSkus, freightData, itemMasterData, capacityData) {
    try {
      const t03Records = [];
      
      // Create lookup maps for faster processing
      const itemMasterMap = new Map();
      itemMasterData.forEach(item => {
        itemMasterMap.set(item.fg_sku_code, item);
      });



      // Step 1: For each SKU-month with capacity > 0, create GFCM, KFCM, NFCM records
      for (const skuRow of filteredSkus) {
        const { fgsku_code, month_num, availableFactories } = skuRow;
        
        // For each SKU-month, create 3 warehouse records in T02 order: GFCM, KFCM, NFCM
        const warehouses = [
          { wh: 'GFCM', cty: 'UAE FS' },
          { wh: 'KFCM', cty: 'Kuwait' },
          { wh: 'NFCM', cty: 'KSA' }
        ];
        
        for (const warehouse of warehouses) {
          const { wh, cty } = warehouse;
          
          // Get item master data for weight
          const itemMaster = itemMasterMap.get(fgsku_code);
          const fgWtPerUnit = itemMaster?.weight || 1;
          
          // Calculate cost per unit - will be updated from T02 data later
          let costPerUnit = 0;
          
          // Custom cost per unit logic
          let customCostPerUnit = 0;
          if (wh === 'NFCM' && cty === 'KSA') {
            // Only NFCM warehouse in KSA has custom cost calculation
            // Custom Duty = [ Average 12 month RM price for that FG SKU + freight cost + factory overheads ] x (1 + Markup%) x Custom Duty %
            const CustomCostLookup = require('../models/CustomCostLookup');
            
            if (availableFactories.includes('GFC')) {
              customCostPerUnit = await CustomCostLookup.calculateCustomCostPerUnit(
                fgsku_code, 'GFC', costPerUnit, cty, false
              );
            } else if (availableFactories.includes('KFC')) {
              customCostPerUnit = await CustomCostLookup.calculateCustomCostPerUnit(
                fgsku_code, 'KFC', costPerUnit, cty, false
              );
            } else {
              customCostPerUnit = 0; // NFC always 0
            }
          }
          
          // Max quantity logic
          let maxQty = 10000000000; // Default value
          if (wh === 'NFCM' && availableFactories.includes('GFC')) {
            maxQty = 0; // WH = NFCM AND PLT = GFC gets 0
          }
          
          t03Records.push({
            wh: wh,
            plt: availableFactories[0] || 'GFC', // Use first available factory as PLT
            cty: cty,
            fgsku_code: fgsku_code,
            mth_num: month_num,
            cost_per_unit: costPerUnit,
            custom_cost_per_unit: customCostPerUnit,
            max_qty: maxQty,
            fg_wt_per_unit: fgWtPerUnit,
            qty: 0,
            wt: 0,
            custom_duty: 0,
            poscheck: true,
            qty_lte_max: true,
            row_cost: 0,
            upload_batch_id: 'c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7' // Frontend-expected batch ID
          });
        }
      }
      
      // Step 2: For all unique SKU codes from T01, add X warehouse records for each month (at the end)
      // Get all unique SKUs from T01, not just the filtered ones
      const { query } = require('../config/database');
      const t01SkusResult = await query(`
        SELECT DISTINCT fgsku_code
        FROM t01_data
        WHERE fgsku_code IS NOT NULL
        AND fgsku_code != ''
        AND fgsku_code NOT LIKE '%Old%'
        AND fgsku_code NOT LIKE '%not to be used%'
        ORDER BY fgsku_code
      `);
      const uniqueSkus = t01SkusResult.rows.map(row => row.fgsku_code);
      for (const fgsku_code of uniqueSkus) {
        for (let month_num = 5; month_num <= 16; month_num++) {
          // Get item master data for weight
          const itemMaster = itemMasterMap.get(fgsku_code);
          const fgWtPerUnit = itemMaster?.weight || 1;
          
          t03Records.push({
            wh: 'X',
            plt: 'X',
            cty: null,
            fgsku_code: fgsku_code,
            mth_num: month_num,
            cost_per_unit: 0,
            custom_cost_per_unit: 0,
            max_qty: 10000000000,
            fg_wt_per_unit: fgWtPerUnit,
            qty: 0,
            wt: 0,
            custom_duty: 0,
            poscheck: true,
            qty_lte_max: true,
            row_cost: 0,
            upload_batch_id: 'c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7' // Frontend-expected batch ID
          });
        }
      }
      
      // Step 3: Sort records to ensure consistent T02-like ordering
      // Order: GFCM first, then KFCM, then NFCM, then X
      t03Records.sort((a, b) => {
        // First sort by warehouse in T02 order: GFCM, KFCM, NFCM, X
        const warehouseOrder = { 'GFCM': 1, 'KFCM': 2, 'NFCM': 3, 'X': 4 };
        if (warehouseOrder[a.wh] !== warehouseOrder[b.wh]) {
          return warehouseOrder[a.wh] - warehouseOrder[b.wh];
        }
        // Then sort by SKU
        if (a.fgsku_code !== b.fgsku_code) {
          return a.fgsku_code.localeCompare(b.fgsku_code);
        }
        // Then sort by month
        return a.mth_num - b.mth_num;
      });
      
      console.log(`✅ Created ${t03Records.length} T03 records following correct business rules`);
      return t03Records;
    } catch (error) {
      console.error('Error creating T03 records with correct business rules:', error);
      throw error;
    }
  }

  // Update cost per unit from T02 data
  static async updateCostPerUnitFromT02() {
    try {
      console.log('🔄 Updating T03 cost per unit from T02 transport cost per case...');
      
      // Get T02 data with transport costs
      const t02Query = `
        SELECT 
          wh,
          fgsku_code,
          month,
          transport_cost_per_case
        FROM t02_data 
        WHERE transport_cost_per_case IS NOT NULL
          AND transport_cost_per_case > 0
        ORDER BY wh, fgsku_code, month
      `;
      
      const t02Result = await query(t02Query);
      console.log(`Found ${t02Result.rows.length} T02 records with transport costs`);
      
      // Create a lookup map for T02 costs: wh + fgsku_code + month -> transport_cost_per_case
      const t02CostMap = new Map();
      t02Result.rows.forEach(row => {
        const key = `${row.wh}_${row.fgsku_code}_${row.month}`;
        t02CostMap.set(key, parseFloat(row.transport_cost_per_case));
      });
      
      // Update T03 records with T02 costs
      const updateQuery = `
        UPDATE t03_primdist 
        SET 
          cost_per_unit = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE wh = $2 
          AND fgsku_code = $3 
          AND mth_num = $4
          AND wh != 'X'
      `;
      
      let updatedCount = 0;
      for (const [key, cost] of t02CostMap) {
        const [wh, fgsku_code, month] = key.split('_');
        const monthNum = parseInt(month);
        
        // Apply same-country shipping rule: cost = 0 for same country
        let finalCost = cost;
        if ((wh === 'GFCM' && monthNum >= 5 && monthNum <= 16) ||
            (wh === 'KFCM' && monthNum >= 5 && monthNum <= 16) ||
            (wh === 'NFCM' && monthNum >= 5 && monthNum <= 16)) {
          finalCost = 0;
        }
        
        await query(updateQuery, [finalCost, wh, fgsku_code, monthNum]);
        updatedCount++;
      }
      
      console.log(`✅ Updated cost per unit for ${updatedCount} T03 records from T02 data`);
      return updatedCount;
    } catch (error) {
      console.error('❌ Error updating cost per unit from T02:', error);
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
      const { upload_batch_id } = req.query;
      
      const t03Data = await T03Data.getBySKU(skuCode, upload_batch_id);
      
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
      const { upload_batch_id } = req.query;
      
      const t03Data = await T03Data.getByFactory(factory, upload_batch_id);
      
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
      const { upload_batch_id } = req.query;
      
      const t03Data = await T03Data.getByWarehouse(warehouse, upload_batch_id);
      
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

  // Delete T03 data by upload batch
  static async deleteT03Data(req, res) {
    try {
      const { upload_batch_id } = req.params;
      
      const deletedCount = await T03Data.deleteByUploadBatch(upload_batch_id);
      
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

  // Recalculate T03 data using formulas
  static async recalculateT03Data(req, res) {
    try {
      const { upload_batch_id } = req.query;
      
      console.log('🔄 Starting T03 recalculation with formulas...');
      
      // First, update custom cost per unit based on warehouse rule
      console.log('🔄 Updating custom cost per unit based on warehouse rule...');
      const customCostUpdated = await T03Data.updateCustomCostPerUnit(upload_batch_id);
      
      // Second, update max quantity based on warehouse and factory rule
      console.log('🔄 Updating max quantity based on warehouse and factory rule...');
      const maxQtyUpdated = await T03Data.updateMaxQuantity(upload_batch_id);
      
      // Third, update cost per unit with enhanced fallback system
      console.log('🔄 Updating cost per unit with enhanced fallback system...');
      const costPerUnitUpdated = await T03Data.updateCostPerUnit(upload_batch_id);
      
      // Then update calculated fields with formulas
      const updatedCount = await T03Data.updateCalculatedFieldsWithFormulas(upload_batch_id);
      
      res.json({
        success: true,
        message: `Recalculated formulas for ${updatedCount} T03 records, updated custom cost for ${customCostUpdated} records, updated max quantity for ${maxQtyUpdated} records, and noted cost per unit enhancement for next generation`,
        updatedCount: updatedCount,
        customCostUpdated: customCostUpdated,
        maxQtyUpdated: maxQtyUpdated,
        costPerUnitUpdated: costPerUnitUpdated
      });
    } catch (error) {
      console.error('Error recalculating T03 data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to recalculate T03 data',
        details: error.message
      });
    }
  }

  // Get available upload batches from T03 data
  static async getUploadBatches(req, res) {
    try {
      const uploadBatches = await T03Data.getUploadBatches();
      res.json({
        success: true,
        data: uploadBatches
      });
    } catch (error) {
      console.error('Error getting T03 upload batches:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting upload batches',
        error: error.message
      });
    }
  }

  // Export T03 data to Excel
  static async exportToExcel(req, res) {
    try {
      const { uploadBatchId } = req.query;
      
      console.log('📊 Exporting T03 data to Excel...');
      console.log(`Parameters: uploadBatchId=${uploadBatchId}`);
      
      if (!uploadBatchId) {
        return res.status(400).json({
          success: false,
          message: 'uploadBatchId is required'
        });
      }

      // Get ALL T03 data for the upload batch (no pagination)
      const t03DataQuery = `
        SELECT 
          wh, plt, fgsku_code, mth_num, cost_per_unit, custom_cost_per_unit,
          max_qty, fg_wt_per_unit, qty, wt, custom_duty, poscheck, qty_lte_max, row_cost
        FROM t03_primdist
        WHERE upload_batch_id = $1
        ORDER BY wh, fgsku_code, mth_num
      `;
      
      const t03DataResult = await query(t03DataQuery, [uploadBatchId]);
      const t03Data = t03DataResult.rows;
      
      if (!t03Data || t03Data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No T03 data found for export'
        });
      }

      console.log(`Found ${t03Data.length} records to export`);

      // Create Excel workbook
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('T03 Data');

      // Define headers
      const headers = [
        'WH', 'PLT', 'FGSKU Code', 'Month', 'Cost Per Unit', 
        'Custom Cost/Unit', 'Max Qty', 'FG Wt Per Unit', 'Qty', 
        'Wt', 'Custom Duty', 'Pos Check', 'Qty≤Max', 'Row Cost'
      ];

      // Add headers
      worksheet.addRow(headers);

      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data rows in batches to avoid memory issues
      const batchSize = 1000;
      console.log(`Processing ${t03Data.length} records in batches of ${batchSize}...`);
      
      for (let i = 0; i < t03Data.length; i += batchSize) {
        const batch = t03Data.slice(i, i + batchSize);
        
        batch.forEach((record) => {
          const row = [
            record.wh || '',
            record.plt || '',
            record.fgsku_code || '',
            record.mth_num || 0,
            parseFloat(record.cost_per_unit) || 0,
            parseFloat(record.custom_cost_per_unit) || 0,
            parseFloat(record.max_qty) || 0,
            parseFloat(record.fg_wt_per_unit) || 0,
            parseFloat(record.qty) || 0,
            parseFloat(record.wt) || 0,
            parseFloat(record.custom_duty) || 0,
            record.poscheck ? 'TRUE' : 'FALSE',
            record.qty_lte_max ? 'TRUE' : 'FALSE',
            parseFloat(record.row_cost) || 0
          ];
          
          worksheet.addRow(row);
        });
        
        if (i % 5000 === 0) {
          console.log(`Processed ${i + batch.length} of ${t03Data.length} records...`);
        }
      }

      // Set column widths (simplified for large datasets)
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      // Style headers only (skip borders for large datasets to improve performance)
      const headerRow2 = worksheet.getRow(1);
      headerRow2.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      console.log('Writing Excel file to buffer...');
      
      // Write to buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Set response headers
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `T03_Export_${timestamp}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      // Send buffer
      res.send(buffer);
      
      console.log(`✅ Exported ${t03Data.length} T03 records to Excel: ${filename} (${buffer.length} bytes)`);
      
    } catch (error) {
      console.error('❌ Error exporting T03 to Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting to Excel',
        error: error.message
      });
    }
  }

  // Export T03 data to CSV
  static async exportToCSV(req, res) {
    try {
      const { uploadBatchId } = req.query;
      
      console.log('📊 Exporting T03 data to CSV...');
      console.log(`Parameters: uploadBatchId=${uploadBatchId}`);
      
      if (!uploadBatchId) {
        return res.status(400).json({
          success: false,
          message: 'uploadBatchId is required'
        });
      }

      // Get ALL T03 data for the upload batch
      const t03DataQuery = `
        SELECT 
          wh, plt, fgsku_code, mth_num, cost_per_unit, custom_cost_per_unit,
          max_qty, fg_wt_per_unit, qty, wt, custom_duty, poscheck, qty_lte_max, row_cost
        FROM t03_primdist
        WHERE upload_batch_id = $1
        ORDER BY wh, fgsku_code, mth_num
      `;
      
      const t03DataResult = await query(t03DataQuery, [uploadBatchId]);
      const t03Data = t03DataResult.rows;
      
      if (!t03Data || t03Data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No T03 data found for export'
        });
      }

      console.log(`Found ${t03Data.length} records to export`);

      // Define headers
      const headers = [
        'WH', 'PLT', 'FGSKU Code', 'Month', 'Cost Per Unit', 
        'Custom Cost/Unit', 'Max Qty', 'FG Wt Per Unit', 'Qty', 
        'Wt', 'Custom Duty', 'Pos Check', 'Qty≤Max', 'Row Cost'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';

      // Add data rows
      t03Data.forEach((record) => {
        const row = [
          `"${record.wh || ''}"`,
          `"${record.plt || ''}"`,
          `"${record.fgsku_code || ''}"`,
          record.mth_num || 0,
          parseFloat(record.cost_per_unit) || 0,
          parseFloat(record.custom_cost_per_unit) || 0,
          parseFloat(record.max_qty) || 0,
          parseFloat(record.fg_wt_per_unit) || 0,
          parseFloat(record.qty) || 0,
          parseFloat(record.wt) || 0,
          parseFloat(record.custom_duty) || 0,
          record.poscheck ? 'TRUE' : 'FALSE',
          record.qty_lte_max ? 'TRUE' : 'FALSE',
          parseFloat(record.row_cost) || 0
        ];
        
        csvContent += row.join(',') + '\n';
      });

      // Set response headers
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `T03_Export_${timestamp}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
      res.setHeader('Cache-Control', 'no-cache');

      // Send CSV content
      res.send(csvContent);
      
      console.log(`✅ Exported ${t03Data.length} T03 records to CSV: ${filename}`);
      
    } catch (error) {
      console.error('❌ Error exporting T03 to CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting to CSV',
        error: error.message
      });
    }
  }
}

module.exports = T03Controller; 