-- Create cursor tables for specific sheet data

-- Table for Demand sheet cursor data
CREATE TABLE IF NOT EXISTS demand_cursor (
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

-- Table for Demand Country Master sheet cursor data
CREATE TABLE IF NOT EXISTS demand_country_master_cursor (
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

-- Table for Base Scenario Configuration / Planning Time Period sheet cursor data
CREATE TABLE IF NOT EXISTS base_scenario_configuration_cursor (
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

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update updated_at for cursor tables
CREATE TRIGGER update_demand_cursor_updated_at BEFORE UPDATE ON demand_cursor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demand_country_master_cursor_updated_at BEFORE UPDATE ON demand_country_master_cursor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_base_scenario_configuration_cursor_updated_at BEFORE UPDATE ON base_scenario_configuration_cursor FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for T01 calculated data
CREATE TABLE IF NOT EXISTS t01_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cty VARCHAR(255), -- Calculated CTY value from country master lookup
    fgsku_code VARCHAR(255), -- FGSKU code from demand data
    demand_cases DECIMAL(15,2), -- Demand cases value
    month VARCHAR(2), -- Month (01-12)
    year INTEGER, -- Year
    upload_batch_id UUID, -- To group data from same calculation batch
    source_demand_id UUID, -- Reference to source demand record
    source_country_master_id UUID, -- Reference to source country master record
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for T01 data
CREATE INDEX IF NOT EXISTS idx_t01_data_upload_batch ON t01_data(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_t01_data_cty ON t01_data(cty);
CREATE INDEX IF NOT EXISTS idx_t01_data_fgsku ON t01_data(fgsku_code);
CREATE INDEX IF NOT EXISTS idx_t01_data_month_year ON t01_data(month, year);

-- Trigger to update updated_at for t01_data
CREATE TRIGGER update_t01_data_updated_at BEFORE UPDATE ON t01_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 