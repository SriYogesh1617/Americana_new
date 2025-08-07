const { query } = require('./config/database');

async function testT01Logic() {
  try {
    console.log('Testing new T01 logic...');
    
    // Get demand data for a specific batch
    const batchId = 'c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7';
    
    // Get demand data
    const demandData = await query(`
      SELECT 
        dc.id as demand_id,
        dc.row_index,
        dc.column_index,
        dc.cell_value,
        dc.column_name
      FROM demand_cursor dc
      WHERE dc.upload_batch_id = $1
      ORDER BY dc.row_index, dc.column_index
    `, [batchId]);

    console.log(`Found ${demandData.rows.length} demand records`);

    // Get country master data
    const countryMasterData = await query(`
      SELECT 
        dcmc.id as country_master_id,
        dcmc.row_index,
        dcmc.column_index,
        dcmc.cell_value,
        dcmc.column_name
      FROM demand_country_master_cursor dcmc
      WHERE dcmc.upload_batch_id = $1
      ORDER BY dcmc.row_index, dcmc.column_index
    `, [batchId]);

    console.log(`Found ${countryMasterData.rows.length} country master records`);

    // Process demand data
    const demandRows = new Map();
      const geographyColumnIndex = 0;
  const marketColumnIndex = 1;
  const fgskuCodeColumnIndex = 5; // Unified code column (Column 6 in Excel, index 5)
  const pdNpdColumnIndex = 3;
  const originColumnIndex = 4;

    // Group demand data by row
    for (const cell of demandData.rows) {
      if (cell.row_index < 3) continue; // Skip header rows
      
      if (!demandRows.has(cell.row_index)) {
        demandRows.set(cell.row_index, {});
      }
      demandRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
    }

    // Create country lookup
    const countryLookup = new Map();
    for (const cell of countryMasterData.rows) {
      if (cell.row_index === 0) continue; // Skip header row
      
      if (!countryLookup.has(cell.row_index)) {
        countryLookup.set(cell.row_index, {});
      }
      countryLookup.get(cell.row_index)[cell.column_index] = cell.cell_value;
    }

    // Process country master data
    const countryMasterRows = new Map();
    const countryNameColumnIndex = 2;
    const marketColumnIndexCM = 1;

    for (const cell of countryMasterData.rows) {
      if (cell.row_index === 0) continue;
      
      if (!countryMasterRows.has(cell.row_index)) {
        countryMasterRows.set(cell.row_index, {});
      }
      countryMasterRows.get(cell.row_index)[cell.column_index] = cell.cell_value;
    }

    // Create lookup map for country master
    for (const [rowIndex, rowData] of countryMasterRows) {
      const countryName = rowData[countryNameColumnIndex];
      const market = rowData[marketColumnIndexCM];
      
      if (countryName && market) {
        countryLookup.set(countryName.trim(), market.trim());
      }
    }

    // Collect unique combinations and demand data
    const uniqueCombinations = new Set();
    const demandDataByCombination = new Map();

    // Process demand rows
    for (const [rowIndex, rowData] of demandRows) {
      const geography = rowData[geographyColumnIndex];
      const market = rowData[marketColumnIndex];
      const fgskuCode = rowData[fgskuCodeColumnIndex];
      const pdNpd = rowData[pdNpdColumnIndex];
      const origin = rowData[originColumnIndex];
      
      // Apply filtering
      if (pdNpd && pdNpd.trim().toLowerCase() === 'npd') continue;
      if (origin && origin.trim().toLowerCase() === 'other') continue;
      
      if (geography && market && fgskuCode) {
        const geographyMarket = `${geography.trim()}_${market.trim()}`;
        const cty = countryLookup.get(geographyMarket);
        
        if (cty) {
          const finalFgskuCode = fgskuCode.trim();
          uniqueCombinations.add(`${cty}_${finalFgskuCode}`);
          
          // Collect demand data for months 5-16
          for (let monthNum = 5; monthNum <= 16; monthNum++) {
            const month = monthNum.toString().padStart(2, '0');
            const demandKey = `${cty}_${finalFgskuCode}_${month}`;
            
            // For now, set all demand to 0 (we'll get actual values later)
            if (!demandDataByCombination.has(demandKey)) {
              demandDataByCombination.set(demandKey, 0);
            }
          }
        }
      }
    }

    console.log(`Found ${uniqueCombinations.size} unique CTY + SKU combinations`);
    console.log(`Created ${demandDataByCombination.size} demand combinations`);

    // Create final records for all months (5-16) for each combination
    const finalRecords = [];
    
    for (const combination of uniqueCombinations) {
      const [cty, fgskuCode] = combination.split('_');
      
      // Create records for ALL months (5-16)
      for (let monthNum = 5; monthNum <= 16; monthNum++) {
        const month = monthNum.toString().padStart(2, '0');
        const demandKey = `${cty}_${fgskuCode}_${month}`;
        const totalDemand = demandDataByCombination.get(demandKey) || 0;
        
        finalRecords.push({
          cty: cty,
          fgsku_code: fgskuCode,
          month: month,
          demand_cases: totalDemand
        });
      }
    }

    console.log(`Created ${finalRecords.length} final records`);
    console.log('Sample records:');
    finalRecords.slice(0, 10).forEach(record => {
      console.log(`  ${record.cty} - ${record.fgsku_code} - Month ${record.month} - Demand: ${record.demand_cases}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testT01Logic(); 