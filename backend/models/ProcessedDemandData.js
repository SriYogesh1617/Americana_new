const { query } = require('../config/database');

class ProcessedDemandData {
  // Create a new processed demand data record
  static async create(data) {
    const {
      workbook_id,
      worksheet_id,
      row_index,
      geography,
      market,
      cty,
      fgsku_code,
      demand_cases,
      production_environment,
      safety_stock_wh,
      inventory_days_norm,
      supply,
      cons,
      pd_npd,
      origin,
      month_num,
      month,
      year
    } = data;

    const result = await query(
      `INSERT INTO processed_demand_data 
       (workbook_id, worksheet_id, row_index, geography, market, cty, fgsku_code, 
        demand_cases, production_environment, safety_stock_wh, inventory_days_norm, 
        supply, cons, pd_npd, origin, month_num, month, year) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
       RETURNING *`,
      [
        workbook_id, worksheet_id, row_index, geography, market, cty, fgsku_code,
        demand_cases, production_environment, safety_stock_wh, inventory_days_norm,
        supply, cons, pd_npd, origin, month_num, month, year
      ]
    );

    return result.rows[0];
  }

  // Create multiple records in batch
  static async createBatch(records) {
    if (records.length === 0) return [];

    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (const record of records) {
      const {
        workbook_id, worksheet_id, row_index, geography, market, cty, fgsku_code,
        demand_cases, production_environment, safety_stock_wh, inventory_days_norm,
        supply, cons, pd_npd, origin, month_num, month, year
      } = record;

      const rowPlaceholders = [];
      for (let i = 0; i < 18; i++) {
        rowPlaceholders.push(`$${paramIndex++}`);
      }
      placeholders.push(`(${rowPlaceholders.join(', ')})`);

      values.push(
        workbook_id, worksheet_id, row_index, geography, market, cty, fgsku_code,
        demand_cases, production_environment, safety_stock_wh, inventory_days_norm,
        supply, cons, pd_npd, origin, month_num, month, year
      );
    }

    const result = await query(
      `INSERT INTO processed_demand_data 
       (workbook_id, worksheet_id, row_index, geography, market, cty, fgsku_code, 
        demand_cases, production_environment, safety_stock_wh, inventory_days_norm, 
        supply, cons, pd_npd, origin, month_num, month, year) 
       VALUES ${placeholders.join(', ')} 
       RETURNING *`,
      values
    );

    return result.rows;
  }

  // Get processed data by workbook
  static async findByWorkbook(workbookId) {
    const result = await query(
      'SELECT * FROM processed_demand_data WHERE workbook_id = $1 ORDER BY row_index',
      [workbookId]
    );
    return result.rows;
  }

  // Get processed data by worksheet
  static async findByWorksheet(worksheetId) {
    const result = await query(
      'SELECT * FROM processed_demand_data WHERE worksheet_id = $1 ORDER BY row_index',
      [worksheetId]
    );
    return result.rows;
  }

  // Get processed data by month and year
  static async findByMonthYear(month, year) {
    const result = await query(
      'SELECT * FROM processed_demand_data WHERE month = $1 AND year = $2 ORDER BY row_index',
      [month, year]
    );
    return result.rows;
  }

  // Get all processed data
  static async findAll(limit = 1000, offset = 0) {
    const result = await query(
      'SELECT * FROM processed_demand_data ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  // Delete processed data by workbook
  static async deleteByWorkbook(workbookId) {
    const result = await query(
      'DELETE FROM processed_demand_data WHERE workbook_id = $1 RETURNING *',
      [workbookId]
    );
    return result.rows;
  }

  // Delete processed data by worksheet
  static async deleteByWorksheet(worksheetId) {
    const result = await query(
      'DELETE FROM processed_demand_data WHERE worksheet_id = $1 RETURNING *',
      [worksheetId]
    );
    return result.rows;
  }

  // Get statistics
  static async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT workbook_id) as total_workbooks,
        COUNT(DISTINCT worksheet_id) as total_worksheets,
        COUNT(DISTINCT geography) as unique_geographies,
        COUNT(DISTINCT market) as unique_markets,
        COUNT(DISTINCT cty) as unique_cty_values
      FROM processed_demand_data
    `);
    return result.rows[0];
  }
}

module.exports = ProcessedDemandData; 