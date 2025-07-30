const { query } = require('./config/database');
const Workbook = require('./models/Workbook');
const ProcessedDemandData = require('./models/ProcessedDemandData');

async function testRawDataProcessing() {
  try {
    console.log('🧪 Testing Raw Data Processing...\n');
    
    // Find Demand workbook
    const demandWorkbooksResult = await query(
      "SELECT * FROM workbooks WHERE workbook_name ILIKE '%demand%' AND workbook_name NOT ILIKE '%country%master%' ORDER BY created_at DESC LIMIT 1"
    );
    
    if (demandWorkbooksResult.rows.length === 0) {
      console.log('❌ No Demand workbook found');
      return;
    }
    
    const demandWorkbook = demandWorkbooksResult.rows[0];
    console.log(`📊 Found Demand workbook: ${demandWorkbook.workbook_name} (ID: ${demandWorkbook.id})`);
    
    // Set month and year (you can modify these)
    const month = '07';
    const year = 2025;
    
    console.log(`📅 Processing for Month: ${month}, Year: ${year}\n`);
    
    // Process the raw data
    console.log('🔄 Starting raw data processing...');
    
    // Import the processing function
    const { processRawData } = require('./controllers/rawDataController');
    
    // Create a mock request and response
    const mockReq = {
      body: {
        workbookId: demandWorkbook.id,
        month: month,
        year: year
      }
    };
    
    const mockRes = {
      json: (data) => {
        if (data.success) {
          console.log(`✅ Processing completed successfully!`);
          console.log(`📈 Processed ${data.processedRows} rows from ${data.workbookName}`);
        } else {
          console.log(`❌ Processing failed: ${data.error}`);
        }
      },
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Error (${code}): ${data.error}`);
        }
      })
    };
    
    // Process the raw data
    await processRawData(mockReq, mockRes);
    
    // Get statistics
    console.log('\n📊 Getting processed data statistics...');
    const stats = await ProcessedDemandData.getStats();
    console.log('Statistics:', stats);
    
    // Get some sample processed data
    console.log('\n📋 Sample processed data:');
    const sampleData = await ProcessedDemandData.findByMonthYear(month, year);
    console.log(`Found ${sampleData.length} processed records for ${month}/${year}`);
    
    if (sampleData.length > 0) {
      console.log('\nFirst 5 processed records:');
      sampleData.slice(0, 5).forEach((record, i) => {
        console.log(`${i + 1}. Geography: "${record.geography}", Market: "${record.market}", CTY: "${record.cty}"`);
      });
    }
    
    console.log('\n✅ Raw data processing test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testRawDataProcessing()
    .then(() => {
      console.log('\n🎉 Raw data processing test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testRawDataProcessing }; 