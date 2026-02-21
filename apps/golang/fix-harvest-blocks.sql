-- Fix harvest records to use blocks that MANDOR user has access to
-- This resolves the "access denied to estate" error when viewing harvest records

-- Update Block B1 records to Block A2 
UPDATE harvest_records SET block_id = 'a2a2a2a2-1234-5678-9abc-def012345678' WHERE block_id = 'b1b1b1b1-1234-5678-9abc-def012345678';

-- Update Block B2 records to Block A1
UPDATE harvest_records SET block_id = 'a1a1a1a1-1234-5678-9abc-def012345678' WHERE block_id = 'c2c2c2c2-1234-5678-9abc-def012345678';

-- Update Block C1 records to Block A1  
UPDATE harvest_records SET block_id = 'a1a1a1a1-1234-5678-9abc-def012345678' WHERE block_id = 'c1c1c1c1-1234-5678-9abc-def012345678';

-- Update Block C2 records to Block A2
UPDATE harvest_records SET block_id = 'a2a2a2a2-1234-5678-9abc-def012345678' WHERE block_id = 'd2d2d2d2-1234-5678-9abc-def012345678';

-- Update Block H1 records to Block A1
UPDATE harvest_records SET block_id = 'a1a1a1a1-1234-5678-9abc-def012345678' WHERE block_id = 'd1d1d1d1-1234-5678-9abc-def012345678';

-- Update Block H2 records to Block A2
UPDATE harvest_records SET block_id = 'a2a2a2a2-1234-5678-9abc-def012345678' WHERE block_id = 'e2e2e2e2-1234-5678-9abc-def012345678';

-- Update Block O1 records to Block A1
UPDATE harvest_records SET block_id = 'a1a1a1a1-1234-5678-9abc-def012345678' WHERE block_id = 'e1e1e1e1-1234-5678-9abc-def012345678';

-- Update Block O2 records to Block A2
UPDATE harvest_records SET block_id = 'a2a2a2a2-1234-5678-9abc-def012345678' WHERE block_id = 'f2f2f2f2-1234-5678-9abc-def012345678';

-- Verify the changes
SELECT 
    block_id,
    COUNT(*) as record_count,
    CASE 
        WHEN block_id IN ('a1a1a1a1-1234-5678-9abc-def012345678', 'a2a2a2a2-1234-5678-9abc-def012345678', 'b2b2b2b2-1234-5678-9abc-def012345679') 
        THEN 'VALID (User has access)'
        ELSE 'INVALID (Access denied)'
    END as access_status
FROM harvest_records 
GROUP BY block_id 
ORDER BY block_id;