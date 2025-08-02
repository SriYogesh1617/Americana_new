const { query } = require('./config/database');

async function applyOSGFCFormula() {
  try {
    console.log('🔧 Applying OS_GFC formula logic...');
    console.log('📋 Formula: Month 5 = m1os_gfc, Months 6-16 = previous month cs_gfc');
    
    // Step 1: Get all records for months 5-16
    console.log('1️⃣ Fetching records for months 5-16...');
    const fetchQuery = `
      SELECT id, fg_sku_code, wh, mth_num, m1os_gfc, os_gfc, cs_gfc
      FROM t04_whbal 
      WHERE mth_num BETWEEN 5 AND 16
      ORDER BY fg_sku_code, wh, mth_num;
    `;
    
    const fetchResult = await query(fetchQuery);
    const records = fetchResult.rows;
    
    console.log(`📊 Found ${records.length} records for months 5-16`);
    
    // Step 2: Group records by SKU and warehouse
    const groupedRecords = {};
    records.forEach(record => {
      const key = `${record.fg_sku_code}_${record.wh}`;
      if (!groupedRecords[key]) {
        groupedRecords[key] = [];
      }
      groupedRecords[key].push(record);
    });
    
    console.log(`📦 Grouped into ${Object.keys(groupedRecords).length} SKU-WH combinations`);
    
    // Step 3: Apply the formula logic
    console.log('2️⃣ Applying formula logic...');
    let updatedCount = 0;
    
    for (const [key, skuRecords] of Object.entries(groupedRecords)) {
      // Sort by month number
      skuRecords.sort((a, b) => a.mth_num - b.mth_num);
      
      for (let i = 0; i < skuRecords.length; i++) {
        const record = skuRecords[i];
        let newOSGFC = null;
        
        if (record.mth_num === 5) {
          // Month 5: Use m1os_gfc
          newOSGFC = record.m1os_gfc || 0;
          console.log(`  ${record.fg_sku_code} (${record.wh}, M${record.mth_num}): os_gfc = m1os_gfc = ${newOSGFC}`);
        } else if (record.mth_num >= 6 && record.mth_num <= 16) {
          // Months 6-16: Use previous month's cs_gfc
          const prevRecord = skuRecords[i - 1];
          if (prevRecord) {
            newOSGFC = prevRecord.cs_gfc || 0;
            console.log(`  ${record.fg_sku_code} (${record.wh}, M${record.mth_num}): os_gfc = prev_month_cs_gfc = ${newOSGFC} (from M${prevRecord.mth_num})`);
          } else {
            newOSGFC = 0;
            console.log(`  ${record.fg_sku_code} (${record.wh}, M${record.mth_num}): No previous month found, setting to 0`);
          }
        }
        
        // Update the database
        if (newOSGFC !== null) {
          const updateQuery = `
            UPDATE t04_whbal 
            SET os_gfc = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2;
          `;
          
          await query(updateQuery, [newOSGFC, record.id]);
          updatedCount++;
        }
      }
    }
    
    console.log(`✅ Updated ${updatedCount} records with new os_gfc values`);
    
    // Step 4: Recalculate dependent fields
    console.log('3️⃣ Recalculating dependent fields...');
    
    // Update totals
    await query(`
      UPDATE t04_whbal 
      SET os_tot = os_gfc + os_kfc + os_nfc + os_x,
          avg_stock = (os_gfc + os_kfc + os_nfc + os_x + cs_gfc + cs_kfc + cs_nfc + cs_x) / 2.0,
          storage_cost = ((os_gfc + os_kfc + os_nfc + os_x + cs_gfc + cs_kfc + cs_nfc + cs_x) / 2.0) * store_cost,
          storage_cost_v2 = ((os_gfc + os_kfc + os_nfc + os_x + cs_gfc + cs_kfc + cs_nfc + cs_x) / 2.0) * store_cost * 0.5,
          updated_at = CURRENT_TIMESTAMP
      WHERE mth_num BETWEEN 5 AND 16;
    `);
    
    console.log('✅ Dependent fields recalculated');
    
    // Step 5: Show sample results
    console.log('4️⃣ Sample results:');
    const sampleQuery = `
      SELECT id, fg_sku_code, wh, mth_num, 
             m1os_gfc, os_gfc, cs_gfc,
             os_tot, avg_stock, storage_cost_v2
      FROM t04_whbal 
      WHERE mth_num BETWEEN 5 AND 16
      ORDER BY fg_sku_code, wh, mth_num
      LIMIT 10;
    `;
    
    const sampleResult = await query(sampleQuery);
    
    console.log('\n📄 Sample updated records:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.fg_sku_code} (${row.wh}, M${row.mth_num}):`);
      console.log(`   m1os_gfc: ${row.m1os_gfc}`);
      console.log(`   os_gfc: ${row.os_gfc}`);
      console.log(`   cs_gfc: ${row.cs_gfc}`);
      console.log(`   os_tot: ${row.os_tot}`);
      console.log(`   avg_stock: ${row.avg_stock}`);
      console.log(`   storage_cost_v2: ${row.storage_cost_v2}`);
      console.log('');
    });
    
    // Step 6: Summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT fg_sku_code) as unique_skus,
        COUNT(DISTINCT wh) as unique_warehouses,
        AVG(os_gfc) as avg_os_gfc,
        SUM(os_gfc) as total_os_gfc
      FROM t04_whbal 
      WHERE mth_num BETWEEN 5 AND 16;
    `;
    
    const statsResult = await query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log('📊 Summary Statistics:');
    console.log(`Total records (M5-16): ${stats.total_records}`);
    console.log(`Unique SKUs: ${stats.unique_skus}`);
    console.log(`Unique warehouses: ${stats.unique_warehouses}`);
    console.log(`Average os_gfc: ${parseFloat(stats.avg_os_gfc).toFixed(2)}`);
    console.log(`Total os_gfc: ${parseFloat(stats.total_os_gfc).toFixed(2)}`);
    
    return {
      updatedCount,
      totalRecords: stats.total_records,
      uniqueSKUs: stats.unique_skus,
      uniqueWarehouses: stats.unique_warehouses,
      avgOSGFC: parseFloat(stats.avg_os_gfc),
      totalOSGFC: parseFloat(stats.total_os_gfc)
    };
    
  } catch (error) {
    console.error('❌ Error applying OS_GFC formula:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  applyOSGFCFormula().then((result) => {
    console.log('\n✅ OS_GFC formula applied successfully!');
    console.log(`📊 Updated ${result.updatedCount} records`);
    console.log(`📈 Average os_gfc: ${result.avgOSGFC.toFixed(2)}`);
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Failed to apply OS_GFC formula:', error);
    process.exit(1);
  });
}

module.exports = { applyOSGFCFormula }; 