package migrations

import (
	"log"

	"gorm.io/gorm"
)

// Migration000039CreateBkmSyncTables creates the ais_bkmmaster and ais_bkmdetail
// tables used by the Oracle → PostgreSQL BKM sync pipeline.
func Migration000039CreateBkmSyncTables(db *gorm.DB) error {
	log.Println("Running migration: 000039_create_bkm_sync_tables")

	// Create BKM Master table (mirrors Oracle AIS_BKMMASTER)
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS ais_bkmmaster (
			masterid     TEXT PRIMARY KEY,
			periode      INTEGER NOT NULL,
			remise       INTEGER,
			iddata       TEXT NOT NULL,
			nomor        INTEGER,
			tanggal      TEXT,
			jenisbkm     INTEGER,
			isborongan   BOOLEAN,
			divisi       TEXT,
			mandor       TEXT,
			userid       TEXT,
			updateby     TEXT,
			sign         INTEGER,
			estate       TEXT,

			createat_raw TEXT,
			updateat_raw TEXT,
			signat_raw   TEXT,

			create_at_ts      TIMESTAMPTZ,
			update_at_ts      TIMESTAMPTZ,
			sign_at_ts        TIMESTAMPTZ,

			source_updated_at TIMESTAMPTZ,
			synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}

	// Add remise column if table already existed without it
	if err := db.Exec(`
		ALTER TABLE ais_bkmmaster ADD COLUMN IF NOT EXISTS remise INTEGER;
	`).Error; err != nil {
		log.Printf("Note: Adding remise column may have issues: %v", err)
	}

	// Create BKM Detail table (mirrors Oracle AIS_BKMDETAIL)
	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS ais_bkmdetail (
			detailid         TEXT PRIMARY KEY,
			masterid         TEXT NOT NULL,
			baris            INTEGER,
			pekerjaan        INTEGER,
			keterangan       TEXT,
			blok             TEXT,
			blokstatus       TEXT,
			tm               TEXT,
			nik              TEXT,
			nama             TEXT,
			divisi_karyawan  TEXT,

			qtyp1   DOUBLE PRECISION,
			satp1   TEXT,
			qtyp2   DOUBLE PRECISION,
			satp2   TEXT,
			qty     DOUBLE PRECISION,
			satuan  TEXT,

			tarif   DOUBLE PRECISION,
			premi   DOUBLE PRECISION,
			denda   DOUBLE PRECISION,
			jumlah  DOUBLE PRECISION,
			ackode  TEXT,

			source_updated_at TIMESTAMPTZ,
			synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`).Error; err != nil {
		return err
	}

	// Create indexes for common query patterns
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_bkmmaster_periode ON ais_bkmmaster(periode)",
		"CREATE INDEX IF NOT EXISTS idx_bkmmaster_iddata ON ais_bkmmaster(iddata)",
		"CREATE INDEX IF NOT EXISTS idx_bkmmaster_periode_iddata ON ais_bkmmaster(periode, iddata)",
		"CREATE INDEX IF NOT EXISTS idx_bkmmaster_synced_at ON ais_bkmmaster(synced_at)",
		"CREATE INDEX IF NOT EXISTS idx_bkmdetail_masterid ON ais_bkmdetail(masterid)",
		"CREATE INDEX IF NOT EXISTS idx_bkmdetail_synced_at ON ais_bkmdetail(synced_at)",
	}

	for _, indexSQL := range indexes {
		if err := db.Exec(indexSQL).Error; err != nil {
			log.Printf("Warning: Failed to create BKM index: %v", err)
		}
	}

	log.Println("Migration 000039 completed: ais_bkmmaster and ais_bkmdetail tables created")
	return nil
}
