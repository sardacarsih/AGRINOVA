-- Migration: Standardize column names from Indonesian to English
-- This ensures consistency between Go struct fields and database columns

-- Users table
ALTER TABLE users RENAME COLUMN nama TO name;
ALTER TABLE users RENAME COLUMN no_telpon TO phone;

-- Companies table
ALTER TABLE companies RENAME COLUMN nama TO name;
ALTER TABLE companies RENAME COLUMN kode_perusahaan TO company_code;
ALTER TABLE companies RENAME COLUMN alamat TO address;
ALTER TABLE companies RENAME COLUMN no_telpon TO phone;

-- Estates table
ALTER TABLE estates RENAME COLUMN nama TO name;
ALTER TABLE estates RENAME COLUMN lokasi TO location;
ALTER TABLE estates RENAME COLUMN luas_ha TO area_ha;

-- Divisions table
ALTER TABLE divisions RENAME COLUMN nama TO name;
ALTER TABLE divisions RENAME COLUMN kode TO code;

-- Blocks table
ALTER TABLE blocks RENAME COLUMN nama TO name;
ALTER TABLE blocks RENAME COLUMN kode_blok TO block_code;
ALTER TABLE blocks RENAME COLUMN luas_ha TO area_ha;

-- Verify changes
SELECT 'Migration completed successfully' as status;
