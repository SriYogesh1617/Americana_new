const { query } = require('../config/database');

class ExportRestrictionsLookup {
  
  /**
   * Load export restrictions data from Base Scenario Configuration
   */
  static async loadExportRestrictions() {
    try {
      console.log('🚫 Loading export restrictions from Base Scenario Configuration...');
      
      // Sheet ID for Export Restrictions
      const exportRestrictionsSheetId = '735703a0-ee5e-4daf-aa71-af5e68b6df3d';
      
      // Load all export restrictions data
      const restrictionsData = await query(`
        SELECT 
          row_index,
          column_index,
          cell_value
        FROM sheet_data
        WHERE worksheet_id = $1
        AND row_index > 0
        AND cell_value IS NOT NULL
        AND cell_value != ''
        ORDER BY row_index, column_index
      `, [exportRestrictionsSheetId]);
      
      console.log(`📊 Found ${restrictionsData.rows.length} export restrictions data cells`);
      
      // Parse export restrictions data according to the structure:
      // Col 0: FG SKU Code, Col 1: Description, Col 2: Month, Col 3: Origin Factory, Col 4: Destination Country
      const restrictionsMap = new Map(); // Will store restrictions by key: SKU_Origin_Destination_Month
      
      // Group data by rows
      const rowData = {};
      for (const cell of restrictionsData.rows) {
        if (!rowData[cell.row_index]) {
          rowData[cell.row_index] = {};
        }
        rowData[cell.row_index][cell.column_index] = cell.cell_value;
      }
      
      // Process data rows (skip header rows 1, 2, 3)
      const dataRows = Object.keys(rowData).filter(rowIndex => parseInt(rowIndex) > 3);
      
      console.log(`📊 Processing ${dataRows.length} export restriction records...`);
      
      dataRows.forEach(rowIndex => {
        const row = rowData[rowIndex];
        const skuCode = row[0]; // FG SKU Code
        const description = row[1]; // Description  
        const month = row[2]; // Month
        const originFactory = row[3]; // Origin Factory
        const destinationCountry = row[4]; // Destination Country
        
        if (skuCode && originFactory && destinationCountry && month) {
          // Handle "All" months - create restrictions for all months 5-16
          const months = month === 'All' ? 
            ['05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16'] : 
            [month.toString().padStart(2, '0')];
          
          months.forEach(monthValue => {
            // Create restriction keys for all factory types (since restriction affects the origin factory)
            const restrictionKey = `${skuCode}_${originFactory}_${destinationCountry}_${monthValue}`;
            restrictionsMap.set(restrictionKey, {
              skuCode,
              description,
              month: monthValue,
              originFactory,
              destinationCountry
            });
          });
          
          console.log(`  Added restriction: ${skuCode} from ${originFactory} to ${destinationCountry} for ${month}`);
        }
      });
      
      console.log(`✅ Created ${restrictionsMap.size} export restriction entries`);
      return restrictionsMap;
      
    } catch (error) {
      console.error('Error loading export restrictions:', error);
      return new Map();
    }
  }
  
  /**
   * Check if there's an export restriction for a specific combination
   * @param {string} skuCode - SKU code
   * @param {string} origin - Origin warehouse (factory)
   * @param {string} destination - Destination country
   * @param {string} month - Month number
   * @param {string} factory - Factory type (GFC, KFC, NFC)
   * @param {Map} restrictionsMap - Export restrictions lookup map
   * @returns {boolean} True if restricted, false if allowed
   */
  static isRestricted(skuCode, origin, destination, month, factory, restrictionsMap) {
    // Check if there's a restriction for this SKU from the origin factory to the destination
    // The restriction applies to the specific origin factory mentioned in the data
    const specificRestrictionKey = `${skuCode}_${factory}_${destination}_${month}`;
    
    // Also check for "All" SKUs restriction
    const allSkuRestrictionKey = `All_${factory}_${destination}_${month}`;
    
    return restrictionsMap.has(specificRestrictionKey) || restrictionsMap.has(allSkuRestrictionKey);
  }
  
  /**
   * Apply export restrictions to max factory values
   * @param {string} skuCode - SKU code
   * @param {string} wh - Warehouse code
   * @param {string} cty - Country code
   * @param {string} month - Month number
   * @param {number} maxGFC - Current max GFC value
   * @param {number} maxKFC - Current max KFC value
   * @param {number} maxNFC - Current max NFC value
   * @param {Map} restrictionsMap - Export restrictions lookup map
   * @returns {Object} Updated max values {maxGFC, maxKFC, maxNFC}
   */
  static applyExportRestrictions(skuCode, wh, cty, month, maxGFC, maxKFC, maxNFC, restrictionsMap) {
    // Map warehouse to origin factory
    const origin = wh.replace('M', ''); // GFCM -> GFC, KFCM -> KFC, NFCM -> NFC
    
    // Check restrictions for each factory
    const gfcRestricted = this.isRestricted(skuCode, origin, cty, month, 'GFC', restrictionsMap);
    const kfcRestricted = this.isRestricted(skuCode, origin, cty, month, 'KFC', restrictionsMap);
    const nfcRestricted = this.isRestricted(skuCode, origin, cty, month, 'NFC', restrictionsMap);
    
    return {
      maxGFC: gfcRestricted ? 0 : maxGFC,
      maxKFC: kfcRestricted ? 0 : maxKFC,
      maxNFC: nfcRestricted ? 0 : maxNFC
    };
  }
  
  /**
   * Get export restrictions statistics
   * @param {Map} restrictionsMap - Export restrictions lookup map
   * @returns {Object} Statistics object
   */
  static getStatistics(restrictionsMap) {
    return {
      totalRestrictions: restrictionsMap.size,
      sampleRestrictions: Array.from(restrictionsMap.entries()).slice(0, 5)
    };
  }
}

module.exports = ExportRestrictionsLookup; 