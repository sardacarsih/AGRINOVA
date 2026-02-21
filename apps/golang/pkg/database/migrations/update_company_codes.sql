-- Migration to populate company codes for existing companies
-- This script adds codes to companies that have NULL or empty code values

-- First, let's check the current state
SELECT 
    id, 
    code, 
    nama,
    CASE 
        WHEN code IS NULL OR code = '' THEN 'NEEDS CODE'
        ELSE 'HAS CODE'
    END as status
FROM companies
ORDER BY created_at;

-- Generate and update codes for companies without codes
-- Using a sequential pattern: COMP-001, COMP-002, etc.
WITH numbered_companies AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at) as row_num
    FROM companies
    WHERE code IS NULL OR code = ''
)
UPDATE companies
SET code = 'COMP-' || LPAD(nc.row_num::text, 3, '0')
FROM numbered_companies nc
WHERE companies.id = nc.id;

-- Verify the update
SELECT 
    id, 
    code, 
    nama,
    created_at
FROM companies
ORDER BY created_at;
