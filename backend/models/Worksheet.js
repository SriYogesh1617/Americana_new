const { query } = require('../config/database');

class Worksheet {
  static async create(worksheetData) {
    const { workbook_id, sheet_name, sheet_index, row_count, column_count, has_headers } = worksheetData;
    const result = await query(
      `INSERT INTO worksheets (workbook_id, sheet_name, sheet_index, row_count, column_count, has_headers) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [workbook_id, sheet_name, sheet_index, row_count, column_count, has_headers]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT ws.*, w.workbook_name, f.original_name as file_name 
       FROM worksheets ws 
       JOIN workbooks w ON ws.workbook_id = w.id 
       JOIN uploaded_files f ON w.file_id = f.id 
       WHERE ws.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByWorkbookId(workbookId) {
    const result = await query(
      'SELECT * FROM worksheets WHERE workbook_id = $1 ORDER BY sheet_index',
      [workbookId]
    );
    return result.rows;
  }

  static async findByWorkbookAndSheetName(workbookId, sheetName) {
    const result = await query(
      'SELECT * FROM worksheets WHERE workbook_id = $1 AND sheet_name = $2',
      [workbookId, sheetName]
    );
    return result.rows[0];
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    const result = await query(
      `UPDATE worksheets SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${fields.length + 1} 
       RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM worksheets WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async getWorksheetWithData(id, limit = 1000, offset = 0) {
    const worksheetResult = await query(
      `SELECT ws.*, w.workbook_name, f.original_name as file_name 
       FROM worksheets ws 
       JOIN workbooks w ON ws.workbook_id = w.id 
       JOIN uploaded_files f ON w.file_id = f.id 
       WHERE ws.id = $1`,
      [id]
    );

    if (worksheetResult.rows.length === 0) {
      return null;
    }

    const dataResult = await query(
      `SELECT * FROM sheet_data 
       WHERE worksheet_id = $1 
       ORDER BY row_index, column_index 
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    return {
      ...worksheetResult.rows[0],
      data: dataResult.rows
    };
  }

  static async getDataSummary(id) {
    const result = await query(
      `SELECT 
         COUNT(*) as total_cells,
         COUNT(DISTINCT row_index) as unique_rows,
         COUNT(DISTINCT column_index) as unique_columns,
         COUNT(CASE WHEN cell_type = 'number' THEN 1 END) as numeric_cells,
         COUNT(CASE WHEN cell_type = 'string' THEN 1 END) as text_cells,
         COUNT(CASE WHEN cell_type = 'formula' THEN 1 END) as formula_cells
       FROM sheet_data 
       WHERE worksheet_id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findAll(limit = 1000, offset = 0) {
    const result = await query(
      `SELECT ws.*, w.workbook_name, f.original_name as file_name 
       FROM worksheets ws 
       JOIN workbooks w ON ws.workbook_id = w.id 
       JOIN uploaded_files f ON w.file_id = f.id 
       ORDER BY ws.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }
}

module.exports = Worksheet; 