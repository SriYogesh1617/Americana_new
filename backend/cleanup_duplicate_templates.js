const { query } = require('./config/database');

async function cleanupDuplicateTemplates() {
  try {
    console.log('🧹 Cleaning up duplicate demand templates...\n');
    
    // First, let's see what we have
    const allTemplates = await query('SELECT * FROM demand_templates ORDER BY created_at DESC');
    console.log(`Total templates before cleanup: ${allTemplates.rows.length}`);
    
    // Group templates by name, month, and year
    const templateGroups = {};
    allTemplates.rows.forEach(template => {
      const key = `${template.template_name}_${template.upload_month}_${template.upload_year}`;
      if (!templateGroups[key]) {
        templateGroups[key] = [];
      }
      templateGroups[key].push(template);
    });
    
    // Find groups with duplicates
    const duplicates = Object.entries(templateGroups).filter(([key, templates]) => templates.length > 1);
    
    console.log(`Found ${duplicates.length} duplicate groups:`);
    duplicates.forEach(([key, templates]) => {
      console.log(`  ${key}: ${templates.length} templates`);
    });
    
    // Keep only the most recent template from each group
    let deletedCount = 0;
    for (const [key, templates] of duplicates) {
      // Sort by created_at DESC and keep the first one (most recent)
      const sortedTemplates = templates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const templateToKeep = sortedTemplates[0];
      const templatesToDelete = sortedTemplates.slice(1);
      
      console.log(`\nKeeping template: ${templateToKeep.id} (${templateToKeep.created_at})`);
      console.log(`Deleting ${templatesToDelete.length} duplicates...`);
      
      for (const template of templatesToDelete) {
        await query('DELETE FROM demand_templates WHERE id = $1', [template.id]);
        deletedCount++;
        console.log(`  Deleted: ${template.id}`);
      }
    }
    
    // Verify cleanup
    const remainingTemplates = await query('SELECT COUNT(*) as count FROM demand_templates');
    console.log(`\n✅ Cleanup completed!`);
    console.log(`Deleted ${deletedCount} duplicate templates`);
    console.log(`Remaining templates: ${remainingTemplates.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupDuplicateTemplates()
  .then(() => {
    console.log('\n🎉 Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  }); 