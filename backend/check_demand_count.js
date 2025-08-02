const { query } = require('./config/database');

async function checkDemandCount() {
  try {
    const result = await query('SELECT COUNT(*) as count FROM demand_cursor WHERE upload_batch_id = $1', ['c2f9b2df-7b5e-47aa-a6e2-cb4852c488d7']);
    console.log('Demand records for batch:', result.rows[0].count);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDemandCount(); 