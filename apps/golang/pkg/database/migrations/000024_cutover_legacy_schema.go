package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000024CutoverLegacySchema normalizes legacy/modern column pairs
// and installs sync triggers so both schemas stay consistent during transition.
func Migration000024CutoverLegacySchema(db *gorm.DB) error {
	log.Println("Running migration: 000024_cutover_legacy_schema")

	finalized, err := isLegacySchemaFinalized(db)
	if err != nil {
		return err
	}
	if finalized {
		log.Println("Migration 000024 skipped: legacy schema already finalized")
		return nil
	}

	if err := db.Exec(`
		DO $$
		BEGIN
			-- Companies: ensure legacy + canonical columns coexist
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'name') THEN
				ALTER TABLE companies ADD COLUMN name VARCHAR(255);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'nama') THEN
				ALTER TABLE companies ADD COLUMN nama VARCHAR(255);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'company_code') THEN
				ALTER TABLE companies ADD COLUMN company_code VARCHAR(50);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'kode') THEN
				ALTER TABLE companies ADD COLUMN kode VARCHAR(50);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'address') THEN
				ALTER TABLE companies ADD COLUMN address TEXT;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'alamat') THEN
				ALTER TABLE companies ADD COLUMN alamat TEXT;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'phone') THEN
				ALTER TABLE companies ADD COLUMN phone VARCHAR(20);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'telepon') THEN
				ALTER TABLE companies ADD COLUMN telepon VARCHAR(20);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'description') THEN
				ALTER TABLE companies ADD COLUMN description TEXT;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'is_active') THEN
				ALTER TABLE companies ADD COLUMN is_active BOOLEAN DEFAULT true;
			END IF;

			-- Estates
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estates' AND column_name = 'name') THEN
				ALTER TABLE estates ADD COLUMN name VARCHAR(255);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estates' AND column_name = 'nama') THEN
				ALTER TABLE estates ADD COLUMN nama VARCHAR(255);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estates' AND column_name = 'code') THEN
				ALTER TABLE estates ADD COLUMN code VARCHAR(50);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estates' AND column_name = 'kode') THEN
				ALTER TABLE estates ADD COLUMN kode VARCHAR(50);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estates' AND column_name = 'location') THEN
				ALTER TABLE estates ADD COLUMN location TEXT;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estates' AND column_name = 'lokasi') THEN
				ALTER TABLE estates ADD COLUMN lokasi TEXT;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estates' AND column_name = 'area_ha') THEN
				ALTER TABLE estates ADD COLUMN area_ha NUMERIC;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estates' AND column_name = 'luas_ha') THEN
				ALTER TABLE estates ADD COLUMN luas_ha NUMERIC;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estates' AND column_name = 'is_active') THEN
				ALTER TABLE estates ADD COLUMN is_active BOOLEAN DEFAULT true;
			END IF;

			-- Divisions
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'name') THEN
				ALTER TABLE divisions ADD COLUMN name VARCHAR(255);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'nama') THEN
				ALTER TABLE divisions ADD COLUMN nama VARCHAR(255);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'code') THEN
				ALTER TABLE divisions ADD COLUMN code VARCHAR(50);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'kode') THEN
				ALTER TABLE divisions ADD COLUMN kode VARCHAR(50);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'is_active') THEN
				ALTER TABLE divisions ADD COLUMN is_active BOOLEAN DEFAULT true;
			END IF;

			-- Blocks
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'name') THEN
				ALTER TABLE blocks ADD COLUMN name VARCHAR(255);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'nama') THEN
				ALTER TABLE blocks ADD COLUMN nama VARCHAR(255);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'block_code') THEN
				ALTER TABLE blocks ADD COLUMN block_code VARCHAR(50);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'kode_blok') THEN
				ALTER TABLE blocks ADD COLUMN kode_blok VARCHAR(50);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'kode') THEN
				ALTER TABLE blocks ADD COLUMN kode VARCHAR(50);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'area_ha') THEN
				ALTER TABLE blocks ADD COLUMN area_ha NUMERIC;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'luas_ha') THEN
				ALTER TABLE blocks ADD COLUMN luas_ha NUMERIC;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'crop_type') THEN
				ALTER TABLE blocks ADD COLUMN crop_type VARCHAR(100);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'jenis_tanaman') THEN
				ALTER TABLE blocks ADD COLUMN jenis_tanaman VARCHAR(100);
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'planting_year') THEN
				ALTER TABLE blocks ADD COLUMN planting_year INTEGER;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'tahun_tanam') THEN
				ALTER TABLE blocks ADD COLUMN tahun_tanam INTEGER;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'is_active') THEN
				ALTER TABLE blocks ADD COLUMN is_active BOOLEAN DEFAULT true;
			END IF;
		END $$;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		-- Backfill companies
		UPDATE companies
		SET
			name = COALESCE(NULLIF(name, ''), NULLIF(nama, '')),
			nama = COALESCE(NULLIF(nama, ''), NULLIF(name, '')),
			company_code = COALESCE(NULLIF(company_code, ''), NULLIF(kode, ''), UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8))),
			kode = COALESCE(NULLIF(kode, ''), NULLIF(company_code, '')),
			address = COALESCE(NULLIF(address, ''), NULLIF(alamat, '')),
			alamat = COALESCE(NULLIF(alamat, ''), NULLIF(address, '')),
			phone = COALESCE(NULLIF(phone, ''), NULLIF(telepon, '')),
			telepon = COALESCE(NULLIF(telepon, ''), NULLIF(phone, ''))
		WHERE
			name IS NULL OR name = '' OR nama IS NULL OR nama = '' OR
			company_code IS NULL OR company_code = '' OR kode IS NULL OR kode = '' OR
			address IS NULL OR address = '' OR alamat IS NULL OR alamat = '' OR
			phone IS NULL OR phone = '' OR telepon IS NULL OR telepon = '';

		-- Backfill estates
		UPDATE estates
		SET
			name = COALESCE(NULLIF(name, ''), NULLIF(nama, '')),
			nama = COALESCE(NULLIF(nama, ''), NULLIF(name, '')),
			code = COALESCE(NULLIF(code, ''), NULLIF(kode, '')),
			kode = COALESCE(NULLIF(kode, ''), NULLIF(code, '')),
			location = COALESCE(NULLIF(location, ''), NULLIF(lokasi, '')),
			lokasi = COALESCE(NULLIF(lokasi, ''), NULLIF(location, '')),
			area_ha = COALESCE(area_ha, luas_ha),
			luas_ha = COALESCE(luas_ha, area_ha)
		WHERE
			name IS NULL OR name = '' OR nama IS NULL OR nama = '' OR
			code IS NULL OR code = '' OR kode IS NULL OR kode = '' OR
			location IS NULL OR location = '' OR lokasi IS NULL OR lokasi = '' OR
			area_ha IS NULL OR luas_ha IS NULL;

		-- Backfill divisions
		UPDATE divisions
		SET
			name = COALESCE(NULLIF(name, ''), NULLIF(nama, '')),
			nama = COALESCE(NULLIF(nama, ''), NULLIF(name, '')),
			code = COALESCE(NULLIF(code, ''), NULLIF(kode, '')),
			kode = COALESCE(NULLIF(kode, ''), NULLIF(code, ''))
		WHERE
			name IS NULL OR name = '' OR nama IS NULL OR nama = '' OR
			code IS NULL OR code = '' OR kode IS NULL OR kode = '';

		-- Backfill blocks
		UPDATE blocks
		SET
			name = COALESCE(NULLIF(name, ''), NULLIF(nama, '')),
			nama = COALESCE(NULLIF(nama, ''), NULLIF(name, '')),
			block_code = COALESCE(NULLIF(block_code, ''), NULLIF(kode_blok, ''), NULLIF(kode, '')),
			kode_blok = COALESCE(NULLIF(kode_blok, ''), NULLIF(block_code, ''), NULLIF(kode, '')),
			kode = COALESCE(NULLIF(kode, ''), NULLIF(block_code, ''), NULLIF(kode_blok, '')),
			area_ha = COALESCE(area_ha, luas_ha),
			luas_ha = COALESCE(luas_ha, area_ha),
			crop_type = COALESCE(NULLIF(crop_type, ''), NULLIF(jenis_tanaman, '')),
			jenis_tanaman = COALESCE(NULLIF(jenis_tanaman, ''), NULLIF(crop_type, '')),
			planting_year = COALESCE(planting_year, tahun_tanam),
			tahun_tanam = COALESCE(tahun_tanam, planting_year)
		WHERE
			name IS NULL OR name = '' OR nama IS NULL OR nama = '' OR
			block_code IS NULL OR block_code = '' OR kode_blok IS NULL OR kode_blok = '' OR
			area_ha IS NULL OR luas_ha IS NULL OR
			crop_type IS NULL OR crop_type = '' OR jenis_tanaman IS NULL OR jenis_tanaman = '' OR
			planting_year IS NULL OR tahun_tanam IS NULL;
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION sync_companies_legacy_columns()
		RETURNS trigger AS $$
		BEGIN
			NEW.name := COALESCE(NULLIF(NEW.name, ''), NEW.nama);
			NEW.nama := COALESCE(NULLIF(NEW.nama, ''), NEW.name);
			NEW.company_code := COALESCE(NULLIF(NEW.company_code, ''), NEW.kode);
			NEW.kode := COALESCE(NULLIF(NEW.kode, ''), NEW.company_code);
			NEW.address := COALESCE(NULLIF(NEW.address, ''), NEW.alamat);
			NEW.alamat := COALESCE(NULLIF(NEW.alamat, ''), NEW.address);
			NEW.phone := COALESCE(NULLIF(NEW.phone, ''), NEW.telepon);
			NEW.telepon := COALESCE(NULLIF(NEW.telepon, ''), NEW.phone);
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;

		DROP TRIGGER IF EXISTS trg_sync_companies_legacy_columns ON companies;
		CREATE TRIGGER trg_sync_companies_legacy_columns
		BEFORE INSERT OR UPDATE ON companies
		FOR EACH ROW
		EXECUTE FUNCTION sync_companies_legacy_columns();

		CREATE OR REPLACE FUNCTION sync_estates_legacy_columns()
		RETURNS trigger AS $$
		BEGIN
			NEW.name := COALESCE(NULLIF(NEW.name, ''), NEW.nama);
			NEW.nama := COALESCE(NULLIF(NEW.nama, ''), NEW.name);
			NEW.code := COALESCE(NULLIF(NEW.code, ''), NEW.kode);
			NEW.kode := COALESCE(NULLIF(NEW.kode, ''), NEW.code);
			NEW.location := COALESCE(NULLIF(NEW.location, ''), NEW.lokasi);
			NEW.lokasi := COALESCE(NULLIF(NEW.lokasi, ''), NEW.location);
			NEW.area_ha := COALESCE(NEW.area_ha, NEW.luas_ha);
			NEW.luas_ha := COALESCE(NEW.luas_ha, NEW.area_ha);
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;

		DROP TRIGGER IF EXISTS trg_sync_estates_legacy_columns ON estates;
		CREATE TRIGGER trg_sync_estates_legacy_columns
		BEFORE INSERT OR UPDATE ON estates
		FOR EACH ROW
		EXECUTE FUNCTION sync_estates_legacy_columns();

		CREATE OR REPLACE FUNCTION sync_divisions_legacy_columns()
		RETURNS trigger AS $$
		BEGIN
			NEW.name := COALESCE(NULLIF(NEW.name, ''), NEW.nama);
			NEW.nama := COALESCE(NULLIF(NEW.nama, ''), NEW.name);
			NEW.code := COALESCE(NULLIF(NEW.code, ''), NEW.kode);
			NEW.kode := COALESCE(NULLIF(NEW.kode, ''), NEW.code);
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;

		DROP TRIGGER IF EXISTS trg_sync_divisions_legacy_columns ON divisions;
		CREATE TRIGGER trg_sync_divisions_legacy_columns
		BEFORE INSERT OR UPDATE ON divisions
		FOR EACH ROW
		EXECUTE FUNCTION sync_divisions_legacy_columns();

		CREATE OR REPLACE FUNCTION sync_blocks_legacy_columns()
		RETURNS trigger AS $$
		BEGIN
			NEW.name := COALESCE(NULLIF(NEW.name, ''), NEW.nama);
			NEW.nama := COALESCE(NULLIF(NEW.nama, ''), NEW.name);
			NEW.block_code := COALESCE(NULLIF(NEW.block_code, ''), NEW.kode_blok, NEW.kode);
			NEW.kode_blok := COALESCE(NULLIF(NEW.kode_blok, ''), NEW.block_code, NEW.kode);
			NEW.kode := COALESCE(NULLIF(NEW.kode, ''), NEW.block_code, NEW.kode_blok);
			NEW.area_ha := COALESCE(NEW.area_ha, NEW.luas_ha);
			NEW.luas_ha := COALESCE(NEW.luas_ha, NEW.area_ha);
			NEW.crop_type := COALESCE(NULLIF(NEW.crop_type, ''), NEW.jenis_tanaman);
			NEW.jenis_tanaman := COALESCE(NULLIF(NEW.jenis_tanaman, ''), NEW.crop_type);
			NEW.planting_year := COALESCE(NEW.planting_year, NEW.tahun_tanam);
			NEW.tahun_tanam := COALESCE(NEW.tahun_tanam, NEW.planting_year);
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;

		DROP TRIGGER IF EXISTS trg_sync_blocks_legacy_columns ON blocks;
		CREATE TRIGGER trg_sync_blocks_legacy_columns
		BEFORE INSERT OR UPDATE ON blocks
		FOR EACH ROW
		EXECUTE FUNCTION sync_blocks_legacy_columns();
	`).Error; err != nil {
		return err
	}

	if err := db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
		CREATE INDEX IF NOT EXISTS idx_companies_company_code ON companies(company_code);
		CREATE INDEX IF NOT EXISTS idx_estates_name ON estates(name);
		CREATE INDEX IF NOT EXISTS idx_estates_code ON estates(code);
		CREATE INDEX IF NOT EXISTS idx_divisions_name ON divisions(name);
		CREATE INDEX IF NOT EXISTS idx_divisions_code ON divisions(code);
		CREATE INDEX IF NOT EXISTS idx_blocks_name ON blocks(name);
		CREATE INDEX IF NOT EXISTS idx_blocks_block_code ON blocks(block_code);
	`).Error; err != nil {
		return err
	}

	log.Println("Migration 000024 completed: legacy cutover sync is active")
	return nil
}
