const { query } = require('../config/database');

class CapacityLookup {
  
  /**
   * Load capacity data from the Capacity workbook
   * @returns {Promise<Map>} Map with SKU code as key and factory capacities as value
   */
  static async loadCapacityData() {
    try {
      console.log('📊 Loading capacity data from Capacity workbook...');
      
      const capacityData = await query(`
        SELECT 
          sd.row_index,
          sd.column_index,
          sd.cell_value
        FROM sheet_data sd
        JOIN worksheets ws ON sd.worksheet_id = ws.id
        JOIN workbooks w ON ws.workbook_id = w.id
        WHERE w.workbook_name = 'Capacity' AND ws.sheet_name = 'Item master'
        ORDER BY sd.row_index, sd.column_index
      `);
      
      console.log(`📊 Loaded ${capacityData.rows.length} capacity records`);
      
      // Process capacity data
      const capacityMap = new Map();
      const capacityRows = new Map();
      
      // Group by row index
      for (const cell of capacityData.rows) {
        if (!capacityRows.has(cell.row_index)) {
          capacityRows.set(cell.row_index, {});
        }
        capacityRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
      }
      
      // Process each row
      for (const [rowIndex, rowData] of capacityRows) {
        if (rowIndex < 2) continue; // Skip header rows
        
        const skuCode = rowData[1]; // Column 1: SKU code
        const gfcCapacity = parseFloat(rowData[42]) || 0; // Column 42: GFC productivity (KG/Hrs)
        const kfcCapacity = parseFloat(rowData[46]) || 0; // Column 46: KFC productivity (KG/Hrs)
        const nfcChickenCapacity = parseFloat(rowData[21]) || 0; // Column 21: NFC Chicken factory productivity (KG/Hrs)
        const nfcMeatCapacity = parseFloat(rowData[28]) || 0; // Column 28: NFC meat factory productivity (KG/Hrs)
        
        if (skuCode) {
          const capacities = {
            GFC: gfcCapacity,
            KFC: kfcCapacity,
            NFC: nfcChickenCapacity + nfcMeatCapacity // Combine both NFC capacities
          };
          
          capacityMap.set(skuCode.trim(), capacities);
        }
      }
      
      console.log(`✅ Processed capacity data for ${capacityMap.size} SKUs`);
      return capacityMap;
      
    } catch (error) {
      console.error('Error loading capacity data:', error);
      return new Map();
    }
  }
  
  /**
   * Get available factories for a SKU based on capacity > 0
   * @param {string} skuCode - SKU code
   * @param {Map} capacityData - Capacity data map
   * @returns {Array} Array of factory codes that have capacity > 0
   */
  static getAvailableFactories(skuCode, capacityData) {
    const capacities = capacityData.get(skuCode);
    if (!capacities) {
      return []; // No capacity data found
    }
    
    const availableFactories = [];
    
    if (capacities.GFC > 0) {
      availableFactories.push('GFC');
    }
    if (capacities.KFC > 0) {
      availableFactories.push('KFC');
    }
    if (capacities.NFC > 0) {
      availableFactories.push('NFC');
    }
    
    return availableFactories;
  }
  
  /**
   * Get the best factory for a SKU based on capacity
   * @param {string} skuCode - SKU code
   * @param {Map} capacityData - Capacity data map
   * @returns {string} Best factory code or null if no capacity
   */
  static getBestFactory(skuCode, capacityData) {
    const capacities = capacityData.get(skuCode);
    if (!capacities) {
      return null; // No capacity data found
    }
    
    // Find factory with highest capacity
    let bestFactory = null;
    let maxCapacity = 0;
    
    if (capacities.GFC > maxCapacity) {
      maxCapacity = capacities.GFC;
      bestFactory = 'GFC';
    }
    if (capacities.KFC > maxCapacity) {
      maxCapacity = capacities.KFC;
      bestFactory = 'KFC';
    }
    if (capacities.NFC > maxCapacity) {
      maxCapacity = capacities.NFC;
      bestFactory = 'NFC';
    }
    
    return bestFactory;
  }
  
  /**
   * Get capacity statistics for debugging
   * @param {Map} capacityData - Capacity data map
   * @returns {Object} Statistics about capacity data
   */
  static getCapacityStatistics(capacityData) {
    let totalSkus = 0;
    let skusWithGFC = 0;
    let skusWithKFC = 0;
    let skusWithNFC = 0;
    let skusWithMultipleFactories = 0;
    
    for (const [skuCode, capacities] of capacityData) {
      totalSkus++;
      
      let factoryCount = 0;
      if (capacities.GFC > 0) {
        skusWithGFC++;
        factoryCount++;
      }
      if (capacities.KFC > 0) {
        skusWithKFC++;
        factoryCount++;
      }
      if (capacities.NFC > 0) {
        skusWithNFC++;
        factoryCount++;
      }
      
      if (factoryCount > 1) {
        skusWithMultipleFactories++;
      }
    }
    
    return {
      totalSkus,
      skusWithGFC,
      skusWithKFC,
      skusWithNFC,
      skusWithMultipleFactories
    };
  }
}

module.exports = CapacityLookup; 