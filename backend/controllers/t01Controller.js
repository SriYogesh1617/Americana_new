const T01Data = require('../models/T01Data');
const XLSX = require('xlsx');

// Calculate T01 data from cursor tables
const calculateT01Data = async (req, res) => {
  try {
    const { uploadBatchId } = req.body;
    
    if (!uploadBatchId) {
      return res.status(400).json({ error: 'uploadBatchId is required' });
    }

    console.log('🚀 Starting T01 calculation for batch:', uploadBatchId);
    
    const result = await T01Data.calculateT01Data(uploadBatchId);
    
    res.json({
      success: true,
      message: 'T01 data calculated successfully',
      uploadBatchId,
      result
    });

  } catch (error) {
    console.error('Error calculating T01 data:', error);
    res.status(500).json({ error: 'Failed to calculate T01 data', details: error.message });
  }
};

// Get T01 data
const getT01Data = async (req, res) => {
  try {
    const { upload_batch_id, uploadBatchId, cty, fgsku_code, month, year, page = 1, limit = 1000 } = req.query;
    const offset = (page - 1) * limit;
    
    // Handle both parameter names
    const batchId = upload_batch_id || uploadBatchId;
    
    let data;
    if (batchId) {
      data = await T01Data.findByUploadBatch(batchId);
    } else {
      data = await T01Data.findAll(parseInt(limit), offset);
    }

    // Apply additional filters if provided
    if (cty || fgsku_code || month || year) {
      data = data.filter(item => {
        if (cty && item.cty !== cty) return false;
        if (fgsku_code && item.fgsku_code !== fgsku_code) return false;
        if (month && item.month !== parseInt(month)) return false;
        if (year && item.year !== parseInt(year)) return false;
        return true;
      });
    }
    
    res.json({
      success: true,
      data,
      count: data.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error getting T01 data:', error);
    res.status(500).json({ error: 'Failed to get T01 data' });
  }
};

// Get T01 data as Excel-like array
const getT01DataAsArray = async (req, res) => {
  try {
    const { uploadBatchId, upload_batch_id } = req.query;
    
    // Handle both parameter names
    const batchId = uploadBatchId || upload_batch_id;
    
    if (!batchId) {
      return res.status(400).json({ error: 'uploadBatchId is required' });
    }

    const data = await T01Data.findByUploadBatch(batchId);
    
    if (data.length === 0) {
      return res.json({
        success: true,
        data: [],
        uploadBatchId
      });
    }

    // Convert to 2D array format
    const headers = ['CTY', 'Market', 'FGSKU Code', 'Demand Cases', 'Month', 'Production Environment', 'Safety Stock WH', 'Inventory Days Norm', 'Supply', 'Cons'];
    const arrayData = [headers];

    data.forEach((item, idx) => {
      // Excel row number (row 1 is header)
      const excelRow = idx + 2;
      // Use the Supply formula from database (which contains direct T02 row references)
      const supply = item.supply;
      const cons = `=@WB(D${excelRow},"=",I${excelRow})`;
      // Round demand cases to nearest integer
      const demandCases = Math.round(parseFloat(item.demand_cases));
      arrayData.push([
        item.cty,
        item.market,
        item.fgsku_code,
        demandCases,
        item.month,
        item.production_environment,
        item.safety_stock_wh,
        item.inventory_days_norm,
        supply,
        cons
      ]);
    });
    
    res.json({
      success: true,
      data: arrayData,
      uploadBatchId: batchId,
      count: data.length
    });

  } catch (error) {
    console.error('Error getting T01 data as array:', error);
    res.status(500).json({ error: 'Failed to get T01 data as array' });
  }
};

// Get T01 statistics
const getT01Stats = async (req, res) => {
  try {
    const stats = await T01Data.getStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting T01 stats:', error);
    res.status(500).json({ error: 'Failed to get T01 stats' });
  }
};

// Clear all T01 data
const clearT01Data = async (req, res) => {
  try {
    const result = await T01Data.clearAll();
    
    res.json({
      success: true,
      message: 'All T01 data cleared successfully',
      deletedCount: result.length
    });

  } catch (error) {
    console.error('Error clearing T01 data:', error);
    res.status(500).json({ error: 'Failed to clear T01 data' });
  }
};

// Export T01 data to Excel file
const exportT01ToExcel = async (req, res) => {
  try {
    const { uploadBatchId, upload_batch_id } = req.query;
    
    // Handle both parameter names
    const batchId = uploadBatchId || upload_batch_id;
    
    if (!batchId) {
      return res.status(400).json({ error: 'uploadBatchId is required' });
    }

    const data = await T01Data.findByUploadBatch(batchId);
    
    if (data.length === 0) {
      return res.status(404).json({ error: 'No T01 data found for the specified upload batch' });
    }

    // Prepare data for Excel export
    const excelData = data.map((item, idx) => {
      const excelRow = idx + 2;
      // Use the Supply formula from database (which contains direct T02 row references)
      const supply = item.supply;
      const cons = `=@WB(D${excelRow},"=",I${excelRow})`;
      // Round demand cases to nearest integer
      const demandCases = Math.round(parseFloat(item.demand_cases));
      return {
        'CTY': item.cty,
        'Market': item.market,
        'FGSKU Code': item.fgsku_code,
        'Demand Cases': demandCases,
        'Month': item.month,
        'Production Environment': item.production_environment,
        'Safety Stock WH': item.safety_stock_wh,
        'Inventory Days Norm': item.inventory_days_norm,
        'Supply': supply,
        'Cons': cons
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Apply Excel cell formatting
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 15 }, // CTY
      { width: 20 }, // Market
      { width: 15 }, // FGSKU Code
      { width: 15 }, // Demand Cases
      { width: 10 }, // Month
      { width: 20 }, // Production Environment
      { width: 18 }, // Safety Stock WH
      { width: 18 }, // Inventory Days Norm
      { width: 40 }, // Supply
      { width: 25 }  // Cons
    ];

    // Apply cell formatting
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      // FGSKU Code (column C, index 2) - number format but preserve display
      const fgskuCell = XLSX.utils.encode_cell({ r: row, c: 2 });
      if (worksheet[fgskuCell]) {
        worksheet[fgskuCell].t = 'n'; // number type
        worksheet[fgskuCell].z = '0'; // number format to preserve leading zeros
      }
      
      // Demand Cases (column D, index 3) - integer format
      const demandCell = XLSX.utils.encode_cell({ r: row, c: 3 });
      if (worksheet[demandCell]) {
        worksheet[demandCell].t = 'n';
        worksheet[demandCell].z = '0';
      }
      
      // Inventory Days Norm (column H, index 7) - 4 decimal places
      const inventoryCell = XLSX.utils.encode_cell({ r: row, c: 7 });
      if (worksheet[inventoryCell]) {
        worksheet[inventoryCell].t = 'n';
        worksheet[inventoryCell].z = '0.0000';
      }
      
      // Supply (column I, index 8) - keep as text formula
      const supplyCell = XLSX.utils.encode_cell({ r: row, c: 8 });
      if (worksheet[supplyCell]) {
        worksheet[supplyCell].t = 's'; // text type for formulas
      }
      
      // Cons (column J, index 9) - keep as text formula
      const consCell = XLSX.utils.encode_cell({ r: row, c: 9 });
      if (worksheet[consCell]) {
        worksheet[consCell].t = 's'; // text type for formulas
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'T_01');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=T_01_${batchId}_${Date.now()}.xlsx`);
    res.setHeader('Content-Length', buffer.length);

    // Send the file
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting T01 data to Excel:', error);
    res.status(500).json({ error: 'Failed to export T01 data to Excel' });
  }
};

// Update Supply formulas with T02 row references
const updateSupplyValues = async (req, res) => {
  try {
    const { uploadBatchId } = req.params;
    
    if (!uploadBatchId) {
      return res.status(400).json({ error: 'uploadBatchId is required' });
    }

    console.log(`🔄 Updating Supply formulas for upload batch: ${uploadBatchId}`);
    
    const result = await T01Data.updateSupplyValuesWithT02Data(uploadBatchId);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error updating Supply formulas:', error);
    res.status(500).json({ error: 'Failed to update Supply formulas', details: error.message });
  }
};

// Remove duplicate T01 records
const removeDuplicates = async (req, res) => {
  try {
    const { uploadBatchId } = req.params;
    
    if (!uploadBatchId) {
      return res.status(400).json({ error: 'uploadBatchId is required' });
    }

    console.log(`🧹 Removing duplicates for upload batch: ${uploadBatchId}`);
    
    const result = await T01Data.removeDuplicates(uploadBatchId);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error removing duplicates:', error);
    res.status(500).json({ error: 'Failed to remove duplicates', details: error.message });
  }
};

module.exports = {
  calculateT01Data,
  getT01Data,
  getT01Stats,
  clearT01Data,
  getT01DataAsArray,
  exportT01ToExcel,
  updateSupplyValues,
  removeDuplicates
}; 