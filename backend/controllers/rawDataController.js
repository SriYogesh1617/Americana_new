const { query } = require('../config/database');
const Workbook = require('../models/Workbook');
const Worksheet = require('../models/Worksheet');
const SheetData = require('../models/SheetData');
const ProcessedDemandData = require('../models/ProcessedDemandData');

// Helper function to convert sheet data to array
const convertSheetDataToArray = (sheetData) => {
  if (!sheetData || sheetData.length === 0) return [];

  // Find the maximum row and column indices
  let maxRow = 0;
  let maxCol = 0;
  
  sheetData.forEach(cell => {
    if (cell.row_index > maxRow) maxRow = cell.row_index;
    if (cell.column_index > maxCol) maxCol = cell.column_index;
  });

  // Create 2D array
  const dataArray = [];
  for (let row = 0; row <= maxRow; row++) {
    const rowData = [];
    for (let col = 0; col <= maxCol; col++) {
      const cell = sheetData.find(c => c.row_index === row && c.column_index === col);
      rowData[col] = cell ? cell.cell_value : '';
    }
    dataArray.push(rowData);
  }

  return dataArray;
};

// Create dynamic month lookup from Planning time period sheet
const createDynamicMonthLookup = async () => {
  try {
    console.log('🔍 Creating dynamic month lookup from Planning time period sheet...');

    // Find Base_scenario_configuration workbook
    const workbookResult = await query(
      "SELECT id FROM workbooks WHERE workbook_name = 'Base_scenario_configuration' LIMIT 1"
    );

    if (workbookResult.rows.length === 0) {
      console.log('⚠️ Base_scenario_configuration workbook not found, using default mapping');
      return {};
    }

    const workbookId = workbookResult.rows[0].id;

    // Find Planning time period worksheet
    const worksheetResult = await query(
      "SELECT id FROM worksheets WHERE workbook_id = $1 AND sheet_name = 'Planning time period' LIMIT 1",
      [workbookId]
    );

    if (worksheetResult.rows.length === 0) {
      console.log('⚠️ Planning time period worksheet not found, using default mapping');
      return {};
    }

    const sheetId = worksheetResult.rows[0].id;
    const sheetData = await SheetData.findByWorksheet(sheetId, null, 0);
    
    if (!sheetData || sheetData.length === 0) {
      console.log('⚠️ No data found in Planning time period sheet, using default mapping');
      return {};
    }

    const dataArray = convertSheetDataToArray(sheetData);
    console.log(`📊 Planning sheet has ${dataArray.length} rows`);

    const monthLookup = {};
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Process each row starting from row 1 (skip header)
    for (let rowIndex = 1; rowIndex < dataArray.length; rowIndex++) {
      const row = dataArray[rowIndex];
      
      if (row.length >= 3) {
        const monthNum = row[0]; // Month number (5, 6, 7, etc.)
        const monthName = row[1]; // Month name (June, July, etc.)
        const year = row[2]; // Year (2025, 2026, etc.)

        if (monthNum && monthName && year) {
          // Find the month number (1-12) from month name
          const monthIndex = monthNames.findIndex(name => 
            monthName.toLowerCase().includes(name.toLowerCase())
          );

          if (monthIndex !== -1) {
            // Create key in format "MM-YYYY"
            const monthKey = `${String(monthIndex + 1).padStart(2, '0')}-${year}`;
            monthLookup[monthKey] = parseInt(monthNum);
            
            console.log(`📅 Mapped: ${monthKey} (${monthName} ${year}) → Month ${monthNum}`);
          }
        }
      }
    }

    console.log('✅ Dynamic month lookup created:', monthLookup);
    return monthLookup;

  } catch (error) {
    console.error('❌ Error creating dynamic month lookup:', error);
    return {};
  }
};

// Helper function to get CTY from Country Master
const getCtyFromCountryMaster = async (geography, market, countryMasterWorkbook) => {
  try {
    console.log(`Looking up CTY for Geography: "${geography}", Market: "${market}"`);
    
    if (!countryMasterWorkbook) {
      console.log('No country master workbook found, using fallback');
      return market; // Return market as fallback
    }

    // Get all worksheets from country master workbook
    for (const worksheet of countryMasterWorkbook.worksheets) {
      const worksheetData = await SheetData.findByWorksheet(worksheet.id, null, 0);
      
      if (worksheetData && worksheetData.length > 0) {
        const dataArray = convertSheetDataToArray(worksheetData);
        
        // Find the required columns
        const headers = dataArray[0] || [];
        let countryNameRawDemandColIndex = -1;
        let marketColIndex = -1;
        
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i].toLowerCase();
          
          if (header.includes('country name') && header.includes('raw demand')) {
            countryNameRawDemandColIndex = i;
          } else if (header === 'market') {
            marketColIndex = i;
          }
        }
        
        if (countryNameRawDemandColIndex >= 0 && marketColIndex >= 0) {
          // Create Geography_Market combination to match
          const geographyMarket = `${geography}_${market}`;
          
          // Search for match
          for (let rowIndex = 1; rowIndex < dataArray.length; rowIndex++) {
            const row = dataArray[rowIndex];
            const rowGeographyMarket = row[countryNameRawDemandColIndex];
            
            if (rowGeographyMarket === geographyMarket) {
              const marketValue = row[marketColIndex];
              console.log(`Found match: ${geographyMarket} -> Market: ${marketValue}`);
              return marketValue; // Return the Market value from Country Master for CTY
            }
          }
        }
      }
    }
    
    console.log(`No match found for "${geography}_${market}", using fallback: ${market}`);
    return market; // Return market as fallback
    
  } catch (error) {
    console.error('Error getting CTY from Country Master:', error);
    return market; // Return market as fallback
  }
};

// Get processed data statistics
const getProcessedDataStats = async (req, res) => {
  try {
    const stats = await ProcessedDemandData.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting processed data stats:', error);
    res.status(500).json({ error: 'Failed to get processed data stats' });
  }
};

// Get processed data by month and year
const getProcessedDataByMonthYear = async (req, res) => {
  try {
    const { month, year } = req.params;
    const data = await ProcessedDemandData.findByMonthYear(month, year);
    res.json(data);
  } catch (error) {
    console.error('Error getting processed data:', error);
    res.status(500).json({ error: 'Failed to get processed data' });
  }
};

// Process raw data from Demand sheets and create processed table
const processRawData = async (req, res) => {
  try {
    const { workbookId } = req.body;

    if (!workbookId) {
      return res.status(400).json({ error: 'Workbook ID is required' });
    }

    console.log('🔄 Processing raw data for workbook:', workbookId);

    // Get the workbook
    const workbook = await Workbook.getWorkbookWithSheets(workbookId);
    if (!workbook) {
      return res.status(404).json({ error: 'Workbook not found' });
    }

    // Find Demand Country Master workbook
    const countryMasterResult = await query(
      "SELECT * FROM workbooks WHERE workbook_name ILIKE '%demand%country%master%' LIMIT 1"
    );

    if (countryMasterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Demand Country Master workbook not found' });
    }

    const countryMasterWorkbook = await Workbook.getWorkbookWithSheets(countryMasterResult.rows[0].id);

    // Create dynamic month lookup
    const monthLookup = await createDynamicMonthLookup();

    // Process each worksheet in the workbook
    let totalProcessedRows = 0;
    const processedRecords = [];

    for (const worksheet of workbook.worksheets) {
      console.log(`Processing worksheet: ${worksheet.sheet_name}`);
      
      const worksheetData = await SheetData.findByWorksheet(worksheet.id, null, 0);
      
      if (worksheetData && worksheetData.length > 0) {
        const dataArray = convertSheetDataToArray(worksheetData);
        console.log(`Processing ${dataArray.length} rows from worksheet: ${worksheet.sheet_name}`);
        
        // Find month columns in the header row
        const headerRow = dataArray[0] || [];
        const monthColumns = [];
        
        // Look for month columns (Jun-25, Jul-25, etc.)
        for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
          const header = headerRow[colIndex];
          if (header && typeof header === 'string') {
            // Check if it's a month-year format (e.g., "Jun-25", "Jul-25")
            const monthMatch = header.match(/^([A-Za-z]{3})-(\d{2})$/);
            if (monthMatch) {
              const monthName = monthMatch[1];
              const year = '20' + monthMatch[2]; // Convert "25" to "2025"
              
              // Convert month name to month number (1-12)
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const monthNum = monthNames.indexOf(monthName) + 1;
              
              if (monthNum > 0) {
                monthColumns.push({
                  colIndex,
                  monthName,
                  year,
                  monthNum,
                  monthKey: `${String(monthNum).padStart(2, '0')}-${year}`
                });
              }
            }
          }
        }
        
        console.log(`Found ${monthColumns.length} month columns:`, monthColumns.map(m => `${m.monthName}-${m.year}`));
        
        // Process each data row
        for (let rowIndex = 1; rowIndex < dataArray.length; rowIndex++) {
          const row = dataArray[rowIndex];
          
          // Skip header rows
          if (row[0] === 'Geography' || row[0] === 'CTY' || !row[0]) {
            continue;
          }

          // Extract base data from raw row
          const geography = row[0] || ''; // Geography column
          const market = row[1] || ''; // Market column
          const pdNpd = row[3] || ''; // PD/NPD column (Column 4)
          const origin = row[4] || ''; // Origin column (Column 5)
          const fgskuCode = row[6] || ''; // FGSKU Code column (assuming column 7)
          
          // Skip rows with empty Geography or Market
          if (!geography || !market || geography.trim() === '' || market.trim() === '') {
            continue;
          }

          // Get CTY value by matching Geography + Market with Country Master
          const cty = await getCtyFromCountryMaster(geography, market, countryMasterWorkbook);
          
          // Process each month column
          for (const monthCol of monthColumns) {
            const demandCases = parseFloat(row[monthCol.colIndex]) || 0;
            
            // Skip if no demand cases for this month
            if (demandCases <= 0) {
              continue;
            }
            
            // Get MthNum from dynamic lookup
            const mthNum = monthLookup[monthCol.monthKey] || null;
            
            // Create processed record for this month
            const processedRecord = {
              workbook_id: workbookId,
              worksheet_id: worksheet.id,
              row_index: rowIndex,
              geography: geography.trim(),
              market: market.trim(),
              cty: cty,
              fgsku_code: fgskuCode.trim(),
              demand_cases: demandCases,
              production_environment: null, // Will be populated later
              safety_stock_wh: null, // Will be populated from country master
              inventory_days_norm: null, // Will be populated later
              supply: null, // Will be populated later
              cons: null, // Will be populated later
              pd_npd: pdNpd.trim(), // Store the PD/NPD value from Column 4
              origin: origin.trim(), // Store the Origin value from Column 5
              month_num: mthNum, // Store the calculated MthNum
              month: String(monthCol.monthNum).padStart(2, '0'),
              year: monthCol.year
            };

            processedRecords.push(processedRecord);
            totalProcessedRows++;
          }
        }
      }
    }

    // Clear existing processed data for this workbook
    await ProcessedDemandData.deleteByWorkbook(workbookId);

    // Insert processed records in batches
    const batchSize = 1000;
    for (let i = 0; i < processedRecords.length; i += batchSize) {
      const batch = processedRecords.slice(i, i + batchSize);
      await ProcessedDemandData.createBatch(batch);
    }

    console.log(`✅ Processed ${totalProcessedRows} rows from workbook: ${workbook.workbook_name}`);

    res.json({
      success: true,
      message: `Successfully processed ${totalProcessedRows} rows`,
      processedRows: totalProcessedRows,
      workbookName: workbook.workbook_name
    });

  } catch (error) {
    console.error('Error processing raw data:', error);
    res.status(500).json({ error: 'Failed to process raw data' });
  }
};

module.exports = {
  processRawData,
  getProcessedDataStats,
  getProcessedDataByMonthYear
}; 