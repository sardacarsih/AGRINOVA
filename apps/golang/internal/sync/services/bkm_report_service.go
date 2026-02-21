package services

import (
	"context"
	"fmt"
	"strings"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/bkm"
	"agrinovagraphql/server/internal/middleware"

	"gorm.io/gorm"
)

// BkmReportService provides reporting queries for BKM data.
type BkmReportService struct {
	db *gorm.DB
}

type bkmAccessScope struct {
	Restricted bool
	EstateKeys []string
	CompanyIDs []string
}

// NewBkmReportService creates a new BkmReportService.
func NewBkmReportService(db *gorm.DB) *BkmReportService {
	return &BkmReportService{db: db}
}

// GetPotongBuahReport queries ais_bkmmaster + ais_bkmdetail for pekerjaan=41001
// and returns a hierarchical report aggregated by estate → divisi → blok.
func (s *BkmReportService) GetPotongBuahReport(ctx context.Context, filter *bkm.BkmPotongBuahFilter) (*bkm.BkmPotongBuahSummary, error) {
	rows, err := s.queryRows(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("bkm report query failed: %w", err)
	}
	return s.aggregateRows(rows), nil
}

func normalizeScopeKey(value string) string {
	return strings.ToUpper(strings.TrimSpace(value))
}

func appendUniqueString(target *[]string, seen map[string]struct{}, value string) {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return
	}
	if _, exists := seen[normalized]; exists {
		return
	}
	seen[normalized] = struct{}{}
	*target = append(*target, normalized)
}

func appendUniqueEstateScopeKey(target *[]string, seen map[string]struct{}, value string) {
	normalized := normalizeScopeKey(value)
	if normalized == "" {
		return
	}
	if _, exists := seen[normalized]; exists {
		return
	}
	seen[normalized] = struct{}{}
	*target = append(*target, normalized)
}

func (s *BkmReportService) resolveAccessScope(ctx context.Context) (*bkmAccessScope, error) {
	role := middleware.GetUserRoleFromContext(ctx)
	if role != auth.UserRoleManager && role != auth.UserRoleAreaManager {
		return &bkmAccessScope{Restricted: false}, nil
	}

	userID := strings.TrimSpace(middleware.GetCurrentUserID(ctx))
	if userID == "" {
		return nil, fmt.Errorf("missing scoped user context")
	}

	scope := &bkmAccessScope{
		Restricted: true,
		EstateKeys: make([]string, 0),
		CompanyIDs: make([]string, 0),
	}

	estateKeySeen := make(map[string]struct{})
	companySeen := make(map[string]struct{})

	type estateScopeRow struct {
		Code      string `gorm:"column:code"`
		Name      string `gorm:"column:name"`
		CompanyID string `gorm:"column:company_id"`
	}

	if role == auth.UserRoleManager {
		var estateRows []estateScopeRow
		if err := s.db.WithContext(ctx).
			Table("user_estate_assignments uea").
			Joins("JOIN estates e ON e.id = uea.estate_id").
			Where("uea.user_id = ? AND uea.is_active = true", userID).
			Select("e.code, e.name, e.company_id").
			Scan(&estateRows).Error; err != nil {
			return nil, fmt.Errorf("failed to load manager estate assignments: %w", err)
		}

		for _, row := range estateRows {
			appendUniqueEstateScopeKey(&scope.EstateKeys, estateKeySeen, row.Code)
			appendUniqueEstateScopeKey(&scope.EstateKeys, estateKeySeen, row.Name)
			appendUniqueString(&scope.CompanyIDs, companySeen, row.CompanyID)
		}

		var divisionRows []estateScopeRow
		if err := s.db.WithContext(ctx).
			Table("user_division_assignments uda").
			Joins("JOIN divisions d ON d.id = uda.division_id").
			Joins("JOIN estates e ON e.id = d.estate_id").
			Where("uda.user_id = ? AND uda.is_active = true", userID).
			Select("e.code, e.name, e.company_id").
			Scan(&divisionRows).Error; err != nil {
			return nil, fmt.Errorf("failed to load manager division assignments: %w", err)
		}

		for _, row := range divisionRows {
			appendUniqueEstateScopeKey(&scope.EstateKeys, estateKeySeen, row.Code)
			appendUniqueEstateScopeKey(&scope.EstateKeys, estateKeySeen, row.Name)
			appendUniqueString(&scope.CompanyIDs, companySeen, row.CompanyID)
		}
	}

	var assignedCompanyIDs []string
	if err := s.db.WithContext(ctx).
		Table("user_company_assignments").
		Where("user_id = ? AND is_active = true", userID).
		Pluck("company_id", &assignedCompanyIDs).Error; err != nil {
		return nil, fmt.Errorf("failed to load scoped company assignments: %w", err)
	}

	for _, companyID := range assignedCompanyIDs {
		appendUniqueString(&scope.CompanyIDs, companySeen, companyID)
	}

	return scope, nil
}

func (s *BkmReportService) buildReportConditions(
	ctx context.Context,
	filter *bkm.BkmPotongBuahFilter,
) ([]string, []interface{}, error) {
	var conditions []string
	var args []interface{}

	conditions = append(conditions, "d.pekerjaan = 41001")
	conditions = append(conditions, "m.periode = ?")
	args = append(args, filter.Periode)

	if filter.Estate != nil && *filter.Estate != "" {
		conditions = append(conditions, "m.estate = ?")
		args = append(args, *filter.Estate)
	}
	if filter.Divisi != nil && *filter.Divisi != "" {
		conditions = append(conditions, "m.divisi = ?")
		args = append(args, *filter.Divisi)
	}
	if filter.Blok != nil && *filter.Blok != "" {
		conditions = append(conditions, "d.blok = ?")
		args = append(args, *filter.Blok)
	}
	if filter.CompanyID != nil && strings.TrimSpace(*filter.CompanyID) != "" {
		estateExpr := "UPPER(TRIM(COALESCE(m.estate, '')))"
		divisiExpr := "UPPER(TRIM(COALESCE(m.divisi, '')))"
		iddataExpr := "UPPER(TRIM(COALESCE(m.iddata, '')))"
		conditions = append(conditions, fmt.Sprintf(`
			(
				EXISTS (
					SELECT 1
					FROM estates filter_est
					WHERE filter_est.company_id = ?
					  AND (
						UPPER(TRIM(COALESCE(filter_est.code, ''))) = %s
						OR UPPER(TRIM(COALESCE(filter_est.name, ''))) = %s
					  )
				)
				OR EXISTS (
					SELECT 1
					FROM bkm_company_bridge bcb
					WHERE bcb.company_id = ?
					  AND bcb.is_active = true
					  AND UPPER(TRIM(COALESCE(bcb.source_system, 'BKM'))) = 'BKM'
					  AND NULLIF(TRIM(COALESCE(bcb.iddata_prefix, '')), '') IS NOT NULL
					  AND %s LIKE UPPER(TRIM(COALESCE(bcb.iddata_prefix, ''))) || '%%'
					  AND (
						NULLIF(TRIM(COALESCE(bcb.estate_key, '')), '') IS NULL
						OR %s = UPPER(TRIM(COALESCE(bcb.estate_key, '')))
					  )
					  AND (
						NULLIF(TRIM(COALESCE(bcb.divisi_key, '')), '') IS NULL
						OR %s = UPPER(TRIM(COALESCE(bcb.divisi_key, '')))
					  )
				)
			)
		`, estateExpr, estateExpr, iddataExpr, estateExpr, divisiExpr))
		companyID := strings.TrimSpace(*filter.CompanyID)
		args = append(args, companyID, companyID)
	}

	scope, err := s.resolveAccessScope(ctx)
	if err != nil {
		return nil, nil, err
	}

	if scope.Restricted {
		if len(scope.EstateKeys) == 0 && len(scope.CompanyIDs) == 0 {
			conditions = append(conditions, "1 = 0")
			return conditions, args, nil
		}

		estateExpr := "UPPER(TRIM(COALESCE(m.estate, '')))"
		if len(scope.EstateKeys) > 0 {
			conditions = append(conditions, fmt.Sprintf("%s IN ?", estateExpr))
			args = append(args, scope.EstateKeys)
		}

		if len(scope.CompanyIDs) > 0 {
			divisiExpr := "UPPER(TRIM(COALESCE(m.divisi, '')))"
			iddataExpr := "UPPER(TRIM(COALESCE(m.iddata, '')))"
			conditions = append(conditions, fmt.Sprintf(`
				(
					EXISTS (
						SELECT 1
						FROM estates scope_est
						WHERE scope_est.company_id IN ?
						  AND (
							UPPER(TRIM(COALESCE(scope_est.code, ''))) = %s
							OR UPPER(TRIM(COALESCE(scope_est.name, ''))) = %s
						  )
					)
					OR EXISTS (
						SELECT 1
						FROM bkm_company_bridge bcb
						WHERE bcb.company_id IN ?
						  AND bcb.is_active = true
						  AND UPPER(TRIM(COALESCE(bcb.source_system, 'BKM'))) = 'BKM'
						  AND NULLIF(TRIM(COALESCE(bcb.iddata_prefix, '')), '') IS NOT NULL
						  AND %s LIKE UPPER(TRIM(COALESCE(bcb.iddata_prefix, ''))) || '%%'
						  AND (
							NULLIF(TRIM(COALESCE(bcb.estate_key, '')), '') IS NULL
							OR %s = UPPER(TRIM(COALESCE(bcb.estate_key, '')))
						  )
						  AND (
							NULLIF(TRIM(COALESCE(bcb.divisi_key, '')), '') IS NULL
							OR %s = UPPER(TRIM(COALESCE(bcb.divisi_key, '')))
						  )
					)
				)
			`, estateExpr, estateExpr, iddataExpr, estateExpr, divisiExpr))
			args = append(args, scope.CompanyIDs, scope.CompanyIDs)
		}
	}

	return conditions, args, nil
}

// queryRows executes the raw SQL query with dynamic filters.
func (s *BkmReportService) queryRows(ctx context.Context, filter *bkm.BkmPotongBuahFilter) ([]*bkm.RawPotongBuahRow, error) {
	conditions, args, err := s.buildReportConditions(ctx, filter)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT 
			m.periode,
			COALESCE(m.estate, '') as estate,
			COALESCE(NULLIF(TRIM(div_ref.name), ''), COALESCE(m.divisi, '')) as divisi,
			COALESCE(NULLIF(TRIM(block_ref.name), ''), COALESCE(d.blok, '')) as blok,
			m.tanggal,
			m.mandor,
			d.nik,
			d.nama,
			COALESCE(d.qty, 0) as qty,
			d.satuan,
			COALESCE(d.jumlah, 0) as jumlah
		FROM ais_bkmmaster m
		JOIN ais_bkmdetail d ON m.masterid = d.masterid
		LEFT JOIN LATERAL (
			SELECT dv.id, dv.name
			FROM divisions dv
			WHERE UPPER(TRIM(COALESCE(dv.code, ''))) = UPPER(TRIM(COALESCE(m.divisi, '')))
			ORDER BY dv.id
			LIMIT 1
		) div_ref ON true
		LEFT JOIN LATERAL (
			SELECT b.name
			FROM blocks b
			LEFT JOIN divisions bd ON bd.id = b.division_id
			WHERE UPPER(TRIM(COALESCE(b.block_code, ''))) = UPPER(TRIM(COALESCE(d.blok, '')))
			  AND (
				div_ref.id IS NULL
				OR b.division_id = div_ref.id
				OR UPPER(TRIM(COALESCE(bd.code, ''))) = UPPER(TRIM(COALESCE(m.divisi, '')))
			  )
			ORDER BY b.id
			LIMIT 1
		) block_ref ON true
		WHERE %s
		ORDER BY m.estate, m.divisi, d.blok, m.tanggal
	`, strings.Join(conditions, " AND "))

	sqlRows, err := s.db.WithContext(ctx).Raw(query, args...).Rows()
	if err != nil {
		return nil, err
	}
	defer sqlRows.Close()

	var results []*bkm.RawPotongBuahRow
	for sqlRows.Next() {
		var row bkm.RawPotongBuahRow
		if err := sqlRows.Scan(
			&row.Periode,
			&row.Estate,
			&row.Divisi,
			&row.Blok,
			&row.Tanggal,
			&row.Mandor,
			&row.NIK,
			&row.Nama,
			&row.Qty,
			&row.Satuan,
			&row.Jumlah,
		); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		results = append(results, &row)
	}

	if err := sqlRows.Err(); err != nil {
		return nil, err
	}

	return results, nil
}

// aggregateRows groups flat rows into the hierarchical estate → divisi → blok → detail structure.
func (s *BkmReportService) aggregateRows(rows []*bkm.RawPotongBuahRow) *bkm.BkmPotongBuahSummary {
	summary := &bkm.BkmPotongBuahSummary{}

	// Use ordered maps to preserve sort order
	estateMap := make(map[string]*bkm.BkmPotongBuahEstate)
	estateOrder := []string{}

	for _, row := range rows {
		// Estate level
		estateKey := row.Estate
		estate, ok := estateMap[estateKey]
		if !ok {
			estate = &bkm.BkmPotongBuahEstate{
				Periode: row.Periode,
				Estate:  row.Estate,
			}
			estateMap[estateKey] = estate
			estateOrder = append(estateOrder, estateKey)
		}

		// Find or create division
		var division *bkm.BkmPotongBuahDivision
		for _, d := range estate.Divisions {
			if d.Divisi == row.Divisi {
				division = d
				break
			}
		}
		if division == nil {
			division = &bkm.BkmPotongBuahDivision{
				Divisi: row.Divisi,
			}
			estate.Divisions = append(estate.Divisions, division)
		}

		// Find or create block
		var block *bkm.BkmPotongBuahBlock
		for _, b := range division.Blocks {
			if b.Blok == row.Blok {
				block = b
				break
			}
		}
		if block == nil {
			block = &bkm.BkmPotongBuahBlock{
				Blok: row.Blok,
			}
			division.Blocks = append(division.Blocks, block)
		}

		// Add detail
		detail := &bkm.BkmPotongBuahDetail{
			Tanggal: row.Tanggal,
			Mandor:  row.Mandor,
			NIK:     row.NIK,
			Nama:    row.Nama,
			Satuan:  row.Satuan,
		}
		qty := row.Qty
		detail.Qty = &qty
		jumlah := row.Jumlah
		detail.Jumlah = &jumlah

		block.Details = append(block.Details, detail)

		// Accumulate totals
		block.TotalQty += row.Qty
		block.TotalJumlah += row.Jumlah
		block.TotalRecords++

		division.TotalQty += row.Qty
		division.TotalJumlah += row.Jumlah
		division.TotalRecords++

		estate.TotalQty += row.Qty
		estate.TotalJumlah += row.Jumlah
		estate.TotalRecords++

		summary.TotalQty += row.Qty
		summary.TotalJumlah += row.Jumlah
		summary.TotalRecords++
	}

	// Build ordered estates list
	for _, key := range estateOrder {
		summary.Estates = append(summary.Estates, estateMap[key])
	}

	return summary
}

// GetPotongBuahFlat queries ais_bkmmaster + ais_bkmdetail for pekerjaan=41001
// and returns a flat list with pagination and summary.
func (s *BkmReportService) GetPotongBuahFlat(ctx context.Context, filter *bkm.BkmPotongBuahFilter, page int32, limit int32) (*bkm.BkmPotongBuahFlatResponse, error) {
	conditions, args, err := s.buildReportConditions(ctx, filter)
	if err != nil {
		return nil, err
	}

	whereClause := strings.Join(conditions, " AND ")

	// 1. Get total count + KPI summary in one pass over filtered rows.
	var aggregate struct {
		TotalCount  int64   `gorm:"column:total_count"`
		TotalQty    float64 `gorm:"column:total_qty"`
		TotalJumlah float64 `gorm:"column:total_jumlah"`
	}

	aggregateQuery := fmt.Sprintf(`
		SELECT
			COUNT(*) AS total_count,
			COALESCE(SUM(d.qtyp2), 0) AS total_qty,
			COALESCE(SUM(d.jumlah), 0) AS total_jumlah
		FROM ais_bkmmaster m
		JOIN ais_bkmdetail d ON m.masterid = d.masterid
		WHERE %s
	`, whereClause)

	if err := s.db.WithContext(ctx).Raw(aggregateQuery, args...).Scan(&aggregate).Error; err != nil {
		return nil, fmt.Errorf("aggregate query failed: %w", err)
	}

	if page < 1 {
		page = 1
	}
	if limit < 0 {
		limit = 0
	}

	// 2. Get paginated data (optional).
	var items []*bkm.BkmPotongBuahFlatItem
	if limit > 0 {
		offset := (page - 1) * limit
		dataQuery := fmt.Sprintf(`
		WITH base AS (
			SELECT
				m.tanggal,
				m.iddata,
				m.estate,
				m.divisi,
				d.blok,
				d.nik,
				d.nama,
				d.qtyp1,
				d.satp1,
				d.qtyp2,
				d.satp2,
				d.qty,
				d.satuan,
				d.jumlah
			FROM ais_bkmmaster m
			JOIN ais_bkmdetail d ON m.masterid = d.masterid
			WHERE %s
			ORDER BY m.estate, m.divisi, d.blok, m.tanggal
			LIMIT ? OFFSET ?
		)
		SELECT 
			base.tanggal,
			COALESCE(company_ref.company_code, '') as company_code,
			COALESCE(company_ref.name, '') as company_name,
			COALESCE(base.estate, '') as estate,
			COALESCE(NULLIF(TRIM(div_ref.name), ''), COALESCE(base.divisi, '')) as divisi,
			COALESCE(NULLIF(TRIM(block_ref.name), ''), COALESCE(base.blok, '')) as blok,
			base.nik,
			base.nama,
			base.qtyp1,
			base.satp1,
			base.qtyp2,
			base.satp2,
			base.qty,
			base.satuan,
			base.jumlah
		FROM base
		LEFT JOIN LATERAL (
			SELECT bcb.company_id
			FROM bkm_company_bridge bcb
			WHERE bcb.is_active = true
			  AND UPPER(TRIM(COALESCE(bcb.source_system, 'BKM'))) = 'BKM'
			  AND NULLIF(TRIM(COALESCE(bcb.iddata_prefix, '')), '') IS NOT NULL
			  AND UPPER(TRIM(COALESCE(base.iddata, ''))) LIKE UPPER(TRIM(COALESCE(bcb.iddata_prefix, ''))) || '%%'
			  AND (
				NULLIF(TRIM(COALESCE(bcb.estate_key, '')), '') IS NULL
				OR UPPER(TRIM(COALESCE(base.estate, ''))) = UPPER(TRIM(COALESCE(bcb.estate_key, '')))
			  )
			  AND (
				NULLIF(TRIM(COALESCE(bcb.divisi_key, '')), '') IS NULL
				OR UPPER(TRIM(COALESCE(base.divisi, ''))) = UPPER(TRIM(COALESCE(bcb.divisi_key, '')))
			  )
			ORDER BY
				LENGTH(TRIM(COALESCE(bcb.iddata_prefix, ''))) DESC,
				COALESCE(bcb.priority, 100) ASC,
				bcb.updated_at DESC NULLS LAST,
				bcb.id
			LIMIT 1
		) bridge_company ON true
		LEFT JOIN LATERAL (
			SELECT c.id, c.company_code, c.name
			FROM companies c
			WHERE (
				bridge_company.company_id IS NOT NULL
				AND c.id = bridge_company.company_id
			) OR (
				bridge_company.company_id IS NULL
				AND NULLIF(TRIM(COALESCE(c.company_code, '')), '') IS NOT NULL
				AND (
					UPPER(TRIM(COALESCE(base.iddata, ''))) LIKE UPPER(TRIM(COALESCE(c.company_code, ''))) || '%%'
					OR UPPER(TRIM(COALESCE(c.company_code, ''))) = UPPER(LEFT(TRIM(COALESCE(base.iddata, '')), 3))
				)
			)
			ORDER BY
				CASE
					WHEN bridge_company.company_id IS NOT NULL AND c.id = bridge_company.company_id THEN 0
					WHEN UPPER(TRIM(COALESCE(base.iddata, ''))) LIKE UPPER(TRIM(COALESCE(c.company_code, ''))) || '%%' THEN 1
					WHEN UPPER(TRIM(COALESCE(c.company_code, ''))) = UPPER(LEFT(TRIM(COALESCE(base.iddata, '')), 3)) THEN 2
					ELSE 3
				END,
				LENGTH(TRIM(COALESCE(c.company_code, ''))) DESC,
				c.id
			LIMIT 1
		) company_ref ON true
		LEFT JOIN LATERAL (
			SELECT dv.id, dv.name
			FROM divisions dv
			WHERE UPPER(TRIM(COALESCE(dv.code, ''))) = UPPER(TRIM(COALESCE(base.divisi, '')))
			ORDER BY dv.id
			LIMIT 1
		) div_ref ON true
		LEFT JOIN LATERAL (
			SELECT b.name
			FROM blocks b
			LEFT JOIN divisions bd ON bd.id = b.division_id
			WHERE UPPER(TRIM(COALESCE(b.block_code, ''))) = UPPER(TRIM(COALESCE(base.blok, '')))
			  AND (
				div_ref.id IS NULL
				OR b.division_id = div_ref.id
				OR UPPER(TRIM(COALESCE(bd.code, ''))) = UPPER(TRIM(COALESCE(base.divisi, '')))
			  )
			ORDER BY b.id
			LIMIT 1
		) block_ref ON true
		ORDER BY base.estate, base.divisi, base.blok, base.tanggal
	`, whereClause)

		// Append limit/offset args
		paginatedArgs := append(args, limit, offset)

		rows, err := s.db.WithContext(ctx).Raw(dataQuery, paginatedArgs...).Rows()
		if err != nil {
			return nil, fmt.Errorf("data query failed: %w", err)
		}
		defer rows.Close()

		for rows.Next() {
			var item bkm.BkmPotongBuahFlatItem
			if err := rows.Scan(
				&item.Tanggal,
				&item.CompanyCode,
				&item.CompanyName,
				&item.Estate,
				&item.Divisi,
				&item.Blok,
				&item.NIK,
				&item.Nama,
				&item.QtyP1,
				&item.SatP1,
				&item.QtyP2,
				&item.SatP2,
				&item.Qty,
				&item.Satuan,
				&item.Jumlah,
			); err != nil {
				return nil, fmt.Errorf("scan item failed: %w", err)
			}
			items = append(items, &item)
		}

		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("iterate rows failed: %w", err)
		}
	}

	// Calculate BGM & Output/HK.
	// TotalHk logic: approximating by total records for now as we don't have HK column explicitly.
	totalCount := aggregate.TotalCount
	totalRecords := int32(totalCount)
	totalQty := aggregate.TotalQty
	totalJumlah := aggregate.TotalJumlah
	var bgm, outputPerHk float64
	if totalQty > 0 { // avoid division by zero
		// BJR/BGM logic depends on what Qty represents. Accessing if Qty is Janjang or Kg?
		// Potong Buah: P1 usually Janjang, P2 Kg? Or Qty is Result?
		// If Qty is Kg, and we have Bunches count...
		// Let's leave BGM 0 if we can't be sure on generic logic.
		// Or try to sum QtyP1 if SatP1 is 'JJG'
	}
	if totalRecords > 0 {
		outputPerHk = totalQty / float64(totalRecords)
	}

	response := &bkm.BkmPotongBuahFlatResponse{
		Data:  items,
		Total: int32(totalCount),
		Summary: &bkm.BkmPotongBuahKPI{
			TotalQty:    totalQty,
			TotalJumlah: totalJumlah,
			TotalHk:     totalRecords,
			Bgm:         bgm,
			OutputPerHk: outputPerHk,
		},
	}

	return response, nil
}

// GetPotongBuahAnalytics returns aggregated analytics data for dashboard usage.
func (s *BkmReportService) GetPotongBuahAnalytics(ctx context.Context, filter *bkm.BkmPotongBuahFilter, topN int32) (*bkm.BkmPotongBuahAnalytics, error) {
	conditions, args, err := s.buildReportConditions(ctx, filter)
	if err != nil {
		return nil, err
	}

	whereClause := strings.Join(conditions, " AND ")
	if topN <= 0 {
		topN = 10
	}
	if topN > 200 {
		topN = 200
	}

	analytics := &bkm.BkmPotongBuahAnalytics{
		Summary:    &bkm.BkmPotongBuahKPI{},
		Daily:      make([]*bkm.BkmPotongBuahDailyPoint, 0),
		Companies:  make([]*bkm.BkmPotongBuahOutputPoint, 0),
		Estates:    make([]*bkm.BkmPotongBuahOutputPoint, 0),
		Divisions:  make([]*bkm.BkmPotongBuahOutputPoint, 0),
		Blocks:     make([]*bkm.BkmPotongBuahOutputPoint, 0),
		Harvesters: make([]*bkm.BkmPotongBuahHarvesterPoint, 0),
	}

	var aggregate struct {
		TotalCount  int64   `gorm:"column:total_count"`
		TotalQty    float64 `gorm:"column:total_qty"`
		TotalJumlah float64 `gorm:"column:total_jumlah"`
	}

	aggregateQuery := fmt.Sprintf(`
		SELECT
			COUNT(*) AS total_count,
			COALESCE(SUM(d.qtyp2), 0) AS total_qty,
			COALESCE(SUM(d.jumlah), 0) AS total_jumlah
		FROM ais_bkmmaster m
		JOIN ais_bkmdetail d ON m.masterid = d.masterid
		WHERE %s
	`, whereClause)

	if err := s.db.WithContext(ctx).Raw(aggregateQuery, args...).Scan(&aggregate).Error; err != nil {
		return nil, fmt.Errorf("analytics aggregate query failed: %w", err)
	}

	totalRecords := int32(aggregate.TotalCount)
	analytics.TotalRecords = totalRecords
	analytics.Summary.TotalQty = aggregate.TotalQty
	analytics.Summary.TotalJumlah = aggregate.TotalJumlah
	analytics.Summary.TotalHk = totalRecords
	analytics.Summary.Bgm = 0
	if totalRecords > 0 {
		analytics.Summary.OutputPerHk = aggregate.TotalQty / float64(totalRecords)
	}

	var dailyRows []struct {
		Date        string  `gorm:"column:date"`
		OutputQty   float64 `gorm:"column:output_qty"`
		TotalJumlah float64 `gorm:"column:total_jumlah"`
		WorkerCount int64   `gorm:"column:worker_count"`
	}

	dailyQuery := fmt.Sprintf(`
		SELECT
			COALESCE(CAST(m.tanggal AS TEXT), '') AS date,
			COALESCE(SUM(d.qtyp2), 0) AS output_qty,
			COALESCE(SUM(d.jumlah), 0) AS total_jumlah,
			COUNT(DISTINCT COALESCE(NULLIF(TRIM(COALESCE(CAST(d.nik AS TEXT), '')), ''), 'UNKNOWN')) AS worker_count
		FROM ais_bkmmaster m
		JOIN ais_bkmdetail d ON m.masterid = d.masterid
		WHERE %s
		GROUP BY COALESCE(CAST(m.tanggal AS TEXT), '')
		ORDER BY COALESCE(CAST(m.tanggal AS TEXT), '')
	`, whereClause)

	if err := s.db.WithContext(ctx).Raw(dailyQuery, args...).Scan(&dailyRows).Error; err != nil {
		return nil, fmt.Errorf("analytics daily query failed: %w", err)
	}
	for _, row := range dailyRows {
		analytics.Daily = append(analytics.Daily, &bkm.BkmPotongBuahDailyPoint{
			Date:        row.Date,
			OutputQty:   row.OutputQty,
			TotalJumlah: row.TotalJumlah,
			WorkerCount: int32(row.WorkerCount),
		})
	}

	var companyRows []struct {
		Name      string  `gorm:"column:name"`
		OutputQty float64 `gorm:"column:output_qty"`
	}

	companyQuery := fmt.Sprintf(`
		SELECT
			COALESCE(NULLIF(TRIM(COALESCE(c.name, c.company_code, '')), ''), 'Unknown') AS name,
			COALESCE(SUM(d.qtyp2), 0) AS output_qty
		FROM ais_bkmmaster m
		JOIN ais_bkmdetail d ON m.masterid = d.masterid
		LEFT JOIN LATERAL (
			SELECT e.company_id
			FROM estates e
			WHERE UPPER(TRIM(COALESCE(e.code, ''))) = UPPER(TRIM(COALESCE(CAST(m.estate AS TEXT), '')))
			   OR UPPER(TRIM(COALESCE(e.name, ''))) = UPPER(TRIM(COALESCE(CAST(m.estate AS TEXT), '')))
			ORDER BY e.id
			LIMIT 1
		) estate_ref ON true
		LEFT JOIN companies c ON c.id = estate_ref.company_id
		WHERE %s
		GROUP BY COALESCE(NULLIF(TRIM(COALESCE(c.name, c.company_code, '')), ''), 'Unknown')
		ORDER BY output_qty DESC
	`, whereClause)

	if err := s.db.WithContext(ctx).Raw(companyQuery, args...).Scan(&companyRows).Error; err != nil {
		return nil, fmt.Errorf("analytics company query failed: %w", err)
	}
	for _, row := range companyRows {
		analytics.Companies = append(analytics.Companies, &bkm.BkmPotongBuahOutputPoint{
			Name:      row.Name,
			OutputQty: row.OutputQty,
		})
	}

	var estateRows []struct {
		Name      string  `gorm:"column:name"`
		OutputQty float64 `gorm:"column:output_qty"`
	}

	estateQuery := fmt.Sprintf(`
		SELECT
			COALESCE(NULLIF(TRIM(COALESCE(CAST(m.estate AS TEXT), '')), ''), 'Unknown') AS name,
			COALESCE(SUM(d.qtyp2), 0) AS output_qty
		FROM ais_bkmmaster m
		JOIN ais_bkmdetail d ON m.masterid = d.masterid
		WHERE %s
		GROUP BY COALESCE(NULLIF(TRIM(COALESCE(CAST(m.estate AS TEXT), '')), ''), 'Unknown')
		ORDER BY output_qty DESC
	`, whereClause)

	if err := s.db.WithContext(ctx).Raw(estateQuery, args...).Scan(&estateRows).Error; err != nil {
		return nil, fmt.Errorf("analytics estate query failed: %w", err)
	}
	for _, row := range estateRows {
		analytics.Estates = append(analytics.Estates, &bkm.BkmPotongBuahOutputPoint{
			Name:      row.Name,
			OutputQty: row.OutputQty,
		})
	}

	var divisionRows []struct {
		Name      string  `gorm:"column:name"`
		OutputQty float64 `gorm:"column:output_qty"`
	}

	divisionQuery := fmt.Sprintf(`
		SELECT
			COALESCE(NULLIF(TRIM(COALESCE(CAST(m.estate AS TEXT), '')), ''), 'Unknown')
				|| ' - ' ||
			COALESCE(NULLIF(TRIM(COALESCE(CAST(m.divisi AS TEXT), '')), ''), 'Unknown') AS name,
			COALESCE(SUM(d.qtyp2), 0) AS output_qty
		FROM ais_bkmmaster m
		JOIN ais_bkmdetail d ON m.masterid = d.masterid
		WHERE %s
		GROUP BY
			COALESCE(NULLIF(TRIM(COALESCE(CAST(m.estate AS TEXT), '')), ''), 'Unknown'),
			COALESCE(NULLIF(TRIM(COALESCE(CAST(m.divisi AS TEXT), '')), ''), 'Unknown')
		ORDER BY output_qty DESC
	`, whereClause)

	if err := s.db.WithContext(ctx).Raw(divisionQuery, args...).Scan(&divisionRows).Error; err != nil {
		return nil, fmt.Errorf("analytics division query failed: %w", err)
	}
	for _, row := range divisionRows {
		analytics.Divisions = append(analytics.Divisions, &bkm.BkmPotongBuahOutputPoint{
			Name:      row.Name,
			OutputQty: row.OutputQty,
		})
	}

	var blockRows []struct {
		Name      string  `gorm:"column:name"`
		OutputQty float64 `gorm:"column:output_qty"`
	}

	blockQuery := fmt.Sprintf(`
		SELECT
			COALESCE(NULLIF(TRIM(COALESCE(CAST(d.blok AS TEXT), '')), ''), 'Unknown')
				|| ' (' ||
			COALESCE(NULLIF(TRIM(COALESCE(CAST(m.divisi AS TEXT), '')), ''), 'Unknown')
				|| ')' AS name,
			COALESCE(SUM(d.qtyp2), 0) AS output_qty
		FROM ais_bkmmaster m
		JOIN ais_bkmdetail d ON m.masterid = d.masterid
		WHERE %s
		GROUP BY
			COALESCE(NULLIF(TRIM(COALESCE(CAST(d.blok AS TEXT), '')), ''), 'Unknown'),
			COALESCE(NULLIF(TRIM(COALESCE(CAST(m.divisi AS TEXT), '')), ''), 'Unknown')
		ORDER BY output_qty DESC
		LIMIT ?
	`, whereClause)

	blockArgs := append(args, topN)
	if err := s.db.WithContext(ctx).Raw(blockQuery, blockArgs...).Scan(&blockRows).Error; err != nil {
		return nil, fmt.Errorf("analytics block query failed: %w", err)
	}
	for _, row := range blockRows {
		analytics.Blocks = append(analytics.Blocks, &bkm.BkmPotongBuahOutputPoint{
			Name:      row.Name,
			OutputQty: row.OutputQty,
		})
	}

	var harvesterRows []struct {
		NIK       string  `gorm:"column:nik"`
		Name      string  `gorm:"column:name"`
		OutputQty float64 `gorm:"column:output_qty"`
	}

	harvesterQuery := fmt.Sprintf(`
		SELECT
			COALESCE(NULLIF(TRIM(COALESCE(CAST(d.nik AS TEXT), '')), ''), 'Unknown') AS nik,
			COALESCE(NULLIF(TRIM(MAX(COALESCE(CAST(d.nama AS TEXT), ''))), ''), 'Unknown') AS name,
			COALESCE(SUM(d.qtyp2), 0) AS output_qty
		FROM ais_bkmmaster m
		JOIN ais_bkmdetail d ON m.masterid = d.masterid
		WHERE %s
		GROUP BY COALESCE(NULLIF(TRIM(COALESCE(CAST(d.nik AS TEXT), '')), ''), 'Unknown')
		ORDER BY output_qty DESC
		LIMIT ?
	`, whereClause)

	harvesterArgs := append(args, topN)
	if err := s.db.WithContext(ctx).Raw(harvesterQuery, harvesterArgs...).Scan(&harvesterRows).Error; err != nil {
		return nil, fmt.Errorf("analytics harvester query failed: %w", err)
	}
	for _, row := range harvesterRows {
		analytics.Harvesters = append(analytics.Harvesters, &bkm.BkmPotongBuahHarvesterPoint{
			NIK:       row.NIK,
			Name:      row.Name,
			OutputQty: row.OutputQty,
		})
	}

	return analytics, nil
}
