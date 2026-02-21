-- Add missing fields to estates table for CRUD operations
-- Migration: Add estate code, description, and is_active fields

-- Add code field (estate identifier)
ALTER TABLE estates
ADD COLUMN IF NOT EXISTS code VARCHAR(50) NOT NULL DEFAULT '';

-- Add description field
ALTER TABLE estates
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add is_active field for status management
ALTER TABLE estates
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_estates_code ON estates(code);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_estates_is_active ON estates(is_active);

-- Create composite index for company + active estates (optimized for Company Admin queries)
CREATE INDEX IF NOT EXISTS idx_estates_company_active ON estates(company_id, is_active);

-- Update existing records to have default code based on nama
UPDATE estates
SET code = CASE
    WHEN code = '' OR code IS NULL THEN
        'EST' || LPAD(extract(epoch from created_at)::bigint::text, 6, '0')
    ELSE code
END
WHERE (code = '' OR code IS NULL) AND nama IS NOT NULL;

-- Set all existing estates as active by default
UPDATE estates
SET is_active = true
WHERE is_active IS NULL;

-- Add unique constraint on code per company
ALTER TABLE estates
ADD CONSTRAINT estates_code_company_unique UNIQUE (company_id, code);

COMMENT ON COLUMN estates.code IS 'Estate code/identifier for Company Admin CRUD operations';
COMMENT ON COLUMN estates.description IS 'Estate description for detailed information';
COMMENT ON COLUMN estates.is_active IS 'Flag to indicate if estate is active for operations';