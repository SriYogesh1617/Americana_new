const { query } = require('../config/database');

class ItemMasterLookup {
  
  /**
   * Load and combine item master data from all three factories (GFC, KFC, NFC)
   */
  static async loadCombinedItemMasterData() {
    try {
      console.log('📦 Loading combined item master data from GFC, KFC, and NFC...');
      
      // Sheet IDs for the three item master workbooks
      const itemMasterSheets = [
        { factory: 'GFC', sheetId: '2b25b53a-03f9-4cc0-8b71-d017da4f06c3' },
        { factory: 'KFC', sheetId: 'a38853cb-70f8-4d73-87df-fb0e9584ef74' },
        { factory: 'NFC', sheetId: '98277e97-5d3c-4f31-a175-6be3e879e152' }
      ];
      
      const combinedItemMaster = new Map(); // SKU -> { weight, factory, description }
      let totalRecords = 0;
      
      for (const sheet of itemMasterSheets) {
        console.log(`📊 Processing ${sheet.factory} item master data...`);
        
        // Load item master data for this factory
        const itemData = await query(`
          SELECT 
            sd_item.cell_value as item_code,
            sd_weight.cell_value as unit_weight,
            sd_desc.cell_value as description,
            sd_status.cell_value as item_status
          FROM sheet_data sd_item
          LEFT JOIN sheet_data sd_weight ON (
            sd_item.worksheet_id = sd_weight.worksheet_id 
            AND sd_item.row_index = sd_weight.row_index 
            AND sd_weight.column_index = 12
          )
          LEFT JOIN sheet_data sd_desc ON (
            sd_item.worksheet_id = sd_desc.worksheet_id 
            AND sd_item.row_index = sd_desc.row_index 
            AND sd_desc.column_index = 6
          )
          LEFT JOIN sheet_data sd_status ON (
            sd_item.worksheet_id = sd_status.worksheet_id 
            AND sd_item.row_index = sd_status.row_index 
            AND sd_status.column_index = 9
          )
          WHERE sd_item.worksheet_id = $1
            AND sd_item.column_index = 4
            AND sd_item.row_index > 0
            AND sd_item.cell_value IS NOT NULL
            AND sd_item.cell_value != ''
        `, [sheet.sheetId]);
        
        console.log(`  Found ${itemData.rows.length} records in ${sheet.factory} item master`);
        
        let validRecords = 0;
        for (const record of itemData.rows) {
          const { item_code, unit_weight, description, item_status } = record;
          
          // Skip inactive items
          if (item_status && item_status.toLowerCase().includes('inactive')) {
            continue;
          }
          
          // Parse unit weight
          if (unit_weight && unit_weight !== '' && unit_weight !== 'Missing') {
            const weightValue = parseFloat(unit_weight);
            
            if (!isNaN(weightValue) && weightValue > 0) {
              // Store in lookup map - if duplicate SKU, prefer the one with weight data
              const existingRecord = combinedItemMaster.get(item_code);
              
              if (!existingRecord || !existingRecord.weight) {
                combinedItemMaster.set(item_code, {
                  weight: weightValue,
                  factory: sheet.factory,
                  description: description || '',
                  item_status: item_status || ''
                });
                validRecords++;
              }
            }
          }
        }
        
        console.log(`  Added ${validRecords} valid records from ${sheet.factory}`);
        totalRecords += validRecords;
      }
      
      console.log(`✅ Combined item master lookup created with ${combinedItemMaster.size} unique SKUs from ${totalRecords} total records`);
      
      // Show sample data
      const sampleEntries = Array.from(combinedItemMaster.entries()).slice(0, 5);
      console.log('📊 Sample combined item master entries:');
      sampleEntries.forEach(([sku, data]) => {
        console.log(`  ${sku} (${data.factory}): ${data.weight} - ${data.description.substring(0, 50)}...`);
      });
      
      return combinedItemMaster;
      
    } catch (error) {
      console.error('Error loading combined item master data:', error);
      return new Map();
    }
  }
  
  /**
   * Get FGWt per unit for a SKU from the combined item master data
   * @param {string} skuCode - The SKU code to lookup
   * @param {Map} itemMasterLookup - The combined item master lookup map
   * @returns {number} Unit weight or 0 if not found
   */
  static getFGWtPerUnit(skuCode, itemMasterLookup) {
    const itemData = itemMasterLookup.get(skuCode);
    return itemData ? itemData.weight : 0;
  }
  
  /**
   * Get item details for a SKU from the combined item master data
   * @param {string} skuCode - The SKU code to lookup
   * @param {Map} itemMasterLookup - The combined item master lookup map
   * @returns {Object|null} Item details or null if not found
   */
  static getItemDetails(skuCode, itemMasterLookup) {
    return itemMasterLookup.get(skuCode) || null;
  }
  
  /**
   * Get statistics about the combined item master data
   * @param {Map} itemMasterLookup - The combined item master lookup map
   * @returns {Object} Statistics object
   */
  static getStatistics(itemMasterLookup) {
    const factoryCounts = { GFC: 0, KFC: 0, NFC: 0 };
    const weightRanges = { min: Infinity, max: 0, total: 0 };
    let validWeightCount = 0;
    
    for (const [sku, data] of itemMasterLookup) {
      factoryCounts[data.factory]++;
      
      if (data.weight > 0) {
        validWeightCount++;
        weightRanges.min = Math.min(weightRanges.min, data.weight);
        weightRanges.max = Math.max(weightRanges.max, data.weight);
        weightRanges.total += data.weight;
      }
    }
    
    return {
      totalSKUs: itemMasterLookup.size,
      factoryBreakdown: factoryCounts,
      validWeightCount,
      averageWeight: validWeightCount > 0 ? weightRanges.total / validWeightCount : 0,
      minWeight: weightRanges.min === Infinity ? 0 : weightRanges.min,
      maxWeight: weightRanges.max
    };
  }
  
  /**
   * Search for SKUs by partial match
   * @param {string} searchTerm - Partial SKU or description to search for
   * @param {Map} itemMasterLookup - The combined item master lookup map
   * @param {number} limit - Maximum number of results to return
   * @returns {Array} Array of matching SKUs and their details
   */
  static searchSKUs(searchTerm, itemMasterLookup, limit = 10) {
    const results = [];
    const searchLower = searchTerm.toLowerCase();
    
    for (const [sku, data] of itemMasterLookup) {
      if (sku.toLowerCase().includes(searchLower) || 
          data.description.toLowerCase().includes(searchLower)) {
        results.push({ sku, ...data });
        
        if (results.length >= limit) break;
      }
    }
    
    return results;
  }
  
  /**
   * Get combined item master data as array for CSV export
   * @returns {Array} Array of item master records with headers
   */
  static async getCombinedItemMasterAsArray() {
    try {
      console.log('📦 Loading combined item master data for CSV export...');
      
      // Sheet IDs for the three item master workbooks
      const itemMasterSheets = [
        { factory: 'GFC', sheetId: '2b25b53a-03f9-4cc0-8b71-d017da4f06c3' },
        { factory: 'KFC', sheetId: 'a38853cb-70f8-4d73-87df-fb0e9584ef74' },
        { factory: 'NFC', sheetId: '98277e97-5d3c-4f31-a175-6be3e879e152' }
      ];
      
      const allRecords = [];
      let totalRecords = 0;
      
      for (const sheet of itemMasterSheets) {
        console.log(`📊 Processing ${sheet.factory} item master data...`);
        
        // Load item master data for this factory
        const itemData = await query(`
          SELECT 
            sd_item.cell_value as item_code,
            sd_weight.cell_value as unit_weight,
            sd_desc.cell_value as description,
            sd_status.cell_value as item_status
          FROM sheet_data sd_item
          LEFT JOIN sheet_data sd_weight ON (
            sd_item.worksheet_id = sd_weight.worksheet_id 
            AND sd_item.row_index = sd_weight.row_index 
            AND sd_weight.column_index = 12
          )
          LEFT JOIN sheet_data sd_desc ON (
            sd_item.worksheet_id = sd_desc.worksheet_id 
            AND sd_item.row_index = sd_desc.row_index 
            AND sd_desc.column_index = 6
          )
          LEFT JOIN sheet_data sd_status ON (
            sd_item.worksheet_id = sd_status.worksheet_id 
            AND sd_item.row_index = sd_status.row_index 
            AND sd_status.column_index = 9
          )
          WHERE sd_item.worksheet_id = $1
            AND sd_item.column_index = 4
            AND sd_item.row_index > 0
            AND sd_item.cell_value IS NOT NULL
            AND sd_item.cell_value != ''
        `, [sheet.sheetId]);
        
        console.log(`  Found ${itemData.rows.length} records in ${sheet.factory} item master`);
        
        for (const record of itemData.rows) {
          const { item_code, unit_weight, description, item_status } = record;
          
          // Parse unit weight
          let weightValue = 0;
          if (unit_weight && unit_weight !== '' && unit_weight !== 'Missing') {
            weightValue = parseFloat(unit_weight) || 0;
          }
          
          // Add record to array
          allRecords.push({
            item_code: item_code || '',
            unit_weight: weightValue,
            description: description || '',
            item_status: item_status || '',
            factory: sheet.factory
          });
          
          totalRecords++;
        }
      }
      
      console.log(`✅ Combined item master data prepared with ${totalRecords} total records`);
      
      return allRecords;
      
    } catch (error) {
      console.error('Error loading combined item master data for CSV:', error);
      return [];
    }
  }
}

module.exports = ItemMasterLookup; 