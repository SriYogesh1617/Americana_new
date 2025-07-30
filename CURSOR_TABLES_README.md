# Cursor Tables Implementation

This document describes the implementation of cursor tables for storing specific sheet data from uploaded Excel files.

## Overview

The system now automatically detects and stores data from three specific sheet types in dedicated cursor tables:

1. **Demand** - Stores data from sheets named "Demand" or workbooks containing "demand" (excluding country master)
2. **Demand Country Master** - Stores data from sheets/workbooks containing "demand", "country", and "master"
3. **Base Scenario Configuration / Planning Time Period** - Stores data from sheets/workbooks containing "base", "scenario", "configuration" or "planning", "time", "period"

## Database Schema

### New Tables Created

#### 1. demand_cursor
```sql
CREATE TABLE demand_cursor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID REFERENCES workbooks(id) ON DELETE CASCADE,
    worksheet_id UUID REFERENCES worksheets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    column_name VARCHAR(255),
    cell_value TEXT,
    cell_type VARCHAR(50),
    formula TEXT,
    upload_batch_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. demand_country_master_cursor
```sql
CREATE TABLE demand_country_master_cursor (
    -- Same structure as demand_cursor
);
```

#### 3. base_scenario_configuration_cursor
```sql
CREATE TABLE base_scenario_configuration_cursor (
    -- Same structure as demand_cursor
);
```

### Key Features

- **Upload Batch ID**: Groups data from the same upload session
- **Cell-level Storage**: Stores individual cell data with row/column indices
- **Formula Support**: Preserves Excel formulas when present
- **Type Detection**: Automatically detects cell types (string, number, date, boolean, formula)
- **Indexing**: Optimized indexes for fast querying

## Backend Implementation

### Models

Three new model files have been created:

1. `backend/models/DemandCursor.js`
2. `backend/models/DemandCountryMasterCursor.js`
3. `backend/models/BaseScenarioConfigurationCursor.js`

Each model provides:
- CRUD operations
- Batch insert capabilities
- Array conversion methods
- Statistics and cleanup functions

### Upload Processing

The upload controller (`backend/controllers/uploadController.js`) has been enhanced to:

1. **Detect Special Sheets**: Uses `getCursorTableForSheet()` function to identify sheets that should be stored in cursor tables
2. **Dual Storage**: Stores data in both regular `sheet_data` table and appropriate cursor table
3. **Batch Processing**: Processes data in batches for performance
4. **Upload Tracking**: Groups cursor data by upload batch ID

### API Endpoints

New cursor API endpoints (`/api/cursor`):

#### Demand Cursor
- `GET /api/cursor/demand` - Get demand cursor data
- `GET /api/cursor/demand/:worksheetId/array` - Get as 2D array

#### Demand Country Master Cursor
- `GET /api/cursor/demand-country-master` - Get country master cursor data
- `GET /api/cursor/demand-country-master/:worksheetId/array` - Get as 2D array

#### Base Scenario Configuration Cursor
- `GET /api/cursor/base-scenario-configuration` - Get base scenario cursor data
- `GET /api/cursor/base-scenario-configuration/:worksheetId/array` - Get as 2D array

#### Management
- `GET /api/cursor/stats` - Get statistics for all cursor tables
- `DELETE /api/cursor/clear` - Clear all cursor data

## Frontend Implementation

### New Page

A new page has been created: `frontend/src/pages/CursorData.js`

Features:
- **Statistics Dashboard**: Shows record counts for each cursor table
- **Table Switching**: Toggle between different cursor tables
- **Data Display**: Table view of cursor data
- **Management**: Clear all cursor data functionality

### API Integration

New API service: `cursorAPI` in `frontend/src/services/api.js`

Provides methods for:
- Fetching cursor data
- Getting statistics
- Clearing data
- Array format conversion

### Navigation

Added to sidebar navigation as "Cursor Data" under the Data section.

## Usage

### 1. Database Setup

Run the migration script to create the new tables:

```bash
cd backend
node run_migrations.js
```

### 2. Upload Files

Upload ZIP files containing Excel files with the specific sheet names. The system will automatically:

1. Process all Excel files in the ZIP
2. Detect sheets matching the cursor table criteria
3. Store data in both regular and cursor tables
4. Log which sheets were stored in cursor tables

### 3. View Cursor Data

Navigate to the "Cursor Data" page in the frontend to:

- View statistics for each cursor table
- Browse data from different cursor tables
- Clear data when needed

### 4. API Usage

```javascript
// Get demand cursor data
const demandData = await cursorAPI.getDemandCursorData();

// Get as 2D array for easy processing
const demandArray = await cursorAPI.getDemandCursorDataAsArray(worksheetId);

// Get statistics
const stats = await cursorAPI.getCursorStats();
```

## Benefits

1. **Easy Access**: Quick access to specific sheet data without complex queries
2. **Performance**: Optimized tables for specific use cases
3. **Batch Processing**: Efficient handling of large datasets
4. **Formula Preservation**: Maintains Excel formulas for calculations
5. **Upload Tracking**: Groups data by upload session for better organization

## Sheet Detection Logic

The system uses the following logic to detect which cursor table to use:

### Demand
- Sheet name exactly equals "Demand"
- OR workbook name contains "demand" but NOT "country" and NOT "master"

### Demand Country Master
- Sheet name contains "demand", "country", AND "master"
- OR workbook name contains "demand", "country", AND "master"

### Base Scenario Configuration
- Sheet name contains "base", "scenario", AND "configuration"
- OR sheet name contains "planning", "time", AND "period"
- OR workbook name contains "base" AND "scenario"
- OR workbook name contains "planning" AND "time"

## Future Enhancements

1. **Export Functionality**: Add export capabilities for cursor data
2. **Advanced Filtering**: Add filtering and search capabilities
3. **Data Validation**: Add validation for cursor data
4. **Real-time Updates**: Add real-time updates for cursor data
5. **Analytics**: Add analytics and reporting features

## Troubleshooting

### Common Issues

1. **Tables Not Created**: Run the migration script
2. **No Data in Cursor Tables**: Check sheet names match the detection criteria
3. **Performance Issues**: Check indexes are properly created
4. **API Errors**: Verify the cursor routes are properly registered

### Debugging

Enable debug logging in the upload controller to see which sheets are being processed:

```javascript
console.log(`📊 Stored sheet "${sheetName}" in ${cursorTableType} cursor table`);
```

Check the database directly to verify data is being stored:

```sql
SELECT COUNT(*) FROM demand_cursor;
SELECT COUNT(*) FROM demand_country_master_cursor;
SELECT COUNT(*) FROM base_scenario_configuration_cursor;
``` 