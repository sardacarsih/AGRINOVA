// Package bkm contains domain models for BKM (Bukti Kerja Mandor) sync.
package bkm

import "time"

// ============================================================================
// GORM Models — PostgreSQL tables
// ============================================================================

// AisBkmMaster is the GORM model for the ais_bkmmaster table.
type AisBkmMaster struct {
	MasterID   string  `gorm:"column:masterid;primaryKey;type:text" json:"masterid"`
	Periode    int     `gorm:"column:periode;type:integer;not null" json:"periode"`
	Remise     *int    `gorm:"column:remise;type:integer" json:"remise,omitempty"`
	IDData     string  `gorm:"column:iddata;type:text;not null" json:"iddata"`
	Nomor      *int64  `gorm:"column:nomor;type:bigint" json:"nomor,omitempty"`
	Tanggal    *string `gorm:"column:tanggal;type:text" json:"tanggal,omitempty"`
	JenisBKM   *int    `gorm:"column:jenisbkm;type:integer" json:"jenisbkm,omitempty"`
	IsBorongan *bool   `gorm:"column:isborongan;type:boolean" json:"isborongan,omitempty"`
	Divisi     *string `gorm:"column:divisi;type:text" json:"divisi,omitempty"`
	Mandor     *string `gorm:"column:mandor;type:text" json:"mandor,omitempty"`
	UserID     *string `gorm:"column:userid;type:text" json:"userid,omitempty"`
	UpdateBy   *string `gorm:"column:updateby;type:text" json:"updateby,omitempty"`
	Sign       *int    `gorm:"column:sign;type:integer" json:"sign,omitempty"`
	Estate     *string `gorm:"column:estate;type:text" json:"estate,omitempty"`

	// Raw timestamp strings from Oracle (for audit)
	CreateAtRaw *string `gorm:"column:createat_raw;type:text" json:"createatRaw,omitempty"`
	UpdateAtRaw *string `gorm:"column:updateat_raw;type:text" json:"updateatRaw,omitempty"`
	SignAtRaw   *string `gorm:"column:signat_raw;type:text" json:"signatRaw,omitempty"`

	// Parsed timestamps
	CreateAtTs *time.Time `gorm:"column:create_at_ts;type:timestamptz" json:"createAtTs,omitempty"`
	UpdateAtTs *time.Time `gorm:"column:update_at_ts;type:timestamptz" json:"updateAtTs,omitempty"`
	SignAtTs   *time.Time `gorm:"column:sign_at_ts;type:timestamptz" json:"signAtTs,omitempty"`

	// Sync metadata
	SourceUpdatedAt *time.Time `gorm:"column:source_updated_at;type:timestamptz" json:"sourceUpdatedAt,omitempty"`
	SyncedAt        time.Time  `gorm:"column:synced_at;type:timestamptz;autoUpdateTime" json:"syncedAt"`
}

// TableName overrides the default table name.
func (AisBkmMaster) TableName() string { return "ais_bkmmaster" }

// AisBkmDetail is the GORM model for the ais_bkmdetail table.
type AisBkmDetail struct {
	DetailID       string  `gorm:"column:detailid;primaryKey;type:text" json:"detailid"`
	MasterID       string  `gorm:"column:masterid;type:text;not null;index" json:"masterid"`
	Baris          *int    `gorm:"column:baris;type:integer" json:"baris,omitempty"`
	Pekerjaan      *int    `gorm:"column:pekerjaan;type:integer" json:"pekerjaan,omitempty"`
	Keterangan     *string `gorm:"column:keterangan;type:text" json:"keterangan,omitempty"`
	Blok           *string `gorm:"column:blok;type:text" json:"blok,omitempty"`
	BlokStatus     *string `gorm:"column:blokstatus;type:text" json:"blokstatus,omitempty"`
	TM             *string `gorm:"column:tm;type:text" json:"tm,omitempty"`
	NIK            *string `gorm:"column:nik;type:text" json:"nik,omitempty"`
	Nama           *string `gorm:"column:nama;type:text" json:"nama,omitempty"`
	DivisiKaryawan *string `gorm:"column:divisi_karyawan;type:text" json:"divisiKaryawan,omitempty"`

	// Quantities
	QtyP1  *float64 `gorm:"column:qtyp1;type:double precision" json:"qtyp1,omitempty"`
	SatP1  *string  `gorm:"column:satp1;type:text" json:"satp1,omitempty"`
	QtyP2  *float64 `gorm:"column:qtyp2;type:double precision" json:"qtyp2,omitempty"`
	SatP2  *string  `gorm:"column:satp2;type:text" json:"satp2,omitempty"`
	Qty    *float64 `gorm:"column:qty;type:double precision" json:"qty,omitempty"`
	Satuan *string  `gorm:"column:satuan;type:text" json:"satuan,omitempty"`

	// Financials
	Tarif  *float64 `gorm:"column:tarif;type:double precision" json:"tarif,omitempty"`
	Premi  *float64 `gorm:"column:premi;type:double precision" json:"premi,omitempty"`
	Denda  *float64 `gorm:"column:denda;type:double precision" json:"denda,omitempty"`
	Jumlah *float64 `gorm:"column:jumlah;type:double precision" json:"jumlah,omitempty"`
	AcKode *string  `gorm:"column:ackode;type:text" json:"ackode,omitempty"`

	// Sync metadata
	SourceUpdatedAt *time.Time `gorm:"column:source_updated_at;type:timestamptz" json:"sourceUpdatedAt,omitempty"`
	SyncedAt        time.Time  `gorm:"column:synced_at;type:timestamptz;autoUpdateTime" json:"syncedAt"`
}

// TableName overrides the default table name.
func (AisBkmDetail) TableName() string { return "ais_bkmdetail" }

// ============================================================================
// GraphQL Input / Result Types (mapped via gqlgen.yml)
// ============================================================================

// BkmMasterUpsertInput is the GraphQL input for upserting BKM masters.
type BkmMasterUpsertInput struct {
	MasterID    string     `json:"masterid"`
	Periode     int32      `json:"periode"`
	Remise      *int32     `json:"remise,omitempty"`
	IDData      string     `json:"iddata"`
	Nomor       *int64     `json:"nomor,omitempty"`
	Tanggal     *string    `json:"tanggal,omitempty"`
	JenisBKM    *int32     `json:"jenisbkm,omitempty"`
	IsBorongan  *bool      `json:"isborongan,omitempty"`
	Divisi      *string    `json:"divisi,omitempty"`
	Mandor      *string    `json:"mandor,omitempty"`
	UserID      *string    `json:"userid,omitempty"`
	UpdateBy    *string    `json:"updateby,omitempty"`
	Sign        *int32     `json:"sign,omitempty"`
	Estate      *string    `json:"estate,omitempty"`
	CreateAtRaw *string    `json:"createatRaw,omitempty"`
	UpdateAtRaw *string    `json:"updateatRaw,omitempty"`
	SignAtRaw   *string    `json:"signatRaw,omitempty"`
	CreateAtTs  *time.Time `json:"createAtTs,omitempty"`
	UpdateAtTs  *time.Time `json:"updateAtTs,omitempty"`
	SignAtTs    *time.Time `json:"signAtTs,omitempty"`
}

// BkmDetailUpsertInput is the GraphQL input for upserting BKM details.
type BkmDetailUpsertInput struct {
	DetailID       string   `json:"detailid"`
	MasterID       string   `json:"masterid"`
	Baris          *int32   `json:"baris,omitempty"`
	Pekerjaan      *int32   `json:"pekerjaan,omitempty"`
	Keterangan     *string  `json:"keterangan,omitempty"`
	Blok           *string  `json:"blok,omitempty"`
	BlokStatus     *string  `json:"blokstatus,omitempty"`
	TM             *string  `json:"tm,omitempty"`
	NIK            *string  `json:"nik,omitempty"`
	Nama           *string  `json:"nama,omitempty"`
	DivisiKaryawan *string  `json:"divisiKaryawan,omitempty"`
	QtyP1          *float64 `json:"qtyp1,omitempty"`
	SatP1          *string  `json:"satp1,omitempty"`
	QtyP2          *float64 `json:"qtyp2,omitempty"`
	SatP2          *string  `json:"satp2,omitempty"`
	Qty            *float64 `json:"qty,omitempty"`
	Satuan         *string  `json:"satuan,omitempty"`
	Tarif          *float64 `json:"tarif,omitempty"`
	Premi          *float64 `json:"premi,omitempty"`
	Denda          *float64 `json:"denda,omitempty"`
	Jumlah         *float64 `json:"jumlah,omitempty"`
	AcKode         *string  `json:"ackode,omitempty"`
}

// UpsertBkmResult is the GraphQL response type for bulk upsert operations.
type UpsertBkmResult struct {
	Received int32 `json:"received"`
	Upserted int32 `json:"upserted"`
}
