const { query } = require('./config/database');

async function checkDemandTemplates() {
  try {
    console.log('🔍 Checking Demand Templates...\n');
    
    // Get all demand templates
    const result = await query('SELECT * FROM demand_templates ORDER BY created_at DESC');
    
    console.log(`Total demand templates: ${result.rows.length}\n`);
    
    if (result.rows.length > 0) {
      console.log('Recent templates:');
      result.rows.slice(0, 10).forEach((template, i) => {
        console.log(`${i + 1}. ${template.template_name}`);
        console.log(`   Month: ${template.upload_month}, Year: ${template.upload_year}`);
        console.log(`   Created: ${template.created_at}`);
        console.log(`   ID: ${template.id}`);
        console.log('');
      });
      
      // Check for duplicates
      const duplicates = await query(`
        SELECT template_name, upload_month, upload_year, COUNT(*) as count 
        FROM demand_templates 
        GROUP BY template_name, upload_month, upload_year 
        HAVING COUNT(*) > 1
      `);
      
      if (duplicates.rows.length > 0) {
        console.log('⚠️  Duplicate templates found:');
        duplicates.rows.forEach(row => {
          console.log(`   ${row.template_name} (${row.upload_month}/${row.upload_year}): ${row.count} duplicates`);
        });
      } else {
        console.log('✅ No duplicate templates found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking demand templates:', error);
  }
}

checkDemandTemplates()
  .then(() => {
    console.log('✅ Check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  }); 