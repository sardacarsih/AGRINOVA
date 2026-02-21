-- Fix null timestamps in divisions table
-- This resolves the GraphQL schema validation error for myAssignments query

-- First, let's check the current state
SELECT 
    id, 
    nama, 
    kode, 
    created_at IS NULL as created_at_null,
    updated_at IS NULL as updated_at_null
FROM divisions 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Update null created_at and updated_at values with current timestamp
UPDATE divisions 
SET 
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

-- Verify the fix
SELECT 
    id, 
    nama, 
    kode, 
    created_at,
    updated_at
FROM divisions 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Also check estates table for similar issues
SELECT 
    id, 
    nama, 
    created_at IS NULL as created_at_null,
    updated_at IS NULL as updated_at_null
FROM estates 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Fix estates if needed
UPDATE estates 
SET 
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

-- Check companies table
SELECT 
    id, 
    nama, 
    created_at IS NULL as created_at_null,
    updated_at IS NULL as updated_at_null
FROM companies 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Fix companies if needed
UPDATE companies 
SET 
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

-- Check blocks table
SELECT 
    id, 
    kode_blok, 
    nama,
    created_at IS NULL as created_at_null,
    updated_at IS NULL as updated_at_null
FROM blocks 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Fix blocks if needed
UPDATE blocks 
SET 
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;