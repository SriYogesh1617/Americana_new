const T03Data = require('./models/T03Data');

async function recreateT03Table() {
  try {
    console.log('🔄 Starting T03 table recreation...');
    
    // Drop the existing table if it exists
    const { query } = require('./config/database');
    await query('DROP TABLE IF EXISTS t03_primdist CASCADE');
    console.log('✅ Dropped existing T03 table');
    
    // Create the new table with updated structure
    await T03Data.createTable();
    console.log('✅ Created new T03 table with updated structure');
    
    console.log('🎉 T03 table recreation completed successfully!');
    console.log('\n📋 New T03 table structure:');
    console.log('  - WH (Destination warehouse)');
    console.log('  - PLT (Factory delivering to destination warehouse)');
    console.log('  - FGSKUCode (SKU Code)');
    console.log('  - MthNum (Month 1-12)');
    console.log('  - CostPerUnit (Primary distribution freight cost/unit)');
    console.log('  - Custom Cost/Unit (Custom cost per unit SKU for international shipping)');
    console.log('  - MaxQty (Quantity to enable/disable any primary shipping lane)');
    console.log('  - FGWtPerUnit (Finished good weight per unit)');
    console.log('  - Qty (Shipped quantity from source factory to destination warehouse)');
    console.log('  - Wt (Shipped weight - calculated: Qty x FGWtPerUnit)');
    console.log('  - Custom Duty (Total custom duty cost - calculated: Qty x Custom Cost/Unit)');
    console.log('  - Poscheck (Positive check validation)');
    console.log('  - Qty<=Max (Quantity <= Max quantity check)');
    console.log('  - RowCost (Total primary shipping cost per unit)');
    
  } catch (error) {
    console.error('❌ Error recreating T03 table:', error);
    throw error;
  }
}

// Run the recreation
recreateT03Table()
  .then(() => {
    console.log('✅ T03 table recreation script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ T03 table recreation script failed:', error);
    process.exit(1);
  }); 