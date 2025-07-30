const { query } = require('../config/database');

class DemandCursor {
  // Create a new demand cursor record
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
      `INSERT INTO demand_cursor 
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
      `INSERT INTO demand_cursor 
       (workbook_id, worksheet_id, row_index, column_index, column_name, 
        cell_value, cell_type, formula, upload_batch_id) 
       VALUES ${placeholders.join(', ')} 
       RETURNING *`,
      values
    );

    return result.rows;
  }

  // Get demand cursor data by workbook
  static async findByWorkbook(workbookId) {
    const result = await query(
      'SELECT * FROM demand_cursor WHERE workbook_id = $1 ORDER BY row_index, column_index',
      [workbookId]
    );
    return result.rows;
  }

  // Get demand cursor data by worksheet
  static async findByWorksheet(worksheetId) {
    const result = await query(
      'SELECT * FROM demand_cursor WHERE worksheet_id = $1 ORDER BY row_index, column_index',
      [worksheetId]
    );
    return result.rows;
  }

  // Get demand cursor data by upload batch
  static async findByUploadBatch(uploadBatchId) {
    const result = await query(
      'SELECT * FROM demand_cursor WHERE upload_batch_id = $1 ORDER BY row_index, column_index',
      [uploadBatchId]
    );
    return result.rows;
  }

  // Get demand cursor data as 2D array (for easy processing)
  static async getAsArray(worksheetId) {
    const result = await query(
      'SELECT * FROM demand_cursor WHERE worksheet_id = $1 ORDER BY row_index, column_index',
      [worksheetId]
    );

    // Convert to 2D array format
    const data = result.rows;
    if (data.length === 0) return [];

    // Find max row and column indices
    const maxRow = Math.max(...data.map(d => d.row_index));
    const maxCol = Math.max(...data.map(d => d.column_index));

    // Create 2D array
    const array = [];
    for (let row = 0; row <= maxRow; row++) {
      array[row] = [];
      for (let col = 0; col <= maxCol; col++) {
        array[row][col] = '';
      }
    }

    // Populate array with data
    data.forEach(cell => {
      array[cell.row_index][cell.column_index] = cell.cell_value || '';
    });

    return array;
  }

  // Get all demand cursor data with pagination
  static async findAll(limit = 1000, offset = 0) {
    const result = await query(
      'SELECT * FROM demand_cursor ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  // Delete demand cursor data by workbook
  static async deleteByWorkbook(workbookId) {
    const result = await query(
      'DELETE FROM demand_cursor WHERE workbook_id = $1 RETURNING *',
      [workbookId]
    );
    return result.rows;
  }

  // Delete demand cursor data by worksheet
  static async deleteByWorksheet(worksheetId) {
    const result = await query(
      'DELETE FROM demand_cursor WHERE worksheet_id = $1 RETURNING *',
      [worksheetId]
    );
    return result.rows;
  }

  // Delete demand cursor data by upload batch
  static async deleteByUploadBatch(uploadBatchId) {
    const result = await query(
      'DELETE FROM demand_cursor WHERE upload_batch_id = $1 RETURNING *',
      [uploadBatchId]
    );
    return result.rows;
  }

  // Get statistics for demand cursor data
  static async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT workbook_id) as unique_workbooks,
        COUNT(DISTINCT worksheet_id) as unique_worksheets,
        COUNT(DISTINCT upload_batch_id) as unique_upload_batches,
        MIN(created_at) as earliest_record,
        MAX(created_at) as latest_record
      FROM demand_cursor
    `);
    return result.rows[0];
  }

  // Clear all demand cursor data
  static async clearAll() {
    const result = await query('DELETE FROM demand_cursor RETURNING *');
    return result.rows;
  }

  // Get structured data for a specific upload batch
  static async getStructuredData(uploadBatchId) {
    const result = await query(
      'SELECT * FROM demand_cursor WHERE upload_batch_id = $1 ORDER BY row_index, column_index',
      [uploadBatchId]
    );
    return result.rows;
  }

  // Get filtered demand cursor data
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
      `SELECT * FROM demand_cursor ${whereClause} ORDER BY row_index, column_index`,
      params
    );
    return result.rows;
  }
}

module.exports = DemandCursor; 