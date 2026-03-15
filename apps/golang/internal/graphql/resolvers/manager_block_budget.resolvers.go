package resolvers

import (
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/generated"
	"agrinovagraphql/server/internal/middleware"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type managerBlockProductionBudgetWrite struct {
	ID             string    `gorm:"column:id"`
	BlockID        string    `gorm:"column:block_id"`
	PeriodMonth    string    `gorm:"column:period_month"`
	TargetTon      float64   `gorm:"column:target_ton"`
	PlannedCost    float64   `gorm:"column:planned_cost"`
	ActualCost     float64   `gorm:"column:actual_cost"`
	WorkflowStatus string    `gorm:"column:workflow_status"`
	Notes          *string   `gorm:"column:notes"`
	CreatedBy      string    `gorm:"column:created_by"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (managerBlockProductionBudgetWrite) TableName() string {
	return "manager_block_production_budgets"
}

type managerBlockProductionBudgetRead struct {
	ID             string    `gorm:"column:id"`
	BlockID        string    `gorm:"column:block_id"`
	BlockCode      string    `gorm:"column:block_code"`
	BlockName      string    `gorm:"column:block_name"`
	DivisionID     string    `gorm:"column:division_id"`
	DivisionName   string    `gorm:"column:division_name"`
	EstateID       string    `gorm:"column:estate_id"`
	EstateName     string    `gorm:"column:estate_name"`
	PeriodMonth    string    `gorm:"column:period_month"`
	TargetTon      float64   `gorm:"column:target_ton"`
	PlannedCost    float64   `gorm:"column:planned_cost"`
	ActualCost     float64   `gorm:"column:actual_cost"`
	WorkflowStatus string    `gorm:"column:workflow_status"`
	Notes          *string   `gorm:"column:notes"`
	CreatedByID    string    `gorm:"column:created_by_id"`
	CreatedByName  string    `gorm:"column:created_by_name"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

type managerBlockOptionRead struct {
	ID           string `gorm:"column:id"`
	BlockCode    string `gorm:"column:block_code"`
	Name         string `gorm:"column:name"`
	DivisionID   string `gorm:"column:division_id"`
	DivisionName string `gorm:"column:division_name"`
	EstateID     string `gorm:"column:estate_id"`
	EstateName   string `gorm:"column:estate_name"`
}

type managerDivisionBudgetLimitRead struct {
	DivisionID       string  `gorm:"column:division_id"`
	PeriodMonth      string  `gorm:"column:period_month"`
	PlannedCost      float64 `gorm:"column:planned_cost"`
	WorkflowStatus   string  `gorm:"column:workflow_status"`
	OverrideApproved bool    `gorm:"column:override_approved"`
}

func (r *Resolver) managerBlockBudgetScopedQuery(ctx context.Context, userID string, role auth.UserRole) *gorm.DB {
	base := r.db.WithContext(ctx).
		Table("manager_block_production_budgets mb").
		Select(`
			mb.id,
			mb.block_id,
			COALESCE(NULLIF(bl.block_code, ''), '-') AS block_code,
			COALESCE(NULLIF(bl.name, ''), '-') AS block_name,
			d.id AS division_id,
			d.name AS division_name,
			d.estate_id,
			e.name AS estate_name,
			mb.period_month,
			mb.target_ton,
			mb.planned_cost,
			mb.actual_cost,
			mb.workflow_status,
			mb.notes,
			mb.created_by::text AS created_by_id,
			COALESCE(NULLIF(u.name, ''), u.username, '-') AS created_by_name,
			mb.created_at,
			mb.updated_at
		`).
		Joins("JOIN blocks bl ON bl.id = mb.block_id").
		Joins("JOIN divisions d ON d.id = bl.division_id").
		Joins("JOIN estates e ON e.id = d.estate_id").
		Joins("LEFT JOIN users u ON u.id = mb.created_by")

	return r.applyManagerDivisionScope(base, userID, role)
}

func (r *Resolver) managerCanAccessBlock(ctx context.Context, userID, blockID string, role auth.UserRole) (bool, error) {
	var count int64
	base := r.db.WithContext(ctx).
		Table("blocks bl").
		Joins("JOIN divisions d ON d.id = bl.division_id").
		Joins("JOIN estates e ON e.id = d.estate_id").
		Where("bl.id = ?", blockID)

	err := r.applyManagerDivisionScope(base, userID, role).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *Resolver) managerBlockBudgetDuplicateExists(
	ctx context.Context,
	blockID string,
	periodMonth string,
	excludeID *string,
) (bool, error) {
	query := r.db.WithContext(ctx).
		Table("manager_block_production_budgets").
		Where("block_id = ? AND period_month = ?", blockID, periodMonth)

	if excludeID != nil && strings.TrimSpace(*excludeID) != "" {
		query = query.Where("id <> ?", *excludeID)
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *Resolver) managerBlockBudgetByID(ctx context.Context, userID, budgetID string) (*managerBlockProductionBudgetRead, error) {
	role := middleware.GetUserRoleFromContext(ctx)
	var row managerBlockProductionBudgetRead
	err := r.managerBlockBudgetScopedQuery(ctx, userID, role).
		Where("mb.id = ?", budgetID).
		Take(&row).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("budget blok tidak ditemukan atau tidak dalam scope manager")
		}
		return nil, err
	}
	return &row, nil
}

func convertManagerBlockBudgetToGraphQL(row *managerBlockProductionBudgetRead) *generated.ManagerBlockProductionBudget {
	if row == nil {
		return nil
	}
	createdBy := row.CreatedByName
	if strings.TrimSpace(createdBy) == "" {
		createdBy = "-"
	}

	return &generated.ManagerBlockProductionBudget{
		ID:             row.ID,
		BlockID:        row.BlockID,
		BlockCode:      row.BlockCode,
		BlockName:      row.BlockName,
		DivisionID:     row.DivisionID,
		DivisionName:   row.DivisionName,
		EstateID:       row.EstateID,
		EstateName:     row.EstateName,
		Period:         row.PeriodMonth,
		TargetTon:      row.TargetTon,
		PlannedCost:    row.PlannedCost,
		ActualCost:     row.ActualCost,
		WorkflowStatus: toManagerBudgetWorkflowStatus(row.WorkflowStatus),
		Notes:          row.Notes,
		CreatedByID:    row.CreatedByID,
		CreatedBy:      createdBy,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}

func isManagerBlockBudgetUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	normalized := strings.ToLower(err.Error())
	return strings.Contains(normalized, "uq_mbpb_block_period") ||
		strings.Contains(normalized, "duplicate key value")
}

func isManagerBlockBudgetDraft(workflowStatus string) bool {
	return strings.TrimSpace(workflowStatus) == string(generated.ManagerBudgetWorkflowStatusDraft)
}

func isManagerBlockBudgetFieldRole(role auth.UserRole) bool {
	return role == auth.UserRoleAsisten || role == auth.UserRoleMandor
}

func enforceManagerBlockBudgetFieldOwnership(existing *managerBlockProductionBudgetRead, userID string) error {
	if existing == nil {
		return fmt.Errorf("budget blok tidak ditemukan")
	}
	if strings.TrimSpace(existing.CreatedByID) != strings.TrimSpace(userID) {
		return fmt.Errorf("hanya draft milik sendiri yang boleh diubah")
	}
	if !isManagerBlockBudgetDraft(existing.WorkflowStatus) {
		return fmt.Errorf("hanya draft yang bisa diubah oleh role lapangan")
	}
	return nil
}

func (r *Resolver) managerDivisionBudgetLimitByBlockPeriod(
	ctx context.Context,
	userID string,
	role auth.UserRole,
	blockID string,
	periodMonth string,
) (*managerDivisionBudgetLimitRead, error) {
	var row managerDivisionBudgetLimitRead
	query := r.db.WithContext(ctx).
		Table("manager_division_production_budgets b").
		Select(`
			b.division_id,
			b.period_month,
			b.planned_cost,
			b.workflow_status,
			b.override_approved
		`).
		Joins("JOIN blocks bl ON bl.division_id = b.division_id").
		Joins("JOIN divisions d ON d.id = b.division_id").
		Joins("JOIN estates e ON e.id = d.estate_id").
		Where("bl.id = ? AND b.period_month = ?", blockID, periodMonth)

	if err := r.applyManagerDivisionScope(query, userID, role).Take(&row).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return &row, nil
}

func (r *Resolver) managerDivisionRollupPlannedCost(
	ctx context.Context,
	divisionID string,
	periodMonth string,
	excludeBudgetID *string,
) (float64, error) {
	query := r.db.WithContext(ctx).
		Table("manager_block_production_budgets mb").
		Joins("JOIN blocks bl ON bl.id = mb.block_id").
		Where(
			"bl.division_id = ? AND mb.period_month = ? AND mb.workflow_status <> ?",
			divisionID,
			periodMonth,
			string(generated.ManagerBudgetWorkflowStatusDraft),
		)

	if excludeBudgetID != nil && strings.TrimSpace(*excludeBudgetID) != "" {
		query = query.Where("mb.id <> ?", *excludeBudgetID)
	}

	var total float64
	if err := query.Select("COALESCE(SUM(mb.planned_cost), 0)").Scan(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

func (r *Resolver) enforceManagerBlockBudgetDivisionLimit(
	ctx context.Context,
	userID string,
	role auth.UserRole,
	blockID string,
	periodMonth string,
	nextPlannedCost float64,
	excludeBudgetID *string,
) error {
	divisionBudget, err := r.managerDivisionBudgetLimitByBlockPeriod(ctx, userID, role, blockID, periodMonth)
	if err != nil {
		return fmt.Errorf("failed to load division budget limit: %w", err)
	}
	if divisionBudget == nil {
		return fmt.Errorf("pagu divisi untuk periode %s belum diset", periodMonth)
	}

	currentRollup, err := r.managerDivisionRollupPlannedCost(ctx, divisionBudget.DivisionID, periodMonth, excludeBudgetID)
	if err != nil {
		return fmt.Errorf("failed to calculate division rollup planned cost: %w", err)
	}

	nextRollup := currentRollup + nextPlannedCost
	if nextRollup <= divisionBudget.PlannedCost {
		return nil
	}

	workflowStatus := strings.TrimSpace(divisionBudget.WorkflowStatus)
	overrideAllowed := workflowStatus == string(generated.ManagerBudgetWorkflowStatusApproved) && divisionBudget.OverrideApproved
	if overrideAllowed {
		return nil
	}

	return fmt.Errorf(
		"rollup budget blok (%0.2f) melebihi pagu divisi (%0.2f). butuh APPROVED + override pada budget divisi",
		nextRollup,
		divisionBudget.PlannedCost,
	)
}

// ManagerBlockProductionBudgets is the resolver for the managerBlockProductionBudgets field.
func (r *queryResolver) ManagerBlockProductionBudgets(ctx context.Context, blockID *string, divisionID *string, period *string) ([]*generated.ManagerBlockProductionBudget, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}
	role := middleware.GetUserRoleFromContext(ctx)

	query := r.managerBlockBudgetScopedQuery(ctx, userID, role)

	if divisionID != nil && strings.TrimSpace(*divisionID) != "" {
		targetDivisionID := strings.TrimSpace(*divisionID)
		canAccessDivision, err := r.managerCanAccessDivision(ctx, userID, targetDivisionID, role)
		if err != nil {
			return nil, fmt.Errorf("failed to validate division scope: %w", err)
		}
		if !canAccessDivision {
			return nil, fmt.Errorf("access denied to selected division")
		}
		query = query.Where("bl.division_id = ?", targetDivisionID)
	}

	if blockID != nil && strings.TrimSpace(*blockID) != "" {
		targetBlockID := strings.TrimSpace(*blockID)
		canAccessBlock, err := r.managerCanAccessBlock(ctx, userID, targetBlockID, role)
		if err != nil {
			return nil, fmt.Errorf("failed to validate block scope: %w", err)
		}
		if !canAccessBlock {
			return nil, fmt.Errorf("access denied to selected block")
		}
		query = query.Where("mb.block_id = ?", targetBlockID)
	}

	if period != nil && strings.TrimSpace(*period) != "" {
		periodMonth, err := normalizeManagerBudgetPeriod(*period)
		if err != nil {
			return nil, err
		}
		query = query.Where("mb.period_month = ?", periodMonth)
	}

	var rows []*managerBlockProductionBudgetRead
	if err := query.
		Order("mb.period_month DESC, mb.updated_at DESC").
		Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to load manager block budgets: %w", err)
	}

	result := make([]*generated.ManagerBlockProductionBudget, 0, len(rows))
	for _, row := range rows {
		result = append(result, convertManagerBlockBudgetToGraphQL(row))
	}

	return result, nil
}

// ManagerBlockOptions is the resolver for the managerBlockOptions field.
func (r *queryResolver) ManagerBlockOptions(ctx context.Context, divisionID *string) ([]*generated.ManagerBlockOption, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}
	role := middleware.GetUserRoleFromContext(ctx)

	base := r.db.WithContext(ctx).
		Table("blocks bl").
		Select(`
			bl.id,
			COALESCE(NULLIF(bl.block_code, ''), '-') AS block_code,
			COALESCE(NULLIF(bl.name, ''), '-') AS name,
			d.id AS division_id,
			d.name AS division_name,
			d.estate_id,
			e.name AS estate_name
		`).
		Joins("JOIN divisions d ON d.id = bl.division_id").
		Joins("JOIN estates e ON e.id = d.estate_id")

	scoped := r.applyManagerDivisionScope(base, userID, role)

	if divisionID != nil && strings.TrimSpace(*divisionID) != "" {
		targetDivisionID := strings.TrimSpace(*divisionID)
		canAccessDivision, err := r.managerCanAccessDivision(ctx, userID, targetDivisionID, role)
		if err != nil {
			return nil, fmt.Errorf("failed to validate division scope: %w", err)
		}
		if !canAccessDivision {
			return nil, fmt.Errorf("access denied to selected division")
		}
		scoped = scoped.Where("bl.division_id = ?", targetDivisionID)
	}

	var rows []*managerBlockOptionRead
	if err := scoped.
		Order("e.name ASC, d.name ASC, bl.block_code ASC, bl.name ASC").
		Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("failed to load manager block options: %w", err)
	}

	result := make([]*generated.ManagerBlockOption, 0, len(rows))
	for _, row := range rows {
		if row == nil || strings.TrimSpace(row.ID) == "" {
			continue
		}

		result = append(result, &generated.ManagerBlockOption{
			ID:           row.ID,
			BlockCode:    row.BlockCode,
			Name:         row.Name,
			DivisionID:   row.DivisionID,
			DivisionName: row.DivisionName,
			EstateID:     row.EstateID,
			EstateName:   row.EstateName,
		})
	}

	return result, nil
}

// CreateManagerBlockProductionBudget is the resolver for the createManagerBlockProductionBudget field.
func (r *mutationResolver) CreateManagerBlockProductionBudget(ctx context.Context, input generated.CreateManagerBlockProductionBudgetInput) (*generated.ManagerBlockProductionBudget, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}
	role := middleware.GetUserRoleFromContext(ctx)

	blockID := strings.TrimSpace(input.BlockID)
	if blockID == "" {
		return nil, fmt.Errorf("blockId wajib diisi")
	}
	periodMonth, err := normalizeManagerBudgetPeriod(input.Period)
	if err != nil {
		return nil, err
	}
	if input.TargetTon <= 0 {
		return nil, fmt.Errorf("targetTon harus lebih dari 0")
	}
	if input.PlannedCost <= 0 {
		return nil, fmt.Errorf("plannedCost harus lebih dari 0")
	}

	actualCost := 0.0
	if input.ActualCost != nil {
		actualCost = *input.ActualCost
	}
	if actualCost < 0 {
		return nil, fmt.Errorf("actualCost tidak boleh negatif")
	}

	workflowStatus, err := normalizeManagerBudgetWorkflowStatus(input.WorkflowStatus)
	if err != nil {
		return nil, err
	}
	if isManagerBlockBudgetFieldRole(role) {
		workflowStatus = string(generated.ManagerBudgetWorkflowStatusDraft)
	}

	canAccess, err := r.managerCanAccessBlock(ctx, userID, blockID, role)
	if err != nil {
		return nil, fmt.Errorf("failed to validate block scope: %w", err)
	}
	if !canAccess {
		return nil, fmt.Errorf("access denied to selected block")
	}

	duplicateExists, err := r.managerBlockBudgetDuplicateExists(ctx, blockID, periodMonth, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to validate duplicate budget: %w", err)
	}
	if duplicateExists {
		return nil, fmt.Errorf("budget untuk blok dan periode tersebut sudah ada")
	}
	if !isManagerBlockBudgetDraft(workflowStatus) {
		if err := r.enforceManagerBlockBudgetDivisionLimit(ctx, userID, role, blockID, periodMonth, input.PlannedCost, nil); err != nil {
			return nil, err
		}
	}

	now := time.Now()
	record := &managerBlockProductionBudgetWrite{
		ID:             uuid.NewString(),
		BlockID:        blockID,
		PeriodMonth:    periodMonth,
		TargetTon:      input.TargetTon,
		PlannedCost:    input.PlannedCost,
		ActualCost:     actualCost,
		WorkflowStatus: workflowStatus,
		Notes:          normalizeManagerBudgetNotes(input.Notes),
		CreatedBy:      userID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := r.db.WithContext(ctx).Table(record.TableName()).Create(record).Error; err != nil {
		if isManagerBlockBudgetUniqueViolation(err) {
			return nil, fmt.Errorf("budget untuk blok dan periode tersebut sudah ada")
		}
		return nil, fmt.Errorf("failed to create manager block budget: %w", err)
	}

	created, err := r.managerBlockBudgetByID(ctx, userID, record.ID)
	if err != nil {
		return nil, fmt.Errorf("budget blok tersimpan tetapi gagal dimuat ulang: %w", err)
	}

	return convertManagerBlockBudgetToGraphQL(created), nil
}

// UpdateManagerBlockProductionBudget is the resolver for the updateManagerBlockProductionBudget field.
func (r *mutationResolver) UpdateManagerBlockProductionBudget(ctx context.Context, input generated.UpdateManagerBlockProductionBudgetInput) (*generated.ManagerBlockProductionBudget, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return nil, fmt.Errorf("authentication required")
	}
	role := middleware.GetUserRoleFromContext(ctx)

	budgetID := strings.TrimSpace(input.ID)
	if budgetID == "" {
		return nil, fmt.Errorf("id budget wajib diisi")
	}

	existing, err := r.managerBlockBudgetByID(ctx, userID, budgetID)
	if err != nil {
		return nil, err
	}
	if isManagerBlockBudgetFieldRole(role) {
		if err := enforceManagerBlockBudgetFieldOwnership(existing, userID); err != nil {
			return nil, err
		}
	}

	nextBlockID := existing.BlockID
	if input.BlockID != nil && strings.TrimSpace(*input.BlockID) != "" {
		nextBlockID = strings.TrimSpace(*input.BlockID)
	}

	nextPeriod := existing.PeriodMonth
	if input.Period != nil {
		nextPeriod, err = normalizeManagerBudgetPeriod(*input.Period)
		if err != nil {
			return nil, err
		}
	}

	nextTargetTon := existing.TargetTon
	if input.TargetTon != nil {
		nextTargetTon = *input.TargetTon
	}
	if nextTargetTon <= 0 {
		return nil, fmt.Errorf("targetTon harus lebih dari 0")
	}

	nextPlannedCost := existing.PlannedCost
	if input.PlannedCost != nil {
		nextPlannedCost = *input.PlannedCost
	}
	if nextPlannedCost <= 0 {
		return nil, fmt.Errorf("plannedCost harus lebih dari 0")
	}

	nextActualCost := existing.ActualCost
	if input.ActualCost != nil {
		nextActualCost = *input.ActualCost
	}
	if nextActualCost < 0 {
		return nil, fmt.Errorf("actualCost tidak boleh negatif")
	}

	nextWorkflowStatus := strings.TrimSpace(existing.WorkflowStatus)
	if input.WorkflowStatus != nil {
		nextWorkflowStatus, err = normalizeManagerBudgetWorkflowStatus(input.WorkflowStatus)
		if err != nil {
			return nil, err
		}
	}
	if isManagerBlockBudgetFieldRole(role) {
		nextWorkflowStatus = string(generated.ManagerBudgetWorkflowStatusDraft)
	}

	nextNotes := existing.Notes
	if input.Notes != nil {
		nextNotes = normalizeManagerBudgetNotes(input.Notes)
	}

	canAccess, err := r.managerCanAccessBlock(ctx, userID, nextBlockID, role)
	if err != nil {
		return nil, fmt.Errorf("failed to validate block scope: %w", err)
	}
	if !canAccess {
		return nil, fmt.Errorf("access denied to selected block")
	}

	duplicateExists, err := r.managerBlockBudgetDuplicateExists(ctx, nextBlockID, nextPeriod, &budgetID)
	if err != nil {
		return nil, fmt.Errorf("failed to validate duplicate budget: %w", err)
	}
	if duplicateExists {
		return nil, fmt.Errorf("budget untuk blok dan periode tersebut sudah ada")
	}
	if !isManagerBlockBudgetDraft(nextWorkflowStatus) {
		if err := r.enforceManagerBlockBudgetDivisionLimit(ctx, userID, role, nextBlockID, nextPeriod, nextPlannedCost, &budgetID); err != nil {
			return nil, err
		}
	}

	updates := map[string]interface{}{
		"block_id":        nextBlockID,
		"period_month":    nextPeriod,
		"target_ton":      nextTargetTon,
		"planned_cost":    nextPlannedCost,
		"actual_cost":     nextActualCost,
		"workflow_status": nextWorkflowStatus,
		"notes":           nextNotes,
		"updated_at":      time.Now(),
	}

	if err := r.db.WithContext(ctx).
		Table((&managerBlockProductionBudgetWrite{}).TableName()).
		Where("id = ?", budgetID).
		Updates(updates).Error; err != nil {
		if isManagerBlockBudgetUniqueViolation(err) {
			return nil, fmt.Errorf("budget untuk blok dan periode tersebut sudah ada")
		}
		return nil, fmt.Errorf("failed to update manager block budget: %w", err)
	}

	updated, err := r.managerBlockBudgetByID(ctx, userID, budgetID)
	if err != nil {
		return nil, fmt.Errorf("budget blok tersimpan tetapi gagal dimuat ulang: %w", err)
	}

	return convertManagerBlockBudgetToGraphQL(updated), nil
}

// DeleteManagerBlockProductionBudget is the resolver for the deleteManagerBlockProductionBudget field.
func (r *mutationResolver) DeleteManagerBlockProductionBudget(ctx context.Context, id string) (bool, error) {
	userID := middleware.GetCurrentUserID(ctx)
	if userID == "" {
		return false, fmt.Errorf("authentication required")
	}
	role := middleware.GetUserRoleFromContext(ctx)

	budgetID := strings.TrimSpace(id)
	if budgetID == "" {
		return false, fmt.Errorf("id budget wajib diisi")
	}

	existing, err := r.managerBlockBudgetByID(ctx, userID, budgetID)
	if err != nil {
		return false, err
	}
	if isManagerBlockBudgetFieldRole(role) {
		if err := enforceManagerBlockBudgetFieldOwnership(existing, userID); err != nil {
			return false, err
		}
	}

	if err := r.db.WithContext(ctx).
		Table((&managerBlockProductionBudgetWrite{}).TableName()).
		Where("id = ?", budgetID).
		Delete(&managerBlockProductionBudgetWrite{}).Error; err != nil {
		return false, fmt.Errorf("failed to delete manager block budget: %w", err)
	}

	return true, nil
}
