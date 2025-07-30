const T02Data = require('../models/T02Data');
const XLSX = require('xlsx');

// Calculate T02 data from T01 data
const calculateT02Data = async (req, res) => {
  try {
    const { uploadBatchId } = req.body;
    
    if (!uploadBatchId) {
      return res.status(400).json({ error: 'uploadBatchId is required' });
    }

    console.log('🚀 Starting T02 calculation for batch:', uploadBatchId);
    
    const result = await T02Data.calculateT02Data(uploadBatchId);
    
    res.json({
      success: true,
      message: 'T02 data calculated successfully',
      uploadBatchId,
      result
    });

  } catch (error) {
    console.error('Error calculating T02 data:', error);
    res.status(500).json({ error: 'Failed to calculate T02 data', details: error.message });
  }
};

// Get T02 data
const getT02Data = async (req, res) => {
  try {
    const { upload_batch_id, uploadBatchId, cty, fgsku_code, wh, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Handle both parameter names
    const batchId = upload_batch_id || uploadBatchId;
    
    let data;
    if (batchId) {
      data = await T02Data.findByUploadBatchWithPagination(batchId, parseInt(limit), offset);
    } else {
      data = await T02Data.findAll(parseInt(limit), offset);
    }

    // Get total count for this upload batch
    const totalCount = await T02Data.getCountByUploadBatch(batchId);
    
    // Apply additional filters if provided
    if (cty || fgsku_code || wh) {
      data = data.filter(item => {
        if (cty && item.cty !== cty) return false;
        if (fgsku_code && item.fgsku_code !== fgsku_code) return false;
        if (wh && item.wh !== wh) return false;
        return true;
      });
    }
    
    res.json({
      success: true,
      data,
      count: data.length,
      totalCount: parseInt(totalCount),
      totalPages: Math.ceil(parseInt(totalCount) / parseInt(limit)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting T02 data:', error);
    res.status(500).json({ error: 'Failed to get T02 data' });
  }
};

// Get T02 data as 2D array for frontend display
const getT02DataAsArray = async (req, res) => {
  try {
    const { uploadBatchId, upload_batch_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Handle both parameter names
    const batchId = uploadBatchId || upload_batch_id;
    
    if (!batchId) {
      return res.status(400).json({ error: 'uploadBatchId is required' });
    }

    const data = await T02Data.findByUploadBatchWithPagination(batchId, parseInt(limit), offset);
    
    if (data.length === 0) {
      return res.json({
        success: true,
        data: [],
        uploadBatchId,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    }

    // Convert to 2D array format
    const headers = [
      'CTY', 'FGSKU Code', 'Month', 'Market', 'WH', 'Default WH Restrictions', 
      'SKU Specific Restrictions', 'Trim SKU', 'RM SKU', 'Customs', 
      'Transport Cost Per Case', 'Max GFC', 'Max KFC', 'Max NFC', 'FGWt Per Unit',
      'Custom Cost/Unit - GFC', 'Custom Cost/Unit - KFC', 'Custom Cost/Unit - NFC',
      'Qty GFC', 'Qty KFC', 'Qty NFC', 'Qty X', 'Max Arbit', 'Qty Total', 'WT GFC', 'WT KFC', 'WT NFC', 'Custom Duty', 'Max GFC 2', 'Max KFC 2', 'Max NFC 2', 'Pos GFC', 'Pos KFC', 'Pos NFC', 'Pos X', 'Max X', 'Row Cost'
    ];
    const arrayData = [headers];

    data.forEach(item => {
      arrayData.push([
        item.cty,
        item.fgsku_code,
        item.month,
        item.market,
        item.wh,
        item.default_wh_restrictions,
        item.sku_specific_restrictions,
        item.trim_sku,
        item.rm_sku,
        item.customs,
        item.transport_cost_per_case,
        item.max_gfc,
        item.max_kfc,
        item.max_nfc,
        item.fgwt_per_unit,
        item.custom_cost_per_unit_gfc,
        item.custom_cost_per_unit_kfc,
        item.custom_cost_per_unit_nfc,
        item.qty_gfc,
        item.qty_kfc,
        item.qty_nfc,
        item.qty_x,
        item.max_arbit,
        item.qty_total,
        item.wt_gfc,
        item.wt_kfc,
        item.wt_nfc,
        item.custom_duty,
        item.max_gfc_2,
        item.max_kfc_2,
        item.max_nfc_2,
        item.pos_gfc,
        item.pos_kfc,
        item.pos_nfc,
        item.pos_x,
        item.max_x,
        item.row_cost
      ]);
    });
    
    res.json({
      success: true,
      data: arrayData,
      uploadBatchId: batchId,
      count: data.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting T02 data as array:', error);
    res.status(500).json({ error: 'Failed to get T02 data as array' });
  }
};

// Get T02 statistics
const getT02Stats = async (req, res) => {
  try {
    const stats = await T02Data.getStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting T02 stats:', error);
    res.status(500).json({ error: 'Failed to get T02 stats' });
  }
};

// Clear all T02 data
const clearT02Data = async (req, res) => {
  try {
    const result = await T02Data.clearAll();
    
    res.json({
      success: true,
      message: 'All T02 data cleared successfully',
      deletedCount: result.length
    });

  } catch (error) {
    console.error('Error clearing T02 data:', error);
    res.status(500).json({ error: 'Failed to clear T02 data' });
  }
};

// Export T02 data to Excel file
const exportT02ToExcel = async (req, res) => {
  try {
    const { uploadBatchId, upload_batch_id } = req.query;
    
    // Handle both parameter names
    const batchId = uploadBatchId || upload_batch_id;
    
    if (!batchId) {
      return res.status(400).json({ error: 'uploadBatchId is required' });
    }

    const data = await T02Data.findByUploadBatch(batchId);
    
    if (data.length === 0) {
      return res.status(404).json({ error: 'No T02 data found for the specified upload batch' });
    }

    // Prepare data for Excel export
    const excelData = data.map(item => ({
      'CTY': item.cty,
      'FGSKU Code': item.fgsku_code,
      'Month': item.month,
      'Market': item.market,
      'WH': item.wh,
      'Default WH Restrictions': item.default_wh_restrictions,
      'SKU Specific Restrictions': item.sku_specific_restrictions,
      'Trim SKU': item.trim_sku,
      'RM SKU': item.rm_sku,
      'Customs': item.customs,
      'Transport Cost Per Case': item.transport_cost_per_case,
      'Max GFC': item.max_gfc,
      'Max KFC': item.max_kfc,
      'Max NFC': item.max_nfc,
      'FGWt Per Unit': item.fgwt_per_unit,
      'Custom Cost/Unit - GFC': item.custom_cost_per_unit_gfc,
      'Custom Cost/Unit - KFC': item.custom_cost_per_unit_kfc,
      'Custom Cost/Unit - NFC': item.custom_cost_per_unit_nfc,
      'Qty GFC': item.qty_gfc,
      'Qty KFC': item.qty_kfc,
      'Qty NFC': item.qty_nfc,
      'Qty X': item.qty_x,
      'Max Arbit': item.max_arbit,
      'Qty Total': item.qty_total,
      'WT GFC': item.wt_gfc,
      'WT KFC': item.wt_kfc,
      'WT NFC': item.wt_nfc,
      'Custom Duty': item.custom_duty,
      'Max GFC 2': item.max_gfc_2,
      'Max KFC 2': item.max_kfc_2,
      'Max NFC 2': item.max_nfc_2,
      'Pos GFC': item.pos_gfc,
      'Pos KFC': item.pos_kfc,
      'Pos NFC': item.pos_nfc,
      'Pos X': item.pos_x,
      'Max X': item.max_x,
      'Row Cost': item.row_cost,
      'Upload Batch ID': item.upload_batch_id,
      'Created At': item.created_at
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'T02_Data');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=T02_Data_${batchId}_${Date.now()}.xlsx`);
    res.setHeader('Content-Length', buffer.length);

    // Send the file
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting T02 data to Excel:', error);
    res.status(500).json({ error: 'Failed to export T02 data to Excel' });
  }
};

module.exports = {
  calculateT02Data,
  getT02Data,
  getT02Stats,
  clearT02Data,
  getT02DataAsArray,
  exportT02ToExcel
}; 