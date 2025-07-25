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