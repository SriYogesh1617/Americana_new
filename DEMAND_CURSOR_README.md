# Demand Filtered Cursor

## Overview

The Demand Filtered Cursor is a powerful new feature that provides advanced querying and filtering capabilities for processed demand data. It allows users to efficiently search, filter, and analyze demand data with real-time statistics and export functionality.

## Features

### 🔍 Advanced Filtering
- **Geography Filter**: Filter by geography with partial matching
- **Market Filter**: Filter by market with partial matching  
- **CTY Filter**: Filter by CTY (Country) values
- **FGSKU Code Filter**: Filter by FGSKU codes
- **Month/Year Filter**: Filter by specific months and years
- **Date Range Filter**: Filter by creation date ranges
- **Workbook/Worksheet Filter**: Filter by specific workbooks or worksheets

### 📊 Real-time Statistics
- Total records count
- Unique geographies, markets, and CTY values
- Total demand cases, supply, and consumption
- Average inventory days
- Top 10 geographies, markets, and CTY values by frequency

### 📈 Pagination & Sorting
- Configurable page size (default: 1000 records)
- Sort by any column (default: created_at DESC)
- Pagination controls with total count

### 📤 Export Functionality
- Export filtered data to Excel (.xlsx, .xlsm)
- Export filtered data to CSV
- Automatic file cleanup after download

## API Endpoints

### 1. Create Filtered Demand Cursor
```
POST /api/demand/cursor
```

**Request Body:**
```json
{
  "filters": {
    "geography": "UAE",
    "market": "UAE",
    "cty": "UAE",
    "fgsku_code": "ABC123",
    "month": "01",
    "year": 2025,
    "date_from": "2025-01-01",
    "date_to": "2025-01-31"
  },
  "sortBy": "created_at",
  "sortOrder": "DESC",
  "limit": 1000,
  "offset": 0
}
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "total": 1500,
    "limit": 1000,
    "offset": 0,
    "page": 1,
    "totalPages": 2
  },
  "filters": {...},
  "sortBy": "created_at",
  "sortOrder": "DESC"
}
```

### 2. Get Cursor Statistics
```
POST /api/demand/cursor/stats
```

**Request Body:**
```json
{
  "filters": {
    "geography": "UAE",
    "market": "UAE"
  }
}
```

**Response:**
```json
{
  "statistics": {
    "total_records": 1500,
    "unique_geographies": 25,
    "unique_markets": 15,
    "unique_cty": 20,
    "unique_fgsku_codes": 500,
    "total_demand_cases": 150000,
    "total_supply": 120000,
    "total_cons": 80000,
    "avg_inventory_days": 45.5
  },
  "top_geographies": [...],
  "top_markets": [...],
  "top_cty": [...],
  "filters": {...}
}
```

### 3. Export Filtered Data
```
POST /api/demand/cursor/export
```

**Request Body:**
```json
{
  "filters": {
    "geography": "UAE"
  },
  "format": "xlsx",
  "sortBy": "created_at",
  "sortOrder": "DESC"
}
```

**Response:** File download (Excel or CSV)

## Frontend Usage

### Accessing the Demand Cursor
1. Navigate to the sidebar and click on "Demand Cursor"
2. Use the filters section to specify your search criteria
3. Click "Search" to execute the query
4. View results in the table below
5. Use pagination controls to navigate through results
6. Export data using the export buttons

### Filter Options
- **Geography**: Enter partial geography name (e.g., "UAE" will match "UAE & LG")
- **Market**: Enter partial market name
- **CTY**: Enter partial CTY value
- **FGSKU Code**: Enter partial FGSKU code
- **Month**: Enter month as MM format (01-12)
- **Year**: Enter year as YYYY format
- **Date From/To**: Select date range for creation date

### Statistics Dashboard
The statistics section shows:
- **Key Metrics**: Total records, demand cases, supply, average inventory days
- **Top Values**: Most frequent geographies, markets, and CTY values
- **Real-time Updates**: Statistics update based on current filters

## Database Schema

The cursor operates on the `processed_demand_data` table:

```sql
CREATE TABLE processed_demand_data (
    id UUID PRIMARY KEY,
    workbook_id UUID REFERENCES workbooks(id),
    worksheet_id UUID REFERENCES worksheets(id),
    row_index INTEGER NOT NULL,
    geography VARCHAR(255),
    market VARCHAR(255),
    cty VARCHAR(255),
    fgsku_code VARCHAR(255),
    demand_cases DECIMAL(15,2),
    production_environment VARCHAR(255),
    safety_stock_wh VARCHAR(255),
    inventory_days_norm DECIMAL(10,2),
    supply DECIMAL(15,2),
    cons DECIMAL(15,2),
    month VARCHAR(2),
    year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Performance Features

### Indexes
The following indexes are created for optimal performance:
- `idx_processed_demand_data_workbook_id`
- `idx_processed_demand_data_worksheet_id`
- `idx_processed_demand_data_geography_market`
- `idx_processed_demand_data_cty`
- `idx_processed_demand_data_month_year`

### Query Optimization
- Uses parameterized queries to prevent SQL injection
- Implements efficient WHERE clause building
- Supports pagination to handle large datasets
- Uses ILIKE for case-insensitive partial matching

## Testing

Run the test script to verify functionality:

```bash
cd backend
node test_demand_cursor.js
```

This will:
1. Check if the `processed_demand_data` table exists and has data
2. Test basic cursor querying
3. Test filtering functionality
4. Test statistics calculation
5. Test top values aggregation

## Error Handling

The cursor includes comprehensive error handling:
- Invalid filter values are validated
- Database connection errors are caught and reported
- Export errors are handled gracefully
- File cleanup is performed after downloads

## Security

- All queries use parameterized statements
- Input validation on all filter parameters
- File download security with proper cleanup
- No direct SQL injection vulnerabilities

## Future Enhancements

Potential future improvements:
- Advanced search with full-text search
- Saved filter presets
- Real-time data updates
- Advanced analytics and charts
- Bulk operations on filtered data
- Custom column selection for exports 