-- Database schema for Americana Excel processing system

-- Table for tracking uploaded files
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for workbooks (Excel files)
CREATE TABLE IF NOT EXISTS workbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES uploaded_files(id) ON DELETE CASCADE,
    workbook_name VARCHAR(255) NOT NULL,
    sheet_count INTEGER DEFAULT 0,
    total_rows BIGINT DEFAULT 0,
    total_columns INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for worksheets (individual sheets in Excel files)
CREATE TABLE IF NOT EXISTS worksheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID REFERENCES workbooks(id) ON DELETE CASCADE,
    sheet_name VARCHAR(255) NOT NULL,
    sheet_index INTEGER NOT NULL,
    row_count BIGINT DEFAULT 0,
    column_count INTEGER DEFAULT 0,
    has_headers BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing actual data from Excel sheets
CREATE TABLE IF NOT EXISTS sheet_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worksheet_id UUID REFERENCES worksheets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    column_name VARCHAR(255),
    cell_value TEXT,
    cell_type VARCHAR(50), -- 'string', 'number', 'date', 'boolean', 'formula'
    formula TEXT, -- for storing Excel formulas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing processed macro calculations
CREATE TABLE IF NOT EXISTS macro_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID REFERENCES workbooks(id) ON DELETE CASCADE,
    calculation_name VARCHAR(255),
    formula TEXT NOT NULL,
    result_value TEXT,
    calculation_type VARCHAR(100),
    dependencies JSONB, -- JSON array of cell references
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for export jobs
CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID REFERENCES workbooks(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL, -- 'xlsx', 'xlsm', 'csv'
    status VARCHAR(50) DEFAULT 'pending',
    file_path TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_upload_date ON uploaded_files(upload_date);
CREATE INDEX IF NOT EXISTS idx_workbooks_file_id ON workbooks(file_id);
CREATE INDEX IF NOT EXISTS idx_worksheets_workbook_id ON worksheets(workbook_id);
CREATE INDEX IF NOT EXISTS idx_sheet_data_worksheet_id ON sheet_data(worksheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_data_row_col ON sheet_data(worksheet_id, row_index, column_index);
CREATE INDEX IF NOT EXISTS idx_macro_calculations_workbook_id ON macro_calculations(workbook_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_workbook_id ON export_jobs(workbook_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Table for demand templates
CREATE TABLE IF NOT EXISTS demand_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL,
    source_workbooks JSONB, -- Array of workbook configurations
    lookup_configs JSONB, -- Array of lookup configurations
    calculations JSONB, -- Array of calculation formulas
    output_format VARCHAR(10) DEFAULT 'xlsm',
    upload_month VARCHAR(2), -- Month from upload (01-12)
    upload_year INTEGER, -- Year from upload
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for demand export jobs
CREATE TABLE IF NOT EXISTS demand_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES demand_templates(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    file_path TEXT,
    month VARCHAR(10),
    year INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes for demand templates
CREATE INDEX IF NOT EXISTS idx_demand_templates_name ON demand_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_demand_export_jobs_template_id ON demand_export_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_demand_export_jobs_status ON demand_export_jobs(status);

-- Triggers to automatically update the updated_at column
CREATE TRIGGER update_uploaded_files_updated_at BEFORE UPDATE ON uploaded_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workbooks_updated_at BEFORE UPDATE ON workbooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_worksheets_updated_at BEFORE UPDATE ON worksheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_macro_calculations_updated_at BEFORE UPDATE ON macro_calculations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demand_templates_updated_at BEFORE UPDATE ON demand_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for processed raw data from Demand sheets
CREATE TABLE IF NOT EXISTS processed_demand_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID REFERENCES workbooks(id) ON DELETE CASCADE,
    worksheet_id UUID REFERENCES worksheets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    geography VARCHAR(255), -- Geography column from raw data
    market VARCHAR(255), -- Market column from raw data
    cty VARCHAR(255), -- Processed CTY column (Market from Country Master)
    fgsku_code VARCHAR(255), -- FGSKU Code from raw data
    demand_cases DECIMAL(15,2), -- Demand cases value
    production_environment VARCHAR(255), -- Production Environment
    safety_stock_wh VARCHAR(255), -- Safety Stock WH
    inventory_days_norm DECIMAL(10,2), -- Inventory Days (Norm)
    supply DECIMAL(15,2), -- Supply value
    cons DECIMAL(15,2), -- CONS value
    pd_npd VARCHAR(255), -- PD/NPD column from raw data (contains PD/NPD information)
    month VARCHAR(2), -- Month (01-12)
    year INTEGER, -- Year
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for processed demand data
CREATE INDEX IF NOT EXISTS idx_processed_demand_data_workbook_id ON processed_demand_data(workbook_id);
CREATE INDEX IF NOT EXISTS idx_processed_demand_data_worksheet_id ON processed_demand_data(worksheet_id);
CREATE INDEX IF NOT EXISTS idx_processed_demand_data_geography_market ON processed_demand_data(geography, market);
CREATE INDEX IF NOT EXISTS idx_processed_demand_data_cty ON processed_demand_data(cty);
CREATE INDEX IF NOT EXISTS idx_processed_demand_data_month_year ON processed_demand_data(month, year);

-- Trigger to update updated_at for processed_demand_data
CREATE TRIGGER update_processed_demand_data_updated_at BEFORE UPDATE ON processed_demand_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for demand country master data
CREATE TABLE IF NOT EXISTS demand_country_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_name VARCHAR(255) NOT NULL, -- Geography_Market combination
    market VARCHAR(255), -- Final market value
    pd_npd VARCHAR(10), -- PD or NPD
    origin VARCHAR(100), -- Local or Import
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for demand country master
CREATE INDEX IF NOT EXISTS idx_demand_country_master_country_name ON demand_country_master(country_name);
CREATE INDEX IF NOT EXISTS idx_demand_country_master_market ON demand_country_master(market);

-- Trigger to update updated_at for demand_country_master
CREATE TRIGGER update_demand_country_master_updated_at BEFORE UPDATE ON demand_country_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CURSOR TABLES FOR SPECIFIC SHEETS
-- ============================================================================

-- Table for Demand sheet cursor data
CREATE TABLE IF NOT EXISTS demand_cursor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID REFERENCES workbooks(id) ON DELETE CASCADE,
    worksheet_id UUID REFERENCES worksheets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    column_name VARCHAR(255),
    cell_value TEXT,
    cell_type VARCHAR(50), -- 'string', 'number', 'date', 'boolean', 'formula'
    formula TEXT, -- for storing Excel formulas
    upload_batch_id UUID, -- To group data from same upload
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Demand Country Master sheet cursor data
CREATE TABLE IF NOT EXISTS demand_country_master_cursor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID REFERENCES workbooks(id) ON DELETE CASCADE,
    worksheet_id UUID REFERENCES worksheets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    column_name VARCHAR(255),
    cell_value TEXT,
    cell_type VARCHAR(50), -- 'string', 'number', 'date', 'boolean', 'formula'
    formula TEXT, -- for storing Excel formulas
    upload_batch_id UUID, -- To group data from same upload
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Base Scenario Configuration / Planning Time Period sheet cursor data
CREATE TABLE IF NOT EXISTS base_scenario_configuration_cursor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID REFERENCES workbooks(id) ON DELETE CASCADE,
    worksheet_id UUID REFERENCES worksheets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    column_name VARCHAR(255),
    cell_value TEXT,
    cell_type VARCHAR(50), -- 'string', 'number', 'date', 'boolean', 'formula'
    formula TEXT, -- for storing Excel formulas
    upload_batch_id UUID, -- To group data from same upload
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Capacity sheet cursor data
CREATE TABLE IF NOT EXISTS capacity_cursor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID REFERENCES workbooks(id) ON DELETE CASCADE,
    worksheet_id UUID REFERENCES worksheets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    column_name VARCHAR(255),
    cell_value TEXT,
    cell_type VARCHAR(50), -- 'string', 'number', 'date', 'boolean', 'formula'
    formula TEXT, -- for storing Excel formulas
    upload_batch_id UUID, -- To group data from same upload
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Freight Storage Costs sheet cursor data
CREATE TABLE IF NOT EXISTS freight_storage_costs_cursor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workbook_id UUID REFERENCES workbooks(id) ON DELETE CASCADE,
    worksheet_id UUID REFERENCES worksheets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    column_name VARCHAR(255),
    cell_value TEXT,
    cell_type VARCHAR(50), -- 'string', 'number', 'date', 'boolean', 'formula'
    formula TEXT, -- for storing Excel formulas
    upload_batch_id UUID, -- To group data from same upload
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for cursor tables
CREATE INDEX IF NOT EXISTS idx_demand_cursor_workbook_id ON demand_cursor(workbook_id);
CREATE INDEX IF NOT EXISTS idx_demand_cursor_worksheet_id ON demand_cursor(worksheet_id);
CREATE INDEX IF NOT EXISTS idx_demand_cursor_row_col ON demand_cursor(worksheet_id, row_index, column_index);
CREATE INDEX IF NOT EXISTS idx_demand_cursor_upload_batch ON demand_cursor(upload_batch_id);

CREATE INDEX IF NOT EXISTS idx_demand_country_master_cursor_workbook_id ON demand_country_master_cursor(workbook_id);
CREATE INDEX IF NOT EXISTS idx_demand_country_master_cursor_worksheet_id ON demand_country_master_cursor(worksheet_id);
CREATE INDEX IF NOT EXISTS idx_demand_country_master_cursor_row_col ON demand_country_master_cursor(worksheet_id, row_index, column_index);
CREATE INDEX IF NOT EXISTS idx_demand_country_master_cursor_upload_batch ON demand_country_master_cursor(upload_batch_id);

CREATE INDEX IF NOT EXISTS idx_base_scenario_configuration_cursor_workbook_id ON base_scenario_configuration_cursor(workbook_id);
CREATE INDEX IF NOT EXISTS idx_base_scenario_configuration_cursor_worksheet_id ON base_scenario_configuration_cursor(worksheet_id);
CREATE INDEX IF NOT EXISTS idx_base_scenario_configuration_cursor_row_col ON base_scenario_configuration_cursor(worksheet_id, row_index, column_index);
CREATE INDEX IF NOT EXISTS idx_base_scenario_configuration_cursor_upload_batch ON base_scenario_configuration_cursor(upload_batch_id);

CREATE INDEX IF NOT EXISTS idx_capacity_cursor_workbook_id ON capacity_cursor(workbook_id);
CREATE INDEX IF NOT EXISTS idx_capacity_cursor_worksheet_id ON capacity_cursor(worksheet_id);
CREATE INDEX IF NOT EXISTS idx_capacity_cursor_row_col ON capacity_cursor(worksheet_id, row_index, column_index);
CREATE INDEX IF NOT EXISTS idx_capacity_cursor_upload_batch ON capacity_cursor(upload_batch_id);

CREATE INDEX IF NOT EXISTS idx_freight_storage_costs_cursor_workbook_id ON freight_storage_costs_cursor(workbook_id);
CREATE INDEX IF NOT EXISTS idx_freight_storage_costs_cursor_worksheet_id ON freight_storage_costs_cursor(worksheet_id);
CREATE INDEX IF NOT EXISTS idx_freight_storage_costs_cursor_row_col ON freight_storage_costs_cursor(worksheet_id, row_index, column_index);
CREATE INDEX IF NOT EXISTS idx_freight_storage_costs_cursor_upload_batch ON freight_storage_costs_cursor(upload_batch_id);

-- Triggers to update updated_at for cursor tables
CREATE TRIGGER update_demand_cursor_updated_at BEFORE UPDATE ON demand_cursor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demand_country_master_cursor_updated_at BEFORE UPDATE ON demand_country_master_cursor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_base_scenario_configuration_cursor_updated_at BEFORE UPDATE ON base_scenario_configuration_cursor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_capacity_cursor_updated_at BEFORE UPDATE ON capacity_cursor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_freight_storage_costs_cursor_updated_at BEFORE UPDATE ON freight_storage_costs_cursor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 