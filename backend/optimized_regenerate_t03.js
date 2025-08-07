const { query } = require('./config/database');
const TransportCostCalculator = require('./models/TransportCostCalculator');
const CustomCostLookup = require('./models/CustomCostLookup');
const T03Data = require('./models/T03Data');

async function optimizedRegenerateT03() {
  try {
    console.log('🚀 Starting optimized T03 regeneration...');
    
    const uploadBatchId = 'c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7';
    
    // Clear existing T03 data
    console.log('🧹 Clearing existing T03 data...');
    await T03Data.deleteByUploadBatch(uploadBatchId);
    
    // Load freight data ONCE (this was the bottleneck)
    console.log('📊 Loading freight data (this will take a moment)...');
    const freightData = await TransportCostCalculator.loadFreightData();
    console.log('✅ Freight data loaded successfully');
    
    // Get T02 data
    console.log('📊 Fetching T02 data...');
    const t02Query = `
      SELECT 
        wh, cty, fgsku_code, month, transport_cost_per_case,
        fgwt_per_unit, customs, custom_cost_per_unit_gfc,
        custom_cost_per_unit_kfc, custom_cost_per_unit_nfc,
        upload_batch_id
      FROM t02_data 
      WHERE upload_batch_id = $1
        AND wh IS NOT NULL 
        AND cty IS NOT NULL
        AND fgsku_code IS NOT NULL 
        AND month IS NOT NULL
      ORDER BY wh, fgsku_code, month
    `;
    
    const t02Result = await query(t02Query, [uploadBatchId]);
    console.log(`Found ${t02Result.rows.length} T02 records to process`);
    
    if (t02Result.rows.length === 0) {
      console.log('❌ No T02 data found');
      return;
    }
    
    // Get demand data for PLT matching
    console.log('📊 Fetching demand data for PLT matching...');
    const demandQuery = `
      SELECT DISTINCT market, fgsku_code, origin
      FROM processed_demand_data 
      WHERE origin IS NOT NULL 
        AND origin != 'Other'
        AND origin != 'Remove "Other"'
        AND market IS NOT NULL
        AND fgsku_code IS NOT NULL
        AND fgsku_code != 'Old - not to be used'
    `;
    
    const demandResult = await query(demandQuery);
    const demandLookup = new Map();
    demandResult.rows.forEach(row => {
      const key = `${row.market}|${row.fgsku_code}`;
      demandLookup.set(key, row.origin);
    });
    
    // Process T02 records in batches
    console.log('🔄 Processing T02 records...');
    const batchSize = 1000;
    let totalProcessed = 0;
    
    for (let i = 0; i < t02Result.rows.length; i += batchSize) {
      const batch = t02Result.rows.slice(i, i + batchSize);
      const t03Records = [];
      
      for (const t02Row of batch) {
        // Skip SKUs with less than 10 digits
        if (!t02Row.fgsku_code || t02Row.fgsku_code.toString().length < 10) {
          continue;
        }
        
        const warehouse = t02Row.wh;
        
        // Map warehouse to correct country based on T03 requirements
        let cty;
        switch (warehouse) {
          case 'GFCM':
            cty = 'UAE FS';
            break;
          case 'KFCM':
            cty = 'Kuwait';
            break;
          case 'NFCM':
            cty = 'KSA';
            break;
          case 'X':
            cty = 'X'; // For X warehouse, keep X as country
            break;
          default:
            cty = 'Unknown';
        }
        
        // Get PLT from demand lookup
        let plt = 'Unknown';
        
        // Try exact match first
        const demandKey = `${t02Row.cty}|${t02Row.fgsku_code}`;
        plt = demandLookup.get(demandKey);
        
        // If not found, try without FS suffix
        if (!plt) {
          const ctyWithoutFS = t02Row.cty.replace(' FS', '');
          const demandKeyWithoutFS = `${ctyWithoutFS}|${t02Row.fgsku_code}`;
          plt = demandLookup.get(demandKeyWithoutFS);
        }
        
        // For WH = X, set PLT = X
        if (warehouse === 'X') {
          plt = 'X';
        }
        
        // Ensure plt is never null or undefined
        if (!plt || plt === 'Unknown') {
          // Set default PLT based on warehouse
          if (warehouse === 'GFCM') {
            plt = 'GFC';
          } else if (warehouse === 'KFCM') {
            plt = 'KFC';
          } else if (warehouse === 'NFCM') {
            plt = 'NFC';
          } else {
            plt = 'Unknown';
          }
        }
        
        const mthNum = parseInt(t02Row.month);
        
        // Calculate cost per unit
        let costPerUnit = 0;
        if (warehouse !== 'X') {
          costPerUnit = TransportCostCalculator.calculateTransportCost(
            cty, warehouse, t02Row.fgsku_code, freightData
          );
        }
        
        // NEW RULE: Cost = 0 for same factory-warehouse shipping
        // GFCM -> GFC, KFCM -> KFC, NFCM -> NFC should have cost = 0
        if ((warehouse === 'GFCM' && plt === 'GFC') ||
            (warehouse === 'KFCM' && plt === 'KFC') ||
            (warehouse === 'NFCM' && plt === 'NFC')) {
          costPerUnit = 0;
        }
        
        const fgWtPerUnit = t02Row.fgwt_per_unit != null ? parseFloat(t02Row.fgwt_per_unit) : 0;
        
        // Calculate custom cost per unit
        let customCostPerUnit = 0;
        if (warehouse === 'NFCM') {
          if (plt === 'GFC') {
            customCostPerUnit = await CustomCostLookup.calculateCustomCostPerUnit(
              t02Row.fgsku_code, 'GFC', costPerUnit, cty, t02Row.customs === 'Yes'
            );
          } else if (plt === 'KFC') {
            customCostPerUnit = await CustomCostLookup.calculateCustomCostPerUnit(
              t02Row.fgsku_code, 'KFC', costPerUnit, cty, t02Row.customs === 'Yes'
            );
          }
          // NFC is always 0
        }
        
        // Set max quantity
        let maxQty = 10000000000;
        if (warehouse === 'NFCM' && plt === 'GFC') {
          maxQty = 0; // WH = NFCM AND PLT = GFC gets 0
        }
        // WH = X keeps maxQty = 10^10 (10000000000)
        
        t03Records.push({
          wh: warehouse,
          plt: plt,
          cty: cty,
          fgsku_code: t02Row.fgsku_code,
          mth_num: mthNum,
          cost_per_unit: costPerUnit,
          custom_cost_per_unit: customCostPerUnit,
          max_qty: maxQty,
          fg_wt_per_unit: fgWtPerUnit,
          qty: 0,
          wt: 0,
          custom_duty: 0,
          poscheck: true,
          qty_lte_max: true,
          row_cost: 0,
          upload_batch_id: uploadBatchId
        });
      }
      
      // Insert batch
      if (t03Records.length > 0) {
        await T03Data.bulkInsert(t03Records);
        totalProcessed += t03Records.length;
        console.log(`✅ Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(t02Result.rows.length/batchSize)} (${t03Records.length} records)`);
      }
    }
    
    // Update calculated fields
    console.log('🧮 Updating calculated fields...');
    await T03Data.updateAllCalculatedFields(uploadBatchId);
    
    // Check results
    const checkResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN cost_per_unit > 0 THEN 1 END) as records_with_cost,
        AVG(cost_per_unit) as avg_cost,
        MAX(cost_per_unit) as max_cost
      FROM t03_primdist 
      WHERE upload_batch_id = $1
    `, [uploadBatchId]);
    
    const stats = checkResult.rows[0];
    console.log('\n🎉 T03 Regeneration Complete!');
    console.log(`Total records: ${stats.total_records}`);
    console.log(`Records with cost > 0: ${stats.records_with_cost}`);
    console.log(`Average cost: ${parseFloat(stats.avg_cost).toFixed(4)}`);
    console.log(`Maximum cost: ${parseFloat(stats.max_cost).toFixed(4)}`);
    
  } catch (error) {
    console.error('❌ Error in optimized regeneration:', error);
  }
}

optimizedRegenerateT03(); 