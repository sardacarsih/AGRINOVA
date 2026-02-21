-- Migration: Add optional fields to harvest_records table
-- This adds notes, latitude, and longitude columns for enhanced harvest tracking
-- All new columns are nullable for backward compatibility

DO $$
BEGIN
    -- Add notes column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='harvest_records' AND column_name='notes'
    ) THEN
        ALTER TABLE harvest_records 
        ADD COLUMN notes TEXT;
        
        RAISE NOTICE 'Added column: notes';
    ELSE
        RAISE NOTICE 'Column notes already exists';
    END IF;
    
    -- Add latitude column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='harvest_records' AND column_name='latitude'
    ) THEN
        ALTER TABLE harvest_records 
        ADD COLUMN latitude DOUBLE PRECISION;
        
        RAISE NOTICE 'Added column: latitude';
    ELSE
        RAISE NOTICE 'Column latitude already exists';
    END IF;
    
    -- Add longitude column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='harvest_records' AND column_name='longitude'
    ) THEN
        ALTER TABLE harvest_records 
        ADD COLUMN longitude DOUBLE PRECISION;
        
        RAISE NOTICE 'Added column: longitude';
    ELSE
        RAISE NOTICE 'Column longitude already exists';
    END IF;
    
    -- Add local_id column if not exists (for mobile offline sync idempotency)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='harvest_records' AND column_name='local_id'
    ) THEN
        ALTER TABLE harvest_records 
        ADD COLUMN local_id TEXT UNIQUE;
        
        CREATE INDEX IF NOT EXISTS idx_harvest_records_local_id 
        ON harvest_records(local_id);
        
        RAISE NOTICE 'Added column: local_id with unique index';
    ELSE
        RAISE NOTICE 'Column local_id already exists';
    END IF;
    
    -- Add company_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='harvest_records' AND column_name='company_id'
    ) THEN
        ALTER TABLE harvest_records 
        ADD COLUMN company_id UUID;
        
        CREATE INDEX IF NOT EXISTS idx_harvest_records_company_id 
        ON harvest_records(company_id);
        
        RAISE NOTICE 'Added column: company_id';
    ELSE
        RAISE NOTICE 'Column company_id already exists';
    END IF;
    
    -- Add estate_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='harvest_records' AND column_name='estate_id'
    ) THEN
        ALTER TABLE harvest_records 
        ADD COLUMN estate_id UUID;
        
        CREATE INDEX IF NOT EXISTS idx_harvest_records_estate_id 
        ON harvest_records(estate_id);
        
        RAISE NOTICE 'Added column: estate_id';
    ELSE
        RAISE NOTICE 'Column estate_id already exists';
    END IF;
    
    -- Add photo_url column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='harvest_records' AND column_name='photo_url'
    ) THEN
        ALTER TABLE harvest_records 
        ADD COLUMN photo_url TEXT;
        
        RAISE NOTICE 'Added column: photo_url';
    ELSE
        RAISE NOTICE 'Column photo_url already exists';
    END IF;
    
    -- Add asisten_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='harvest_records' AND column_name='asisten_id'
    ) THEN
        ALTER TABLE harvest_records 
        ADD COLUMN asisten_id UUID;
        
        CREATE INDEX IF NOT EXISTS idx_harvest_records_asisten_id 
        ON harvest_records(asisten_id);
        
        RAISE NOTICE 'Added column: asisten_id';
    ELSE
        RAISE NOTICE 'Column asisten_id already exists';
    END IF;
    
    -- Add division_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='harvest_records' AND column_name='division_id'
    ) THEN
        ALTER TABLE harvest_records 
        ADD COLUMN division_id UUID;
        
        CREATE INDEX IF NOT EXISTS idx_harvest_records_division_id 
        ON harvest_records(division_id);
        
        RAISE NOTICE 'Added column: division_id';
    ELSE
        RAISE NOTICE 'Column division_id already exists';
    END IF;
    
    -- Add karyawan_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='harvest_records' AND column_name='karyawan_id'
    ) THEN
        ALTER TABLE harvest_records 
        ADD COLUMN karyawan_id UUID;
        
        CREATE INDEX IF NOT EXISTS idx_harvest_records_karyawan_id 
        ON harvest_records(karyawan_id);
        
        RAISE NOTICE 'Added column: karyawan_id';
    ELSE
        RAISE NOTICE 'Column karyawan_id already exists';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN harvest_records.notes IS 'Optional notes or remarks about the harvest';
COMMENT ON COLUMN harvest_records.latitude IS 'GPS latitude coordinate (-90 to 90)';
COMMENT ON COLUMN harvest_records.longitude IS 'GPS longitude coordinate (-180 to 180)';
COMMENT ON COLUMN harvest_records.local_id IS 'Unique ID from mobile device for offline sync idempotency';
COMMENT ON COLUMN harvest_records.company_id IS 'Company ID reference';
COMMENT ON COLUMN harvest_records.estate_id IS 'Estate ID reference';
COMMENT ON COLUMN harvest_records.photo_url IS 'URL or path to harvest photo';
COMMENT ON COLUMN harvest_records.asisten_id IS 'Asisten (supervisor) ID reference';
COMMENT ON COLUMN harvest_records.division_id IS 'Division ID reference';
COMMENT ON COLUMN harvest_records.karyawan_id IS 'Employee/Karyawan ID reference';
