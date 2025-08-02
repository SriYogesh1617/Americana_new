-- Fix T02 table structure to match required format
-- Drop and recreate the table with correct column names and order

-- First, backup existing data
CREATE TABLE IF NOT EXISTS t02_data_backup AS SELECT * FROM t02_data;

-- Drop the existing table
DROP TABLE IF EXISTS t02_data;

-- Create the new T02 table with correct structure
CREATE TABLE t02_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Required columns in exact order
    cty VARCHAR(255), -- CTY
    wh VARCHAR(255), -- WH
    default_wh_restrictions VARCHAR(255), -- Default WH Restrictions
    sku_specific_restrictions VARCHAR(255), -- SKU specific Restrictions
    fgsku_code VARCHAR(255), -- FGSKUCode
    trim_sku VARCHAR(255), -- TrimSKU
    rm_sku VARCHAR(255), -- RMSKU
    month VARCHAR(2), -- MthNum
    market VARCHAR(255), -- Market
    customs VARCHAR(255), -- Customs?
    transport_cost_per_case DECIMAL(15,2), -- TransportCostPerCase
    max_gfc DECIMAL(15,2), -- Max_GFC
    max_kfc DECIMAL(15,2), -- Max_KFC
    max_nfc DECIMAL(15,2), -- Max_NFC
    fgwt_per_unit DECIMAL(15,2), -- FGWtPerUnit
    custom_cost_per_unit_gfc DECIMAL(15,2), -- Custom Cost/Unit - GFC
    custom_cost_per_unit_kfc DECIMAL(15,2), -- Custom Cost/Unit - KFC
    custom_cost_per_unit_nfc DECIMAL(15,2), -- Custom Cost/Unit - NFC
    max_arbit DECIMAL(15,2), -- Max_Arbit
    d10 DECIMAL(15,2), -- D10
    qty_gfc DECIMAL(15,2), -- Qty_GFC
    qty_kfc DECIMAL(15,2), -- Qty_KFC
    qty_nfc DECIMAL(15,2), -- Qty_NFC
    qty_x DECIMAL(15,2), -- Qty_X
    v05 DECIMAL(15,2), -- V05
    v06 DECIMAL(15,2), -- V06
    qty_total DECIMAL(15,2), -- Qty_Total (changed from TEXT to DECIMAL)
    wt_gfc DECIMAL(15,2), -- Wt_GFC (changed from TEXT to DECIMAL)
    wt_kfc DECIMAL(15,2), -- Wt_KFC (changed from TEXT to DECIMAL)
    wt_nfc DECIMAL(15,2), -- Wt_NFC (changed from TEXT to DECIMAL)
    custom_duty DECIMAL(15,2), -- Custom Duty (changed from TEXT to DECIMAL)
    f06 DECIMAL(15,2), -- F06
    f07 DECIMAL(15,2), -- F07
    f08 DECIMAL(15,2), -- F08
    f09 DECIMAL(15,2), -- F09
    f10 DECIMAL(15,2), -- F10
    max_gfc_2 DECIMAL(15,2), -- Max_GFC (second occurrence) (changed from TEXT to DECIMAL)
    max_kfc_2 DECIMAL(15,2), -- Max_KFC (second occurrence) (changed from TEXT to DECIMAL)
    max_nfc_2 DECIMAL(15,2), -- Max_NFC (second occurrence) (changed from TEXT to DECIMAL)
    pos_gfc VARCHAR(255), -- Pos_GFC (changed from TEXT to VARCHAR for formula storage)
    pos_kfc VARCHAR(255), -- Pos_KFC (changed from TEXT to VARCHAR for formula storage)
    pos_nfc VARCHAR(255), -- Pos_NFC (changed from TEXT to VARCHAR for formula storage)
    pos_x VARCHAR(255), -- Pos_X (changed from TEXT to VARCHAR for formula storage)
    max_x VARCHAR(255), -- Max_X (changed from TEXT to VARCHAR for formula storage)
    c09 DECIMAL(15,2), -- C09
    c10 DECIMAL(15,2), -- C10
    of01 DECIMAL(15,2), -- OF01
    of02 DECIMAL(15,2), -- OF02
    of03 DECIMAL(15,2), -- OF03
    of04 DECIMAL(15,2), -- OF04
    of05 DECIMAL(15,2), -- OF05
    row_cost VARCHAR(255), -- RowCost (changed from TEXT to VARCHAR for formula storage)
    -- Additional system columns
    upload_batch_id UUID,
    source_t01_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_t02_data_upload_batch ON t02_data(upload_batch_id);
CREATE INDEX idx_t02_data_cty ON t02_data(cty);
CREATE INDEX idx_t02_data_fgsku ON t02_data(fgsku_code);
CREATE INDEX idx_t02_data_market ON t02_data(market);
CREATE INDEX idx_t02_data_month ON t02_data(month);
CREATE INDEX idx_t02_data_wh ON t02_data(wh);

-- Create trigger for updated_at
CREATE TRIGGER update_t02_data_updated_at BEFORE UPDATE ON t02_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Restore data from backup (if any)
-- Note: This will need to be handled carefully due to column type changes
-- For now, we'll start fresh and let the application populate the data 