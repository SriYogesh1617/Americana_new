const { query } = require('../config/database');

class CustomCostLookup {
  
  /**
   * Get Average RM price for a SKU from Custom Cost - Average RM price workbook
   * @param {string} skuCode - The SKU code to lookup
   * @param {string} factory - Factory code (GFC, KFC, NFC) - optional
   * @returns {number|null} Average RM price or null if not found
   */
  static async getAverageRMPrice(skuCode, factory = null) {
    try {
      let whereClause = `
        WHERE worksheet_id = '06e6a43f-6bb9-4cfd-9d74-fbd09b86aa85'
        AND column_index = 2
        AND EXISTS (
          SELECT 1 FROM sheet_data sd2 
          WHERE sd2.worksheet_id = sd.worksheet_id 
          AND sd2.row_index = sd.row_index 
          AND sd2.column_index = 1 
          AND sd2.cell_value = $1
        )
      `;
      let params = [skuCode];

      if (factory) {
        whereClause += ` AND EXISTS (
          SELECT 1 FROM sheet_data sd3 
          WHERE sd3.worksheet_id = sd.worksheet_id 
          AND sd3.row_index = sd.row_index 
          AND sd3.column_index = 0 
          AND sd3.cell_value = $2
        )`;
        params.push(factory);
      }

      const result = await query(`
        SELECT cell_value FROM sheet_data sd
        ${whereClause}
        ORDER BY row_index ASC
        LIMIT 1
      `, params);

      if (result.rows.length > 0) {
        const value = parseFloat(result.rows[0].cell_value);
        return isNaN(value) ? null : value;
      }
      return null;
    } catch (error) {
      console.error('Error getting Average RM price:', error);
      return null;
    }
  }

  /**
   * Get Factory Overhead for a SKU from Customs workbook
   * @param {string} skuCode - The SKU code to lookup
   * @param {string} factory - Factory code (GFC, KFC, NFC) - optional
   * @returns {number|null} Factory overhead in USD or null if not found
   */
  static async getFactoryOverhead(skuCode, factory = null) {
    try {
      let whereClause = `
        WHERE worksheet_id = 'cb2884b1-d35d-459e-b379-3ee4a1e73f11'
        AND column_index = 3
        AND EXISTS (
          SELECT 1 FROM sheet_data sd2 
          WHERE sd2.worksheet_id = sd.worksheet_id 
          AND sd2.row_index = sd.row_index 
          AND sd2.column_index = 1 
          AND sd2.cell_value = $1
        )
      `;
      let params = [skuCode];

      if (factory) {
        whereClause += ` AND EXISTS (
          SELECT 1 FROM sheet_data sd3 
          WHERE sd3.worksheet_id = sd.worksheet_id 
          AND sd3.row_index = sd.row_index 
          AND sd3.column_index = 0 
          AND sd3.cell_value = $2
        )`;
        params.push(factory);
      }

      const result = await query(`
        SELECT cell_value FROM sheet_data sd
        ${whereClause}
        ORDER BY row_index ASC
        LIMIT 1
      `, params);

      if (result.rows.length > 0) {
        const value = parseFloat(result.rows[0].cell_value);
        return isNaN(value) ? null : value;
      }
      return null;
    } catch (error) {
      console.error('Error getting Factory Overhead:', error);
      return null;
    }
  }

  /**
   * Get Markup percentage from Custom Duty sheet
   * @returns {number} Markup percentage (e.g., 0.1 for 10%)
   */
  static async getMarkupPercentage() {
    try {
      const result = await query(`
        SELECT cell_value FROM sheet_data 
        WHERE worksheet_id = 'dc2e4e83-4e17-40a0-9a35-46ab6d6c78f4'
        AND row_index = 1 
        AND column_index = 1
      `);

      if (result.rows.length > 0) {
        const value = parseFloat(result.rows[0].cell_value);
        return isNaN(value) ? 0.1 : value; // Default to 10% if not found
      }
      return 0.1; // Default markup
    } catch (error) {
      console.error('Error getting Markup percentage:', error);
      return 0.1; // Default markup
    }
  }

  /**
   * Get Custom Duty percentage from Custom Duty sheet
   * @returns {number} Custom duty percentage (e.g., 0.055 for 5.5%)
   */
  static async getCustomDutyPercentage() {
    try {
      const result = await query(`
        SELECT cell_value FROM sheet_data 
        WHERE worksheet_id = 'dc2e4e83-4e17-40a0-9a35-46ab6d6c78f4'
        AND row_index = 2 
        AND column_index = 1
      `);

      if (result.rows.length > 0) {
        const value = parseFloat(result.rows[0].cell_value);
        return isNaN(value) ? 0.055 : value; // Default to 5.5% if not found
      }
      return 0.055; // Default custom duty
    } catch (error) {
      console.error('Error getting Custom Duty percentage:', error);
      return 0.055; // Default custom duty
    }
  }

  /**
   * Calculate Custom Cost/Unit based on the formula:
   * Custom Duty = [Average 12 month RM price + freight cost + factory overheads] × (1 + Markup%) × Custom Duty %
   * 
   * @param {string} skuCode - SKU code
   * @param {string} factory - Factory code (GFC, KFC, NFC)
   * @param {number} freightCost - Transport cost per case from T02
   * @param {string} country - Country code (for KSA check)
   * @param {boolean} isCustomsRequired - Whether customs is required (from "customs?" column)
   * @returns {Promise<number>} Custom cost per unit
   */
  static async calculateCustomCostPerUnit(skuCode, factory, freightCost, country, isCustomsRequired) {
    try {
      // Rule: Custom Cost/Unit is 0 if customs is not required
      if (!isCustomsRequired || (isCustomsRequired === 'No')) {
        return 0;
      }

      // Rule: Custom Cost/Unit - NFC is always 0
      if (factory === 'NFC' || factory === 'NFCM') {
        return 0;
      }

      // Rule: Custom duty only applies to inbound shipments to KSA
      if (country !== 'KSA' && country !== 'KSA FS') {
        return 0;
      }

      // Get all required components
      const [averageRMPrice, factoryOverhead, markupPercentage, customDutyPercentage] = await Promise.all([
        this.getAverageRMPrice(skuCode, factory),
        this.getFactoryOverhead(skuCode, factory),
        this.getMarkupPercentage(),
        this.getCustomDutyPercentage()
      ]);

      // Use default values if not found
      const rmPrice = averageRMPrice || 0;
      const overhead = factoryOverhead || 0;
      const freight = freightCost || 0;

      // Apply the formula: [RM Price + Freight Cost + Factory Overheads] × (1 + Markup%) × Custom Duty %
      const baseAmount = rmPrice + freight + overhead;
      const withMarkup = baseAmount * (1 + markupPercentage);
      const customCost = withMarkup * customDutyPercentage;

      console.log(`Custom Cost Calculation for SKU ${skuCode}, Factory ${factory}, Country ${country}:`);
      console.log(`  RM Price: ${rmPrice}`);
      console.log(`  Freight Cost: ${freight}`);
      console.log(`  Factory Overhead: ${overhead}`);
      console.log(`  Base Amount: ${baseAmount}`);
      console.log(`  Markup %: ${markupPercentage * 100}%`);
      console.log(`  With Markup: ${withMarkup}`);
      console.log(`  Custom Duty %: ${customDutyPercentage * 100}%`);
      console.log(`  Final Custom Cost: ${customCost}`);

      return Math.round(customCost * 10000) / 10000; // Round to 4 decimal places
    } catch (error) {
      console.error('Error calculating custom cost per unit:', error);
      return 0;
    }
  }

  /**
   * Get all custom cost data for debugging
   */
  static async getAllCustomCostData() {
    try {
      const [rmPrices, overheads, markup, customDuty] = await Promise.all([
        // Get RM prices
        query(`
          SELECT 
            sd1.cell_value as factory,
            sd2.cell_value as sku_code,
            sd3.cell_value as rm_price
          FROM sheet_data sd1
          JOIN sheet_data sd2 ON sd1.worksheet_id = sd2.worksheet_id AND sd1.row_index = sd2.row_index AND sd2.column_index = 1
          JOIN sheet_data sd3 ON sd1.worksheet_id = sd3.worksheet_id AND sd1.row_index = sd3.row_index AND sd3.column_index = 2
          WHERE sd1.worksheet_id = '06e6a43f-6bb9-4cfd-9d74-fbd09b86aa85'
          AND sd1.column_index = 0
          AND sd1.row_index > 0
          ORDER BY sd1.row_index
          LIMIT 10
        `),
        
        // Get factory overheads
        query(`
          SELECT 
            sd1.cell_value as factory,
            sd2.cell_value as sku_code,
            sd4.cell_value as overhead
          FROM sheet_data sd1
          JOIN sheet_data sd2 ON sd1.worksheet_id = sd2.worksheet_id AND sd1.row_index = sd2.row_index AND sd2.column_index = 1
          JOIN sheet_data sd4 ON sd1.worksheet_id = sd4.worksheet_id AND sd1.row_index = sd4.row_index AND sd4.column_index = 3
          WHERE sd1.worksheet_id = 'cb2884b1-d35d-459e-b379-3ee4a1e73f11'
          AND sd1.column_index = 0
          AND sd1.row_index > 0
          ORDER BY sd1.row_index
          LIMIT 10
        `),
        
        // Get markup
        this.getMarkupPercentage(),
        
        // Get custom duty
        this.getCustomDutyPercentage()
      ]);

      return {
        rmPrices: rmPrices.rows,
        overheads: overheads.rows,
        markup,
        customDuty,
        sampleCalculation: await this.calculateCustomCostPerUnit('4001351001', 'GFC', 5.5, 'KSA', true)
      };
    } catch (error) {
      console.error('Error getting all custom cost data:', error);
      return null;
    }
  }
}

module.exports = CustomCostLookup; 