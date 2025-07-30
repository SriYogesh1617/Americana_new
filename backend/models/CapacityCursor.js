const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class CapacityCursor {
  static async create(data) {
    const {
      upload_batch_id,
      row_index,
      column_index,
      cell_value,
      cell_type = 'string'
    } = data;

    const result = await query(
      `INSERT INTO capacity_cursor 
       (id, upload_batch_id, row_index, column_index, cell_value, cell_type, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [uuidv4(), upload_batch_id, row_index, column_index, cell_value, cell_type]
    );

    return result.rows[0];
  }

  static async createBatch(records) {
    if (records.length === 0) return [];

    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (const record of records) {
      const {
        upload_batch_id,
        row_index,
        column_index,
        cell_value,
        cell_type = 'string'
      } = record;

      const rowPlaceholders = [];
      for (let i = 0; i < 5; i++) {
        rowPlaceholders.push(`$${paramIndex++}`);
      }
      placeholders.push(`(${rowPlaceholders.join(', ')})`);

      values.push(
        uuidv4(),
        upload_batch_id,
        row_index,
        column_index,
        cell_value,
        cell_type
      );
    }

    const result = await query(
      `INSERT INTO capacity_cursor 
       (id, upload_batch_id, row_index, column_index, cell_value, cell_type) 
       VALUES ${placeholders.join(', ')} 
       RETURNING *`,
      values
    );

    return result.rows;
  }

  static async findByUploadBatch(uploadBatchId) {
    const result = await query(
      'SELECT * FROM capacity_cursor WHERE upload_batch_id = $1 ORDER BY row_index, column_index',
      [uploadBatchId]
    );
    return result.rows;
  }

  static async findAll(limit = 1000, offset = 0) {
    const result = await query(
      'SELECT * FROM capacity_cursor ORDER BY upload_batch_id, row_index, column_index LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  static async deleteByUploadBatch(uploadBatchId) {
    const result = await query(
      'DELETE FROM capacity_cursor WHERE upload_batch_id = $1 RETURNING *',
      [uploadBatchId]
    );
    return result.rows;
  }

  static async clearAll() {
    const result = await query('DELETE FROM capacity_cursor RETURNING *');
    return result.rows;
  }

  static async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT upload_batch_id) as total_upload_batches,
        COUNT(DISTINCT row_index) as unique_rows,
        COUNT(DISTINCT column_index) as unique_columns
      FROM capacity_cursor
    `);
    return result.rows[0];
  }

  // Get filtered capacity cursor data
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
      `SELECT * FROM capacity_cursor ${whereClause} ORDER BY row_index, column_index`,
      params
    );
    return result.rows;
  }
}

module.exports = CapacityCursor; 