const T03TestData = require('../models/T03TestData');
const { query } = require('../config/database');

class T03TestController {
  // Generate T03 Test data using SQL
  static async generateData(req, res) {
    try {
      console.log('🚀 Starting T03 Test data generation...');
      
      const result = await T03TestData.generateFromSQL();
      
      res.json({
        success: true,
        message: 'T03 Test data generated successfully using SQL',
        data: result.summary
      });
    } catch (error) {
      console.error('❌ Error generating T03 Test data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate T03 Test data',
        details: error.message
      });
    }
  }

  // Get all T03 Test data with pagination
  static async getData(req, res) {
    try {
      const { page = 1, limit = 100, sort_by = 'id', sort_order = 'asc' } = req.query;
      
      const pageNum = parseInt(page) || 1;
      const limitNum = Math.min(parseInt(limit) || 100, 1000); // Max 1000 records per page
      const offset = (pageNum - 1) * limitNum;
      
      const countQuery = `SELECT COUNT(*) as total FROM public.t03_test`;
      const countResult = await query(countQuery);
      const totalRecords = parseInt(countResult.rows[0].total);
      
      // Validate sort column to prevent SQL injection
      const validSortColumns = ['id', 'WH', 'PLT', 'FGSKUCode', 'mth_number', 'country', 'cost_per_unit', 'factcountry'];
      const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'id';
      const sortOrder = sort_order === 'desc' ? 'DESC' : 'ASC';
      
      const dataQuery = `
        SELECT id, WH, PLT, "FGSKUCode", mth_number, country, cost_per_unit, factcountry
        FROM public.t03_test
        ORDER BY ${sortColumn === 'FGSKUCode' ? '"FGSKUCode"' : sortColumn} ${sortOrder}
        LIMIT $1 OFFSET $2
      `;
      
      const dataResult = await query(dataQuery, [limitNum, offset]);
      
      const totalPages = Math.ceil(totalRecords / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;
      
      res.json({
        success: true,
        data: dataResult.rows,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalRecords: totalRecords,
          recordsPerPage: limitNum,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage,
          startRecord: offset + 1,
          endRecord: Math.min(offset + limitNum, totalRecords)
        }
      });
    } catch (error) {
      console.error('❌ Error getting T03 Test data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get T03 Test data',
        details: error.message
      });
    }
  }

  // Get T03 Test summary statistics
  static async getSummary(req, res) {
    try {
      const stats = await T03TestData.getSummaryStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Error getting T03 Test summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T03 Test summary',
        details: error.message
      });
    }
  }

  // Get validation report
  static async getValidation(req, res) {
    try {
      const validation = await T03TestData.getValidationReport();
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('❌ Error getting T03 Test validation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve T03 Test validation',
        details: error.message
      });
    }
  }

  // Export T03 Test data to Excel
  static async exportToExcel(req, res) {
    try {
      console.log('📊 Exporting T03 Test data to Excel...');
      
      // Get ALL T03 Test data
      const dataQuery = `
        SELECT WH, PLT, "FGSKUCode", mth_number, country, cost_per_unit, factcountry
        FROM public.t03_test
        ORDER BY WH, PLT, "FGSKUCode", mth_number
      `;
      
      const dataResult = await query(dataQuery);
      const data = dataResult.rows;
      
      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No T03 Test data found for export'
        });
      }

      console.log(`Found ${data.length} records to export`);

      // Create Excel workbook
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('T03 Test Data');

      // Define headers based on your SQL schema
      const headers = [
        'WH', 'PLT', 'FGSKU Code', 'Month', 'Country', 'Cost Per Unit', 'Factory Country'
      ];

      // Add headers
      worksheet.addRow(headers);

      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data rows
      data.forEach((record) => {
        const row = [
          record.WH || '',
          record.PLT || '',
          record.FGSKUCode || '',
          record.mth_number || 0,
          record.country || '',
          parseFloat(record.cost_per_unit) || 0,
          record.factcountry || ''
        ];
        
        worksheet.addRow(row);
      });

      // Set column widths
      worksheet.columns.forEach(column => {
        column.width = 15;
      });

      // Style headers with borders
      const headerRow2 = worksheet.getRow(1);
      headerRow2.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      console.log('Writing Excel file to buffer...');
      
      // Write to buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Set response headers
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `T03_Test_Export_${timestamp}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      // Send buffer
      res.send(buffer);
      
      console.log(`✅ Exported ${data.length} T03 Test records to Excel: ${filename}`);
      
    } catch (error) {
      console.error('❌ Error exporting T03 Test to Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting to Excel',
        error: error.message
      });
    }
  }

  // Export T03 Test data to CSV
  static async exportToCSV(req, res) {
    try {
      console.log('📊 Exporting T03 Test data to CSV...');
      
      // Get ALL T03 Test data
      const dataQuery = `
        SELECT WH, PLT, "FGSKUCode", mth_number, country, cost_per_unit, factcountry
        FROM public.t03_test
        ORDER BY WH, PLT, "FGSKUCode", mth_number
      `;
      
      const dataResult = await query(dataQuery);
      const data = dataResult.rows;
      
      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No T03 Test data found for export'
        });
      }

      console.log(`Found ${data.length} records to export`);

      // Define headers
      const headers = [
        'WH', 'PLT', 'FGSKU Code', 'Month', 'Country', 'Cost Per Unit', 'Factory Country'
      ];

      // Create CSV content
      let csvContent = headers.join(',') + '\n';

      // Add data rows
      data.forEach((record) => {
        const row = [
          `"${record.WH || ''}"`,
          `"${record.PLT || ''}"`,
          `"${record.FGSKUCode || ''}"`,
          record.mth_number || 0,
          `"${record.country || ''}"`,
          parseFloat(record.cost_per_unit) || 0,
          `"${record.factcountry || ''}"`
        ];
        
        csvContent += row.join(',') + '\n';
      });

      // Set response headers
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `T03_Test_Export_${timestamp}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
      res.setHeader('Cache-Control', 'no-cache');

      // Send CSV content
      res.send(csvContent);
      
      console.log(`✅ Exported ${data.length} T03 Test records to CSV: ${filename}`);
      
    } catch (error) {
      console.error('❌ Error exporting T03 Test to CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting to CSV',
        error: error.message
      });
    }
  }

  // Clear all T03 Test data
  static async clearData(req, res) {
    try {
      const deletedCount = await T03TestData.deleteAll();
      
      res.json({
        success: true,
        message: `Deleted ${deletedCount} T03 Test records`,
        deletedCount
      });
    } catch (error) {
      console.error('❌ Error clearing T03 Test data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear T03 Test data',
        details: error.message
      });
    }
  }
}

module.exports = T03TestController;