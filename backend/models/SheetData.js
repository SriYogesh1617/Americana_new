const { query } = require('../config/database');

class SheetData {
  static async createBatch(dataArray) {
    if (!dataArray || dataArray.length === 0) {
      return [];
    }

    // Build parameterized query for batch insert
    const placeholders = dataArray.map((_, index) => {
      const offset = index * 6;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
    }).join(', ');

    const values = dataArray.flatMap(data => [
      data.worksheet_id,
      data.row_index,
      data.column_index,
      data.column_name,
      data.cell_value,
      data.cell_type
    ]);

    const result = await query(
      `INSERT INTO sheet_data (worksheet_id, row_index, column_index, column_name, cell_value, cell_type) 
       VALUES ${placeholders} 
       RETURNING *`,
      values
    );
    return result.rows;
  }

  static async create(cellData) {
    const { worksheet_id, row_index, column_index, column_name, cell_value, cell_type, formula } = cellData;
    const result = await query(
      `INSERT INTO sheet_data (worksheet_id, row_index, column_index, column_name, cell_value, cell_type, formula) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [worksheet_id, row_index, column_index, column_name, cell_value, cell_type, formula]
    );
    return result.rows[0];
  }

  static async findByWorksheet(worksheetId, limit = null, offset = 0) {
    let queryText = `SELECT * FROM sheet_data 
                     WHERE worksheet_id = $1 
                     ORDER BY row_index, column_index`;
    let params = [worksheetId];
    
    if (limit !== null) {
      queryText += ` LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    }
    
    const result = await query(queryText, params);
    return result.rows;
  }

  static async findByCell(worksheetId, rowIndex, columnIndex) {
    const result = await query(
      'SELECT * FROM sheet_data WHERE worksheet_id = $1 AND row_index = $2 AND column_index = $3',
      [worksheetId, rowIndex, columnIndex]
    );
    return result.rows[0];
  }

  static async findByRange(worksheetId, startRow, endRow, startCol, endCol) {
    const result = await query(
      `SELECT * FROM sheet_data 
       WHERE worksheet_id = $1 
       AND row_index >= $2 AND row_index <= $3 
       AND column_index >= $4 AND column_index <= $5 
       ORDER BY row_index, column_index`,
      [worksheetId, startRow, endRow, startCol, endCol]
    );
    return result.rows;
  }

  static async updateCell(worksheetId, rowIndex, columnIndex, cellValue, cellType = null) {
    const result = await query(
      `UPDATE sheet_data 
       SET cell_value = $1, cell_type = COALESCE($2, cell_type) 
       WHERE worksheet_id = $3 AND row_index = $4 AND column_index = $5 
       RETURNING *`,
      [cellValue, cellType, worksheetId, rowIndex, columnIndex]
    );
    return result.rows[0];
  }

  static async deleteByWorksheet(worksheetId) {
    const result = await query(
      'DELETE FROM sheet_data WHERE worksheet_id = $1',
      [worksheetId]
    );
    return result.rowCount;
  }

  static async getRowData(worksheetId, rowIndex) {
    const result = await query(
      `SELECT * FROM sheet_data 
       WHERE worksheet_id = $1 AND row_index = $2 
       ORDER BY column_index`,
      [worksheetId, rowIndex]
    );
    return result.rows;
  }

  static async getColumnData(worksheetId, columnIndex) {
    const result = await query(
      `SELECT * FROM sheet_data 
       WHERE worksheet_id = $1 AND column_index = $2 
       ORDER BY row_index`,
      [worksheetId, columnIndex]
    );
    return result.rows;
  }

  static async getHeaders(worksheetId) {
    const result = await query(
      `SELECT DISTINCT column_name, column_index 
       FROM sheet_data 
       WHERE worksheet_id = $1 AND row_index = 0 
       ORDER BY column_index`,
      [worksheetId]
    );
    return result.rows;
  }

  static async searchCells(worksheetId, searchTerm) {
    const result = await query(
      `SELECT * FROM sheet_data 
       WHERE worksheet_id = $1 
       AND (cell_value ILIKE $2 OR column_name ILIKE $2)
       ORDER BY row_index, column_index`,
      [worksheetId, `%${searchTerm}%`]
    );
    return result.rows;
  }

  static async getFormulaCells(worksheetId) {
    const result = await query(
      `SELECT * FROM sheet_data 
       WHERE worksheet_id = $1 AND cell_type = 'formula' 
       ORDER BY row_index, column_index`,
      [worksheetId]
    );
    return result.rows;
  }

  static async getTotalCount() {
    const result = await query('SELECT COUNT(*) as count FROM sheet_data');
    return parseInt(result.rows[0].count);
  }

  static async getMonthlyRecords(startDate, endDate) {
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM sheet_data sd
       JOIN worksheets w ON sd.worksheet_id = w.id
       JOIN workbooks wb ON w.workbook_id = wb.id
       WHERE wb.created_at >= $1 AND wb.created_at <= $2`,
      [startDate, endDate]
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = SheetData; 