package resolvers

import (
	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/middleware"
	panenModels "agrinovagraphql/server/internal/panen/models"
	"context"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

func getCurrentUserScope(ctx context.Context) (string, auth.UserRole) {
	userID := strings.TrimSpace(middleware.GetCurrentUserID(ctx))
	role := middleware.GetUserRoleFromContext(ctx)
	return userID, role
}

func (r *queryResolver) buildScopedHarvestFilters(
	ctx context.Context,
	userID string,
	role auth.UserRole,
	base *panenModels.HarvestFilters,
) (*panenModels.HarvestFilters, bool, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, false, fmt.Errorf("authentication required")
	}
	if r.MasterResolver == nil || r.MasterResolver.GetMasterService() == nil {
		return nil, false, fmt.Errorf("master service unavailable")
	}

	assignments, err := r.MasterResolver.GetMasterService().GetUserAssignments(ctx, userID)
	if err != nil {
		return nil, false, fmt.Errorf("failed to load user assignments: %w", err)
	}

	companyIDs := make([]string, 0, len(assignments.Companies))
	estateIDs := make([]string, 0, len(assignments.Estates))
	divisionIDs := make([]string, 0, len(assignments.Divisions))
	companySeen := make(map[string]struct{}, len(assignments.Companies))
	estateSeen := make(map[string]struct{}, len(assignments.Estates))
	divisionSeen := make(map[string]struct{}, len(assignments.Divisions))

	for _, company := range assignments.Companies {
		companyIDs = appendUniqueHarvestScopeID(companyIDs, companySeen, company.ID)
	}
	for _, estate := range assignments.Estates {
		estateIDs = appendUniqueHarvestScopeID(estateIDs, estateSeen, estate.ID)
	}
	for _, division := range assignments.Divisions {
		divisionIDs = appendUniqueHarvestScopeID(divisionIDs, divisionSeen, division.ID)
	}

	filters := &panenModels.HarvestFilters{}
	if base != nil {
		*filters = *base
		filters.MandorIDs = append([]string(nil), base.MandorIDs...)
		filters.CompanyIDs = append([]string(nil), base.CompanyIDs...)
		filters.EstateIDs = append([]string(nil), base.EstateIDs...)
		filters.DivisionIDs = append([]string(nil), base.DivisionIDs...)
	}

	// Reset scope dimensions and set exactly one role-priority scope.
	filters.CompanyIDs = nil
	filters.EstateIDs = nil
	filters.DivisionIDs = nil

	switch role {
	case auth.UserRoleManager:
		if len(estateIDs) > 0 {
			filters.EstateIDs = estateIDs
			return filters, true, nil
		}
	case auth.UserRoleAsisten:
		if len(divisionIDs) > 0 {
			filters.DivisionIDs = divisionIDs
			return filters, true, nil
		}
	case auth.UserRoleAreaManager, auth.UserRoleCompanyAdmin:
		if len(companyIDs) > 0 {
			filters.CompanyIDs = companyIDs
			return filters, true, nil
		}
	}

	return nil, false, nil
}

func (r *queryResolver) buildHierarchyMandorScopedHarvestFilters(
	ctx context.Context,
	userID string,
	base *panenModels.HarvestFilters,
) (*panenModels.HarvestFilters, bool, error) {
	mandorIDs, err := r.getHierarchyMandorIDs(ctx, userID)
	if err != nil {
		return nil, false, err
	}
	if len(mandorIDs) == 0 {
		return nil, false, nil
	}

	filters := &panenModels.HarvestFilters{}
	if base != nil {
		*filters = *base
		filters.MandorIDs = append([]string(nil), base.MandorIDs...)
		filters.CompanyIDs = append([]string(nil), base.CompanyIDs...)
		filters.EstateIDs = append([]string(nil), base.EstateIDs...)
		filters.DivisionIDs = append([]string(nil), base.DivisionIDs...)
	}
	filters.MandorIDs = mandorIDs

	return filters, true, nil
}

func (r *queryResolver) getHierarchyMandorIDs(ctx context.Context, userID string) ([]string, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("authentication required")
	}
	if r.HierarchyService == nil {
		return nil, fmt.Errorf("hierarchy service unavailable")
	}

	queue := []string{userID}
	visited := map[string]struct{}{userID: {}}
	mandorSeen := make(map[string]struct{})
	mandorIDs := make([]string, 0)

	for len(queue) > 0 {
		currentID := queue[0]
		queue = queue[1:]

		children, err := r.HierarchyService.GetChildren(ctx, currentID)
		if err != nil {
			return nil, fmt.Errorf("failed to load hierarchy children: %w", err)
		}

		for _, child := range children {
			if child == nil {
				continue
			}

			childID := strings.TrimSpace(child.ID)
			if childID == "" {
				continue
			}

			if child.Role == auth.UserRoleMandor {
				if _, exists := mandorSeen[childID]; !exists {
					mandorSeen[childID] = struct{}{}
					mandorIDs = append(mandorIDs, childID)
				}
			}

			if _, seen := visited[childID]; seen {
				continue
			}
			visited[childID] = struct{}{}
			queue = append(queue, childID)
		}
	}

	return mandorIDs, nil
}

func (r *mutationResolver) ensureManagerCanAccessHarvest(
	ctx context.Context,
	managerID string,
	harvestID string,
) error {
	record, err := r.PanenResolver.HarvestRecordByManager(ctx, harvestID, managerID)
	if err != nil {
		var harvestErr *panenModels.HarvestError
		if errors.As(err, &harvestErr) && harvestErr.Code == panenModels.ErrHarvestNotFound {
			return fmt.Errorf("harvest record not found")
		}
		return err
	}
	if record == nil {
		return fmt.Errorf("harvest record not found")
	}

	return nil
}

func (r *queryResolver) getMandorAssignedDivisionIDs(ctx context.Context, userID string) ([]string, error) {
	var assignedDivisionIDs []string
	if err := r.db.WithContext(ctx).
		Table("user_division_assignments").
		Select("division_id").
		Where("user_id = ? AND is_active = true", userID).
		Pluck("division_id", &assignedDivisionIDs).Error; err != nil {
		return nil, fmt.Errorf("failed to get division assignments: %w", err)
	}

	return assignedDivisionIDs, nil
}

func (r *queryResolver) applyMandorDivisionScope(query *gorm.DB, assignedDivisionIDs []string, divisionID *string, column string) (*gorm.DB, error) {
	if len(assignedDivisionIDs) == 0 {
		return query.Where("1 = 0"), nil
	}

	if divisionID != nil {
		trimmedDivisionID := strings.TrimSpace(*divisionID)
		if trimmedDivisionID != "" {
			for _, assignedDivisionID := range assignedDivisionIDs {
				if assignedDivisionID == trimmedDivisionID {
					return query.Where(fmt.Sprintf("%s = ?", column), trimmedDivisionID), nil
				}
			}
			return nil, fmt.Errorf("access denied to division")
		}
	}

	return query.Where(fmt.Sprintf("%s IN ?", column), assignedDivisionIDs), nil
}
