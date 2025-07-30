const { query } = require('./config/database');
const Workbook = require('./models/Workbook');
const SheetData = require('./models/SheetData');

// Helper function to convert sheet data to array format (copied from demandController)
const convertSheetDataToArray = (sheetData) => {
  console.log('Converting', sheetData.length, 'cells to array format');
  
  // Group data by row
  const rowMap = new Map();
  
  for (const cell of sheetData) {
    if (!rowMap.has(cell.row_index)) {
      rowMap.set(cell.row_index, []);
    }
    rowMap.get(cell.row_index)[cell.column_index] = cell.cell_value;
  }
  
  console.log('Found', rowMap.size, 'unique rows');
  
  // Get the actual row range
  const rowIndices = Array.from(rowMap.keys()).sort((a, b) => a - b);
  const minRow = Math.min(...rowIndices);
  const maxRow = Math.max(...rowIndices);
  
  console.log('Row range:', minRow, 'to', maxRow);
  
  // Convert to array and fill empty cells
  const maxColumns = Math.max(...Array.from(rowMap.values()).map(row => row.length));
  const result = [];
  
  for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
    const row = rowMap.get(rowIndex) || [];
    const filledRow = [];
    
    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      filledRow[colIndex] = row[colIndex] || '';
    }
    
    result.push(filledRow);
  }
  
  console.log('Converted to', result.length, 'rows with', maxColumns, 'columns');
  return result;
};

// Helper function to map Geography-Market to Country (copied from demandController)
const mapToCountry = async (geography, market, countryMasterWorkbook) => {
  try {
    console.log('Mapping Geography and Market to Country:', { geography, market });
    console.log('Country Master Workbook:', countryMasterWorkbook?.workbook_name);
    
    if (!countryMasterWorkbook) {
      console.log('No country master workbook found, using fallback');
      return market; // Return market as fallback
    }

    // Get all worksheets from country master workbook
    for (const worksheet of countryMasterWorkbook.worksheets) {
      console.log('Processing worksheet:', worksheet.sheet_name);
      
      const worksheetData = await SheetData.findByWorksheet(worksheet.id, null, 0);
      console.log(`Processing worksheet: ${worksheet.sheet_name} with ${worksheetData?.length || 0} cells`);
      if (worksheetData && worksheetData.length > 0) {
        // Convert to array format
        const dataArray = convertSheetDataToArray(worksheetData);
        
        console.log('Country master data structure:');
        if (dataArray.length > 0) {
          console.log('Headers:', dataArray[0]);
          console.log('First few rows:', dataArray.slice(1, 4));
        }
        
        // Find the Country Name (Raw demand) column and Country column
        const headers = dataArray[0] || [];
        let countryNameRawDemandColIndex = -1;
        let countryColIndex = -1;
        
        console.log('Looking for Country Name (Raw demand) and Country columns in headers:', headers);
        
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i].toLowerCase();
          console.log(`Column ${i}: "${headers[i]}" (lowercase: "${header}")`);
          
          if (header.includes('country name') && header.includes('raw demand')) {
            countryNameRawDemandColIndex = i;
            console.log(`Found Country Name (Raw demand) column at index ${i}: "${headers[i]}"`);
          } else if (header === 'country') {
            countryColIndex = i;
            console.log(`Found Country column at index ${i}: "${headers[i]}"`);
          }
        }
        
        console.log('Column indices - Country Name (Raw demand):', countryNameRawDemandColIndex, 'Country:', countryColIndex);
        
        if (countryNameRawDemandColIndex >= 0 && countryColIndex >= 0) {
          // Create the Geography_Market combination to match against
          const geographyMarket = `${geography}_${market}`;
          console.log(`Searching for "${geographyMarket}" in Country Name (Raw demand) column...`);
          
          for (let rowIndex = 1; rowIndex < dataArray.length; rowIndex++) {
            const row = dataArray[rowIndex];
            const rowGeographyMarket = row[countryNameRawDemandColIndex];
            
            // Try exact match
            if (rowGeographyMarket === geographyMarket) {
              const countryName = row[countryColIndex];
              console.log(`Found exact match: ${geographyMarket} -> ${countryName}`);
              return countryName; // Return the Country Name for CTY column
            }
            
            // Log first few comparisons for debugging
            if (rowIndex <= 5) {
              console.log(`Row ${rowIndex}: Geography_Market="${rowGeographyMarket}", Country="${row[countryColIndex]}"`);
            }
          }
          
          console.log(`No match found for "${geographyMarket}" in Country Name (Raw demand) column`);
        } else {
          console.log('Could not find required columns in Demand_Country_Master');
          console.log('Available columns:', headers);
          console.log('Required columns: Country Name (Raw demand), Country');
        }
      }
    }
    
    console.log('No match found, using fallback:', market);
    return market; // Return market as fallback
    
  } catch (error) {
    console.error('Error mapping to country:', error);
    return market; // Return market as fallback
  }
};

async function testDemandMapping() {
  try {
    console.log('🧪 Testing Demand Mapping Logic...\n');
    
    // Find Demand and Demand_Country_Master workbooks
    const workbooksResult = await query(
      "SELECT * FROM workbooks WHERE workbook_name ILIKE '%demand%' ORDER BY workbook_name"
    );
    
    console.log('Found workbooks:');
    workbooksResult.rows.forEach(wb => {
      console.log(`- ${wb.workbook_name} (ID: ${wb.id})`);
    });
    
    let demandWorkbook = null;
    let countryMasterWorkbook = null;
    
    for (const wb of workbooksResult.rows) {
      if (wb.workbook_name.toLowerCase().includes('demand') && wb.workbook_name.toLowerCase().includes('country')) {
        countryMasterWorkbook = wb;
      } else if (wb.workbook_name.toLowerCase() === 'demand') {
        demandWorkbook = wb;
      }
    }
    
    if (!demandWorkbook) {
      console.log('❌ No Demand workbook found');
      return;
    }
    
    if (!countryMasterWorkbook) {
      console.log('❌ No Demand_Country_Master workbook found');
      return;
    }
    
    // Load workbooks with their worksheets
    const demandWorkbookWithSheets = await Workbook.getWorkbookWithSheets(demandWorkbook.id);
    const countryMasterWorkbookWithSheets = await Workbook.getWorkbookWithSheets(countryMasterWorkbook.id);
    
    console.log(`\n📊 Testing with:`);
    console.log(`- Demand workbook: ${demandWorkbookWithSheets.workbook_name} (${demandWorkbookWithSheets.worksheets.length} worksheets)`);
    console.log(`- Country Master workbook: ${countryMasterWorkbookWithSheets.workbook_name} (${countryMasterWorkbookWithSheets.worksheets.length} worksheets)\n`);
    
    // Test some sample Geography-Market combinations based on actual data
    const testCases = [
      { geography: 'IS & PL', market: 'UAE' },
      { geography: 'UAE & LG', market: 'UAE' },
      { geography: 'QSR', market: 'UAE' },
      { geography: 'UAE & LG', market: 'FS-UAE' }
    ];
    
    console.log('🔍 Testing Geography-Market to Country Name mapping:');
    console.log('=' .repeat(60));
    
    for (const testCase of testCases) {
      console.log(`\nTesting: Geography="${testCase.geography}", Market="${testCase.market}"`);
      
      try {
        const result = await mapToCountry(testCase.geography, testCase.market, countryMasterWorkbookWithSheets);
        console.log(`✅ Result: "${result}"`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDemandMapping()
    .then(() => {
      console.log('\n🎉 Demand mapping test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testDemandMapping }; 