const { query } = require('../config/database');

class FreightStorageCostsCursor {
  static async create(data) {
    const result = await query(
      `INSERT INTO freight_storage_costs_cursor 
       (row_index, column_index, cell_value, cell_type, upload_batch_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [data.row_index, data.column_index, data.cell_value, data.cell_type, data.upload_batch_id]
    );
    return result.rows[0];
  }

  static async createBatch(dataArray) {
    if (dataArray.length === 0) return [];

    const values = dataArray.map((data, index) => {
      const baseIndex = index * 5;
      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, NOW(), NOW())`;
    }).join(', ');

    const flatValues = dataArray.flatMap(data => [
      data.row_index,
      data.column_index,
      data.cell_value,
      data.cell_type,
      data.upload_batch_id
    ]);

    const result = await query(
      `INSERT INTO freight_storage_costs_cursor 
       (row_index, column_index, cell_value, cell_type, upload_batch_id, created_at, updated_at)
       VALUES ${values}
       RETURNING *`,
      flatValues
    );

    return result.rows;
  }

  static async findByUploadBatch(uploadBatchId) {
    const result = await query(
      `SELECT * FROM freight_storage_costs_cursor 
       WHERE upload_batch_id = $1 
       ORDER BY row_index, column_index`,
      [uploadBatchId]
    );
    return result.rows;
  }

  static async getStructuredData(uploadBatchId) {
    const rawData = await this.findByUploadBatch(uploadBatchId);
    
    if (rawData.length === 0) return [];

    // Group data by row index
    const rowsByIndex = {};
    rawData.forEach(cell => {
      if (!rowsByIndex[cell.row_index]) {
        rowsByIndex[cell.row_index] = [];
      }
      rowsByIndex[cell.row_index].push(cell);
    });

    // Extract headers from row 3 (actual header row)
    const headers = [];
    const headerRow = rowsByIndex[3] || [];
    for (const cell of headerRow) {
      headers[cell.column_index] = cell.cell_value;
    }

    // Convert to structured records starting from row 4 (data rows)
    const structuredData = [];
    for (let rowIndex = 4; rowIndex < Math.max(...Object.keys(rowsByIndex).map(Number)) + 1; rowIndex++) {
      const row = rowsByIndex[rowIndex] || [];
      if (row.length === 0) continue;

      const record = {};
      for (const cell of row) {
        const headerName = headers[cell.column_index];
        if (headerName) {
          record[headerName] = cell.cell_value;
        }
      }
      
      if (Object.keys(record).length > 0) {
        structuredData.push(record);
      }
    }

    return structuredData;
  }

  static async getStats() {
    const result = await query(
      `SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT upload_batch_id) as total_upload_batches,
        MIN(created_at) as earliest_record,
        MAX(created_at) as latest_record
       FROM freight_storage_costs_cursor`
    );
    return result.rows[0];
  }

  static async clearAll() {
    const result = await query('DELETE FROM freight_storage_costs_cursor');
    return result.rowCount;
  }

  // Get filtered freight storage costs cursor data
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
      `SELECT * FROM freight_storage_costs_cursor ${whereClause} ORDER BY row_index, column_index`,
      params
    );
    return result.rows;
  }
}

module.exports = FreightStorageCostsCursor; 