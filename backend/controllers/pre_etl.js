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


// === Test Case 5 | Country names are consistent across all input files ===
async function testCountryConsistency(zip, zipStructure, validationResults) {
  console.log('\n🔍 Checking country name consistency across all relevant files…');
  validationResults.countryMismatches = [];

  // --- STEP 1: Identify relevant sheets from schema ---
  const countryFiles = [];
  for (const [fileBase, fileSchema] of Object.entries(formatSchema)) {
    for (const [sheetName, sheetSchema] of Object.entries(fileSchema.sheets)) {
      if (sheetSchema.countryValueColumns && sheetSchema.countryValueColumns.length > 0) {
        countryFiles.push({
          fileBase,
          sheetName,
          headerRow: sheetSchema.headerRow,
          headers: sheetSchema.headers,
          countryValueColumns: sheetSchema.countryValueColumns,
          countryColumnIndices: sheetSchema.countryValueColumns.map(colName =>
            sheetSchema.headers.findIndex(h => h === colName)
          ).filter(idx => idx >= 0)
        });
      }
    }
  }

  if (!countryFiles.length) {
    console.log('  ⚠️  No country columns found in any schema. Skipping test.');
    return;
  }

  const allCountriesSet = new Set();
  const countriesByFile = {};

  // --- STEP 2: Extract countries from each sheet ---
  for (const fileDef of countryFiles) {
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
      let sheet = workbook.Sheets[sheetName];
      
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
        console.log(`  ❌ Sheet ${sheetName} missing in ${fileName}`);
        continue;
      }

      const range = xlsx.utils.decode_range(sheet['!ref']);
      const countries = new Set();

      // Read values from each identified country column
      fileDef.countryColumnIndices.forEach(colIdx => {
        for (let R = headerRow; R <= range.e.r; R++) {
          const cellRef = xlsx.utils.encode_cell({ r: R, c: colIdx });
          const cell = sheet[cellRef];
          if (cell && cell.v && String(cell.v)) {
            const countryName = String(cell.v);
            countries.add(countryName);
          }
        }
      });

      countriesByFile[`${fileBase}:${sheetName}`] = countries;
      countries.forEach(c => allCountriesSet.add(c));

    } catch (err) {
      console.log(`  ❌ Unable to read ${fileName} for countries: ${err.message}`);
    }
  }

  const allCountries = Array.from(allCountriesSet);

  // --- STEP 3: Build matrix ---
  const matrix = allCountries.map(country => {
    const row = { Country: country };
    for (const key of Object.keys(countriesByFile)) {
      row[key] = countriesByFile[key].has(country);
      if (!countriesByFile[key].has(country)) {
        validationResults.countryMismatches.push({
          country: country,
          fileSheet: key,
          message: `Please check ${key} for missing country "${country}"`
        });
      }
    }
    return row;
  });

  // --- STEP 4: Display matrix with countries as rows and files as columns ---
  console.log('\nCountry consistency matrix (Countries as rows):');
  console.table(matrix);

  // --- STEP 5: Messages for missing countries ---
  if (validationResults.countryMismatches.length) {
    console.log('\n=== Country Mismatches ===');
    validationResults.countryMismatches.forEach(m => console.log(`  ❌ ${m.message}`));
  } else {
    console.log('  ✅ All countries present in all relevant sheets.');
  }
}


// === Test Case 6 | Warehouse names are consistent across all input files ===
async function testWarehouseConsistency(zip, zipStructure, validationResults) {
  console.log('\n🔍 Checking warehouse name consistency across all relevant files…');
  validationResults.warehouseMismatches = [];

  // --- STEP 1: Identify relevant sheets from schema ---
  const warehouseFiles = [];
  for (const [fileBase, fileSchema] of Object.entries(formatSchema)) {
    for (const [sheetName, sheetSchema] of Object.entries(fileSchema.sheets)) {
      if (sheetSchema.warehouseValueColumns && sheetSchema.warehouseValueColumns.length > 0) {
        warehouseFiles.push({
          fileBase,
          sheetName,
          headerRow: sheetSchema.headerRow,
          headers: sheetSchema.headers,
          warehouseValueColumns: sheetSchema.warehouseValueColumns,
          warehouseColumnIndices: sheetSchema.warehouseValueColumns.map(colName =>
            sheetSchema.headers.findIndex(h => h === colName)
          ).filter(idx => idx >= 0),
          warehouseExcludeValues: sheetSchema.warehouseExcludeValues || []
        });
      }
    }
  }

  if (!warehouseFiles.length) {
    console.log('  ⚠️  No warehouse columns found in any schema. Skipping test.');
    return;
  }

  const allWarehousesSet = new Set();
  const warehousesByFile = {};

  // --- STEP 2: Extract warehouses from each sheet ---
  for (const fileDef of warehouseFiles) {
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
      let sheet = workbook.Sheets[sheetName];
      
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
        console.log(`  ❌ Sheet ${sheetName} missing in ${fileName}`);
        continue;
      }

      const range = xlsx.utils.decode_range(sheet['!ref']);
      const warehouses = new Set();

      // Read values from each identified warehouse column
      fileDef.warehouseColumnIndices.forEach(colIdx => {
        for (let R = headerRow; R <= range.e.r; R++) {
          const cellRef = xlsx.utils.encode_cell({ r: R, c: colIdx });
          const cell = sheet[cellRef];
          if (cell && cell.v && String(cell.v)) {
            const warehouseName = String(cell.v);
            // Skip excluded values
            if (!fileDef.warehouseExcludeValues.includes(warehouseName)) {
              warehouses.add(warehouseName);
            }
          }
        }
      });

      warehousesByFile[`${fileBase}:${sheetName}`] = warehouses;
      warehouses.forEach(w => allWarehousesSet.add(w));

    } catch (err) {
      console.log(`  ❌ Unable to read ${fileName} for warehouses: ${err.message}`);
    }
  }

  const allWarehouses = Array.from(allWarehousesSet);

  // --- STEP 3: Build matrix ---
  const matrix = allWarehouses.map(warehouse => {
    const row = { Warehouse: warehouse };
    for (const key of Object.keys(warehousesByFile)) {
      row[key] = warehousesByFile[key].has(warehouse);
      if (!warehousesByFile[key].has(warehouse)) {
        validationResults.warehouseMismatches.push({
          warehouse: warehouse,
          fileSheet: key,
          message: `Please check ${key} for missing warehouse "${warehouse}"`
        });
      }
    }
    return row;
  });

  // --- STEP 4: Display matrix with warehouses as rows and files as columns ---
  console.log('\nWarehouse consistency matrix (Warehouses as rows):');
  console.table(matrix);

  // --- STEP 5: Messages for missing warehouses ---
  if (validationResults.warehouseMismatches.length) {
    console.log('\n=== Warehouse Mismatches ===');
    validationResults.warehouseMismatches.forEach(m => console.log(`  ❌ ${m.message}`));
  } else {
    console.log('  ✅ All warehouses present in all relevant sheets.');
  }
}


// === Test Case 8 Step 1 | Filter demand data SKU codes ===
async function filterDemandSKUs(zip, zipStructure, validationResults) {
  console.log('\n🔍 Filtering demand data SKUs based on criteria…');
  validationResults.demandFiltering = {
    totalRowsProcessed: 0,
    originFiltered: 0,
    pdNpdFiltered: 0,
    zeroDemandFiltered: 0,
    finalFilteredSKUs: [],
    filteredData: []
  };

  // Find Demand.xlsx file (not Demand_country_master.xlsx)
  let demandFolderPath = null;
  let fileName = null;
  
  for (const folderPath of Object.keys(zipStructure.folders)) {
    const files = zipStructure.folders[folderPath].files;
    const demandFile = files.find(f => f === 'Demand.xlsx' || f === 'Demand.xls');
    if (demandFile) {
      demandFolderPath = folderPath;
      fileName = demandFile;
      break;
    }
  }
  
  if (!demandFolderPath || !fileName) {
    console.log('  ❌ Demand.xlsx file not found in ZIP structure');
    return;
  }
  const entryName = `${demandFolderPath}/${fileName}`;

  try {
    const buffer = zip.readFile(entryName);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let sheet = workbook.Sheets['Raw Demand'];
    
    if (!sheet) {
      const nonMetaSheets = workbook.SheetNames.filter(
        n => !n.toLowerCase().includes('meta')
      );
      if (nonMetaSheets.length > 0) {
        const fallbackSheetName = nonMetaSheets[0];
        sheet = workbook.Sheets[fallbackSheetName];
        console.log(
          `  ⚠️ Sheet "Raw Demand" not found in "${fileName}". Using "${fallbackSheetName}" instead.`
        );
      }
    }

    if (!sheet) {
      console.log(`  ❌ Raw Demand sheet missing in ${fileName}`);
      return;
    }

    const range = xlsx.utils.decode_range(sheet['!ref']);
    const demandSchema = formatSchema.Demand.sheets['Raw Demand'];
    const filterConfig = demandSchema.demandFiltering;
    
    // Get column indices
    const originColIdx = demandSchema.headers.findIndex(h => h === 'Origin');
    const pdNpdColIdx = demandSchema.headers.findIndex(h => h === 'PD/NPD');
    const skuColIdx = demandSchema.headers.findIndex(h => h === filterConfig.skuColumn);
    
    if (originColIdx === -1 || pdNpdColIdx === -1 || skuColIdx === -1) {
      console.log('  ❌ Required columns not found in Raw Demand sheet');
      return;
    }

    console.log(`  ✅ Found columns - Origin: ${originColIdx}, PD/NPD: ${pdNpdColIdx}, SKU: ${skuColIdx}`);
    console.log(`  ✅ Demand column range: ${filterConfig.demandColumnRange.startColumn} to ${filterConfig.demandColumnRange.endColumn}`);
    console.log(`  ✅ Total range in sheet: rows ${demandSchema.headerRow} to ${range.e.r}`);

    // Process each row starting from header row
    for (let R = demandSchema.headerRow; R <= range.e.r; R++) {
      validationResults.demandFiltering.totalRowsProcessed++;
      
      // Read row data
      const originCell = sheet[xlsx.utils.encode_cell({ r: R, c: originColIdx })];
      const pdNpdCell = sheet[xlsx.utils.encode_cell({ r: R, c: pdNpdColIdx })];
      const skuCell = sheet[xlsx.utils.encode_cell({ r: R, c: skuColIdx })];
      
      const origin = originCell ? String(originCell.v) : '';
      const pdNpd = pdNpdCell ? String(pdNpdCell.v) : '';
      const sku = skuCell ? String(skuCell.v) : '';
      
      if (!sku) continue; // Skip rows without SKU
      
      // Debug: Track non-numeric SKUs
      if (validationResults.demandFiltering.totalRowsProcessed <= 10 || !(/^\d+$/.test(sku))) {
        if (!(/^\d+$/.test(sku))) {
          console.log(`    Debug: Non-numeric SKU found: "${sku}" (Row ${R})`);
        }
      }
      
      // Apply filtering criteria
      // Filter 1: Remove rows where Origin="Other"
      if (filterConfig.originExcludeValues.includes(origin)) {
        validationResults.demandFiltering.originFiltered++;
        continue;
      }
      
      // Filter 2: Remove rows where PD/NPD="NPD" (case sensitive)
      if (filterConfig.pdNpdExcludeValues.includes(pdNpd)) {
        validationResults.demandFiltering.pdNpdFiltered++;
        continue;
      }
      
      // Filter 3: Calculate total demand for first 12 months (convert negative to 0)
      let totalDemand = 0;
      const { startColumn, endColumn } = filterConfig.demandColumnRange;
      let debugValues = [];
      
      for (let colIdx = startColumn; colIdx <= endColumn; colIdx++) {
        const demandCell = sheet[xlsx.utils.encode_cell({ r: R, c: colIdx })];
        if (demandCell && demandCell.v !== undefined && demandCell.v !== null) {
          const monthDemand = Number(demandCell.v);
          if (!isNaN(monthDemand)) {
            const adjustedDemand = Math.max(0, monthDemand);
            totalDemand += adjustedDemand;
            debugValues.push(adjustedDemand);
          }
        }
      }
      
      // Debug log for first few rows
      if (validationResults.demandFiltering.totalRowsProcessed <= 3) {
        console.log(`    Debug Row ${R}: SKU="${sku}", Origin="${origin}", PD/NPD="${pdNpd}", TotalDemand=${totalDemand}, Values=[${debugValues.slice(0,5).join(',')}...]`);
      }
      
      // Filter 3: Remove SKUs with total demand = 0 (after negative conversion)
      if (totalDemand === 0) {
        validationResults.demandFiltering.zeroDemandFiltered++;
        continue;
      }
      
      // Row passed all filters - store it
      const rowData = {
        sku: sku,
        origin: origin,
        pdNpd: pdNpd,
        totalDemand: totalDemand
      };
      
      validationResults.demandFiltering.filteredData.push(rowData);
      if (!validationResults.demandFiltering.finalFilteredSKUs.includes(sku)) {
        validationResults.demandFiltering.finalFilteredSKUs.push(sku);
      }
    }

    // Display summary
    console.log(`  ✅ Demand filtering completed:`);
    console.log(`     Total rows processed: ${validationResults.demandFiltering.totalRowsProcessed}`);
    console.log(`     Filtered by Origin="Other": ${validationResults.demandFiltering.originFiltered}`);
    console.log(`     Filtered by PD/NPD="NPD": ${validationResults.demandFiltering.pdNpdFiltered}`);
    console.log(`     Filtered by zero demand (after negative conversion): ${validationResults.demandFiltering.zeroDemandFiltered}`);
    console.log(`     Final filtered data rows: ${validationResults.demandFiltering.filteredData.length}`);
    console.log(`     Unique SKUs (Unified codes) after filtering: ${validationResults.demandFiltering.finalFilteredSKUs.length}`);
    
    // Display first few filtered SKUs as sample
    const sampleSKUs = validationResults.demandFiltering.finalFilteredSKUs.slice(0, 10);
    console.log(`     Sample filtered SKUs: ${sampleSKUs.join(', ')}${validationResults.demandFiltering.finalFilteredSKUs.length > 10 ? '...' : ''}`);

  } catch (err) {
    console.log(`  ❌ Unable to process demand filtering: ${err.message}`);
  }
}


// === Test Case 13 | Opening Stock vs Inventory Norm Validation ===
async function testOpeningStockInventoryNormValidation(zip, zipStructure, validationResults) {
  console.log('\n🔍 Validating Opening Stock vs Inventory Norm consistency…');
  
  if (!validationResults.demandFiltering || !validationResults.demandFiltering.finalFilteredSKUs.length) {
    console.log('  ⚠️ No filtered SKUs available from Test Case 8. Skipping OS validation.');
    return;
  }

  validationResults.osInventoryNormValidation = {
    factoryWarehouseMapping: {},
    osData: {},
    capacityNorms: {},
    flaggedCases: [],
    totalSKUsValidated: 0,
    totalFlagged: 0,
    coverageStats: {}
  };

  const filteredSKUs = validationResults.demandFiltering.finalFilteredSKUs;
  console.log(`  ✅ Validating inventory norms for ${filteredSKUs.length} filtered SKUs`);

  // Step 1: Build dynamic Factory-Warehouse mapping
  await buildFactoryWarehouseMapping(zip, zipStructure, validationResults);

  // Step 2: Parse Opening Stock files
  await parseOpeningStockFiles(zip, zipStructure, validationResults);

  // Step 3: Parse Capacity file for inventory norms
  await parseCapacityInventoryNorms(zip, zipStructure, validationResults);

  // Step 4: Cross-reference and flag mismatches
  await validateOSInventoryNorms(filteredSKUs, validationResults);

  // Step 5: Display results
  console.log(`  ✅ OS Inventory Norm validation completed:`);
  console.log(`     Total SKUs validated: ${validationResults.osInventoryNormValidation.totalSKUsValidated}`);
  console.log(`     Total flagged cases: ${validationResults.osInventoryNormValidation.totalFlagged}`);
  
  if (validationResults.osInventoryNormValidation.totalFlagged > 0) {
    const sampleFlags = validationResults.osInventoryNormValidation.flaggedCases.slice(0, 5);
    console.log(`     Sample flagged cases: ${sampleFlags.map(f => `${f.sku}(${f.factory}:${f.qtyOnHand}>${f.norm})`).join(', ')}${validationResults.osInventoryNormValidation.totalFlagged > 5 ? '...' : ''}`);
  }
}

// Helper function to build Factory-Warehouse mapping from Freight_storage_costs
async function buildFactoryWarehouseMapping(zip, zipStructure, validationResults) {
  console.log('    📍 Building dynamic Factory-Warehouse mapping...');
  
  // Find Freight_storage_costs file
  let freightFolderPath = null;
  let fileName = null;
  
  for (const folderPath of Object.keys(zipStructure.folders)) {
    const files = zipStructure.folders[folderPath].files;
    const freightFile = files.find(f => f === 'Freight_storage_costs.xlsx' || f === 'Freight_storage_costs.xls');
    if (freightFile) {
      freightFolderPath = folderPath;
      fileName = freightFile;
      break;
    }
  }
  
  if (!freightFolderPath || !fileName) {
    console.log('    ❌ Freight_storage_costs.xlsx file not found');
    return;
  }

  const entryName = `${freightFolderPath}/${fileName}`;
  
  try {
    const buffer = zip.readFile(entryName);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Parse Factory sheet
    const factorySheet = workbook.Sheets['Factory'];
    const warehouseSheet = workbook.Sheets['Warehouse'];
    
    if (!factorySheet || !warehouseSheet) {
      console.log('    ❌ Factory or Warehouse sheet missing in Freight_storage_costs.xlsx');
      return;
    }

    const factorySchema = formatSchema.Freight_storage_costs.sheets['Factory'];
    const warehouseSchema = formatSchema.Freight_storage_costs.sheets['Warehouse'];
    
    // Parse factory data
    const factoryRange = xlsx.utils.decode_range(factorySheet['!ref']);
    const factoryMapping = {};
    
    for (let R = factorySchema.headerRow; R <= factoryRange.e.r; R++) {
      const factCodeCell = factorySheet[xlsx.utils.encode_cell({ r: R, c: 0 })]; // FactCode
      const factCountryCell = factorySheet[xlsx.utils.encode_cell({ r: R, c: 1 })]; // FactCountry
      
      const factCode = factCodeCell ? String(factCodeCell.v).trim() : '';
      const factCountry = factCountryCell ? String(factCountryCell.v).trim() : '';
      
      if (factCode && factCountry) {
        factoryMapping[factCode] = factCountry;
      }
    }
    
    // Parse warehouse data
    const warehouseRange = xlsx.utils.decode_range(warehouseSheet['!ref']);
    const warehouseMapping = {};
    
    for (let R = warehouseSchema.headerRow; R <= warehouseRange.e.r; R++) {
      const whCodeCell = warehouseSheet[xlsx.utils.encode_cell({ r: R, c: 0 })]; // WHCode
      const whCountryCell = warehouseSheet[xlsx.utils.encode_cell({ r: R, c: 1 })]; // WHCountry
      
      const whCode = whCodeCell ? String(whCodeCell.v).trim() : '';
      const whCountry = whCountryCell ? String(whCountryCell.v).trim() : '';
      
      if (whCode && whCountry) {
        warehouseMapping[whCode] = whCountry;
      }
    }
    
    // Build Factory → Warehouse mapping by country
    const factoryToWarehouse = {};
    for (const [factCode, factCountry] of Object.entries(factoryMapping)) {
      for (const [whCode, whCountry] of Object.entries(warehouseMapping)) {
        if (factCountry.toLowerCase() === whCountry.toLowerCase()) {
          factoryToWarehouse[factCode] = whCode;
          break;
        }
      }
    }
    
    validationResults.osInventoryNormValidation.factoryWarehouseMapping = factoryToWarehouse;
    validationResults.osInventoryNormValidation.factoryCountries = factoryMapping; // Store factory countries for capacity lookup
    console.log(`    ✅ Built factory-warehouse mapping: ${JSON.stringify(factoryToWarehouse)}`);
    console.log(`    ✅ Built factory-countries mapping: ${JSON.stringify(factoryMapping)}`);
    
  } catch (err) {
    console.log(`    ❌ Unable to build factory-warehouse mapping: ${err.message}`);
  }
}

// Helper function to parse Opening Stock files
async function parseOpeningStockFiles(zip, zipStructure, validationResults) {
  console.log('    📦 Parsing Opening Stock files...');
  
  const osFiles = ['NFC_OS', 'GFC_OS', 'KFC_OS'];
  const osData = {};
  
  for (const osFileBase of osFiles) {
    const factoryCode = osFileBase.split('_')[0]; // Extract NFC, GFC, KFC
    
    // Find OS file
    let osFolderPath = null;
    let fileName = null;
    
    for (const folderPath of Object.keys(zipStructure.folders)) {
      const files = zipStructure.folders[folderPath].files;
      const osFile = files.find(f => f === `${osFileBase}.xlsx` || f === `${osFileBase}.xls`);
      if (osFile) {
        osFolderPath = folderPath;
        fileName = osFile;
        break;
      }
    }
    
    if (!osFolderPath || !fileName) {
      console.log(`    ⚠️ ${osFileBase}.xlsx file not found`);
      continue;
    }

    const entryName = `${osFolderPath}/${fileName}`;
    
    try {
      const buffer = zip.readFile(entryName);
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames.filter(n => !n.toLowerCase().includes('meta'));
      
      if (!sheetNames.length) {
        console.log(`    ❌ No valid sheets found in ${fileName}`);
        continue;
      }
      
      const sheet = workbook.Sheets[sheetNames[0]];
      const osSchema = formatSchema[osFileBase].sheets[sheetNames[0]];
      const range = xlsx.utils.decode_range(sheet['!ref']);
      
      osData[factoryCode] = {};
      
      // Find column indices dynamically
      const itemColIdx = osSchema.headers.findIndex(h => h.toLowerCase().includes('item'));
      const qtyColIdx = osSchema.headers.findIndex(h => h.toLowerCase().includes('quantity') && h.toLowerCase().includes('hand'));
      
      // For NFC_OS and GFC_OS, also find Reporting Level column
      let reportingLevelColIdx = -1;
      if (factoryCode === 'NFC' || factoryCode === 'GFC') {
        reportingLevelColIdx = osSchema.headers.findIndex(h => h.toLowerCase().includes('reporting') && h.toLowerCase().includes('level'));
        if (reportingLevelColIdx === -1) {
          console.log(`    ❌ Reporting Level column not found in ${fileName} (required for ${factoryCode})`);
          continue;
        }
      }
      
      if (itemColIdx === -1 || qtyColIdx === -1) {
        console.log(`    ❌ Required columns not found in ${fileName}`);
        continue;
      }
      
      // Parse OS data with summing logic
      for (let R = osSchema.headerRow; R <= range.e.r; R++) {
        const itemCell = sheet[xlsx.utils.encode_cell({ r: R, c: itemColIdx })];
        const qtyCell = sheet[xlsx.utils.encode_cell({ r: R, c: qtyColIdx })];
        
        const itemCode = itemCell ? String(itemCell.v).trim() : '';
        const qtyOnHand = qtyCell && qtyCell.v && !isNaN(Number(qtyCell.v)) ? Number(qtyCell.v) : 0;
        
        if (itemCode) {
          // Apply Reporting Level filter for NFC_OS and GFC_OS
          let includeRow = true;
          if (factoryCode === 'NFC' || factoryCode === 'GFC') {
            const reportingLevelCell = sheet[xlsx.utils.encode_cell({ r: R, c: reportingLevelColIdx })];
            const reportingLevel = reportingLevelCell ? String(reportingLevelCell.v).trim() : '';
            includeRow = reportingLevel === 'SUBINV_LEVEL';
          }
          
          if (includeRow) {
            // Sum quantities for the same SKU
            if (osData[factoryCode][itemCode]) {
              osData[factoryCode][itemCode] += qtyOnHand;
            } else {
              osData[factoryCode][itemCode] = qtyOnHand;
            }
          }
        }
      }
      
      console.log(`    ✅ Parsed ${Object.keys(osData[factoryCode]).length} items from ${fileName}`);
      
    } catch (err) {
      console.log(`    ❌ Unable to parse ${fileName}: ${err.message}`);
    }
  }
  
  validationResults.osInventoryNormValidation.osData = osData;
}

// Helper function to parse Capacity file for inventory norms
async function parseCapacityInventoryNorms(zip, zipStructure, validationResults) {
  console.log('    🏭 Parsing Capacity inventory norms...');
  
  // Find Capacity file
  let capacityFolderPath = null;
  let fileName = null;
  
  for (const folderPath of Object.keys(zipStructure.folders)) {
    const files = zipStructure.folders[folderPath].files;
    const capacityFile = files.find(f => f === 'Capacity.xlsx' || f === 'Capacity.xls');
    if (capacityFile) {
      capacityFolderPath = folderPath;
      fileName = capacityFile;
      break;
    }
  }
  
  if (!capacityFolderPath || !fileName) {
    console.log('    ❌ Capacity.xlsx file not found');
    return;
  }

  const entryName = `${capacityFolderPath}/${fileName}`;
  
  try {
    const buffer = zip.readFile(entryName);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets['Item master'];
    
    if (!sheet) {
      console.log('    ❌ Item master sheet not found in Capacity.xlsx');
      return;
    }

    const capacitySchema = formatSchema.Capacity.sheets['Item master'];
    const range = xlsx.utils.decode_range(sheet['!ref']);
    const capacityNorms = {};
    
    // Find item column
    const itemColIdx = capacitySchema.headers.findIndex(h => h.toLowerCase().includes('item'));
    if (itemColIdx === -1) {
      console.log('    ❌ Item column not found in Capacity.xlsx');
      return;
    }
    
    // Country-to-Capacity-Column mapping
    const countryToCapacityColumn = {
      "Saudi Arabia": "KSA",
      "Kuwait": "Kuwait", 
      "United Arab Emirates": "UAE FS",
      "UAE": "UAE FS"
    };
    
    // Get factory countries from existing mapping and convert to capacity columns
    const factoryCapacityColumns = {};
    
    // Get factory countries from buildFactoryWarehouseMapping results (stored in temp var)
    // We need to re-parse factory countries since we only stored warehouse mapping
    const factoryCountries = validationResults.osInventoryNormValidation.factoryCountries || {};
    
    for (const [factory, country] of Object.entries(factoryCountries)) {
      const capacityColumn = countryToCapacityColumn[country];
      if (capacityColumn) {
        const capacityColIdx = capacitySchema.headers.findIndex(h => h === capacityColumn);
        if (capacityColIdx !== -1) {
          factoryCapacityColumns[factory] = capacityColIdx;
        }
      }
    }
    
    console.log(`    ✅ Found capacity columns: ${JSON.stringify(factoryCapacityColumns)}`);
    
    // Parse capacity norms
    for (let R = capacitySchema.headerRow; R <= range.e.r; R++) {
      const itemCell = sheet[xlsx.utils.encode_cell({ r: R, c: itemColIdx })];
      const itemCode = itemCell ? String(itemCell.v).trim() : '';
      
      if (itemCode) {
        capacityNorms[itemCode] = {};
        
        for (const [factory, colIdx] of Object.entries(factoryCapacityColumns)) {
          const normCell = sheet[xlsx.utils.encode_cell({ r: R, c: colIdx })];
          const norm = normCell ? String(normCell.v).trim() : '';
          capacityNorms[itemCode][factory] = norm;
        }
      }
    }
    
    validationResults.osInventoryNormValidation.capacityNorms = capacityNorms;
    console.log(`    ✅ Parsed inventory norms for ${Object.keys(capacityNorms).length} items`);
    
  } catch (err) {
    console.log(`    ❌ Unable to parse Capacity.xlsx: ${err.message}`);
  }
}

// Helper function to validate OS vs Inventory Norms
async function validateOSInventoryNorms(filteredSKUs, validationResults) {
  console.log('    🔍 Cross-referencing OS vs Inventory Norms...');
  
  const osData = validationResults.osInventoryNormValidation.osData;
  const capacityNorms = validationResults.osInventoryNormValidation.capacityNorms;
  const flaggedCases = [];
  let totalValidated = 0;
  
  for (const sku of filteredSKUs) {
    let skuValidated = false;
    
    // Check each factory's OS data
    for (const [factory, osItems] of Object.entries(osData)) {
      if (osItems[sku] !== undefined) {
        const qtyOnHand = osItems[sku];
        totalValidated++;
        skuValidated = true;
        
        // Check if qty > 100
        if (qtyOnHand > 100) {
          const norm = capacityNorms[sku] && capacityNorms[sku][factory] ? capacityNorms[sku][factory] : '';
          
          // Flag if norm is MTO or Blank (should be MTS for high inventory)
          if (norm === 'MTO' || norm === '' || norm === null) {
            flaggedCases.push({
              sku: sku,
              factory: factory,
              qtyOnHand: qtyOnHand,
              norm: norm || 'Blank',
              message: `SKU "${sku}" has ${qtyOnHand} units in ${factory} but inventory norm is "${norm || 'Blank'}" (should be MTS)`
            });
          }
        }
      }
    }
  }
  
  validationResults.osInventoryNormValidation.flaggedCases = flaggedCases;
  validationResults.osInventoryNormValidation.totalSKUsValidated = totalValidated;
  validationResults.osInventoryNormValidation.totalFlagged = flaggedCases.length;
}


// === Test Case 14 | Item Master Consolidation & Validation ===
async function testItemMasterConsolidation(zip, zipStructure, validationResults) {
  console.log('\n🔍 Consolidating and validating Item Master files…');
  
  validationResults.itemMasterValidation = {
    consolidatedRecords: [],
    duplicateFlags: [],
    unitWeightFlags: [],
    unifiedItemMaster: [],
    demandCoverageFlags: [],
    totalRecords: 0,
    totalDuplicates: 0,
    totalWeightInconsistencies: 0,
    totalUnifiedItems: 0,
    totalDemandSKUs: 0,
    totalMissingSKUs: 0,
    coveragePercentage: 0
  };

  // Step 1: Parse and consolidate all three Item Master files
  await parseAndConsolidateItemMasters(zip, zipStructure, validationResults);

  // Step 2: Check for duplicate Item Code + Org Code combinations
  await detectDuplicateRecords(validationResults);

  // Step 3: Validate Unit Weight consistency for FG items
  await validateUnitWeightConsistency(validationResults);

  // Step 4: Create unified Item Master table
  await createUnifiedItemMaster(validationResults);

  // Step 5: Validate demand SKU coverage
  await validateDemandSKUCoverage(validationResults);

  // Display results
  console.log(`  ✅ Item Master consolidation completed:`);
  console.log(`     Total records processed: ${validationResults.itemMasterValidation.totalRecords}`);
  console.log(`     Duplicate combinations found: ${validationResults.itemMasterValidation.totalDuplicates}`);
  console.log(`     Unit Weight inconsistencies: ${validationResults.itemMasterValidation.totalWeightInconsistencies}`);
  console.log(`     Unified items created: ${validationResults.itemMasterValidation.totalUnifiedItems}`);
  console.log(`     Demand SKU coverage: ${validationResults.itemMasterValidation.coveragePercentage.toFixed(1)}% (${validationResults.itemMasterValidation.totalMissingSKUs} missing out of ${validationResults.itemMasterValidation.totalDemandSKUs})`);
}

// Helper function to parse and consolidate Item Master files
async function parseAndConsolidateItemMasters(zip, zipStructure, validationResults) {
  console.log('    📊 Parsing and consolidating Item Master files...');
  
  const itemMasterFiles = ['Item_master_NFC', 'Item_master_GFC', 'Item_master_KFC'];
  const consolidatedRecords = [];
  
  for (const itemMasterBase of itemMasterFiles) {
    const factoryCode = itemMasterBase.split('_')[2]; // Extract NFC, GFC, KFC
    
    // Find Item Master file
    let itemMasterFolderPath = null;
    let fileName = null;
    
    for (const folderPath of Object.keys(zipStructure.folders)) {
      const files = zipStructure.folders[folderPath].files;
      const itemMasterFile = files.find(f => f === `${itemMasterBase}.xlsx` || f === `${itemMasterBase}.xls`);
      if (itemMasterFile) {
        itemMasterFolderPath = folderPath;
        fileName = itemMasterFile;
        break;
      }
    }
    
    if (!itemMasterFolderPath || !fileName) {
      console.log(`    ⚠️ ${itemMasterBase}.xlsx file not found`);
      continue;
    }

    const entryName = `${itemMasterFolderPath}/${fileName}`;
    
    try {
      const buffer = zip.readFile(entryName);
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames.filter(n => !n.toLowerCase().includes('meta'));
      
      if (!sheetNames.length) {
        console.log(`    ❌ No valid sheets found in ${fileName}`);
        continue;
      }
      
      const sheet = workbook.Sheets[sheetNames[0]];
      const itemMasterSchema = formatSchema[itemMasterBase].sheets[sheetNames[0]];
      const range = xlsx.utils.decode_range(sheet['!ref']);
      
      // Find key column indices
      const itemCodeColIdx = itemMasterSchema.headers.findIndex(h => h === 'Item Code');
      const orgCodeColIdx = itemMasterSchema.headers.findIndex(h => h === 'Org Code');
      const userItemTypeColIdx = itemMasterSchema.headers.findIndex(h => h === 'User Item Type');
      const unitWeightColIdx = itemMasterSchema.headers.findIndex(h => h === 'Unit Weight');
      
      if (itemCodeColIdx === -1 || orgCodeColIdx === -1) {
        console.log(`    ❌ Required columns (Item Code, Org Code) not found in ${fileName}`);
        continue;
      }
      
      // Parse Item Master data
      for (let R = itemMasterSchema.headerRow; R <= range.e.r; R++) {
        const record = { sourceFactory: factoryCode };
        
        // Extract all column values
        for (let colIdx = 0; colIdx < itemMasterSchema.headers.length; colIdx++) {
          const cell = sheet[xlsx.utils.encode_cell({ r: R, c: colIdx })];
          const columnName = itemMasterSchema.headers[colIdx];
          record[columnName] = cell ? String(cell.v).trim() : '';
        }
        
        // Only include records with Item Code
        if (record['Item Code']) {
          consolidatedRecords.push(record);
        }
      }
      
      console.log(`    ✅ Parsed ${consolidatedRecords.filter(r => r.sourceFactory === factoryCode).length} records from ${fileName}`);
      
    } catch (err) {
      console.log(`    ❌ Unable to parse ${fileName}: ${err.message}`);
    }
  }
  
  validationResults.itemMasterValidation.consolidatedRecords = consolidatedRecords;
  validationResults.itemMasterValidation.totalRecords = consolidatedRecords.length;
  console.log(`    ✅ Total consolidated records: ${consolidatedRecords.length}`);
}

// Helper function to detect duplicate Item Code + Org Code combinations
async function detectDuplicateRecords(validationResults) {
  console.log('    🔍 Detecting duplicate Item Code + Org Code combinations...');
  
  const records = validationResults.itemMasterValidation.consolidatedRecords;
  const seenCombinations = {};
  const duplicates = [];
  
  for (const record of records) {
    const key = `${record['Item Code']}|${record['Org Code']}`;
    
    if (seenCombinations[key]) {
      // This is a duplicate
      duplicates.push({
        itemCode: record['Item Code'],
        orgCode: record['Org Code'],
        sourceFactory1: seenCombinations[key].sourceFactory,
        sourceFactory2: record.sourceFactory,
        message: `Duplicate Item Code "${record['Item Code']}" + Org Code "${record['Org Code']}" found in ${seenCombinations[key].sourceFactory} and ${record.sourceFactory}`
      });
    } else {
      seenCombinations[key] = record;
    }
  }
  
  validationResults.itemMasterValidation.duplicateFlags = duplicates;
  validationResults.itemMasterValidation.totalDuplicates = duplicates.length;
  
  if (duplicates.length > 0) {
    console.log(`    ⚠️ Found ${duplicates.length} duplicate combinations`);
    const sampleDuplicates = duplicates.slice(0, 3);
    sampleDuplicates.forEach(d => console.log(`      ❌ ${d.message}`));
    if (duplicates.length > 3) {
      console.log(`      ... and ${duplicates.length - 3} more duplicates`);
    }
  } else {
    console.log(`    ✅ No duplicate Item Code + Org Code combinations found`);
  }
}

// Helper function to validate Unit Weight consistency for FG items
async function validateUnitWeightConsistency(validationResults) {
  console.log('    ⚖️ Validating Unit Weight consistency for FG items...');
  
  const records = validationResults.itemMasterValidation.consolidatedRecords;
  
  // Filter for FG items only
  const fgItems = records.filter(record => record['User Item Type'] === 'FG');
  console.log(`    ✅ Found ${fgItems.length} FG items to validate`);
  
  // Group by Item Code and collect Unit Weight values
  const itemWeights = {};
  for (const record of fgItems) {
    const itemCode = record['Item Code'];
    const orgCode = record['Org Code'];
    const unitWeight = record['Unit Weight'];
    
    if (!itemWeights[itemCode]) {
      itemWeights[itemCode] = {};
    }
    itemWeights[itemCode][orgCode] = {
      unitWeight: unitWeight,
      sourceFactory: record.sourceFactory
    };
  }
  
  // Check for inconsistencies
  const weightInconsistencies = [];
  for (const [itemCode, orgWeights] of Object.entries(itemWeights)) {
    const orgCodes = Object.keys(orgWeights);
    if (orgCodes.length > 1) {
      // Item appears in multiple orgs, check if weights are consistent
      const weights = orgCodes.map(org => orgWeights[org].unitWeight);
      const uniqueWeights = [...new Set(weights)];
      
      if (uniqueWeights.length > 1) {
        // Found inconsistency
        const weightDetails = orgCodes.map(org => 
          `${org}:${orgWeights[org].unitWeight} (${orgWeights[org].sourceFactory})`
        ).join(', ');
        
        weightInconsistencies.push({
          itemCode: itemCode,
          orgWeights: orgWeights,
          weightDetails: weightDetails,
          message: `FG Item "${itemCode}" has different Unit Weights across orgs: ${weightDetails}`
        });
      }
    }
  }
  
  validationResults.itemMasterValidation.unitWeightFlags = weightInconsistencies;
  validationResults.itemMasterValidation.totalWeightInconsistencies = weightInconsistencies.length;
  
  if (weightInconsistencies.length > 0) {
    console.log(`    ⚠️ Found ${weightInconsistencies.length} FG items with Unit Weight inconsistencies`);
    const sampleInconsistencies = weightInconsistencies.slice(0, 3);
    sampleInconsistencies.forEach(w => console.log(`      ❌ ${w.message}`));
    if (weightInconsistencies.length > 3) {
      console.log(`      ... and ${weightInconsistencies.length - 3} more weight inconsistencies`);
    }
  } else {
    console.log(`    ✅ All FG items have consistent Unit Weights across orgs`);
  }
}

// Helper function to create unified Item Master table
async function createUnifiedItemMaster(validationResults) {
  console.log('    🔄 Creating unified Item Master table...');
  
  const records = validationResults.itemMasterValidation.consolidatedRecords;
  
  // Group by Item Code
  const itemGroups = {};
  for (const record of records) {
    const itemCode = record['Item Code'];
    if (!itemGroups[itemCode]) {
      itemGroups[itemCode] = [];
    }
    itemGroups[itemCode].push(record);
  }
  
  const unifiedItemMaster = [];
  
  // Create unified record for each Item Code
  for (const [itemCode, itemRecords] of Object.entries(itemGroups)) {
    // Use first record as base (conflict resolution: first occurrence wins)
    const unifiedRecord = { ...itemRecords[0] };
    
    // Remove source-specific fields
    delete unifiedRecord.sourceFactory;
    delete unifiedRecord['Org Code']; // Remove org code dimension
    
    // Add metadata about consolidation
    unifiedRecord.consolidationInfo = {
      totalRecords: itemRecords.length,
      sourceFactories: [...new Set(itemRecords.map(r => r.sourceFactory))],
      orgCodes: [...new Set(itemRecords.map(r => r['Org Code']))]
    };
    
    unifiedItemMaster.push(unifiedRecord);
  }
  
  validationResults.itemMasterValidation.unifiedItemMaster = unifiedItemMaster;
  validationResults.itemMasterValidation.totalUnifiedItems = unifiedItemMaster.length;
  
  console.log(`    ✅ Created unified Item Master with ${unifiedItemMaster.length} unique items`);
  console.log(`    ✅ Consolidated from ${records.length} original records across ${[...new Set(records.map(r => r.sourceFactory))].length} factories`);
}

// Helper function to validate demand SKU coverage in Item Master
async function validateDemandSKUCoverage(validationResults) {
  console.log('    📊 Validating demand SKU coverage in unified Item Master...');
  
  // Get filtered demand SKUs from previous validation
  const filteredDemandSKUs = validationResults.demandFiltering?.finalFilteredSKUs || [];
  if (!filteredDemandSKUs.length) {
    console.log('    ⚠️ No filtered demand SKUs found from previous validation. Skipping coverage check.');
    return;
  }
  
  // Get unified Item Master codes
  const unifiedItemMaster = validationResults.itemMasterValidation?.unifiedItemMaster || [];
  if (!unifiedItemMaster.length) {
    console.log('    ⚠️ No unified Item Master found. Skipping coverage check.');
    return;
  }
  
  // Create set of Item Codes for fast lookup
  const itemMasterCodes = new Set(unifiedItemMaster.map(item => item['Item Code']));
  
  // Check coverage for each demand SKU
  const missingSkus = [];
  const coverageFlags = [];
  
  for (const demandSku of filteredDemandSKUs) {
    const isPresent = itemMasterCodes.has(demandSku);
    
    if (!isPresent) {
      missingSkus.push(demandSku);
      coverageFlags.push({
        demandSKU: demandSku,
        inItemMaster: false,
        issue: 'Demand SKU missing from unified Item Master'
      });
    } else {
      coverageFlags.push({
        demandSKU: demandSku,
        inItemMaster: true,
        issue: null
      });
    }
  }
  
  // Calculate coverage statistics
  const totalDemandSKUs = filteredDemandSKUs.length;
  const totalMissingSKUs = missingSkus.length;
  const coveragePercentage = totalDemandSKUs > 0 ? ((totalDemandSKUs - totalMissingSKUs) / totalDemandSKUs) * 100 : 0;
  
  // Store results
  validationResults.itemMasterValidation.demandCoverageFlags = coverageFlags;
  validationResults.itemMasterValidation.totalDemandSKUs = totalDemandSKUs;
  validationResults.itemMasterValidation.totalMissingSKUs = totalMissingSKUs;
  validationResults.itemMasterValidation.coveragePercentage = coveragePercentage;
  
  console.log(`    ✅ Demand SKU coverage analysis completed: ${(100 - coveragePercentage).toFixed(1)}% missing (${totalMissingSKUs}/${totalDemandSKUs})`);
  
  if (totalMissingSKUs > 0) {
    console.log(`    ⚠️ ${totalMissingSKUs} demand SKUs are unavailable in unified Item Master:`);
    missingSkus.forEach((sku, index) => {
      console.log(`       ${index + 1}. ${sku}`);
    });
  }
}


// === Test Case 7 | Planning period month consistency validation ===
async function testPlanningPeriodConsistency(zip, zipStructure, validationResults) {
  console.log('\n🔍 Checking planning period month consistency across all relevant files…');
  validationResults.monthMismatches = [];

  // --- STEP 1: Extract reference months from Base_scenario_configuration Planning time period ---
  let referenceMonths = [];
  const baseConfigPath = Object.keys(zipStructure.folders)
    .find(fp => zipStructure.folders[fp].files.some(f => f.startsWith('Base_scenario_configuration')));
  
  if (baseConfigPath) {
    const fileName = zipStructure.folders[baseConfigPath].files.find(f => f.startsWith('Base_scenario_configuration'));
    const entryName = `${baseConfigPath}/${fileName}`;
    
    try {
      const buffer = zip.readFile(entryName);
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets['Planning time period'];
      
      if (sheet) {
        const range = xlsx.utils.decode_range(sheet['!ref']);
        for (let R = 1; R <= range.e.r; R++) { // Start from row 1 (0-based), skip header
          const cellRef = xlsx.utils.encode_cell({ r: R, c: 0 }); // First column
          const cell = sheet[cellRef];
          if (cell && cell.v && String(cell.v)) {
            referenceMonths.push(String(cell.v));
          }
        }
        console.log(`  ✅ Reference months from planning period: ${referenceMonths.join(', ')}`);
      }
    } catch (err) {
      console.log(`  ❌ Unable to read planning period: ${err.message}`);
      return;
    }
  }

  if (!referenceMonths.length) {
    console.log('  ⚠️  No reference months found in planning period. Skipping test.');
    return;
  }

  // --- STEP 2: Identify relevant sheets with month validation patterns ---
  const monthFiles = [];
  for (const [fileBase, fileSchema] of Object.entries(formatSchema)) {
    for (const [sheetName, sheetSchema] of Object.entries(fileSchema.sheets)) {
      if (sheetSchema.monthValidationPattern && sheetSchema.monthValidationPattern !== 'reference_source') {
        monthFiles.push({
          fileBase,
          sheetName,
          headerRow: sheetSchema.headerRow,
          headers: sheetSchema.headers,
          monthValidationPattern: sheetSchema.monthValidationPattern,
          monthColumns: sheetSchema.monthColumns || [],
          monthHeaderRange: sheetSchema.monthHeaderRange || null,
          monthHeaderPattern: sheetSchema.monthHeaderPattern || null,
          monthExcelHeaders: sheetSchema.monthExcelHeaders || []
        });
      }
    }
  }

  if (!monthFiles.length) {
    console.log('  ⚠️  No month validation patterns found in any schema. Skipping test.');
    return;
  }

  const allMonthsSet = new Set(referenceMonths);
  const monthsByFile = {};

  // --- STEP 3: Extract months from each file based on pattern ---
  for (const fileDef of monthFiles) {
    const { fileBase, sheetName, headerRow, monthValidationPattern } = fileDef;

    // Find actual file path in zip
    const folderPath = Object.keys(zipStructure.folders)
      .find(fp => zipStructure.folders[fp].files.some(f => f.startsWith(fileBase)));
    if (!folderPath) continue;
    const fileName = zipStructure.folders[folderPath].files.find(f => f.startsWith(fileBase));
    const entryName = `${folderPath}/${fileName}`;

    try {
      const buffer = zip.readFile(entryName);
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      let sheet = workbook.Sheets[sheetName];
      
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
        console.log(`  ❌ Sheet ${sheetName} missing in ${fileName}`);
        continue;
      }

      const months = new Set();
      const range = xlsx.utils.decode_range(sheet['!ref']);

      if (monthValidationPattern === 'column_value') {
        // Extract months from column values
        const monthColumnIndices = fileDef.monthColumns.map(colName =>
          fileDef.headers.findIndex(h => h === colName)
        ).filter(idx => idx >= 0);

        monthColumnIndices.forEach(colIdx => {
          for (let R = headerRow; R <= range.e.r; R++) {
            const cellRef = xlsx.utils.encode_cell({ r: R, c: colIdx });
            const cell = sheet[cellRef];
            if (cell && cell.v && String(cell.v)) {
              months.add(String(cell.v));
            }
          }
        });

      } else if (monthValidationPattern === 'header_numeric') {
        // Extract months from numeric headers using dynamic range
        if (fileDef.monthHeaderRange) {
          const { startColumn, endColumn } = fileDef.monthHeaderRange;
          for (let colIdx = startColumn; colIdx <= endColumn; colIdx++) {
            if (colIdx < fileDef.headers.length) {
              const header = fileDef.headers[colIdx];
              if (header && fileDef.monthHeaderPattern === 'numeric' && /^\d+$/.test(header)) {
                months.add(header);
              }
            }
          }
        }

      } else if (monthValidationPattern === 'header_excel_date') {
        // Convert Excel date headers to month numbers
        fileDef.monthExcelHeaders.forEach(excelDate => {
          // Excel date serial number to month conversion
          // Excel epoch starts at 1900-01-01, but Excel incorrectly treats 1900 as leap year
          const excelEpoch = new Date(1900, 0, 1);
          const daysSinceEpoch = parseInt(excelDate) - 2; // Adjust for Excel's leap year bug
          const actualDate = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
          const monthNumber = String(actualDate.getMonth() + 1); // Convert to 1-based month
          months.add(monthNumber);
        });
      }

      monthsByFile[`${fileBase}:${sheetName}`] = months;

    } catch (err) {
      console.log(`  ❌ Unable to read ${fileName} for months: ${err.message}`);
    }
  }

  // Use only reference months for validation (no outer join)
  const requiredMonths = referenceMonths;

  // --- STEP 4: Build matrix and validate consistency ---
  const fileKeys = Object.keys(monthsByFile);
  
  // Build validation results - only check for required months
  requiredMonths.forEach(month => {
    fileKeys.forEach(key => {
      const hasMonth = monthsByFile[key].has(month);
      if (!hasMonth) {
        validationResults.monthMismatches.push({
          month: month,
          fileSheet: key,
          message: `Please check ${key} for missing month "${month}"`
        });
      }
    });
  });

  // --- STEP 5: Build transposed matrix (Files as rows, Required Months as columns) ---
  const transposedMatrix = fileKeys.map(fileKey => {
    const row = { 'File:Sheet': fileKey };
    requiredMonths.forEach(month => {
      row[month] = monthsByFile[fileKey].has(month) ? 'TRUE' : 'FALSE';
    });
    return row;
  });

  // Display transposed matrix
  console.log('\nMonth consistency matrix (Files as rows, Months as columns):');
  console.table(transposedMatrix);

  if (validationResults.monthMismatches.length) {
    console.log('\n=== Month Mismatches ===');
    validationResults.monthMismatches.forEach(m => console.log(`  ❌ ${m.message}`));
  } else {
    console.log('  ✅ All required months present in all relevant sheets.');
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

    // Test Case 4: #Factories and names of factories are same in all input files
    await testFactoryConsistency(zip, structure, validation);

    // Test Case 5: Country names are consistent across all input files
    await testCountryConsistency(zip, structure, validation);

    // Test Case 6: Warehouse names are consistent across all input files
    await testWarehouseConsistency(zip, structure, validation);

    // Test Case 7: Planning period month consistency validation
    await testPlanningPeriodConsistency(zip, structure, validation);

    // Test Case 8 Step 1: Filter demand data SKU codes
    await filterDemandSKUs(zip, structure, validation);

    // Test Case 13: Opening Stock vs Inventory Norm validation
    await testOpeningStockInventoryNormValidation(zip, structure, validation);

    // Test Case 14: Item Master Consolidation & Validation
    await testItemMasterConsolidation(zip, structure, validation);

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

    // ===== Country Consistency Validation Summary =====
    if (validation.countryMismatches && validation.countryMismatches.length > 0) {
      console.log('\n=== Country Consistency Validation ===');
      console.log(`Total country mismatches: ${validation.countryMismatches.length}`);
      validation.countryMismatches.forEach(c =>
        console.log(`  ❌ ${c.message}`)
      );
    }

    // ===== Warehouse Consistency Validation Summary =====
    if (validation.warehouseMismatches && validation.warehouseMismatches.length > 0) {
      console.log('\n=== Warehouse Consistency Validation ===');
      console.log(`Total warehouse mismatches: ${validation.warehouseMismatches.length}`);
      validation.warehouseMismatches.forEach(w =>
        console.log(`  ❌ ${w.message}`)
      );
    }

    // ===== Month Consistency Validation Summary =====
    if (validation.monthMismatches && validation.monthMismatches.length > 0) {
      console.log('\n=== Month Consistency Validation ===');
      console.log(`Total month mismatches: ${validation.monthMismatches.length}`);
      validation.monthMismatches.forEach(m =>
        console.log(`  ❌ ${m.message}`)
      );
    }

    // ===== Demand Filtering Summary =====
    if (validation.demandFiltering) {
      console.log('\n=== Demand SKU Filtering Summary ===');
      console.log(`Total rows processed: ${validation.demandFiltering.totalRowsProcessed}`);
      console.log(`Filtered by Origin="Other": ${validation.demandFiltering.originFiltered}`);
      console.log(`Filtered by PD/NPD="NPD": ${validation.demandFiltering.pdNpdFiltered}`);
      console.log(`Filtered by zero demand (after negative conversion): ${validation.demandFiltering.zeroDemandFiltered}`);
      console.log(`Final filtered data rows: ${validation.demandFiltering.filteredData.length}`);
      console.log(`Unique SKUs (Unified codes) after filtering: ${validation.demandFiltering.finalFilteredSKUs.length}`);
    }

    // ===== Opening Stock vs Inventory Norm Validation Summary =====
    if (validation.osInventoryNormValidation) {
      console.log('\n=== Opening Stock vs Inventory Norm Validation Summary ===');
      console.log(`Factory-Warehouse mapping: ${JSON.stringify(validation.osInventoryNormValidation.factoryWarehouseMapping)}`);
      console.log(`Total SKUs validated: ${validation.osInventoryNormValidation.totalSKUsValidated}`);
      console.log(`Total flagged cases: ${validation.osInventoryNormValidation.totalFlagged}`);
      if (validation.osInventoryNormValidation.totalFlagged > 0) {
        console.log(`Flagged cases (high inventory without MTS):`)
        validation.osInventoryNormValidation.flaggedCases.forEach(f =>
          console.log(`  ❌ ${f.message}`)
        );
      }
    }

    // ===== Item Master Consolidation Validation Summary =====
    if (validation.itemMasterValidation) {
      console.log('\n=== Item Master Consolidation Validation Summary ===');
      console.log(`Total records processed: ${validation.itemMasterValidation.totalRecords}`);
      console.log(`Duplicate Item Code + Org Code combinations: ${validation.itemMasterValidation.totalDuplicates}`);
      console.log(`Unit Weight inconsistencies for FG items: ${validation.itemMasterValidation.totalWeightInconsistencies}`);
      console.log(`Unified Item Master records created: ${validation.itemMasterValidation.totalUnifiedItems}`);
      
      if (validation.itemMasterValidation.totalDuplicates > 0) {
        console.log(`Duplicate combinations found:`)
        validation.itemMasterValidation.duplicateFlags.slice(0, 5).forEach(d =>
          console.log(`  ❌ ${d.message}`)
        );
        if (validation.itemMasterValidation.totalDuplicates > 5) {
          console.log(`  ... and ${validation.itemMasterValidation.totalDuplicates - 5} more duplicates`);
        }
      }
      
      if (validation.itemMasterValidation.totalWeightInconsistencies > 0) {
        console.log(`Unit Weight inconsistencies found:`)
        validation.itemMasterValidation.unitWeightFlags.slice(0, 5).forEach(w =>
          console.log(`  ❌ ${w.message}`)
        );
        if (validation.itemMasterValidation.totalWeightInconsistencies > 5) {
          console.log(`  ... and ${validation.itemMasterValidation.totalWeightInconsistencies - 5} more weight inconsistencies`);
        }
      }
    }

    process.exit(summary.passed ? 0 : 1);

  } catch (err) {
    console.error('\n❌ Validation failed:', err.message);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}
