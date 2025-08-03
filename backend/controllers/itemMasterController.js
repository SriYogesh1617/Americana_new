const ItemMasterLookup = require('../models/ItemMasterLookup');

// Export combined Item Master data as CSV
const exportCombinedItemMasterToCSV = async (req, res) => {
  try {
    console.log('📦 Starting combined Item Master CSV export...');
    
    // Get combined item master data
    const itemMasterData = await ItemMasterLookup.getCombinedItemMasterAsArray();
    
    if (itemMasterData.length === 0) {
      return res.status(404).json({ error: 'No Item Master data found' });
    }

    // Create CSV content
    const headers = ['Item Code', 'Unit Weight', 'Description', 'Item Status', 'Factory'];
    const csvRows = [headers.join(',')];
    
    for (const record of itemMasterData) {
      const row = [
        `"${record.item_code || ''}"`,
        record.unit_weight || 0,
        `"${(record.description || '').replace(/"/g, '""')}"`,
        `"${record.item_status || ''}"`,
        `"${record.factory || ''}"`
      ];
      csvRows.push(row.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Combined_Item_Master_${Date.now()}.csv`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
    
    console.log(`✅ Exported ${itemMasterData.length} Item Master records to CSV`);
    
    // Send the CSV content
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting Item Master data to CSV:', error);
    res.status(500).json({ error: 'Failed to export Item Master data to CSV', details: error.message });
  }
};

// Get combined Item Master data as JSON
const getCombinedItemMasterData = async (req, res) => {
  try {
    console.log('📦 Getting combined Item Master data...');
    
    const itemMasterData = await ItemMasterLookup.getCombinedItemMasterAsArray();
    
    res.json({
      success: true,
      data: itemMasterData,
      count: itemMasterData.length,
      message: 'Combined Item Master data retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting Item Master data:', error);
    res.status(500).json({ error: 'Failed to get Item Master data', details: error.message });
  }
};

// Get Item Master statistics
const getItemMasterStats = async (req, res) => {
  try {
    console.log('📊 Getting Item Master statistics...');
    
    const itemMasterData = await ItemMasterLookup.getCombinedItemMasterAsArray();
    
    // Calculate statistics
    const factoryCounts = { GFC: 0, KFC: 0, NFC: 0 };
    const weightRanges = { min: Infinity, max: 0, total: 0 };
    let validWeightCount = 0;
    
    for (const record of itemMasterData) {
      factoryCounts[record.factory]++;
      
      if (record.unit_weight > 0) {
        validWeightCount++;
        weightRanges.min = Math.min(weightRanges.min, record.unit_weight);
        weightRanges.max = Math.max(weightRanges.max, record.unit_weight);
        weightRanges.total += record.unit_weight;
      }
    }
    
    const stats = {
      totalRecords: itemMasterData.length,
      factoryBreakdown: factoryCounts,
      validWeightCount,
      averageWeight: validWeightCount > 0 ? weightRanges.total / validWeightCount : 0,
      minWeight: weightRanges.min === Infinity ? 0 : weightRanges.min,
      maxWeight: weightRanges.max
    };
    
    res.json({
      success: true,
      stats,
      message: 'Item Master statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting Item Master statistics:', error);
    res.status(500).json({ error: 'Failed to get Item Master statistics', details: error.message });
  }
};

module.exports = {
  exportCombinedItemMasterToCSV,
  getCombinedItemMasterData,
  getItemMasterStats
}; 