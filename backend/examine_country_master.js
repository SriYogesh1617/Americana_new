const XLSX = require('xlsx');
const { query } = require('./config/database');
const Workbook = require('./models/Workbook');
const SheetData = require('./models/SheetData');

async function examineCountryMaster() {
  try {
    // Find the Demand_Country_Master workbook
    const workbooksResult = await query(
      "SELECT * FROM workbooks WHERE workbook_name ILIKE '%demand%country%master%'"
    );
    
    if (workbooksResult.rows.length === 0) {
      console.log('No Demand_Country_Master workbook found');
      return;
    }
    
    const countryMasterWorkbook = workbooksResult.rows[0];
    console.log('Found Demand_Country_Master workbook:', countryMasterWorkbook.workbook_name);
    
    // Get all worksheets
    const worksheetsResult = await query(
      'SELECT * FROM worksheets WHERE workbook_id = $1 ORDER BY sheet_index',
      [countryMasterWorkbook.id]
    );
    
    console.log('Worksheets in Demand_Country_Master:', worksheetsResult.rows.map(ws => ws.sheet_name));
    
    for (const worksheet of worksheetsResult.rows) {
      console.log(`\n=== Examining worksheet: ${worksheet.sheet_name} ===`);
      
      // Get worksheet data
      const worksheetData = await SheetData.findByWorksheet(worksheet.id, null, 0);
      console.log(`Total cells in worksheet: ${worksheetData.length}`);
      
      if (worksheetData.length > 0) {
        // Convert to array format
        const rowMap = new Map();
        for (const cell of worksheetData) {
          if (!rowMap.has(cell.row_index)) {
            rowMap.set(cell.row_index, []);
          }
          rowMap.get(cell.row_index)[cell.column_index] = cell.cell_value;
        }
        
        // Get headers (row 0)
        const headers = rowMap.get(0) || [];
        console.log('Headers:', headers);
        
        // Show first few data rows
        console.log('\nFirst 5 data rows:');
        for (let rowIndex = 1; rowIndex <= Math.min(5, rowMap.size - 1); rowIndex++) {
          const row = rowMap.get(rowIndex) || [];
          console.log(`Row ${rowIndex}:`, row);
        }
        
        // Look for Market and Country Name columns
        console.log('\nColumn analysis:');
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i];
          if (header) {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('market')) {
              console.log(`Column ${i} (${header}): Contains "market"`);
            }
            if (lowerHeader.includes('country') && lowerHeader.includes('name')) {
              console.log(`Column ${i} (${header}): Contains "country name"`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error examining country master:', error);
  }
}

examineCountryMaster(); 