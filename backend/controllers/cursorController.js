const DemandCursor = require('../models/DemandCursor');
const DemandCountryMasterCursor = require('../models/DemandCountryMasterCursor');
const BaseScenarioConfigurationCursor = require('../models/BaseScenarioConfigurationCursor');
const CapacityCursor = require('../models/CapacityCursor');
const FreightStorageCostsCursor = require('../models/FreightStorageCostsCursor');

// Get demand cursor data
const getDemandCursorData = async (req, res) => {
  try {
    const { workbook_id, worksheet_id, upload_batch_id, cell_type, column_name } = req.query;
    
    const filters = {};
    if (workbook_id) filters.workbook_id = workbook_id;
    if (worksheet_id) filters.worksheet_id = worksheet_id;
    if (upload_batch_id) filters.upload_batch_id = upload_batch_id;
    if (cell_type) filters.cell_type = cell_type;
    if (column_name) filters.column_name = column_name;

    const data = await DemandCursor.getFilteredData(filters);
    
    res.json({
      success: true,
      data,
      count: data.length
    });

  } catch (error) {
    console.error('Error getting demand cursor data:', error);
    res.status(500).json({ error: 'Failed to get demand cursor data' });
  }
};

// Get demand cursor data as 2D array
const getDemandCursorDataAsArray = async (req, res) => {
  try {
    const { worksheetId } = req.params;
    
    const arrayData = await DemandCursor.getAsArray(worksheetId);
    
    res.json({
      success: true,
      data: arrayData,
      worksheetId
    });

  } catch (error) {
    console.error('Error getting demand cursor data as array:', error);
    res.status(500).json({ error: 'Failed to get demand cursor data as array' });
  }
};

// Get demand country master cursor data
const getDemandCountryMasterCursorData = async (req, res) => {
  try {
    const { workbook_id, worksheet_id, upload_batch_id, cell_type, column_name } = req.query;
    
    const filters = {};
    if (workbook_id) filters.workbook_id = workbook_id;
    if (worksheet_id) filters.worksheet_id = worksheet_id;
    if (upload_batch_id) filters.upload_batch_id = upload_batch_id;
    if (cell_type) filters.cell_type = cell_type;
    if (column_name) filters.column_name = column_name;

    const data = await DemandCountryMasterCursor.getFilteredData(filters);
    
    res.json({
      success: true,
      data,
      count: data.length
    });

  } catch (error) {
    console.error('Error getting demand country master cursor data:', error);
    res.status(500).json({ error: 'Failed to get demand country master cursor data' });
  }
};

// Get demand country master cursor data as 2D array
const getDemandCountryMasterCursorDataAsArray = async (req, res) => {
  try {
    const { worksheetId } = req.params;
    
    const arrayData = await DemandCountryMasterCursor.getAsArray(worksheetId);
    
    res.json({
      success: true,
      data: arrayData,
      worksheetId
    });

  } catch (error) {
    console.error('Error getting demand country master cursor data as array:', error);
    res.status(500).json({ error: 'Failed to get demand country master cursor data as array' });
  }
};

// Get base scenario configuration cursor data
const getBaseScenarioConfigurationCursorData = async (req, res) => {
  try {
    const { workbook_id, worksheet_id, upload_batch_id, cell_type, column_name } = req.query;
    
    const filters = {};
    if (workbook_id) filters.workbook_id = workbook_id;
    if (worksheet_id) filters.worksheet_id = worksheet_id;
    if (upload_batch_id) filters.upload_batch_id = upload_batch_id;
    if (cell_type) filters.cell_type = cell_type;
    if (column_name) filters.column_name = column_name;

    const data = await BaseScenarioConfigurationCursor.getFilteredData(filters);
    
    res.json({
      success: true,
      data,
      count: data.length
    });

  } catch (error) {
    console.error('Error getting base scenario configuration cursor data:', error);
    res.status(500).json({ error: 'Failed to get base scenario configuration cursor data' });
  }
};

// Get base scenario configuration cursor data as 2D array
const getBaseScenarioConfigurationCursorDataAsArray = async (req, res) => {
  try {
    const { worksheetId } = req.params;
    
    const arrayData = await BaseScenarioConfigurationCursor.getAsArray(worksheetId);
    
    res.json({
      success: true,
      data: arrayData,
      worksheetId
    });

  } catch (error) {
    console.error('Error getting base scenario configuration cursor data as array:', error);
    res.status(500).json({ error: 'Failed to get base scenario configuration cursor data as array' });
  }
};

// Get capacity cursor data
const getCapacityCursorData = async (req, res) => {
  try {
    const { workbook_id, worksheet_id, upload_batch_id, cell_type, column_name } = req.query;
    
    const filters = {};
    if (workbook_id) filters.workbook_id = workbook_id;
    if (worksheet_id) filters.worksheet_id = worksheet_id;
    if (upload_batch_id) filters.upload_batch_id = upload_batch_id;
    if (cell_type) filters.cell_type = cell_type;
    if (column_name) filters.column_name = column_name;

    const data = await CapacityCursor.getFilteredData(filters);
    
    res.json({
      success: true,
      data,
      count: data.length
    });

  } catch (error) {
    console.error('Error getting capacity cursor data:', error);
    res.status(500).json({ error: 'Failed to get capacity cursor data' });
  }
};

// Get freight storage costs cursor data
const getFreightStorageCostsCursorData = async (req, res) => {
  try {
    const { workbook_id, worksheet_id, upload_batch_id, cell_type, column_name } = req.query;
    
    const filters = {};
    if (workbook_id) filters.workbook_id = workbook_id;
    if (worksheet_id) filters.worksheet_id = worksheet_id;
    if (upload_batch_id) filters.upload_batch_id = upload_batch_id;
    if (cell_type) filters.cell_type = cell_type;
    if (column_name) filters.column_name = column_name;

    const data = await FreightStorageCostsCursor.getFilteredData(filters);
    
    res.json({
      success: true,
      data,
      count: data.length
    });

  } catch (error) {
    console.error('Error getting freight storage costs cursor data:', error);
    res.status(500).json({ error: 'Failed to get freight storage costs cursor data' });
  }
};

// Get statistics for all cursor tables
const getCursorStats = async (req, res) => {
  try {
    const [
      demandStats,
      demandCountryMasterStats,
      baseScenarioConfigStats,
      capacityStats,
      freightStorageStats
    ] = await Promise.all([
      DemandCursor.getStats(),
      DemandCountryMasterCursor.getStats(),
      BaseScenarioConfigurationCursor.getStats(),
      CapacityCursor.getStats(),
      FreightStorageCostsCursor.getStats()
    ]);

    res.json({
      success: true,
      stats: {
        demand: demandStats,
        demandCountryMaster: demandCountryMasterStats,
        baseScenarioConfiguration: baseScenarioConfigStats,
        capacity: capacityStats,
        freightStorageCosts: freightStorageStats
      }
    });

  } catch (error) {
    console.error('Error getting cursor stats:', error);
    res.status(500).json({ error: 'Failed to get cursor stats' });
  }
};

// Get upload batches
const getUploadBatches = async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    // Get unique upload batch IDs from all cursor tables
    const [demandBatches, demandCountryMasterBatches, baseScenarioConfigBatches, capacityBatches, freightStorageBatches] = await Promise.all([
      DemandCursor.getFilteredData({}),
      DemandCountryMasterCursor.getFilteredData({}),
      BaseScenarioConfigurationCursor.getFilteredData({}),
      CapacityCursor.getFilteredData({}),
      FreightStorageCostsCursor.getFilteredData({})
    ]);

    // Extract unique upload batch IDs from cursor tables
    const allBatches = new Set();
    
    demandBatches.forEach(item => item.upload_batch_id && allBatches.add(item.upload_batch_id));
    demandCountryMasterBatches.forEach(item => item.upload_batch_id && allBatches.add(item.upload_batch_id));
    baseScenarioConfigBatches.forEach(item => item.upload_batch_id && allBatches.add(item.upload_batch_id));
    capacityBatches.forEach(item => item.upload_batch_id && allBatches.add(item.upload_batch_id));
    freightStorageBatches.forEach(item => item.upload_batch_id && allBatches.add(item.upload_batch_id));

    // Also check for upload batches from regular upload tables
    try {
      const uploadBatchesResult = await query(`
        SELECT DISTINCT upload_batch_id, created_at 
        FROM (
          SELECT upload_batch_id, created_at FROM demand_cursor WHERE upload_batch_id IS NOT NULL
          UNION
          SELECT upload_batch_id, created_at FROM demand_country_master_cursor WHERE upload_batch_id IS NOT NULL
          UNION
          SELECT upload_batch_id, created_at FROM base_scenario_configuration_cursor WHERE upload_batch_id IS NOT NULL
          UNION
          SELECT upload_batch_id, created_at FROM capacity_cursor WHERE upload_batch_id IS NOT NULL
          UNION
          SELECT upload_batch_id, created_at FROM freight_storage_costs_cursor WHERE upload_batch_id IS NOT NULL
          UNION
          SELECT upload_batch_id, created_at FROM t01_data WHERE upload_batch_id IS NOT NULL
          UNION
          SELECT upload_batch_id, created_at FROM t02_data WHERE upload_batch_id IS NOT NULL
        ) AS all_batches
        ORDER BY created_at DESC
      `);

      uploadBatchesResult.rows.forEach(row => {
        if (row.upload_batch_id) {
          allBatches.add(row.upload_batch_id);
        }
      });
    } catch (dbError) {
      console.log('Could not fetch upload batches from database:', dbError.message);
    }

    // If no batches found, create a sample batch for testing
    if (allBatches.size === 0) {
      const sampleBatchId = 'sample-batch-' + Date.now();
      allBatches.add(sampleBatchId);
    }

    const batches = Array.from(allBatches).map(batchId => ({
      upload_batch_id: batchId,
      created_at: new Date().toISOString()
    }));

    res.json({
      success: true,
      data: batches,
      count: batches.length
    });

  } catch (error) {
    console.error('Error getting upload batches:', error);
    res.status(500).json({ error: 'Failed to get upload batches' });
  }
};

// Clear all cursor data
const clearAllCursorData = async (req, res) => {
  try {
    const [
      demandResult,
      demandCountryMasterResult,
      baseScenarioConfigResult,
      capacityResult,
      freightStorageResult
    ] = await Promise.all([
      DemandCursor.clearAll(),
      DemandCountryMasterCursor.clearAll(),
      BaseScenarioConfigurationCursor.clearAll(),
      CapacityCursor.clearAll(),
      FreightStorageCostsCursor.clearAll()
    ]);

    res.json({
      success: true,
      message: 'All cursor data cleared successfully',
      results: {
        demand: demandResult.length,
        demandCountryMaster: demandCountryMasterResult.length,
        baseScenarioConfiguration: baseScenarioConfigResult.length,
        capacity: capacityResult.length,
        freightStorageCosts: freightStorageResult.length
      }
    });

  } catch (error) {
    console.error('Error clearing cursor data:', error);
    res.status(500).json({ error: 'Failed to clear cursor data' });
  }
};

module.exports = {
  getDemandCursorData,
  getDemandCursorDataAsArray,
  getDemandCountryMasterCursorData,
  getDemandCountryMasterCursorDataAsArray,
  getBaseScenarioConfigurationCursorData,
  getBaseScenarioConfigurationCursorDataAsArray,
  getCapacityCursorData,
  getFreightStorageCostsCursorData,
  getCursorStats,
  getUploadBatches,
  clearAllCursorData
}; 