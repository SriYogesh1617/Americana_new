// validateZip.js
// Run with: node validateZip.js
// Or override ZIP_PATH: ZIP_PATH=/path/to/file.zip node validateZip.js

const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// === Configuration ===
const ZIP_PATH = process.env.ZIP_PATH || path.join(__dirname, 'Input Files.zip');

// === Validation 1 | All files are available in folder ===

// === Folder-to-Expected-Files Mapping ===
const FOLDER_STRUCTURE_MAPPING = {
  'Input Files': [
    'Factory_line_master.xlsx',
    'Demand_country_master.xlsx',
    'Base_scenario_configuration.xlsx',
    'Scenario_builder_template.xlsx'
  ],
  'Input Files/SKU Master': [
    'Item_master_NFC.xlsx',
    'Item_master_KFC.xlsx',
    'Item_master_GFC.xlsx'
  ],
  'Input Files/SKU-Line Mapping': [
    'Capacity.xlsx'
  ],
  'Input Files/Bill of Materials': [
    'GFC_BOM.xlsx',
    'KFC_BOM.xlsx',
    'NF1_BOM.xlsx',
    'NF2_BOM.xlsx',
    'Chicken_trimming_recipe.xlsx'
  ],
  'Input Files/Cost Data': [
    'Factory_routing.xlsx',
    'Labor_electricity_cost_per_factory.xlsx',
    'Labor_cost_details_by_factory.xlsx',
    'Landed_raw_material_cost.xlsx',
    'Customs.xlsx',
    'RM_transfer_costs.xlsx',
    'Freight_storage_costs.xlsx'
  ],
  'Input Files/Demand and OS': [
    'Demand.xlsx',
    'GFC_OS.xlsx',
    'KFC_OS.xlsx',
    'NFC_OS.xlsx'
  ]
};

// === Analyze ZIP structure recursively ===
async function analyzeZipStructure(zipEntries) {
  const structure = { folders: {}, files: [], totalFolders: 0, totalFiles: 0 };

  zipEntries.forEach(entry => {
    const entryPath = entry.entryName.replace(/\\/g, '/');
    if (entry.isDirectory) {
      const folderName = entryPath.replace(/\/$/, '');
      if (!structure.folders[folderName]) {
        structure.folders[folderName] = { name: folderName, files: [] };
        structure.totalFolders++;
      }
    } else {
      structure.totalFiles++;
      const parts = entryPath.split('/');
      const fileName = parts.pop();
      const folderPath = parts.join('/');
      if (folderPath) {
        if (!structure.folders[folderPath]) {
          structure.folders[folderPath] = { name: folderPath, files: [] };
          structure.totalFolders++;
        }
        structure.folders[folderPath].files.push(fileName);
      } else {
        structure.files.push(fileName);
      }
    }
  });

  console.log(`Found ${structure.totalFolders} folders and ${structure.totalFiles} files in ZIP`);
  return structure;
}

// === Perform validation with .xlsx / .xls flexibility ===
async function performValidation(zipStructure) {
  const results = { missingFiles: [], extraFiles: [], unknownFolders: [] };

  Object.entries(FOLDER_STRUCTURE_MAPPING).forEach(([expectedFolder, expectedFiles]) => {
    const actualFolder = Object.keys(zipStructure.folders)
      .find(zf => zf === expectedFolder || zf.endsWith(`/${expectedFolder}`));
    const actualFiles = actualFolder ? zipStructure.folders[actualFolder].files : [];

    if (!actualFolder) {
      // whole folder missing
      expectedFiles.forEach(f => {
        results.missingFiles.push({ folder: expectedFolder, file: f });
      });
      return;
    }

    // Check each expected file (allow .xlsx or .xls)
    expectedFiles.forEach(expectedFile => {
      const base = path.parse(expectedFile).name;
      const hasXlsx = actualFiles.includes(base + '.xlsx');
      const hasXls  = actualFiles.includes(base + '.xls');
      if (!hasXlsx && !hasXls) {
        const msg = `${base}.{xlsx|xls} unavailable in ${expectedFolder}`;
        console.log(`  ❌ ${msg}`);
        results.missingFiles.push({ folder: expectedFolder, file: expectedFile, message: msg });
      } else {
        const found = hasXlsx ? '.xlsx' : '.xls';
        console.log(`  ✅ Found: ${base}${found}`);
      }
    });

    // Extra files in folder
    actualFiles.forEach(actualFile => {
      const base = path.parse(actualFile).name;
      if (!expectedFiles.some(f => path.parse(f).name === base)) {
        const msg = `Extra file found: ${actualFile} in ${expectedFolder}`;
        console.log(`  ⚠️  ${msg}`);
        results.extraFiles.push({ folder: expectedFolder, file: actualFile, message: msg });
      }
    });
  });

  // Detect any folders not in the mapping
  Object.keys(zipStructure.folders).forEach(zf => {
    const known = Object.keys(FOLDER_STRUCTURE_MAPPING)
      .some(ef => zf === ef || zf.endsWith(`/${ef}`));
    if (!known) {
      results.unknownFolders.push({ folder: zf, files: zipStructure.folders[zf].files });
    }
  });

  return results;
}

// === Generate summary ===
function generateValidationSummary(results, zipStructure) {
  return {
    totalFoldersInZip: zipStructure.totalFolders,
    totalFilesInZip: zipStructure.totalFiles,
    expectedFolders: Object.keys(FOLDER_STRUCTURE_MAPPING).length,
    foldersFound: Object.keys(FOLDER_STRUCTURE_MAPPING).length - 
                  new Set(results.missingFiles.map(m => m.folder)).size,
    missingCount: results.missingFiles.length,
    extraCount: results.extraFiles.length,
    unknownFolders: results.unknownFolders.length,
    passed: results.missingFiles.length === 0,
    testedAt: new Date().toISOString()
  };
}


// === Test Case 2 | Open & Read Each File ===
async function testOpenFiles(zip, zipStructure, validationResults) {
  // initialize open‑failure array
  validationResults.openFailures = [];

  console.log('\n🔍 Testing file open/read…');
  for (const [folderPath, folderObj] of Object.entries(zipStructure.folders)) {
    for (const fileName of folderObj.files) {
      const entryName = `${folderPath}/${fileName}`;
      try {
        // attempt to parse the buffer as Excel
        const buffer = zip.readFile(entryName);
        xlsx.read(buffer, { type: 'buffer' });
        console.log(`  ✅ ${fileName} opened successfully in ${folderPath}`);
      } catch (err) {
        const msg = `Unable to open ${fileName} in ${folderPath}: ${err.message}`;
        console.log(`  ❌ ${msg}`);
        validationResults.openFailures.push({ folder: folderPath, file: fileName, message: msg });
      }
    }
  }
}


// === Main ===
async function main() {
  try {
    console.log('\n=== ZIP Validation Started ===');
    if (!fs.existsSync(ZIP_PATH)) {
      throw new Error(`ZIP not found at ${ZIP_PATH}`);
    }
    const zip = new AdmZip(ZIP_PATH);
    const entries = zip.getEntries();

    const structure = await analyzeZipStructure(entries);
    console.log('\n🔍 Validating contents…');
    const validation = await performValidation(structure);
    // Test Case 2: open & read each file
    await testOpenFiles(zip, structure, validation);
    const summary = generateValidationSummary(validation, structure);

    console.log('\n=== Validation Summary ===');
    console.log(JSON.stringify(summary, null, 2));

    if (validation.missingFiles.length) {
      console.log('\n=== Missing Files ===');
      validation.missingFiles.forEach(m =>
        console.log(`${m.message}`)
      );
    }
    if (validation.extraFiles.length) {
      console.log('\n=== Extra Files ===');
      validation.extraFiles.forEach(e =>
        console.log(`${e.message}`)
      );
    }
    if (validation.unknownFolders.length) {
      console.log('\n=== Unknown Folders ===');
      validation.unknownFolders.forEach(u =>
        console.log(`Unknown folder: ${u.folder}`)
      );
    }

        // ===== File‑Open Validation Summary =====
    console.log('\n=== File‑Open Validation ===');
    console.log(`Total open failures: ${validation.openFailures.length}`);
    validation.openFailures.forEach(f =>
      console.log(`  ❌ ${f.message}`)
    );

    process.exit(summary.passed ? 0 : 1);

  } catch (err) {
    console.error('\n❌ Validation failed:', err.message);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}
