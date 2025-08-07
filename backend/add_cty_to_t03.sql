-- Migration script to add cty column to T03 table and populate it based on warehouse mapping

-- Add cty column to existing t03_primdist table
ALTER TABLE t03_primdist ADD COLUMN IF NOT EXISTS cty VARCHAR(50);

-- Create index for the new cty column
CREATE INDEX IF NOT EXISTS idx_t03_country ON t03_primdist(cty);

-- Update existing records with country mapping based on warehouse
UPDATE t03_primdist 
SET cty = CASE 
  WHEN wh = 'GFCM' THEN 'UAE FS'
  WHEN wh = 'KFCM' THEN 'Kuwait'
  WHEN wh = 'NFCM' THEN 'KSA'
  ELSE 'Unknown'
END
WHERE cty IS NULL;

-- Display the results
SELECT 
  wh,
  cty,
  COUNT(*) as record_count
FROM t03_primdist 
GROUP BY wh, cty 
ORDER BY wh, cty;

-- Verify the migration
SELECT 
  'Total records updated' as status,
  COUNT(*) as count
FROM t03_primdist 
WHERE cty IS NOT NULL
UNION ALL
SELECT 
  'Records with UAE FS' as status,
  COUNT(*) as count
FROM t03_primdist 
WHERE cty = 'UAE FS'
UNION ALL
SELECT 
  'Records with Kuwait' as status,
  COUNT(*) as count
FROM t03_primdist 
WHERE cty = 'Kuwait'
UNION ALL
SELECT 
  'Records with KSA' as status,
  COUNT(*) as count
FROM t03_primdist 
WHERE cty = 'KSA'; 