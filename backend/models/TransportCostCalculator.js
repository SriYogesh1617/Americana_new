const { query } = require('../config/database');

class TransportCostCalculator {
  
  /**
   * Load and process freight data from FreightRawData sheet
   * Implements the enhanced transport cost calculation with 3-tier fallback system
   */
  static async loadFreightData() {
    try {
      console.log('🚛 Loading freight data from FreightRawData sheet...');
      
      // Load freight data from the specific FreightRawData sheet
      const freightData = await query(`
        SELECT 
          sd_fg.cell_value as fg_code,
          sd_origin.cell_value as origin,
          sd_dest.cell_value as destination,
          sd_load.cell_value as truck_load,
          sd_freight.cell_value as truck_freight
        FROM sheet_data sd_fg
        JOIN sheet_data sd_origin ON sd_fg.worksheet_id = sd_origin.worksheet_id AND sd_fg.row_index = sd_origin.row_index AND sd_origin.column_index = 4
        JOIN sheet_data sd_dest ON sd_fg.worksheet_id = sd_dest.worksheet_id AND sd_fg.row_index = sd_dest.row_index AND sd_dest.column_index = 5
        JOIN sheet_data sd_load ON sd_fg.worksheet_id = sd_load.worksheet_id AND sd_fg.row_index = sd_load.row_index AND sd_load.column_index = 6
        JOIN sheet_data sd_freight ON sd_fg.worksheet_id = sd_freight.worksheet_id AND sd_fg.row_index = sd_freight.row_index AND sd_freight.column_index = 7
        WHERE sd_fg.worksheet_id = '337ef349-310d-4369-b009-2dc41c11953b'
        AND sd_fg.column_index = 1
        AND sd_fg.row_index > 3
        AND sd_fg.cell_value IS NOT NULL
        AND sd_fg.cell_value != ''
      `);
      
      console.log(`📊 Loaded ${freightData.rows.length} freight records from FreightRawData`);
      
      // Process data into lookup structures
      const result = this.processFreightData(freightData.rows);
      console.log(`✅ Processed freight data with ${result.specificCosts.size} specific costs and ${result.fallbackStructure.originDestinationAvg.size} origin-destination averages`);
      
      return result;
      
    } catch (error) {
      console.error('Error loading freight data:', error);
      return {
        specificCosts: new Map(),
        fallbackStructure: {
          originDestinationAvg: new Map(),
          destinationAvg: new Map(),
          maxDestinationAvg: 0
        }
      };
    }
  }
  
  /**
   * Process freight data according to the specified conditions
   * 1. Cost per Case = Truck Freight / Truck Load
   * 2. Create CTY + WH + FGSKUCode specific lookups
   * 3. Calculate fallback averages
   */
  static processFreightData(freightRecords) {
    const specificCosts = new Map(); // CTY_WH_FGSKU -> cost
    const originDestinationCosts = new Map(); // Origin_Destination -> [costs]
    const destinationCosts = new Map(); // Destination -> [costs]
    
    console.log('📊 Processing freight records for transport cost calculation...');
    
    for (const record of freightRecords) {
      const { fg_code, origin, destination, truck_load, truck_freight } = record;
      
      // Skip records with missing or invalid data
      if (!fg_code || !origin || !destination || !truck_load || !truck_freight ||
          truck_load === 'Missing' || truck_freight === 'Missing' ||
          truck_load === '' || truck_freight === '') {
        continue;
      }
      
      // Calculate cost per case: Truck Freight / Truck Load
      const freightValue = parseFloat(truck_freight);
      const loadValue = parseFloat(truck_load);
      
      if (isNaN(freightValue) || isNaN(loadValue) || loadValue === 0) {
        continue;
      }
      
      const costPerCase = freightValue / loadValue;
      
      // Map origin to warehouse codes for consistency
      let warehouseCode = origin;
      if (origin === 'NFC') warehouseCode = 'NFCM';
      if (origin === 'GFC') warehouseCode = 'GFCM';
      if (origin === 'KFC') warehouseCode = 'KFCM';
      
      // Map destination to standard country codes
      let countryCode = destination;
      if (destination === 'Saudi Arabia') countryCode = 'KSA';
      if (destination === 'United Arab Emirates') countryCode = 'UAE';
      
      // Create specific lookup key: CTY + WH + FGSKUCode
      const specificKey = `${countryCode}_${warehouseCode}_${fg_code}`;
      specificCosts.set(specificKey, costPerCase);
      
      // Collect data for fallback calculations
      // Fallback 1: Origin-Destination combination
      const odKey = `${origin}_${countryCode}`;
      if (!originDestinationCosts.has(odKey)) {
        originDestinationCosts.set(odKey, []);
      }
      originDestinationCosts.get(odKey).push(costPerCase);
      
      // Fallback 2: Destination only
      if (!destinationCosts.has(countryCode)) {
        destinationCosts.set(countryCode, []);
      }
      destinationCosts.get(countryCode).push(costPerCase);
      
      // Debug first few records
      if (specificCosts.size <= 5) {
        console.log(`  Added: ${specificKey} -> ${costPerCase.toFixed(4)} (${truck_freight}/${truck_load})`);
      }
    }
    
    // Calculate averages for fallbacks
    const originDestinationAvg = new Map();
    const destinationAvg = new Map();
    const allDestinationAvgs = [];
    
    // Fallback 1: Average for origin-destination combinations
    for (const [odKey, costs] of originDestinationCosts) {
      const average = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
      originDestinationAvg.set(odKey, average);
    }
    
    // Fallback 2: Average for each destination
    for (const [destination, costs] of destinationCosts) {
      const average = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
      destinationAvg.set(destination, average);
      allDestinationAvgs.push(average);
    }
    
    // Fallback 3: Maximum of all destination averages
    const maxDestinationAvg = allDestinationAvgs.length > 0 ? Math.max(...allDestinationAvgs) : 0;
    
    console.log(`📈 Calculated averages:`);
    console.log(`  - Origin-Destination combinations: ${originDestinationAvg.size}`);
    console.log(`  - Destination averages: ${destinationAvg.size}`);
    console.log(`  - Max destination average: ${maxDestinationAvg.toFixed(4)}`);
    
    return {
      specificCosts,
      fallbackStructure: {
        originDestinationAvg,
        destinationAvg,
        maxDestinationAvg
      }
    };
  }
  
  /**
   * Calculate transport cost with enhanced fallback system
   * 
   * @param {string} cty - Country code
   * @param {string} wh - Warehouse code (GFCM, KFCM, NFCM, X)
   * @param {string} fgskuCode - FG SKU code
   * @param {Object} freightData - Processed freight data structure
   * @returns {number} Transport cost per case
   */
  static calculateTransportCost(cty, wh, fgskuCode, freightData) {
    // Rule: For all combinations to/from factory X, keep the cost as 0
    if (wh === 'X') {
      return 0;
    }
    
    // Rule: Transport cost should be 0 for shipping within the same country
    // This rule is handled in the T03 generation logic, not here
    // The TransportCostCalculator should only handle the fallback logic
    
    const { specificCosts, fallbackStructure } = freightData;
    
    // Map T03 country codes to freight data country codes
    let mappedCty = cty;
    if (cty === 'UAE FS') mappedCty = 'UAE';
    if (cty === 'KSA') mappedCty = 'KSA';
    if (cty === 'Kuwait') mappedCty = 'Kuwait';
    
    // Rule 1 & 2: Look for specific CTY + WH + FGSKUCode combination
    const specificKey = `${mappedCty}_${wh}_${fgskuCode}`;
    let transportCost = specificCosts.get(specificKey);
    
    if (transportCost !== undefined) {
      return transportCost;
    }
    
    // Rule 3: Enhanced Fallback System
    
    // Fallback 1: Average transport cost for origin-destination combination
    const origin = wh.replace('M', ''); // GFCM -> GFC, KFCM -> KFC, NFCM -> NFC
    const odKey = `${origin}_${mappedCty}`;
    transportCost = fallbackStructure.originDestinationAvg.get(odKey);
    
    if (transportCost !== undefined) {
      return transportCost;
    }
    
    // Fallback 2: Average cost for the given destination
    transportCost = fallbackStructure.destinationAvg.get(mappedCty);
    
    if (transportCost !== undefined) {
      return transportCost;
    }
    
    // Fallback 3: Max of all destination average costs
    return fallbackStructure.maxDestinationAvg;
  }
  
  /**
   * Get transport cost calculation summary for debugging
   */
  static async getCalculationSummary(freightData) {
    const { specificCosts, fallbackStructure } = freightData;
    
    return {
      totalSpecificCosts: specificCosts.size,
      originDestinationPairs: fallbackStructure.originDestinationAvg.size,
      destinationAverages: fallbackStructure.destinationAvg.size,
      maxDestinationAverage: fallbackStructure.maxDestinationAvg,
      sampleSpecificCosts: Array.from(specificCosts.entries()).slice(0, 5),
      sampleOriginDestination: Array.from(fallbackStructure.originDestinationAvg.entries()).slice(0, 5),
      sampleDestinationAvg: Array.from(fallbackStructure.destinationAvg.entries()).slice(0, 5)
    };
  }
}

module.exports = TransportCostCalculator; 