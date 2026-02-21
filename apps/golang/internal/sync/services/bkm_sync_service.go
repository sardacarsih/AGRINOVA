package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"

	"agrinovagraphql/server/internal/graphql/domain/bkm"
)

// BkmSyncService handles bulk upsert of BKM master and detail records.
type BkmSyncService struct {
	db *gorm.DB
}

// NewBkmSyncService creates a new BkmSyncService.
func NewBkmSyncService(db *gorm.DB) *BkmSyncService {
	return &BkmSyncService{db: db}
}

// UpsertMasters performs a bulk upsert of BKM master records.
func (s *BkmSyncService) UpsertMasters(ctx context.Context, inputs []*bkm.BkmMasterUpsertInput) (*bkm.UpsertBkmResult, error) {
	if len(inputs) == 0 {
		return &bkm.UpsertBkmResult{Received: 0, Upserted: 0}, nil
	}

	// Validate all inputs
	for i, inp := range inputs {
		if inp.MasterID == "" {
			return nil, fmt.Errorf("input[%d]: masterid is required", i)
		}
		if inp.Periode <= 0 {
			return nil, fmt.Errorf("input[%d]: periode is required and must be positive", i)
		}
		if inp.IDData == "" {
			return nil, fmt.Errorf("input[%d]: iddata is required", i)
		}
		// Validate YYYYMM format
		month := inp.Periode % 100
		if month < 1 || month > 12 {
			return nil, fmt.Errorf("input[%d]: periode %d has invalid month (must be 01-12)", i, inp.Periode)
		}
	}

	received := int32(len(inputs))
	var upserted int32

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, inp := range inputs {
			// Compute source_updated_at: prefer updateAtTs, fallback createAtTs
			var sourceUpdatedAt *time.Time
			if inp.UpdateAtTs != nil {
				sourceUpdatedAt = inp.UpdateAtTs
			} else if inp.CreateAtTs != nil {
				sourceUpdatedAt = inp.CreateAtTs
			}

			// Convert int32 pointers to int pointers for GORM model
			var nomor *int64
			var jenisbkm, sign, remise *int
			if inp.Nomor != nil {
				nomor = inp.Nomor
			}
			if inp.JenisBKM != nil {
				v := int(*inp.JenisBKM)
				jenisbkm = &v
			}
			if inp.Sign != nil {
				v := int(*inp.Sign)
				sign = &v
			}
			if inp.Remise != nil {
				v := int(*inp.Remise)
				remise = &v
			}

			record := bkm.AisBkmMaster{
				MasterID:        inp.MasterID,
				Periode:         int(inp.Periode),
				Remise:          remise,
				IDData:          inp.IDData,
				Nomor:           nomor,
				Tanggal:         inp.Tanggal,
				JenisBKM:        jenisbkm,
				IsBorongan:      inp.IsBorongan,
				Divisi:          inp.Divisi,
				Mandor:          inp.Mandor,
				UserID:          inp.UserID,
				UpdateBy:        inp.UpdateBy,
				Sign:            sign,
				Estate:          inp.Estate,
				CreateAtRaw:     inp.CreateAtRaw,
				UpdateAtRaw:     inp.UpdateAtRaw,
				SignAtRaw:       inp.SignAtRaw,
				CreateAtTs:      inp.CreateAtTs,
				UpdateAtTs:      inp.UpdateAtTs,
				SignAtTs:        inp.SignAtTs,
				SourceUpdatedAt: sourceUpdatedAt,
				SyncedAt:        time.Now(),
			}

			sql := buildMasterUpsertSQL()
			args := masterArgs(record)

			result := tx.Exec(sql, args...)
			if result.Error != nil {
				return fmt.Errorf("upsert master %s: %w", inp.MasterID, result.Error)
			}
			upserted += int32(result.RowsAffected)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	log.Printf("[BKM Sync] UpsertMasters: received=%d, upserted=%d", received, upserted)
	return &bkm.UpsertBkmResult{Received: received, Upserted: upserted}, nil
}

// UpsertDetails performs a bulk upsert of BKM detail records.
func (s *BkmSyncService) UpsertDetails(ctx context.Context, inputs []*bkm.BkmDetailUpsertInput) (*bkm.UpsertBkmResult, error) {
	if len(inputs) == 0 {
		return &bkm.UpsertBkmResult{Received: 0, Upserted: 0}, nil
	}

	// Validate all inputs
	for i, inp := range inputs {
		if inp.DetailID == "" {
			return nil, fmt.Errorf("input[%d]: detailid is required", i)
		}
		if inp.MasterID == "" {
			return nil, fmt.Errorf("input[%d]: masterid is required", i)
		}
	}

	received := int32(len(inputs))
	var upserted int32

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, inp := range inputs {
			// Convert int32 pointers to int pointers
			var baris, pekerjaan *int
			if inp.Baris != nil {
				v := int(*inp.Baris)
				baris = &v
			}
			if inp.Pekerjaan != nil {
				v := int(*inp.Pekerjaan)
				pekerjaan = &v
			}

			record := bkm.AisBkmDetail{
				DetailID:       inp.DetailID,
				MasterID:       inp.MasterID,
				Baris:          baris,
				Pekerjaan:      pekerjaan,
				Keterangan:     inp.Keterangan,
				Blok:           inp.Blok,
				BlokStatus:     inp.BlokStatus,
				TM:             inp.TM,
				NIK:            inp.NIK,
				Nama:           inp.Nama,
				DivisiKaryawan: inp.DivisiKaryawan,
				QtyP1:          inp.QtyP1,
				SatP1:          inp.SatP1,
				QtyP2:          inp.QtyP2,
				SatP2:          inp.SatP2,
				Qty:            inp.Qty,
				Satuan:         inp.Satuan,
				Tarif:          inp.Tarif,
				Premi:          inp.Premi,
				Denda:          inp.Denda,
				Jumlah:         inp.Jumlah,
				AcKode:         inp.AcKode,
				SyncedAt:       time.Now(),
			}

			sql := buildDetailUpsertSQL()
			args := detailArgs(record)

			result := tx.Exec(sql, args...)
			if result.Error != nil {
				return fmt.Errorf("upsert detail %s: %w", inp.DetailID, result.Error)
			}
			upserted += int32(result.RowsAffected)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	log.Printf("[BKM Sync] UpsertDetails: received=%d, upserted=%d", received, upserted)
	return &bkm.UpsertBkmResult{Received: received, Upserted: upserted}, nil
}

// ============================================================================
// SQL builders
// ============================================================================

func buildMasterUpsertSQL() string {
	cols := []string{
		"masterid", "periode", "remise", "iddata", "nomor", "tanggal", "jenisbkm", "isborongan",
		"divisi", "mandor", "userid", "updateby", "sign", "estate",
		"createat_raw", "updateat_raw", "signat_raw",
		"create_at_ts", "update_at_ts", "sign_at_ts",
		"source_updated_at", "synced_at",
	}

	placeholders := make([]string, len(cols))
	for i := range cols {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}

	// Build the ON CONFLICT update set (exclude masterid from updates)
	updateCols := cols[1:] // skip masterid
	setClauses := make([]string, len(updateCols))
	for i, col := range updateCols {
		if col == "synced_at" {
			setClauses[i] = "synced_at=now()"
		} else {
			setClauses[i] = fmt.Sprintf("%s=EXCLUDED.%s", col, col)
		}
	}

	return fmt.Sprintf(
		"INSERT INTO ais_bkmmaster (%s) VALUES (%s) ON CONFLICT (masterid) DO UPDATE SET %s",
		strings.Join(cols, ", "),
		strings.Join(placeholders, ", "),
		strings.Join(setClauses, ", "),
	)
}

func masterArgs(r bkm.AisBkmMaster) []interface{} {
	return []interface{}{
		r.MasterID, r.Periode, r.Remise, r.IDData, r.Nomor, r.Tanggal, r.JenisBKM, r.IsBorongan,
		r.Divisi, r.Mandor, r.UserID, r.UpdateBy, r.Sign, r.Estate,
		r.CreateAtRaw, r.UpdateAtRaw, r.SignAtRaw,
		r.CreateAtTs, r.UpdateAtTs, r.SignAtTs,
		r.SourceUpdatedAt, r.SyncedAt,
	}
}

func buildDetailUpsertSQL() string {
	cols := []string{
		"detailid", "masterid", "baris", "pekerjaan", "keterangan", "blok", "blokstatus", "tm",
		"nik", "nama", "divisi_karyawan",
		"qtyp1", "satp1", "qtyp2", "satp2", "qty", "satuan",
		"tarif", "premi", "denda", "jumlah", "ackode",
		"source_updated_at", "synced_at",
	}

	placeholders := make([]string, len(cols))
	for i := range cols {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}

	updateCols := cols[1:] // skip detailid
	setClauses := make([]string, len(updateCols))
	for i, col := range updateCols {
		if col == "synced_at" {
			setClauses[i] = "synced_at=now()"
		} else {
			setClauses[i] = fmt.Sprintf("%s=EXCLUDED.%s", col, col)
		}
	}

	return fmt.Sprintf(
		"INSERT INTO ais_bkmdetail (%s) VALUES (%s) ON CONFLICT (detailid) DO UPDATE SET %s",
		strings.Join(cols, ", "),
		strings.Join(placeholders, ", "),
		strings.Join(setClauses, ", "),
	)
}

func detailArgs(r bkm.AisBkmDetail) []interface{} {
	return []interface{}{
		r.DetailID, r.MasterID, r.Baris, r.Pekerjaan, r.Keterangan, r.Blok, r.BlokStatus, r.TM,
		r.NIK, r.Nama, r.DivisiKaryawan,
		r.QtyP1, r.SatP1, r.QtyP2, r.SatP2, r.Qty, r.Satuan,
		r.Tarif, r.Premi, r.Denda, r.Jumlah, r.AcKode,
		r.SourceUpdatedAt, r.SyncedAt,
	}
}
