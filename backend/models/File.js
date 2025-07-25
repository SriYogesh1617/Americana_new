const { query } = require('../config/database');

class File {
  static async create(fileData) {
    const { original_name, file_type, file_size } = fileData;
    const result = await query(
      `INSERT INTO uploaded_files (original_name, file_type, file_size) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [original_name, file_type, file_size]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM uploaded_files WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async findAll(limit = 50, offset = 0) {
    const result = await query(
      `SELECT * FROM uploaded_files 
       ORDER BY upload_date DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async updateStatus(id, status, errorMessage = null) {
    const result = await query(
      `UPDATE uploaded_files 
       SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [status, errorMessage, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await query(
      'DELETE FROM uploaded_files WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  static async getByStatus(status) {
    const result = await query(
      'SELECT * FROM uploaded_files WHERE status = $1 ORDER BY upload_date DESC',
      [status]
    );
    return result.rows;
  }

  static async getTotalCount() {
    const result = await query('SELECT COUNT(*) as count FROM uploaded_files');
    return parseInt(result.rows[0].count);
  }

  static async getProcessingStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing
      FROM uploaded_files
    `);
    
    const stats = result.rows[0];
    const rate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0;
    
    return {
      total: parseInt(stats.total),
      completed: parseInt(stats.completed),
      failed: parseInt(stats.failed),
      processing: parseInt(stats.processing),
      rate: parseFloat(rate)
    };
  }

  static async getRecentUploads(limit = 10) {
    const result = await query(
      `SELECT * FROM uploaded_files 
       ORDER BY upload_date DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async getMonthlyUploads(startDate, endDate) {
    const result = await query(
      `SELECT * FROM uploaded_files 
       WHERE upload_date >= $1 AND upload_date <= $2 
       ORDER BY upload_date DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }
}

module.exports = File; 