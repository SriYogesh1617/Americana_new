const T02Data = require('../models/T02Data');
const T01Data = require('../models/T01Data');
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

    // Prepare data for Excel export with exact required format
    const excelData = data.map(item => ({
      'CTY': item.cty,
      'WH': item.wh,
      'Default WH Restrictions': item.default_wh_restrictions,
      'SKU specific Restrictions': item.sku_specific_restrictions,
      'FGSKUCode': item.fgsku_code,
      'TrimSKU': item.trim_sku,
      'RMSKU': item.rm_sku,
      'MthNum': item.month,
      'Market': item.market,
      'Customs?': item.customs,
      'TransportCostPerCase': item.transport_cost_per_case,
      'Max_GFC': item.max_gfc,
      'Max_KFC': item.max_kfc,
      'Max_NFC': item.max_nfc,
      'FGWtPerUnit': item.fgwt_per_unit,
      'Custom Cost/Unit - GFC': item.custom_cost_per_unit_gfc,
      'Custom Cost/Unit - KFC': item.custom_cost_per_unit_kfc,
      'Custom Cost/Unit - NFC': item.custom_cost_per_unit_nfc,
      'Max_Arbit': item.max_arbit,
      'Qty_GFC': item.qty_gfc,
      'Qty_KFC': item.qty_kfc,
      'Qty_NFC': item.qty_nfc,
      'Qty_X': item.qty_x,
      'Qty_Total': item.qty_total,
      'Wt_GFC': item.wt_gfc,
      'Wt_KFC': item.wt_kfc,
      'Wt_NFC': item.wt_nfc,
      'Custom Duty': item.custom_duty,
      'Max_GFC_2': item.max_gfc_2,
      'Max_KFC_2': item.max_kfc_2,
      'Max_NFC_2': item.max_nfc_2,
      'Pos_GFC': item.pos_gfc,
      'Pos_KFC': item.pos_kfc,
      'Pos_NFC': item.pos_nfc,
      'Pos_X': item.pos_x,
      'Max_X': item.max_x,
      'RowCost': item.row_cost
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Apply formatting to columns
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Define column formatting
    const columnFormats = {
      'CTY': { t: 's' }, // Text
      'WH': { t: 's' }, // Text
      'Default WH Restrictions': { t: 's' }, // Text
      'SKU specific Restrictions': { t: 's' }, // Text
      'FGSKUCode': { t: 'n', z: '0' }, // Number format for SKU (preserves display)
      'TrimSKU': { t: 's', z: '@' }, // Text format
      'RMSKU': { t: 's', z: '@' }, // Text format
      'MthNum': { t: 'n', z: '0' }, // Number (integer)
      'Market': { t: 's' }, // Text
      'Customs?': { t: 's' }, // Text
      'TransportCostPerCase': { t: 'n', z: '0.0000' }, // Number (4 decimals)
      'Max_GFC': { t: 'n', z: '0' }, // Number (integer)
      'Max_KFC': { t: 'n', z: '0' }, // Number (integer)
      'Max_NFC': { t: 'n', z: '0' }, // Number (integer)
      'FGWtPerUnit': { t: 'n', z: '0.0000' }, // Number (4 decimals)
      'Custom Cost/Unit - GFC': { t: 'n', z: '0.0000' }, // Number (4 decimals)
      'Custom Cost/Unit - KFC': { t: 'n', z: '0.0000' }, // Number (4 decimals)
      'Custom Cost/Unit - NFC': { t: 'n', z: '0.0000' }, // Number (4 decimals)
      'Max_Arbit': { t: 'n', z: '0' }, // Number (integer)
      'Qty_GFC': { t: 'n', z: '0' }, // Number (integer)
      'Qty_KFC': { t: 'n', z: '0' }, // Number (integer)
      'Qty_NFC': { t: 'n', z: '0' }, // Number (integer)
      'Qty_X': { t: 'n', z: '0' }, // Number (integer)
      'Qty_Total': { t: 's' }, // Text (Excel formula)
      'Wt_GFC': { t: 's' }, // Text (Excel formula)
      'Wt_KFC': { t: 's' }, // Text (Excel formula)
      'Wt_NFC': { t: 's' }, // Text (Excel formula)
      'Custom Duty': { t: 's' }, // Text (Excel formula)
      'Max_GFC_2': { t: 's' }, // Text (Excel formula)
      'Max_KFC_2': { t: 's' }, // Text (Excel formula)
      'Max_NFC_2': { t: 's' }, // Text (Excel formula)
      'Pos_GFC': { t: 's' }, // Text (Excel formula)
      'Pos_KFC': { t: 's' }, // Text (Excel formula)
      'Pos_NFC': { t: 's' }, // Text (Excel formula)
      'Pos_X': { t: 's' }, // Text (Excel formula)
      'Max_X': { t: 's' }, // Text (Excel formula)
      'RowCost': { t: 's' } // Text (Excel formula)
    };

    // Get header row to map column names to indices
    const headers = Object.keys(excelData[0]);
    
    // Apply formatting to each column
    for (let col = 0; col <= range.e.c; col++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
      const headerValue = worksheet[headerCell]?.v;
      
      if (headerValue && columnFormats[headerValue]) {
        const format = columnFormats[headerValue];
        
        // Apply formatting to all cells in this column
        for (let row = 1; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (worksheet[cellAddress]) {
            // Apply cell type and number format
            worksheet[cellAddress].t = format.t;
            if (format.z) {
              worksheet[cellAddress].z = format.z;
            }
            
            // For text fields that should be treated as text (like SKU codes)
            if (format.z === '@') {
              worksheet[cellAddress].t = 's';
              // Ensure the value is treated as text
              if (worksheet[cellAddress].v !== undefined) {
                worksheet[cellAddress].v = String(worksheet[cellAddress].v);
              }
            }
          }
        }
      }
    }

    // Set column widths for better readability
    const columnWidths = headers.map(header => {
      switch(header) {
        case 'FGSKUCode':
        case 'TrimSKU':
        case 'RMSKU':
          return { wch: 15 };
        case 'Default WH Restrictions':
        case 'SKU specific Restrictions':
          return { wch: 25 };
        case 'Custom Cost/Unit - GFC':
        case 'Custom Cost/Unit - KFC':
        case 'Custom Cost/Unit - NFC':
          return { wch: 20 };
        case 'TransportCostPerCase':
        case 'FGWtPerUnit':
          return { wch: 18 };
        default:
          return { wch: 12 };
      }
    });
    
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'T_02');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=T_02_${batchId}_${Date.now()}.xlsx`);
    res.setHeader('Content-Length', buffer.length);

    // Send the file
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting T02 data to Excel:', error);
    res.status(500).json({ error: 'Failed to export T02 data to Excel' });
  }
};

// Export combined T01 and T02 data to single XLSM file
const exportCombinedToExcel = async (req, res) => {
  try {
    const { uploadBatchId, upload_batch_id } = req.query;
    
    // Handle both parameter names
    const batchId = uploadBatchId || upload_batch_id;
    
    if (!batchId) {
      return res.status(400).json({ error: 'uploadBatchId is required' });
    }

    // Get both T01 and T02 data
    const [t01Data, t02Data] = await Promise.all([
      T01Data.findByUploadBatch(batchId),
      T02Data.findByUploadBatch(batchId)
    ]);
    
    if (t01Data.length === 0 && t02Data.length === 0) {
      return res.status(404).json({ error: 'No T01 or T02 data found for the specified upload batch' });
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // === T01 SHEET ===
    if (t01Data.length > 0) {
      console.log(`📊 Adding T01 data: ${t01Data.length} records`);
      
             // Prepare T01 data for Excel export
       const t01ExcelData = t01Data.map((item, idx) => {
         const excelRow = idx + 2;
         // Use the Supply formula from database (which contains direct T02 row references)
         const supply = item.supply;
         const cons = `=@WB(D${excelRow},"=",I${excelRow})`;
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

      // Create T01 worksheet
      const t01Worksheet = XLSX.utils.json_to_sheet(t01ExcelData);
      
      // Apply T01 formatting
      const t01Range = XLSX.utils.decode_range(t01Worksheet['!ref']);
      const t01Headers = Object.keys(t01ExcelData[0]);
      
      // T01 column formatting
      const t01ColumnFormats = {
        'CTY': { t: 's' },
        'Market': { t: 's' },
        'FGSKU Code': { t: 'n', z: '0' }, // Number format for SKU (preserves display)
        'Demand Cases': { t: 'n', z: '0' }, // Integer
        'Month': { t: 'n', z: '0' }, // Integer
        'Production Environment': { t: 's' },
        'Safety Stock WH': { t: 'n', z: '0.00' }, // 2 decimals
        'Inventory Days Norm': { t: 'n', z: '0.00' }, // 2 decimals
        'Supply': { t: 's' }, // Formula
        'Cons': { t: 's' } // Formula
      };
      
      // Apply T01 formatting
      for (let col = 0; col <= t01Range.e.c; col++) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
        const headerValue = t01Worksheet[headerCell]?.v;
        
        if (headerValue && t01ColumnFormats[headerValue]) {
          const format = t01ColumnFormats[headerValue];
          
          for (let row = 1; row <= t01Range.e.r; row++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (t01Worksheet[cellAddress]) {
              t01Worksheet[cellAddress].t = format.t;
              if (format.z) {
                t01Worksheet[cellAddress].z = format.z;
              }
              
              if (format.z === '@') {
                t01Worksheet[cellAddress].t = 's';
                if (t01Worksheet[cellAddress].v !== undefined) {
                  t01Worksheet[cellAddress].v = String(t01Worksheet[cellAddress].v);
                }
              }
            }
          }
        }
      }
      
      // Set T01 column widths
      const t01ColumnWidths = t01Headers.map(header => {
        switch(header) {
          case 'FGSKU Code':
            return { wch: 15 };
          case 'Production Environment':
            return { wch: 20 };
          case 'Supply':
            return { wch: 25 };
          default:
            return { wch: 12 };
        }
      });
      
      t01Worksheet['!cols'] = t01ColumnWidths;
      XLSX.utils.book_append_sheet(workbook, t01Worksheet, 'T_01');
    }

    // === T02 SHEET ===
    if (t02Data.length > 0) {
      console.log(`📊 Adding T02 data: ${t02Data.length} records`);
      
      // Prepare T02 data for Excel export (using the same format as the standalone export)
      const t02ExcelData = t02Data.map(item => ({
        'CTY': item.cty,
        'WH': item.wh,
        'Default WH Restrictions': item.default_wh_restrictions,
        'SKU specific Restrictions': item.sku_specific_restrictions,
        'FGSKUCode': item.fgsku_code,
        'TrimSKU': item.trim_sku,
        'RMSKU': item.rm_sku,
        'MthNum': item.month,
        'Market': item.market,
        'Customs?': item.customs,
        'TransportCostPerCase': item.transport_cost_per_case,
        'Max_GFC': item.max_gfc,
        'Max_KFC': item.max_kfc,
        'Max_NFC': item.max_nfc,
        'FGWtPerUnit': item.fgwt_per_unit,
        'Custom Cost/Unit - GFC': item.custom_cost_per_unit_gfc,
        'Custom Cost/Unit - KFC': item.custom_cost_per_unit_kfc,
        'Custom Cost/Unit - NFC': item.custom_cost_per_unit_nfc,
        'Max_Arbit': item.max_arbit,
        'Qty_GFC': item.qty_gfc,
        'Qty_KFC': item.qty_kfc,
        'Qty_NFC': item.qty_nfc,
        'Qty_X': item.qty_x,
        'Qty_Total': item.qty_total,
        'Wt_GFC': item.wt_gfc,
        'Wt_KFC': item.wt_kfc,
        'Wt_NFC': item.wt_nfc,
        'Custom Duty': item.custom_duty,
        'Max_GFC_2': item.max_gfc_2,
        'Max_KFC_2': item.max_kfc_2,
        'Max_NFC_2': item.max_nfc_2,
        'Pos_GFC': item.pos_gfc,
        'Pos_KFC': item.pos_kfc,
        'Pos_NFC': item.pos_nfc,
        'Pos_X': item.pos_x,
        'Max_X': item.max_x,
        'RowCost': item.row_cost
      }));

      // Create T02 worksheet
      const t02Worksheet = XLSX.utils.json_to_sheet(t02ExcelData);
      
      // Apply T02 formatting (reuse the same logic as standalone export)
      const t02Range = XLSX.utils.decode_range(t02Worksheet['!ref']);
      const t02Headers = Object.keys(t02ExcelData[0]);
      
      // T02 column formatting
      const t02ColumnFormats = {
        'CTY': { t: 's' },
        'WH': { t: 's' },
        'Default WH Restrictions': { t: 's' },
        'SKU specific Restrictions': { t: 's' },
        'FGSKUCode': { t: 'n', z: '0' }, // Number format for SKU (preserves display)
        'TrimSKU': { t: 's', z: '@' },
        'RMSKU': { t: 's', z: '@' },
        'MthNum': { t: 'n', z: '0' },
        'Market': { t: 's' },
        'Customs?': { t: 's' },
        'TransportCostPerCase': { t: 'n', z: '0.0000' },
        'Max_GFC': { t: 'n', z: '0' },
        'Max_KFC': { t: 'n', z: '0' },
        'Max_NFC': { t: 'n', z: '0' },
        'FGWtPerUnit': { t: 'n', z: '0.0000' },
        'Custom Cost/Unit - GFC': { t: 'n', z: '0.0000' },
        'Custom Cost/Unit - KFC': { t: 'n', z: '0.0000' },
        'Custom Cost/Unit - NFC': { t: 'n', z: '0.0000' },
        'Max_Arbit': { t: 'n', z: '0' },
        'Qty_GFC': { t: 'n', z: '0' },
        'Qty_KFC': { t: 'n', z: '0' },
        'Qty_NFC': { t: 'n', z: '0' },
        'Qty_X': { t: 'n', z: '0' },
        'Qty_Total': { t: 's' },
        'Wt_GFC': { t: 's' },
        'Wt_KFC': { t: 's' },
        'Wt_NFC': { t: 's' },
        'Custom Duty': { t: 's' },
        'Max_GFC_2': { t: 's' },
        'Max_KFC_2': { t: 's' },
        'Max_NFC_2': { t: 's' },
        'Pos_GFC': { t: 's' },
        'Pos_KFC': { t: 's' },
        'Pos_NFC': { t: 's' },
        'Pos_X': { t: 's' },
        'Max_X': { t: 's' },
        'RowCost': { t: 's' }
      };
      
      // Apply T02 formatting
      for (let col = 0; col <= t02Range.e.c; col++) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
        const headerValue = t02Worksheet[headerCell]?.v;
        
        if (headerValue && t02ColumnFormats[headerValue]) {
          const format = t02ColumnFormats[headerValue];
          
          for (let row = 1; row <= t02Range.e.r; row++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (t02Worksheet[cellAddress]) {
              t02Worksheet[cellAddress].t = format.t;
              if (format.z) {
                t02Worksheet[cellAddress].z = format.z;
              }
              
              if (format.z === '@') {
                t02Worksheet[cellAddress].t = 's';
                if (t02Worksheet[cellAddress].v !== undefined) {
                  t02Worksheet[cellAddress].v = String(t02Worksheet[cellAddress].v);
                }
              }
            }
          }
        }
      }
      
      // Set T02 column widths
      const t02ColumnWidths = t02Headers.map(header => {
        switch(header) {
          case 'FGSKUCode':
          case 'TrimSKU':
          case 'RMSKU':
            return { wch: 15 };
          case 'Default WH Restrictions':
          case 'SKU specific Restrictions':
            return { wch: 25 };
          case 'Custom Cost/Unit - GFC':
          case 'Custom Cost/Unit - KFC':
          case 'Custom Cost/Unit - NFC':
            return { wch: 20 };
          case 'TransportCostPerCase':
          case 'FGWtPerUnit':
            return { wch: 18 };
          default:
            return { wch: 12 };
        }
      });
      
      t02Worksheet['!cols'] = t02ColumnWidths;
      XLSX.utils.book_append_sheet(workbook, t02Worksheet, 'T_02');
    }

    // Generate XLSM buffer (macro-enabled format)
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsm' });

    // Set response headers for XLSM
    res.setHeader('Content-Type', 'application/vnd.ms-excel.sheet.macroEnabled.12');
    res.setHeader('Content-Disposition', `attachment; filename=T01_T02_Combined_${batchId}_${Date.now()}.xlsm`);
    res.setHeader('Content-Length', buffer.length);

    console.log(`✅ Generated combined T01/T02 XLSM file successfully`);

    // Send the file
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting combined T01/T02 data to Excel:', error);
    res.status(500).json({ error: 'Failed to export combined T01/T02 data to Excel', details: error.message });
  }
};

module.exports = {
  calculateT02Data,
  getT02Data,
  getT02Stats,
  clearT02Data,
  getT02DataAsArray,
  exportT02ToExcel,
  exportCombinedToExcel
}; 