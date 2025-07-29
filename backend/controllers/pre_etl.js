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
// === Test Case 1 | Check file availability as per input file list  ===
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



// =======TO BE DELETED LATER============
// // === Helper: Extract & Save Dynamic Format Schema (Trim Trailing Blanks) ===
// const FORMAT_SCHEMA_OUTPUT = path.join(__dirname, 'formatSchema.json');

// function extractFormatSchema(zip, zipStructure) {
//   const schema = {};

//   for (const [folderPath, folderObj] of Object.entries(zipStructure.folders)) {
//     for (const fileName of folderObj.files) {
//       const entryName = `${folderPath}/${fileName}`;
//       try {
//         const buffer   = zip.readFile(entryName);
//         const workbook = xlsx.read(buffer, { type: 'buffer' });
//         const base     = path.parse(fileName).name;
//         schema[base]   = { sheets: {} };

//         workbook.SheetNames.forEach(sheetName => {
//           const sheet = workbook.Sheets[sheetName];
//           const range = xlsx.utils.decode_range(sheet['!ref'] || '');

//           let bestRow        = null;
//           let maxNonEmpty    = 0;
//           let bestHeaders    = [];

//           // Find the row with the most non‑empty cells
//           for (let R = range.s.r; R <= range.e.r; ++R) {
//             const headers     = [];
//             let nonEmptyCount = 0;

//             for (let C = range.s.c; C <= range.e.c; ++C) {
//               const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
//               const cell    = sheet[cellRef];
//               const val     = cell && cell.v != null ? String(cell.v).trim() : '';
//               headers.push(val);
//               if (val !== '') nonEmptyCount++;
//             }

//             if (nonEmptyCount > maxNonEmpty) {
//               maxNonEmpty = nonEmptyCount;
//               bestRow     = R + 1;      // convert to 1‑based
//               bestHeaders = headers;
//             }
//           }

//           // Trim off any trailing empty strings
//           let lastIdx = bestHeaders.length - 1;
//           while (lastIdx >= 0 && bestHeaders[lastIdx] === '') {
//             lastIdx--;
//           }
//           const trimmedHeaders = bestHeaders.slice(0, lastIdx + 1);

//           schema[base].sheets[sheetName] = {
//             sheetName,
//             headerRow: bestRow,
//             headers: trimmedHeaders,
//             columnCount: trimmedHeaders.length
//           };
//         });

//       } catch (err) {
//         console.error(`Error reading ${entryName}: ${err.message}`);
//       }
//     }
//   }

//   // Persist to JSON
//   try {
//     fs.writeFileSync(
//       FORMAT_SCHEMA_OUTPUT,
//       JSON.stringify(schema, null, 2),
//       'utf8'
//     );
//     console.log(`\n✅ Format schema saved to ${FORMAT_SCHEMA_OUTPUT}`);
//   } catch (err) {
//     console.error(`❌ Failed to write schema file: ${err.message}`);
//   }

//   return schema;
// }


// === Test Case 3 | Check if the given file formats are being followed ===
const formatSchema = require('./formatSchema.json');

async function testFormatAgainstSchema(zip, zipStructure, validationResults) {
  validationResults.formatFailures = [];

  console.log('\n🔍 Checking file format as per schema…');

  for (const [folderPath, folderObj] of Object.entries(zipStructure.folders)) {
    for (const fileName of folderObj.files) {
      const entryName = `${folderPath}/${fileName}`;
      const baseName = path.parse(fileName).name;

      if (!formatSchema[baseName]) {
        console.log(`  ⚠️  No schema found for ${fileName} (skipped)`);
        continue;
      }

      try {
        const buffer = zip.readFile(entryName);
        const workbook = xlsx.read(buffer, { type: 'buffer' });

        const expectedSheets = formatSchema[baseName].sheets;

        for (const [sheetName, schema] of Object.entries(expectedSheets)) {
          let sheet = workbook.Sheets[sheetName];

          // // Log what sheet names we have in workbook
          // console.log(`Workbook sheets found: ${workbook.SheetNames.join(', ')}`);
          // console.log(`Looking for sheet "${sheetName}" in file "${fileName}"`);

          if (!sheet) {
              const nonMetaSheets = workbook.SheetNames.filter(
                  n => !n.toLowerCase().includes('meta')
              );
              if (nonMetaSheets.length > 0) {
                  const fallbackSheetName = nonMetaSheets[0];
                  sheet = workbook.Sheets[fallbackSheetName];
                  console.log(
                      `  ⚠️ Sheet "${sheetName}" not found in "${fileName}". Using "${fallbackSheetName}" instead.`
                  );
              }
          }


          if (!sheet) {
            const msg = `Sheet "${sheetName}" missing in file "${fileName}" (path: ${folderPath})`;
            console.log(`  ❌ ${msg}`);
            validationResults.formatFailures.push({ folder: folderPath, file: fileName, message: msg });
            continue;
          }

          // Handle merged cells - fill empty merged cells with top-left value
          // if (sheet['!merges']) {
          //   sheet['!merges'].forEach(merge => {
          //     const topLeftRef = xlsx.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
          //     const topLeftCell = sheet[topLeftRef];
          //     if (topLeftCell && topLeftCell.v !== undefined) {
          //       for (let R = merge.s.r; R <= merge.e.r; R++) {
          //         for (let C = merge.s.c; C <= merge.e.c; C++) {
          //           const cellRef = xlsx.utils.encode_cell({ r: R, c: C });
          //           if (!sheet[cellRef]) sheet[cellRef] = { v: topLeftCell.v };
          //         }
          //       }
          //     }
          //   });
          // }

          if (sheet['!merges']) {
            sheet['!merges'].forEach(merge => {
              const topLeft = xlsx.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
              const value = sheet[topLeft] && sheet[topLeft].v;
              for (let R = merge.s.r; R <= merge.e.r; ++R) {
                for (let C = merge.s.c; C <= merge.e.c; ++C) {
                  const ref = xlsx.utils.encode_cell({ r: R, c: C });
                  if (!sheet[ref]) sheet[ref] = { v: value };
                }
              }
            });
          }

          // Determine actual headers
          const range = xlsx.utils.decode_range(sheet['!ref']);
          const headerRowIdx = schema.headerRow - 1;
          const headers = [];
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = xlsx.utils.encode_cell({ r: headerRowIdx, c: C });
            const cell = sheet[cellRef];
            headers.push(cell ? String(cell.v).trim() : '');
          }

          // Trim trailing blanks
          while (headers.length && headers[headers.length - 1] === '') {
            headers.pop();
          }

          // Check header count
          if (headers.length !== schema.columnCount) {
            const msg = `Column count mismatch in "${sheetName}" of "${fileName}". Expected ${schema.columnCount}, found ${headers.length}`;
            console.log(`  ❌ ${msg}`);
            validationResults.formatFailures.push({ folder: folderPath, file: fileName, message: msg });
          }

          // Check each header
          schema.headers.forEach((expectedHeader, idx) => {
            if ((headers[idx] || '') !== expectedHeader) {
              const msg = `Header mismatch at column ${idx + 1} in "${sheetName}" of "${fileName}". Expected "${expectedHeader}", found "${headers[idx] || ''}"`;
              console.log(`  ❌ ${msg}`);
              validationResults.formatFailures.push({ folder: folderPath, file: fileName, message: msg });
            }
          });
        }
      } catch (err) {
        const msg = `Unable to parse "${fileName}" at ${folderPath}: ${err.message}`;
        console.log(`  ❌ ${msg}`);
        validationResults.formatFailures.push({ folder: folderPath, file: fileName, message: msg });
      }
    }
  }
}


// === Test Case 4 | #Factories and names of factories are same in all input files ===
async function testFactoryConsistency(zip, zipStructure, validationResults) {
  console.log('\n🔍 Checking unique factory names across all relevant files…');
  validationResults.factoryMismatches = [];

  // --- STEP 1: Identify relevant sheets from schema ---
  const factoryFiles = [];
  for (const [fileBase, fileSchema] of Object.entries(formatSchema)) {
    for (const [sheetName, sheetSchema] of Object.entries(fileSchema.sheets)) {
      const isHeaderBased = sheetSchema.factoryHeaders && sheetSchema.factoryColumns;
      const isValueBased = (sheetSchema.factoryValueColumns && sheetSchema.factoryValueColumns.length > 0)
        || sheetSchema.headers.some(h => h.toLowerCase() === 'factory');

      if (isHeaderBased || isValueBased) {
        factoryFiles.push({
          fileBase,
          sheetName,
          headerRow: sheetSchema.headerRow,
          headers: sheetSchema.headers,
          factoryHeaders: !!sheetSchema.factoryHeaders,
          factoryColumns: sheetSchema.factoryColumns || [],
          factoryValueColumns: sheetSchema.factoryValueColumns || [],
          factoryColumnIndex: sheetSchema.headers.findIndex(h => h.toLowerCase() === 'factory')
        });
      }
    }
  }


  if (!factoryFiles.length) {
    console.log('  ⚠️  No Factory columns or headers found in any schema. Skipping test.');
    return;
  }

  const allFactoriesSet = new Set();
  const factoriesByFile = {};

  // --- STEP 2: Extract factories from each sheet ---
  for (const fileDef of factoryFiles) {
    const { fileBase, sheetName, headerRow } = fileDef;

    // Find actual file path in zip
    const folderPath = Object.keys(zipStructure.folders)
      .find(fp => zipStructure.folders[fp].files.some(f => f.startsWith(fileBase)));
    if (!folderPath) continue;
    const fileName = zipStructure.folders[folderPath].files.find(f => f.startsWith(fileBase));
    const entryName = `${folderPath}/${fileName}`;

    try {
      const buffer = zip.readFile(entryName);
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        console.log(`  ❌ Sheet ${sheetName} missing in ${fileName}`);
        continue;
      }

      const range = xlsx.utils.decode_range(sheet['!ref']);
      const factories = new Set();

      if (fileDef.factoryHeaders) {
        // Case 1: Factory names are column headers
        (fileDef.factoryColumns || []).forEach(h => factories.add(h));
      } else {
        // Case 2: Factory names are row values
        let valueColumns = [];

        // Add explicitly defined columns from schema
        if (fileDef.factoryValueColumns && fileDef.factoryValueColumns.length > 0) {
          valueColumns = fileDef.factoryValueColumns.map(colName =>
            fileDef.headers.findIndex(h => h === colName)
          ).filter(idx => idx >= 0);
        }

        // If no explicit factoryValueColumns, fallback to "Factory" column index
        if (valueColumns.length === 0 && fileDef.factoryColumnIndex !== null) {
          valueColumns.push(fileDef.factoryColumnIndex);
        }

        // Read values from each identified factory column
        valueColumns.forEach(colIdx => {
          for (let R = headerRow; R <= range.e.r; R++) {
            const cellRef = xlsx.utils.encode_cell({ r: R, c: colIdx });
            const cell = sheet[cellRef];
            if (cell && cell.v) factories.add(String(cell.v).trim());
          }
        });
      }

      factoriesByFile[`${fileBase}:${sheetName}`] = factories;
      factories.forEach(f => allFactoriesSet.add(f));

    } catch (err) {
      console.log(`  ❌ Unable to read ${fileName} for factories: ${err.message}`);
    }
  }

  const allFactories = Array.from(allFactoriesSet);

  // --- STEP 3: Build matrix ---
  const matrix = allFactories.map(f => {
    const row = { Factory: f };
    for (const key of Object.keys(factoriesByFile)) {
      row[key] = factoriesByFile[key].has(f);
      if (!factoriesByFile[key].has(f)) {
        validationResults.factoryMismatches.push({
          factory: f,
          fileSheet: key,
          message: `Please check ${key} for missing factory "${f}"`
        });
      }
    }
    return row;
  });

  // --- STEP 4: Transpose matrix and print ---
  function transposeMatrix(matrix, headers) {
    const transposed = [];
    headers.slice(1).forEach(sheet => {
      const row = { Sheet: sheet };
      matrix.forEach(factoryRow => {
        row[factoryRow.Factory] = factoryRow[sheet] ? 'TRUE' : 'FALSE';
      });
      transposed.push(row);
    });
    return transposed;
  }

  const headers = ['Factory', ...Object.keys(factoriesByFile)];
  const transposedMatrix = transposeMatrix(matrix, headers);
  console.log('\nFactory consistency matrix (Sheets as rows):');
  console.table(transposedMatrix);

  // --- STEP 5: Messages for missing factories ---
  if (validationResults.factoryMismatches.length) {
    console.log('\n=== Factory Mismatches ===');
    validationResults.factoryMismatches.forEach(m => console.log(`  ❌ ${m.message}`));
  } else {
    console.log('  ✅ All factories present in all relevant sheets.');
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

    // // Helper Test Case - Prep: extract & save schema
    // const formatSchema = extractFormatSchema(zip, structure);

    // Test Case 3: format validation
    await testFormatAgainstSchema(zip, structure, validation);

    // Test Case 3: #Factories and names of factories are same in all input files
    await testFactoryConsistency(zip, structure, validation);

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
