const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function extractT3Data() {
  try {
    console.log('📊 Extracting complete T3.xlsx data...');
    
    const filePath = path.join(__dirname, '..', 'samples', 'T3.xlsx');
    console.log('File path:', filePath);
    
    // Read the workbook
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets['Sheet1'];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('\n📋 Complete T3 Data Structure:');
    console.log('=' .repeat(80));
    
    // Get headers
    const headers = jsonData[0];
    console.log('Headers:', headers);
    
    // Process each row
    const processedData = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row && row.length > 0 && row[0]) { // Skip empty rows
        const rowData = {};
        headers.forEach((header, index) => {
          if (header) {
            rowData[header] = row[index] || '';
          }
        });
        processedData.push(rowData);
      }
    }
    
    console.log(`\nTotal data rows: ${processedData.length}`);
    
    // Filter for T03_PrimDist table
    const t03Data = processedData.filter(row => row.Table === 'T03_PrimDist');
    console.log(`\nT03_PrimDist rows: ${t03Data.length}`);
    
    console.log('\n🏗️ T03_PrimDist Table Structure:');
    console.log('=' .repeat(60));
    
    t03Data.forEach((row, index) => {
      console.log(`\n${index + 1}. Column: ${row['Column Name']} (Position: ${row['Column Number']})`);
      console.log(`   Description: ${row['Column Description']}`);
      console.log(`   Type: ${row['Type']}`);
      console.log(`   Data Source: ${row['Data Source']}`);
      if (row['Transformation Logic']) {
        console.log(`   Transformation Logic: ${row['Transformation Logic']}`);
      }
      if (row['List of sheets linked to this']) {
        console.log(`   Linked Sheets: ${row['List of sheets linked to this']}`);
      }
      if (row['QC Checklist']) {
        console.log(`   QC Checklist: ${row['QC Checklist']}`);
      }
    });
    
    // Save the extracted data
    const outputData = {
      allData: processedData,
      t03Structure: t03Data,
      tableInfo: {
        name: 'T03_PrimDist',
        description: 'Primary Distribution Table',
        totalColumns: t03Data.length,
        columns: t03Data.map(row => ({
          name: row['Column Name'],
          position: row['Column Number'],
          description: row['Column Description'],
          type: row['Type'],
          dataSource: row['Data Source'],
          transformationLogic: row['Transformation Logic'],
          linkedSheets: row['List of sheets linked to this'],
          qcChecklist: row['QC Checklist']
        }))
      }
    };
    
    const outputPath = path.join(__dirname, 't3_complete_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 Complete T3 data saved to: ${outputPath}`);
    
    // Create a summary of requirements
    console.log('\n📝 T03_PrimDist Implementation Requirements:');
    console.log('=' .repeat(60));
    
    const requirements = {
      tableName: 'T03_PrimDist',
      description: 'Primary Distribution Table - Maps SKUs to warehouses and factories with transformation logic',
      dataSources: [...new Set(t03Data.map(row => row['Data Source']).filter(Boolean))],
      transformationSteps: t03Data
        .filter(row => row['Transformation Logic'])
        .map(row => ({
          column: row['Column Name'],
          logic: row['Transformation Logic']
        })),
      columns: t03Data.map(row => ({
        name: row['Column Name'],
        sqlType: getSQLType(row['Type'], row['Column Description']),
        position: row['Column Number'],
        description: row['Column Description'],
        required: true
      }))
    };
    
    console.log('Data Sources:', requirements.dataSources);
    console.log('\nTransformation Steps:');
    requirements.transformationSteps.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.column}: ${step.logic}`);
    });
    
    console.log('\nColumn Definitions:');
    requirements.columns.forEach(col => {
      console.log(`  - ${col.name} (${col.sqlType}): ${col.description}`);
    });
    
    const requirementsPath = path.join(__dirname, 't03_requirements.json');
    fs.writeFileSync(requirementsPath, JSON.stringify(requirements, null, 2));
    console.log(`\n💾 Implementation requirements saved to: ${requirementsPath}`);
    
    console.log('\n✅ T3 data extraction complete!');
    
  } catch (error) {
    console.error('❌ Error extracting T3 data:', error);
  }
}

function getSQLType(type, description) {
  const desc = (description || '').toLowerCase();
  const typeStr = (type || '').toLowerCase();
  
  if (desc.includes('code') || desc.includes('sku')) {
    return 'VARCHAR(50)';
  } else if (desc.includes('month') || desc.includes('number')) {
    return 'INTEGER';
  } else if (desc.includes('warehouse') || desc.includes('factory')) {
    return 'VARCHAR(10)';
  } else if (typeStr.includes('raw data')) {
    return 'VARCHAR(100)';
  } else {
    return 'TEXT';
  }
}

// Run the extraction
extractT3Data(); 