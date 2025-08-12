const { query } = require('./config/database');

async function testSameFactoryCost() {
  try {
    console.log('🧪 Testing same factory-warehouse cost logic...');
    
    // Check current T03 data for same factory-warehouse combinations
    const testQuery = `
      SELECT 
        wh, plt, cty, fgsku_code, cost_per_unit,
        CASE 
          WHEN (wh = 'GFCM' AND plt = 'GFC') THEN 'Same Factory-Warehouse'
          WHEN (wh = 'KFCM' AND plt = 'KFC') THEN 'Same Factory-Warehouse'
          WHEN (wh = 'NFCM' AND plt = 'NFC') THEN 'Same Factory-Warehouse'
          ELSE 'Different Factory-Warehouse'
        END as factory_warehouse_type
      FROM t03_primdist 
      WHERE upload_batch_id = 'c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7'
      AND (
        (wh = 'GFCM' AND plt = 'GFC') OR
        (wh = 'KFCM' AND plt = 'KFC') OR
        (wh = 'NFCM' AND plt = 'NFC')
      )
      LIMIT 20
    `;
    
    const result = await query(testQuery);
    
    console.log('\n📊 Same Factory-Warehouse Records:');
    console.log('==================================');
    
    let zeroCount = 0;
    let nonZeroCount = 0;
    
    result.rows.forEach((row, index) => {
      const cost = parseFloat(row.cost_per_unit) || 0;
      const status = cost === 0 ? '✅ ZERO' : '❌ NON-ZERO';
      console.log(`${index + 1}. ${row.wh} -> ${row.plt} (${row.cty}): ${cost.toFixed(4)} ${status}`);
      
      if (cost === 0) {
        zeroCount++;
      } else {
        nonZeroCount++;
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`Records with cost = 0: ${zeroCount}`);
    console.log(`Records with cost > 0: ${nonZeroCount}`);
    
    if (nonZeroCount > 0) {
      console.log('\n❌ ISSUE FOUND: Some same factory-warehouse records have non-zero costs!');
      console.log('This needs to be fixed by regenerating T03 data.');
    } else {
      console.log('\n✅ All same factory-warehouse records correctly have cost = 0');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSameFactoryCost(); 