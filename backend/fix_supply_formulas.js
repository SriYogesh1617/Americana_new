const { query } = require('./config/database');

async function fixSupplyFormulas() {
  try {
    console.log('🔧 Fixing T01 Supply Formulas...\n');

    // Get upload batch ID
    const batchResult = await query('SELECT upload_batch_id FROM t01_data LIMIT 1');
    if (batchResult.rows.length === 0) {
      console.log('No T01 data found');
      return;
    }
    
    const uploadBatchId = batchResult.rows[0].upload_batch_id;
    console.log(`Using upload batch ID: ${uploadBatchId}\n`);

    // Step 1: Get all T01 records
    console.log('📊 Step 1: Getting T01 records...');
    const t01Records = await query(`
      SELECT id, cty, fgsku_code, month, supply
      FROM t01_data 
      WHERE upload_batch_id = $1 
      ORDER BY id
    `, [uploadBatchId]);

    console.log(`Found ${t01Records.rows.length} T01 records to update`);

    // Step 2: Get all T02 records with their row numbers
    console.log('\n📊 Step 2: Getting T02 records...');
    const t02Records = await query(`
      SELECT cty, fgsku_code, month, 
             ROW_NUMBER() OVER (ORDER BY id) + 1 as excel_row_number
      FROM t02_data 
      WHERE upload_batch_id = $1
      ORDER BY id
    `, [uploadBatchId]);

    console.log(`Found ${t02Records.rows.length} T02 records for mapping`);

    // Step 3: Create T02 mapping
    console.log('\n📊 Step 3: Creating T02 mapping...');
    const t02Mapping = new Map();
    for (const t02Row of t02Records.rows) {
      const key = `${t02Row.cty}_${t02Row.fgsku_code}_${t02Row.month}`;
      if (!t02Mapping.has(key)) {
        t02Mapping.set(key, []);
      }
      t02Mapping.get(key).push(t02Row.excel_row_number);
    }

    console.log(`Created mapping for ${t02Mapping.size} unique T02 combinations`);

    // Step 4: Update each T01 record with correct Supply formula
    console.log('\n🔧 Step 4: Updating T01 supply formulas...');
    let updatedCount = 0;
    let errorCount = 0;

    for (const t01Row of t01Records.rows) {
      try {
        const lookupKey = `${t01Row.cty}_${t01Row.fgsku_code}_${t01Row.month}`;
        const t02Rows = t02Mapping.get(lookupKey) || [];
        
        let supplyFormula;
        if (t02Rows.length === 0) {
          // No matching T02 rows
          supplyFormula = '0';
        } else if (t02Rows.length === 1) {
          // Single T02 row
          supplyFormula = `=T_02!X${t02Rows[0]}`;
        } else {
          // Multiple T02 rows - sum them
          const cellReferences = t02Rows.map(rowNum => `T_02!X${rowNum}`);
          supplyFormula = `=${cellReferences.join('+')}`;
        }

        // Update the T01 record
        await query(`
          UPDATE t01_data 
          SET supply = $1 
          WHERE id = $2
        `, [supplyFormula, t01Row.id]);
        
        updatedCount++;
        
        // Log first few updates for verification
        if (updatedCount <= 5) {
          console.log(`  ${updatedCount}. ${lookupKey} -> ${supplyFormula}`);
        }
        
      } catch (error) {
        console.error(`Error updating T01 record ${t01Row.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Updated ${updatedCount} T01 supply formulas`);
    if (errorCount > 0) {
      console.log(`❌ ${errorCount} errors occurred`);
    }

    // Step 5: Verify the fix
    console.log('\n📊 Step 5: Verifying the fix...');
    const sampleResults = await query(`
      SELECT cty, fgsku_code, month, supply
      FROM t01_data 
      WHERE upload_batch_id = $1 
      ORDER BY cty, fgsku_code, month
      LIMIT 10
    `, [uploadBatchId]);

    console.log('Sample updated supply formulas:');
    sampleResults.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.cty}|${row.fgsku_code}|${row.month} -> ${row.supply}`);
    });

    console.log('\n✅ Supply formulas fix completed!');
    console.log('\n📝 Summary:');
    console.log(`  - Updated ${updatedCount} T01 supply formulas`);
    console.log(`  - Used correct T02 row numbers for matching CTY|SKU|Month combinations`);
    console.log(`  - Formulas now reference correct T02 cells (column X)`);

  } catch (error) {
    console.error('❌ Error fixing supply formulas:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixSupplyFormulas().then(() => {
    console.log('\n✅ Fix completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });
}

module.exports = { fixSupplyFormulas }; 