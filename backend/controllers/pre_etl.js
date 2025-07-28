// validateZip.js
// Run with: node validateZip.js
// Or override ZIP_PATH: ZIP_PATH=/path/to/file.zip node validateZip.js

const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

// === Configuration ===
const ZIP_PATH = process.env.ZIP_PATH || path.join(__dirname, 'Input Files.zip');

// === Folder-to-Expected-Files Mapping ===
const FOLDER_STRUCTURE_MAPPING = {
  'Input Files': [
    'Factory_Line_Master.xlsx',
    'Demand_country_master.xlsx',
    'Base_scenario_configuration.xlsx'
  ],
  'Input Files/SKU Master': [
    'Item_master_NFC.xlsx',
    'Item_master_KFC.xlsx',
    'Item_master_GFC.xlsx'
  ],
  // ... (rest of your mapping) ...
  'Input Files/Demand and OS': [
    'Demand.xlsx',
    'GFC_OS.xlsx',
    'KFC_OS.xlsx',
    'NFC_OS.xlsx'
  ]
};

// === Core Functions ===
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
      const folderPath = parts.join('/') || '';
      if (folderPath) {
        structure.folders[folderPath] = structure.folders[folderPath] || { name: folderPath, files: [] };
        structure.folders[folderPath].files.push(fileName);
      } else {
        structure.files.push(fileName);
      }
    }
  });
  console.log(`Found ${structure.totalFolders} folders and ${structure.totalFiles} files in ZIP`);
  return structure;
}

async function performValidation(zipStructure) {
  const results = { missingFiles: [], extraFiles: [], unknownFolders: [] };

  Object.entries(FOLDER_STRUCTURE_MAPPING).forEach(([expectedFolder, expectedFiles]) => {
    const actualFolder = Object.keys(zipStructure.folders)
      .find(zf => zf === expectedFolder || zf.endsWith(`/${expectedFolder}`));
    const actualFiles = actualFolder ? zipStructure.folders[actualFolder].files : [];

    if (!actualFolder) {
      // Entire folder missing
      expectedFiles.forEach(f => results.missingFiles.push({ folder: expectedFolder, file: f }));
      return;
    }

    // Missing
    expectedFiles.forEach(f => {
      if (!actualFiles.includes(f)) {
        results.missingFiles.push({ folder: expectedFolder, file: f });
      }
    });
    // Extra
    actualFiles.forEach(f => {
      if (!expectedFiles.includes(f)) {
        results.extraFiles.push({ folder: expectedFolder, file: f });
      }
    });
  });

  // Any folders in ZIP not in mapping
  Object.keys(zipStructure.folders).forEach(zf => {
    if (!Object.keys(FOLDER_STRUCTURE_MAPPING).some(ef => zf === ef || zf.endsWith(`/${ef}`))) {
      results.unknownFolders.push({ folder: zf, files: zipStructure.folders[zf].files });
    }
  });

  return results;
}

function generateValidationSummary(results, zipStructure) {
  return {
    totalFoldersInZip: zipStructure.totalFolders,
    totalFilesInZip: zipStructure.totalFiles,
    expectedFolders: Object.keys(FOLDER_STRUCTURE_MAPPING).length,
    foldersFound: Object.keys(FOLDER_STRUCTURE_MAPPING).length - 
                  results.missingFiles.reduce((set, m) => set.add(m.folder), new Set()).size,
    missingCount: results.missingFiles.length,
    extraCount: results.extraFiles.length,
    unknownFolders: results.unknownFolders.length,
    passed: results.missingFiles.length === 0,
    testedAt: new Date().toISOString()
  };
}

// === Main Execution ===
async function main() {
  try {
    console.log('\n=== ZIP Validation Started ===');
    if (!fs.existsSync(ZIP_PATH)) {
      throw new Error(`ZIP not found at ${ZIP_PATH}`);
    }
    const zip = new AdmZip(ZIP_PATH);
    const entries = zip.getEntries();
    const structure = await analyzeZipStructure(entries);
    const validation = await performValidation(structure);
    const summary = generateValidationSummary(validation, structure);

    console.log('\n=== Validation Summary ===');
    console.log(JSON.stringify(summary, null, 2));
    console.log('\n=== Missing Files ===');
    validation.missingFiles.forEach(m => 
      console.log(`${m.file} unavailable in ${m.folder}`)
    );
    console.log('\n=== Extra Files ===');
    validation.extraFiles.forEach(e => 
      console.log(`Extra file: ${e.file} in ${e.folder}`)
    );
    console.log('\n=== Unknown Folders ===');
    validation.unknownFolders.forEach(u => 
      console.log(`Unknown folder: ${u.folder}`)
    );

    process.exit(summary.passed ? 0 : 1);
  } catch (err) {
    console.error('\n❌ Validation failed:', err.message);
    process.exit(2);
  }
}

// Invoke if run directly
if (require.main === module) {
  main();
}
