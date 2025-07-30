const { query } = require('../config/database');

class BaseScenarioConfigurationCursor {
  // Create a new base scenario configuration cursor record
  static async create(data) {
    const {
      workbook_id,
      worksheet_id,
      row_index,
      column_index,
      column_name,
      cell_value,
      cell_type,
      formula,
      upload_batch_id
    } = data;

    const result = await query(
      `INSERT INTO base_scenario_configuration_cursor 
       (workbook_id, worksheet_id, row_index, column_index, column_name, 
        cell_value, cell_type, formula, upload_batch_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        workbook_id, worksheet_id, row_index, column_index, column_name,
        cell_value, cell_type, formula, upload_batch_id
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
        workbook_id, worksheet_id, row_index, column_index, column_name,
        cell_value, cell_type, formula, upload_batch_id
      } = record;

      const rowPlaceholders = [];
      for (let i = 0; i < 9; i++) {
        rowPlaceholders.push(`$${paramIndex++}`);
      }
      placeholders.push(`(${rowPlaceholders.join(', ')})`);

      values.push(
        workbook_id, worksheet_id, row_index, column_index, column_name,
        cell_value, cell_type, formula, upload_batch_id
      );
    }

    const result = await query(
      `INSERT INTO base_scenario_configuration_cursor 
       (workbook_id, worksheet_id, row_index, column_index, column_name, 
        cell_value, cell_type, formula, upload_batch_id) 
       VALUES ${placeholders.join(', ')} 
       RETURNING *`,
      values
    );

    return result.rows;
  }

  // Get base scenario configuration cursor data by workbook
  static async findByWorkbook(workbookId) {
    const result = await query(
      'SELECT * FROM base_scenario_configuration_cursor WHERE workbook_id = $1 ORDER BY row_index, column_index',
      [workbookId]
    );
    return result.rows;
  }

  // Get base scenario configuration cursor data by worksheet
  static async findByWorksheet(worksheetId) {
    const result = await query(
      'SELECT * FROM base_scenario_configuration_cursor WHERE worksheet_id = $1 ORDER BY row_index, column_index',
      [worksheetId]
    );
    return result.rows;
  }

  // Get base scenario configuration cursor data by upload batch
  static async findByUploadBatch(uploadBatchId) {
    const result = await query(
      'SELECT * FROM base_scenario_configuration_cursor WHERE upload_batch_id = $1 ORDER BY row_index, column_index',
      [uploadBatchId]
    );
    return result.rows;
  }

  // Get base scenario configuration cursor data as 2D array (for easy processing)
  static async getAsArray(worksheetId) {
    const result = await query(
      'SELECT * FROM base_scenario_configuration_cursor WHERE worksheet_id = $1 ORDER BY row_index, column_index',
      [worksheetId]
    );
    
    if (result.rows.length === 0) return [];

    // Find max row and column indices
    const maxRow = Math.max(...result.rows.map(r => r.row_index));
    const maxCol = Math.max(...result.rows.map(r => r.column_index));

    // Create 2D array
    const array = [];
    for (let row = 0; row <= maxRow; row++) {
      array[row] = [];
      for (let col = 0; col <= maxCol; col++) {
        array[row][col] = '';
      }
    }

    // Populate array with data
    for (const cell of result.rows) {
      array[cell.row_index][cell.column_index] = cell.cell_value;
    }

    return array;
  }

  // Get all base scenario configuration cursor data
  static async findAll(limit = 1000, offset = 0) {
    const result = await query(
      'SELECT * FROM base_scenario_configuration_cursor ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  // Delete base scenario configuration cursor data by workbook
  static async deleteByWorkbook(workbookId) {
    const result = await query(
      'DELETE FROM base_scenario_configuration_cursor WHERE workbook_id = $1 RETURNING *',
      [workbookId]
    );
    return result.rows;
  }

  // Delete base scenario configuration cursor data by worksheet
  static async deleteByWorksheet(worksheetId) {
    const result = await query(
      'DELETE FROM base_scenario_configuration_cursor WHERE worksheet_id = $1 RETURNING *',
      [worksheetId]
    );
    return result.rows;
  }

  // Delete base scenario configuration cursor data by upload batch
  static async deleteByUploadBatch(uploadBatchId) {
    const result = await query(
      'DELETE FROM base_scenario_configuration_cursor WHERE upload_batch_id = $1 RETURNING *',
      [uploadBatchId]
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
        COUNT(DISTINCT upload_batch_id) as total_upload_batches
      FROM base_scenario_configuration_cursor
    `);
    return result.rows[0];
  }

  // Clear all data (for cleanup)
  static async clearAll() {
    const result = await query('DELETE FROM base_scenario_configuration_cursor RETURNING *');
    return result.rows;
  }

  // Get filtered base scenario configuration cursor data
  static async getFilteredData(filters = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.workbook_id) {
      whereClause += ` AND workbook_id = $${paramIndex++}`;
      params.push(filters.workbook_id);
    }

    if (filters.worksheet_id) {
      whereClause += ` AND worksheet_id = $${paramIndex++}`;
      params.push(filters.worksheet_id);
    }

    if (filters.upload_batch_id) {
      whereClause += ` AND upload_batch_id = $${paramIndex++}`;
      params.push(filters.upload_batch_id);
    }

    if (filters.cell_type) {
      whereClause += ` AND cell_type = $${paramIndex++}`;
      params.push(filters.cell_type);
    }

    if (filters.column_name) {
      whereClause += ` AND column_name ILIKE $${paramIndex++}`;
      params.push(`%${filters.column_name}%`);
    }

    const result = await query(
      `SELECT * FROM base_scenario_configuration_cursor ${whereClause} ORDER BY row_index, column_index`,
      params
    );
    return result.rows;
  }
}

module.exports = BaseScenarioConfigurationCursor; 