package bkm

// ============================================================================
// BKM Potong Buah Report — Domain types used by the report service
// These mirror the GraphQL schema types in bkm_report.graphqls
// ============================================================================

// BkmPotongBuahFilter is the filter input for the report query.
type BkmPotongBuahFilter struct {
	Periode   int32   `json:"periode"`
	CompanyID *string `json:"companyId,omitempty"`
	Estate    *string `json:"estate,omitempty"`
	Divisi    *string `json:"divisi,omitempty"`
	Blok      *string `json:"blok,omitempty"`
}

// BkmPotongBuahDetail represents a single detail row in the report.
type BkmPotongBuahDetail struct {
	Tanggal *string  `json:"tanggal,omitempty"`
	Mandor  *string  `json:"mandor,omitempty"`
	NIK     *string  `json:"nik,omitempty"`
	Nama    *string  `json:"nama,omitempty"`
	Qty     *float64 `json:"qty,omitempty"`
	Satuan  *string  `json:"satuan,omitempty"`
	Jumlah  *float64 `json:"jumlah,omitempty"`
}

// BkmPotongBuahBlock represents block-level aggregation.
type BkmPotongBuahBlock struct {
	Blok         string                 `json:"blok"`
	TotalQty     float64                `json:"totalQty"`
	TotalJumlah  float64                `json:"totalJumlah"`
	TotalRecords int32                  `json:"totalRecords"`
	Details      []*BkmPotongBuahDetail `json:"details"`
}

// BkmPotongBuahDivision represents division-level aggregation.
type BkmPotongBuahDivision struct {
	Divisi       string                `json:"divisi"`
	TotalQty     float64               `json:"totalQty"`
	TotalJumlah  float64               `json:"totalJumlah"`
	TotalRecords int32                 `json:"totalRecords"`
	Blocks       []*BkmPotongBuahBlock `json:"blocks"`
}

// BkmPotongBuahEstate represents estate-level aggregation.
type BkmPotongBuahEstate struct {
	Periode      int32                    `json:"periode"`
	Estate       string                   `json:"estate"`
	TotalRecords int32                    `json:"totalRecords"`
	TotalQty     float64                  `json:"totalQty"`
	TotalJumlah  float64                  `json:"totalJumlah"`
	Divisions    []*BkmPotongBuahDivision `json:"divisions"`
}

// BkmPotongBuahSummary is the top-level report result.
type BkmPotongBuahSummary struct {
	TotalRecords int32                  `json:"totalRecords"`
	TotalQty     float64                `json:"totalQty"`
	TotalJumlah  float64                `json:"totalJumlah"`
	Estates      []*BkmPotongBuahEstate `json:"estates"`
}

// rawPotongBuahRow is the flat row returned from the SQL query.
type RawPotongBuahRow struct {
	Periode int32
	Estate  string
	Divisi  string
	Blok    string
	Tanggal *string
	Mandor  *string
	NIK     *string
	Nama    *string
	Qty     float64
	Satuan  *string
	Jumlah  float64
}

// ============================================================================
// Flat Report Models
// ============================================================================

type BkmPotongBuahFlatItem struct {
	Tanggal     string   `json:"tanggal"`
	CompanyCode string   `json:"companyCode"`
	CompanyName string   `json:"companyName"`
	Estate      string   `json:"estate"`
	Divisi      string   `json:"divisi"`
	Blok        string   `json:"blok"`
	NIK         *string  `json:"nik"`
	Nama        *string  `json:"nama"`
	QtyP1       *float64 `json:"qtyp1"`
	SatP1       *string  `json:"satp1"`
	QtyP2       *float64 `json:"qtyp2"`
	SatP2       *string  `json:"satp2"`
	Qty         *float64 `json:"qty"`
	Satuan      *string  `json:"satuan"`
	Jumlah      *float64 `json:"jumlah"`
}

type BkmPotongBuahKPI struct {
	TotalQty    float64 `json:"totalQty"`
	TotalJumlah float64 `json:"totalJumlah"`
	TotalHk     int32   `json:"totalHk"`
	Bgm         float64 `json:"bgm"`
	OutputPerHk float64 `json:"outputPerHk"`
}

type BkmPotongBuahFlatResponse struct {
	Data    []*BkmPotongBuahFlatItem `json:"data"`
	Total   int32                    `json:"total"`
	Summary *BkmPotongBuahKPI        `json:"summary"`
}

type BkmPotongBuahDailyPoint struct {
	Date        string  `json:"date"`
	OutputQty   float64 `json:"outputQty"`
	TotalJumlah float64 `json:"totalJumlah"`
	WorkerCount int32   `json:"workerCount"`
}

type BkmPotongBuahOutputPoint struct {
	Name      string  `json:"name"`
	OutputQty float64 `json:"outputQty"`
}

type BkmPotongBuahHarvesterPoint struct {
	NIK       string  `json:"nik"`
	Name      string  `json:"name"`
	OutputQty float64 `json:"outputQty"`
}

type BkmPotongBuahAnalytics struct {
	TotalRecords int32                          `json:"totalRecords"`
	Summary      *BkmPotongBuahKPI              `json:"summary"`
	Daily        []*BkmPotongBuahDailyPoint     `json:"daily"`
	Companies    []*BkmPotongBuahOutputPoint    `json:"companies"`
	Estates      []*BkmPotongBuahOutputPoint    `json:"estates"`
	Divisions    []*BkmPotongBuahOutputPoint    `json:"divisions"`
	Blocks       []*BkmPotongBuahOutputPoint    `json:"blocks"`
	Harvesters   []*BkmPotongBuahHarvesterPoint `json:"harvesters"`
}
