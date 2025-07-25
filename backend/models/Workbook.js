const { query } = require('../config/database');

class Workbook {
  static async create(workbookData) {
    const { file_id, workbook_name, sheet_count, total_rows, total_columns } = workbookData;
    const result = await query(
      `INSERT INTO workbooks (file_id, workbook_name, sheet_count, total_rows, total_columns) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [file_id, workbook_name, sheet_count, total_rows, total_columns]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT w.*, f.original_name as file_name, f.upload_date 
       FROM workbooks w 
       JOIN uploaded_files f ON w.file_id = f.id 
       WHERE w.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByFileId(fileId) {
    const result = await query(
      'SELECT * FROM workbooks WHERE file_id = $1',
      [fileId]
    );
    return result.rows;
  }

  static async findAll(limit = 50, offset = 0) {
    const result = await query(
      `SELECT w.*, f.original_name as file_name, f.upload_date 
       FROM workbooks w 
       JOIN uploaded_files f ON w.file_id = f.id 
       ORDER BY w.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData);
    const values = Object.values(updateData);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    const result = await query(
      `UPDATE workbooks SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${fields.length + 1} 
       RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM workbooks WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async getWorkbookWithSheets(id) {
    const workbookResult = await query(
      `SELECT w.*, f.original_name as file_name, f.upload_date 
       FROM workbooks w 
       JOIN uploaded_files f ON w.file_id = f.id 
       WHERE w.id = $1`,
      [id]
    );

    if (workbookResult.rows.length === 0) {
      return null;
    }

    const worksheetsResult = await query(
      'SELECT * FROM worksheets WHERE workbook_id = $1 ORDER BY sheet_index',
      [id]
    );

    return {
      ...workbookResult.rows[0],
      worksheets: worksheetsResult.rows
    };
  }

  static async getTotalCount() {
    const result = await query('SELECT COUNT(*) as count FROM workbooks');
    return parseInt(result.rows[0].count);
  }

  static async getRecentWorkbooks(limit = 10) {
    const result = await query(
      `SELECT w.*, f.original_name as file_name 
       FROM workbooks w 
       JOIN uploaded_files f ON w.file_id = f.id 
       ORDER BY w.created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async getMonthlyWorkbooks(startDate, endDate) {
    const result = await query(
      `SELECT w.*, f.original_name as file_name 
       FROM workbooks w 
       JOIN uploaded_files f ON w.file_id = f.id 
       WHERE w.created_at >= $1 AND w.created_at <= $2 
       ORDER BY w.created_at DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }
}

module.exports = Workbook; 