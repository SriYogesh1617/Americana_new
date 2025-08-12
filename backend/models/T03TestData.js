const { query } = require('../config/database');

class T03TestData {
  // Create the T03_Test table with user's schema
  static async createTable() {
    try {
      console.log('🔧 Creating T03 Test table...');
      
      // Drop existing table if it exists (optional for testing)
      await query(`DROP TABLE IF EXISTS public.t03_test CASCADE;`);
      
      // Create the main table with all needed columns
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.t03_test (
          id BIGSERIAL PRIMARY KEY,
          WH TEXT,
          PLT TEXT,
          "FGSKUCode" TEXT,
          mth_number INT
        );
      `;
      
      await query(createTableQuery);
      
      // Create indexes for performance and uniqueness
      const indexQueries = [
        `CREATE UNIQUE INDEX IF NOT EXISTS uidx_t03_test_key
         ON public.t03_test (WH, PLT, "FGSKUCode", mth_number);`,
        `CREATE INDEX IF NOT EXISTS idx_t03_fgsku ON public.t03_test ("FGSKUCode");`,
        `CREATE INDEX IF NOT EXISTS idx_t03_wh ON public.t03_test (WH);`,
        `CREATE INDEX IF NOT EXISTS idx_t03_plt ON public.t03_test (PLT);`
      ];
      
      for (const indexQuery of indexQueries) {
        await query(indexQuery);
      }
      
      console.log('✅ T03 Test table and indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating T03 Test table:', error);
      throw error;
    }
  }

  // Generate T03 Test data using complete SQL script
  static async generateFromSQL() {
    try {
      console.log('🚀 Starting T03 Test data generation with SQL...');
      
      // Create the table first
      await this.createTable();
      
      // Step 1: Create temp table for distinct SKUs
      console.log('📊 Step 1: Creating temp table for SKUs...');
      await query(`
        CREATE TEMP TABLE temp_skus AS
        SELECT DISTINCT NULLIF(TRIM(column_6::text), '') AS "FGSKUCode"
        FROM public.demand_raw_demand
        WHERE TRIM(column_6::text) IS NOT NULL
          AND TRIM(column_6::text) <> '' 
          AND TRIM(column_6::text) <> 'column_6';
      `);
      
      // Step 2: Populate main table with cartesian product
      console.log('📊 Step 2: Populating main table with cartesian product...');
      await query(`
        INSERT INTO public.t03_test (WH, PLT, "FGSKUCode", mth_number)
        SELECT
          w.wh,
          f.plt,
          s."FGSKUCode",
          m.mon
        FROM (
          SELECT DISTINCT TRIM(whcode::text) AS wh
          FROM public.freight_storage_costs_warehouse
          WHERE whcode IS NOT NULL AND TRIM(whcode::text) <> ''
        ) w
        CROSS JOIN (
          SELECT DISTINCT TRIM(factcode::text) AS plt
          FROM public.freight_storage_costs_factory
          WHERE factcode IS NOT NULL AND TRIM(factcode::text) <> ''
        ) f
        CROSS JOIN temp_skus s
        CROSS JOIN LATERAL generate_series(1,12) AS m(mon)
        ON CONFLICT (WH, PLT, "FGSKUCode", mth_number) DO NOTHING;
      `);
      
      // Step 3: Add X warehouse and factory records
      console.log('📊 Step 3: Adding X warehouse and factory records...');
      await query(`
        INSERT INTO public.t03_test (WH, PLT, "FGSKUCode", mth_number)
        SELECT DISTINCT
          'X' AS WH,
          'X' AS PLT,
          NULLIF(TRIM(column_6::text), '') AS "FGSKUCode",
          m.mon AS mth_number
        FROM public.demand_raw_demand
        CROSS JOIN LATERAL generate_series(1,12) AS m(mon)
        WHERE TRIM(column_6::text) IS NOT NULL
          AND TRIM(column_6::text) <> '' 
          AND TRIM(column_6::text) <> 'column_6'
        ON CONFLICT (WH, PLT, "FGSKUCode", mth_number) DO NOTHING;
      `);
      
      // Step 4: Add country column and populate
      console.log('📊 Step 4: Adding and populating country column...');
      await query(`ALTER TABLE public.t03_test ADD COLUMN IF NOT EXISTS country TEXT;`);
      
      await query(`
        UPDATE public.t03_test t03
        SET country = w.WHCountry
        FROM public.freight_storage_costs_warehouse w
        WHERE TRIM(t03.WH) = TRIM(w.whcode::text)
          AND t03.WH IS NOT NULL 
          AND t03.WH <> 'X';
      `);
      
      // Step 5: Add cost_per_unit column
      console.log('📊 Step 5: Adding cost_per_unit column...');
      await query(`ALTER TABLE public.t03_test ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC;`);
      
      // Step 6: Update cost_per_unit with exact matches
      console.log('📊 Step 6: Updating cost_per_unit with exact matches...');
      await query(`
        UPDATE public.t03_test t03
        SET cost_per_unit = subquery.calculated_cost
        FROM (
          SELECT 
            TRIM(f.origin::text) as origin,
            TRIM(f.destination::text) as destination,
            TRIM(f.fg_code::text) as fg_code,
            CASE 
              WHEN TRIM(f.truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
                AND TRIM(f.truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
                AND TRIM(f.truck_load_uom::text)::NUMERIC > 0
              THEN TRIM(f.truck_freight_usd_truckload::text)::NUMERIC / TRIM(f.truck_load_uom::text)::NUMERIC
              ELSE NULL
            END as calculated_cost
          FROM public.freight_storage_costs_ii_template_freightrawdata f
          WHERE f.truck_load_uom IS NOT NULL 
            AND f.truck_freight_usd_truckload IS NOT NULL
            AND LOWER(TRIM(f.truck_load_uom::text)) NOT IN ('missing', '')
            AND LOWER(TRIM(f.truck_freight_usd_truckload::text)) NOT IN ('missing', '')
        ) subquery
        WHERE TRIM(t03.PLT) = subquery.origin
          AND TRIM(t03.country) = subquery.destination
          AND TRIM(t03."FGSKUCode") = subquery.fg_code;
      `);
      
      // Step 7: Fallback 1 - Use average cost for origin-destination combination
      console.log('📊 Step 7: Applying Fallback 1 - Origin-Destination averages...');
      await query(`
        UPDATE public.t03_test t03
        SET cost_per_unit = subquery.avg_cost
        FROM (
          SELECT 
            TRIM(origin::text) as origin,
            TRIM(destination::text) as destination,
            AVG(
              CASE 
                WHEN TRIM(truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
                  AND TRIM(truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
                  AND TRIM(truck_load_uom::text)::NUMERIC > 0
                THEN TRIM(truck_freight_usd_truckload::text)::NUMERIC / TRIM(truck_load_uom::text)::NUMERIC
                ELSE NULL
              END
            ) as avg_cost
          FROM public.freight_storage_costs_ii_template_freightrawdata
          WHERE truck_load_uom IS NOT NULL 
            AND truck_freight_usd_truckload IS NOT NULL
            AND LOWER(TRIM(truck_load_uom::text)) NOT IN ('missing', '')
            AND LOWER(TRIM(truck_freight_usd_truckload::text)) NOT IN ('missing', '')
          GROUP BY TRIM(origin::text), TRIM(destination::text)
          HAVING AVG(
              CASE 
                WHEN TRIM(truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
                  AND TRIM(truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
                  AND TRIM(truck_load_uom::text)::NUMERIC > 0
                THEN TRIM(truck_freight_usd_truckload::text)::NUMERIC / TRIM(truck_load_uom::text)::NUMERIC
                ELSE NULL
              END
            ) IS NOT NULL
        ) subquery
        WHERE TRIM(t03.PLT) = subquery.origin
          AND TRIM(t03.country) = subquery.destination
          AND t03.cost_per_unit IS NULL;
      `);
      
      // Step 8: Fallback 2 - Use average cost for destination only
      console.log('📊 Step 8: Applying Fallback 2 - Destination averages...');
      await query(`
        UPDATE public.t03_test t03
        SET cost_per_unit = subquery.avg_cost
        FROM (
          SELECT 
            TRIM(destination::text) as destination,
            AVG(
              CASE 
                WHEN TRIM(truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
                  AND TRIM(truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
                  AND TRIM(truck_load_uom::text)::NUMERIC > 0
                THEN TRIM(truck_freight_usd_truckload::text)::NUMERIC / TRIM(truck_load_uom::text)::NUMERIC
                ELSE NULL
              END
            ) as avg_cost
          FROM public.freight_storage_costs_ii_template_freightrawdata
          WHERE truck_load_uom IS NOT NULL 
            AND truck_freight_usd_truckload IS NOT NULL
            AND LOWER(TRIM(truck_load_uom::text)) NOT IN ('missing', '')
            AND LOWER(TRIM(truck_freight_usd_truckload::text)) NOT IN ('missing', '')
          GROUP BY TRIM(destination::text)
          HAVING AVG(
              CASE 
                WHEN TRIM(truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
                  AND TRIM(truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
                  AND TRIM(truck_load_uom::text)::NUMERIC > 0
                THEN TRIM(truck_freight_usd_truckload::text)::NUMERIC / TRIM(truck_load_uom::text)::NUMERIC
                ELSE NULL
              END
            ) IS NOT NULL
        ) subquery
        WHERE TRIM(t03.country) = subquery.destination
          AND t03.cost_per_unit IS NULL;
      `);
      
      // Step 9: Fallback 3 - Use maximum of all destination averages
      console.log('📊 Step 9: Applying Fallback 3 - Maximum destination average...');
      await query(`
        UPDATE public.t03_test t03
        SET cost_per_unit = (
          SELECT MAX(dest_avg.avg_cost)
          FROM (
            SELECT 
              TRIM(destination::text) as destination,
              AVG(
                CASE 
                  WHEN TRIM(truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
                    AND TRIM(truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
                    AND TRIM(truck_load_uom::text)::NUMERIC > 0
                  THEN TRIM(truck_freight_usd_truckload::text)::NUMERIC / TRIM(truck_load_uom::text)::NUMERIC
                  ELSE NULL
                END
              ) as avg_cost
            FROM public.freight_storage_costs_ii_template_freightrawdata
            WHERE truck_load_uom IS NOT NULL 
              AND truck_freight_usd_truckload IS NOT NULL
              AND LOWER(TRIM(truck_load_uom::text)) NOT IN ('missing', '')
              AND LOWER(TRIM(truck_freight_usd_truckload::text)) NOT IN ('missing', '')
            GROUP BY TRIM(destination::text)
            HAVING AVG(
                CASE 
                  WHEN TRIM(truck_load_uom::text) ~ '^[0-9]+(\.[0-9]+)?$' 
                    AND TRIM(truck_freight_usd_truckload::text) ~ '^[0-9]+(\.[0-9]+)?$'
                    AND TRIM(truck_load_uom::text)::NUMERIC > 0
                  THEN TRIM(truck_freight_usd_truckload::text)::NUMERIC / TRIM(truck_load_uom::text)::NUMERIC
                  ELSE NULL
                END
              ) IS NOT NULL
          ) dest_avg
        )
        WHERE t03.cost_per_unit IS NULL;
      `);
      
      // Step 10: Add factcountry column and populate
      console.log('📊 Step 10: Adding and populating factcountry column...');
      await query(`ALTER TABLE public.t03_test ADD COLUMN IF NOT EXISTS factcountry TEXT;`);
      
      await query(`
        UPDATE public.t03_test t03
        SET factcountry = f.factcountry
        FROM public.freight_storage_costs_factory f
        WHERE TRIM(t03.PLT) = TRIM(f.factcode::text)
          AND t03.PLT IS NOT NULL 
          AND t03.PLT <> 'X';
      `);
      
      // Step 11: Apply business rules - Set cost to 0 for same country or X values
      console.log('📊 Step 11: Applying business rules - Setting cost to 0 for same country/X values...');
      await query(`
        UPDATE public.t03_test
        SET cost_per_unit = 0
        WHERE (
          (country IS NOT NULL AND factcountry IS NOT NULL AND TRIM(country) = TRIM(factcountry))
          OR (WH = 'X')
          OR (PLT = 'X')
        );
      `);
      
      // Clean up temp table
      await query(`DROP TABLE IF EXISTS temp_skus;`);
      
      console.log('✅ T03 Test data generation completed successfully!');
      
      // Return summary statistics
      const summaryResult = await query(`
        SELECT 
          COUNT(*) FILTER (WHERE cost_per_unit = 0) AS rows_with_zero_cost,
          COUNT(*) FILTER (WHERE cost_per_unit IS NULL) AS rows_with_null_cost,
          COUNT(*) FILTER (WHERE cost_per_unit > 0) AS rows_with_positive_cost,
          COUNT(*) AS total_rows,
          ROUND(100.0 * COUNT(*) FILTER (WHERE cost_per_unit > 0) / COUNT(*), 2) as percent_positive_cost
        FROM public.t03_test;
      `);
      
      return {
        success: true,
        summary: summaryResult.rows[0]
      };
      
    } catch (error) {
      console.error('❌ Error generating T03 Test data:', error);
      throw error;
    }
  }

  // Get all T03 Test data with pagination
  static async getAll(page = 1, limit = 100) {
    try {
      const offset = (page - 1) * limit;
      
      const countQuery = `SELECT COUNT(*) as total FROM public.t03_test`;
      const countResult = await query(countQuery);
      const totalRecords = parseInt(countResult.rows[0].total);
      
      const dataQuery = `
        SELECT id, WH, PLT, "FGSKUCode", mth_number, country, cost_per_unit, factcountry
        FROM public.t03_test
        ORDER BY WH, PLT, "FGSKUCode", mth_number
        LIMIT $1 OFFSET $2
      `;
      
      const dataResult = await query(dataQuery, [limit, offset]);
      
      return {
        data: dataResult.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords: totalRecords,
          recordsPerPage: limit,
          hasNextPage: page < Math.ceil(totalRecords / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('❌ Error getting T03 Test data:', error);
      throw error;
    }
  }

  // Get summary statistics
  static async getSummaryStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT "FGSKUCode") as unique_skus,
          COUNT(DISTINCT WH) as unique_warehouses,
          COUNT(DISTINCT PLT) as unique_plants,
          COUNT(DISTINCT country) as unique_countries,
          COUNT(*) FILTER (WHERE cost_per_unit = 0) AS rows_with_zero_cost,
          COUNT(*) FILTER (WHERE cost_per_unit IS NULL) AS rows_with_null_cost,
          COUNT(*) FILTER (WHERE cost_per_unit > 0) AS rows_with_positive_cost,
          ROUND(AVG(cost_per_unit), 4) as avg_cost_per_unit,
          ROUND(MIN(cost_per_unit), 4) as min_cost_per_unit,
          ROUND(MAX(cost_per_unit), 4) as max_cost_per_unit
        FROM public.t03_test
      `;
      
      const result = await query(statsQuery);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting T03 Test summary stats:', error);
      throw error;
    }
  }

  // Delete all T03 Test data
  static async deleteAll() {
    try {
      const result = await query('DELETE FROM public.t03_test');
      console.log(`✅ Deleted ${result.rowCount} T03 Test records`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Error deleting T03 Test data:', error);
      throw error;
    }
  }

  // Get validation report
  static async getValidationReport() {
    try {
      const validationQuery = `
        WITH sku AS (
          SELECT COUNT(DISTINCT NULLIF(TRIM(column_6::text), '')) AS c
          FROM public.demand_raw_demand
          WHERE TRIM(column_6::text) IS NOT NULL
            AND TRIM(column_6::text) <> '' 
            AND TRIM(column_6::text) <> 'column_6'
        ),
        wh AS (
          SELECT COUNT(DISTINCT TRIM(whcode::text)) AS c
          FROM public.freight_storage_costs_warehouse
          WHERE whcode IS NOT NULL AND TRIM(whcode::text) <> ''
        ),
        plt AS (
          SELECT COUNT(DISTINCT TRIM(factcode::text)) AS c
          FROM public.freight_storage_costs_factory
          WHERE factcode IS NOT NULL AND TRIM(factcode::text) <> ''
        )
        SELECT
          (SELECT c FROM sku) AS distinct_skus,
          (SELECT c FROM wh) AS distinct_warehouses,
          (SELECT c FROM plt) AS distinct_plants,
          (SELECT c FROM sku) * (SELECT c FROM wh) * (SELECT c FROM plt) * 12 AS expected_rows,
          (SELECT COUNT(*) FROM public.t03_test) AS actual_rows;
      `;
      
      const result = await query(validationQuery);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting validation report:', error);
      throw error;
    }
  }
}

module.exports = T03TestData;