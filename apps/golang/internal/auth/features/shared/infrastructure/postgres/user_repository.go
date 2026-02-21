package postgres

import (
	"context"

	"agrinovagraphql/server/internal/auth/features/shared/domain"

	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// UserRepository implements domain.UserRepository for PostgreSQL
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates new PostgreSQL user repository
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db.Debug()}
}

// FindByID finds user by ID
func (r *UserRepository) FindByID(ctx context.Context, id string) (*domain.User, error) {
	var user UserModel
	err := r.db.WithContext(ctx).
		Preload("Manager", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("CompanyAssignments.Company", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("EstateAssignments.Estate", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("DivisionAssignments.Division", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Where("id = ?", id).
		First(&user).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainUser(&user), nil
}

// FindByUsername finds user by username
func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*domain.User, error) {
	var user UserModel
	err := r.db.WithContext(ctx).
		Preload("Manager", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("CompanyAssignments.Company", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("EstateAssignments.Estate", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("DivisionAssignments.Division", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Where("username = ?", username).
		First(&user).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainUser(&user), nil
}

// FindByEmail finds user by email
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user UserModel
	err := r.db.WithContext(ctx).
		Preload("Manager", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("CompanyAssignments.Company", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("EstateAssignments.Estate", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("DivisionAssignments.Division", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Where("email = ?", email).
		First(&user).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainUser(&user), nil
}

// FindByIdentifier finds user by username or email
func (r *UserRepository) FindByIdentifier(ctx context.Context, identifier string) (*domain.User, error) {
	var user UserModel
	err := r.db.WithContext(ctx).
		Preload("Manager", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("CompanyAssignments.Company", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("EstateAssignments.Estate", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("DivisionAssignments.Division", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Where("(username = ? OR email = ?)", identifier, identifier).
		First(&user).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}

	return r.toDomainUser(&user), nil
}

// FindByCompany finds all users in a company
func (r *UserRepository) FindByCompany(ctx context.Context, companyID string) ([]*domain.User, error) {
	var users []UserModel
	err := r.db.WithContext(ctx).
		Preload("Manager", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("CompanyAssignments.Company", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("EstateAssignments.Estate", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("DivisionAssignments.Division", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Joins("JOIN user_company_assignments ON user_company_assignments.user_id = users.id").
		Where("user_company_assignments.company_id = ? AND user_company_assignments.is_active = true", companyID).
		Find(&users).Error

	if err != nil {
		return nil, err
	}

	domainUsers := make([]*domain.User, len(users))
	for i, user := range users {
		domainUsers[i] = r.toDomainUser(&user)
	}

	return domainUsers, nil
}

// FindByRole finds all users with a specific role
func (r *UserRepository) FindByRole(ctx context.Context, role domain.Role) ([]*domain.User, error) {
	var users []UserModel
	err := r.db.WithContext(ctx).
		Preload("Manager", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("CompanyAssignments.Company", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("EstateAssignments.Estate", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("DivisionAssignments.Division", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Where("role = ?", string(role)).
		Find(&users).Error

	if err != nil {
		return nil, err
	}

	domainUsers := make([]*domain.User, len(users))
	for i, user := range users {
		domainUsers[i] = r.toDomainUser(&user)
	}

	return domainUsers, nil
}

func (r *UserRepository) FindWithFilters(ctx context.Context, filters domain.UserFilters) ([]*domain.User, int64, error) {
	query := r.db.WithContext(ctx).Unscoped().Model(&UserModel{}).
		Preload("Manager", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("CompanyAssignments").
		Preload("CompanyAssignments.Company", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("EstateAssignments.Estate", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		Preload("DivisionAssignments.Division", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		})

	// Apply filters
	if filters.CompanyID != nil {
		query = query.Joins("JOIN user_company_assignments ON user_company_assignments.user_id = users.id").
			Where("user_company_assignments.company_id = ? AND user_company_assignments.is_active = true", *filters.CompanyID)
	}

	if filters.Role != nil {
		query = query.Where("users.role = ?", string(*filters.Role))
	}

	if filters.IsActive != nil {
		query = query.Where("users.is_active = ?", *filters.IsActive)
	}

	if filters.Search != nil {
		search := "%" + *filters.Search + "%"
		// Search only in users table profile columns.
		// Use LOWER() for case-insensitive search compatible with SQLite tests.
		query = query.Where("LOWER(users.username) LIKE LOWER(?) OR LOWER(users.name) LIKE LOWER(?) OR LOWER(users.email) LIKE LOWER(?)", search, search, search)
	}

	// Count total records
	var total int64
	// Use Select("count(DISTINCT users.id)") to get accurate count of unique users after joins
	if err := query.Session(&gorm.Session{}).Select("count(DISTINCT users.id)").Scan(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply Distinct to avoid duplicate rows in final result
	query = query.Distinct("users.*")

	// Apply sorting
	if filters.SortBy != "" {
		order := "users." + filters.SortBy
		if filters.SortDesc {
			order += " DESC"
		}
		query = query.Order(order)
	} else {
		query = query.Order("users.created_at DESC")
	}

	// Apply pagination
	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	}
	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}

	var users []UserModel
	if err := query.Find(&users).Error; err != nil {
		return nil, 0, err
	}

	domainUsers := make([]*domain.User, len(users))
	for i, user := range users {
		domainUsers[i] = r.toDomainUser(&user)
	}

	return domainUsers, total, nil
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	userModel := r.fromDomainUser(user)
	if userModel.ID == "" {
		userModel.ID = uuid.New().String()
	}

	// Ensure IDs for assignments
	for i := range userModel.CompanyAssignments {
		if userModel.CompanyAssignments[i].ID == "" {
			userModel.CompanyAssignments[i].ID = uuid.New().String()
		}
	}
	for i := range userModel.EstateAssignments {
		if userModel.EstateAssignments[i].ID == "" {
			userModel.EstateAssignments[i].ID = uuid.New().String()
		}
	}
	for i := range userModel.DivisionAssignments {
		if userModel.DivisionAssignments[i].ID == "" {
			userModel.DivisionAssignments[i].ID = uuid.New().String()
		}
	}

	if err := r.db.WithContext(ctx).Create(userModel).Error; err != nil {
		return err
	}

	// Sync back IDs to domain object
	user.ID = userModel.ID
	// Note: Updating IDs in domain assignments is complex due to splitting.
	// For now, we rely on reloading the user if needed, or simple mapping if array order preserved.

	return nil
}

// Update updates an existing user
func (r *UserRepository) Update(ctx context.Context, user *domain.User) error {
	userModel := r.fromDomainUser(user)
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Update scalar fields on users table first.
		if err := tx.Model(&UserModel{}).
			Where("id = ?", user.ID).
			Updates(map[string]interface{}{
				"username":   userModel.Username,
				"name":       userModel.Name,
				"email":      userModel.Email,
				"phone":      userModel.Phone,
				"avatar_url": userModel.AvatarURL,
				"password":   userModel.Password,
				"role":       userModel.Role,
				"is_active":  userModel.IsActive,
				"manager_id": userModel.ManagerID,
				"updated_at": userModel.UpdatedAt,
			}).Error; err != nil {
			return err
		}

		if err := upsertCompanyAssignments(tx, userModel.CompanyAssignments); err != nil {
			return err
		}
		if err := upsertEstateAssignments(tx, userModel.EstateAssignments); err != nil {
			return err
		}
		if err := upsertDivisionAssignments(tx, userModel.DivisionAssignments); err != nil {
			return err
		}
		if err := cleanupActiveDivisionAssignmentDuplicates(tx, user.ID); err != nil {
			return err
		}

		return nil
	})
}

func upsertCompanyAssignments(tx *gorm.DB, assignments []UserCompanyAssignmentModel) error {
	if len(assignments) == 0 {
		return nil
	}
	assignments = dedupeCompanyAssignmentsByUniqueKey(assignments)

	now := time.Now()
	rows := make([]map[string]interface{}, 0, len(assignments))
	for i := range assignments {
		if assignments[i].ID == "" {
			assignments[i].ID = uuid.New().String()
		}
		if assignments[i].CreatedAt.IsZero() {
			assignments[i].CreatedAt = now
		}
		if assignments[i].UpdatedAt.IsZero() {
			assignments[i].UpdatedAt = now
		}
		if assignments[i].AssignedBy == "" {
			assignments[i].AssignedBy = "00000000-0000-0000-0000-000000000000"
		}
		if assignments[i].AssignedAt.IsZero() {
			assignments[i].AssignedAt = assignments[i].CreatedAt
		}
		rows = append(rows, map[string]interface{}{
			"id":          assignments[i].ID,
			"user_id":     assignments[i].UserID,
			"company_id":  assignments[i].CompanyID,
			"is_active":   assignments[i].IsActive,
			"assigned_by": assignments[i].AssignedBy,
			"assigned_at": assignments[i].AssignedAt,
			"created_at":  assignments[i].CreatedAt,
			"updated_at":  assignments[i].UpdatedAt,
		})
	}

	conflictColumns := []clause.Column{{Name: "id"}}
	if tx.Dialector.Name() != "sqlite" {
		conflictColumns = []clause.Column{
			{Name: "user_id"},
			{Name: "company_id"},
		}
	}

	return tx.Model(&UserCompanyAssignmentModel{}).Clauses(clause.OnConflict{
		Columns: conflictColumns,
		DoUpdates: clause.AssignmentColumns([]string{
			"is_active",
			"assigned_by",
			"assigned_at",
			"updated_at",
		}),
	}).Create(rows).Error
}

func upsertEstateAssignments(tx *gorm.DB, assignments []UserEstateAssignmentModel) error {
	if len(assignments) == 0 {
		return nil
	}
	assignments = dedupeEstateAssignmentsByUniqueKey(assignments)

	now := time.Now()
	rows := make([]map[string]interface{}, 0, len(assignments))
	for i := range assignments {
		if assignments[i].ID == "" {
			assignments[i].ID = uuid.New().String()
		}
		if assignments[i].CreatedAt.IsZero() {
			assignments[i].CreatedAt = now
		}
		if assignments[i].UpdatedAt.IsZero() {
			assignments[i].UpdatedAt = now
		}
		if assignments[i].AssignedBy == "" {
			assignments[i].AssignedBy = "00000000-0000-0000-0000-000000000000"
		}
		if assignments[i].AssignedAt.IsZero() {
			assignments[i].AssignedAt = assignments[i].CreatedAt
		}
		rows = append(rows, map[string]interface{}{
			"id":          assignments[i].ID,
			"user_id":     assignments[i].UserID,
			"estate_id":   assignments[i].EstateID,
			"is_active":   assignments[i].IsActive,
			"assigned_by": assignments[i].AssignedBy,
			"assigned_at": assignments[i].AssignedAt,
			"created_at":  assignments[i].CreatedAt,
			"updated_at":  assignments[i].UpdatedAt,
		})
	}

	conflictColumns := []clause.Column{{Name: "id"}}
	if tx.Dialector.Name() != "sqlite" {
		conflictColumns = []clause.Column{
			{Name: "user_id"},
			{Name: "estate_id"},
		}
	}

	return tx.Model(&UserEstateAssignmentModel{}).Clauses(clause.OnConflict{
		Columns: conflictColumns,
		DoUpdates: clause.AssignmentColumns([]string{
			"is_active",
			"assigned_by",
			"assigned_at",
			"updated_at",
		}),
	}).Create(rows).Error
}

func upsertDivisionAssignments(tx *gorm.DB, assignments []UserDivisionAssignmentModel) error {
	if len(assignments) == 0 {
		return nil
	}
	assignments = dedupeDivisionAssignmentsByUniqueKey(assignments)

	now := time.Now()
	rows := make([]map[string]interface{}, 0, len(assignments))
	for i := range assignments {
		if assignments[i].ID == "" {
			assignments[i].ID = uuid.New().String()
		}
		if assignments[i].CreatedAt.IsZero() {
			assignments[i].CreatedAt = now
		}
		if assignments[i].UpdatedAt.IsZero() {
			assignments[i].UpdatedAt = now
		}
		if assignments[i].AssignedBy == "" {
			assignments[i].AssignedBy = "00000000-0000-0000-0000-000000000000"
		}
		if assignments[i].AssignedAt.IsZero() {
			assignments[i].AssignedAt = assignments[i].CreatedAt
		}
		rows = append(rows, map[string]interface{}{
			"id":          assignments[i].ID,
			"user_id":     assignments[i].UserID,
			"division_id": assignments[i].DivisionID,
			"is_active":   assignments[i].IsActive,
			"assigned_by": assignments[i].AssignedBy,
			"assigned_at": assignments[i].AssignedAt,
			"created_at":  assignments[i].CreatedAt,
			"updated_at":  assignments[i].UpdatedAt,
		})
	}

	conflictColumns := []clause.Column{{Name: "id"}}
	if tx.Dialector.Name() != "sqlite" {
		conflictColumns = []clause.Column{
			{Name: "user_id"},
			{Name: "division_id"},
		}
	}

	return tx.Model(&UserDivisionAssignmentModel{}).Clauses(clause.OnConflict{
		Columns: conflictColumns,
		DoUpdates: clause.AssignmentColumns([]string{
			"is_active",
			"assigned_by",
			"assigned_at",
			"updated_at",
		}),
	}).Create(rows).Error
}

func cleanupActiveDivisionAssignmentDuplicates(tx *gorm.DB, userID string) error {
	var assignments []UserDivisionAssignmentModel
	if err := tx.
		Where("user_id = ? AND is_active = ?", userID, true).
		Order("updated_at DESC, created_at DESC, id DESC").
		Find(&assignments).Error; err != nil {
		return err
	}

	seen := make(map[string]bool, len(assignments))
	now := time.Now()
	for _, assignment := range assignments {
		if !seen[assignment.DivisionID] {
			seen[assignment.DivisionID] = true
			continue
		}

		if err := tx.Model(&UserDivisionAssignmentModel{}).
			Where("id = ?", assignment.ID).
			Updates(map[string]interface{}{
				"is_active":  false,
				"updated_at": now,
			}).Error; err != nil {
			return err
		}
	}

	return nil
}

// Delete soft deletes a user
func (r *UserRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&UserModel{}).Error
}

// Helper methods to convert between domain and GORM models

func (r *UserRepository) toDomainUser(user *UserModel) *domain.User {
	domainUser := &domain.User{
		ID:        user.ID,
		Username:  user.Username,
		Name:      user.Name,
		Email:     user.Email,
		Phone:     user.Phone,
		Avatar:    user.AvatarURL,
		Password:  user.Password,
		Role:      domain.Role(user.Role),
		IsActive:  user.IsActive,
		ManagerID: user.ManagerID,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}

	// Map direct manager relation so mobile profile can display immediate superior.
	if user.Manager != nil {
		domainUser.Manager = &domain.User{
			ID:        user.Manager.ID,
			Username:  user.Manager.Username,
			Name:      user.Manager.Name,
			Email:     user.Manager.Email,
			Phone:     user.Manager.Phone,
			Avatar:    user.Manager.AvatarURL,
			Role:      domain.Role(user.Manager.Role),
			IsActive:  user.Manager.IsActive,
			ManagerID: user.Manager.ManagerID,
			CreatedAt: user.Manager.CreatedAt,
			UpdatedAt: user.Manager.UpdatedAt,
		}
	}

	// Map company assignments
	for _, assignment := range user.CompanyAssignments {
		domainAssignment := domain.Assignment{
			ID:         assignment.ID,
			UserID:     assignment.UserID,
			CompanyID:  assignment.CompanyID,
			AssignedBy: assignment.AssignedBy,
			IsActive:   assignment.IsActive,
			CreatedAt:  assignment.CreatedAt,
			UpdatedAt:  assignment.UpdatedAt,
		}

		if assignment.Company != nil {
			domainAssignment.Company = &domain.Company{
				ID:      assignment.Company.ID,
				Name:    assignment.Company.Name,
				Status:  assignment.Company.Status,
				Address: assignment.Company.Address,
				Phone:   assignment.Company.Phone,
			}
		} else {
			// Fallback: Try to find company manually (in case of soft delete or preload failure)
			var comp CompanyModel
			fmt.Printf("DEBUG: Fallback lookup for CompanyID: %s\n", assignment.CompanyID)
			// Use Unscoped to find even soft-deleted companies
			if err := r.db.Unscoped().First(&comp, "id = ?", assignment.CompanyID).Error; err == nil {
				fmt.Printf("DEBUG: Found company: %s\n", comp.Name)
				domainAssignment.Company = &domain.Company{
					ID:      comp.ID,
					Name:    comp.Name,
					Status:  comp.Status,
					Address: comp.Address,
					Phone:   comp.Phone,
				}
			} else {
				fmt.Printf("DEBUG: Failed to find company: %v\n", err)
			}
		}
		domainUser.Assignments = append(domainUser.Assignments, domainAssignment)
	}

	// Map estate assignments
	for _, assignment := range user.EstateAssignments {
		if assignment.Estate == nil {
			continue
		}
		domainAssignment := domain.Assignment{
			ID:         assignment.ID,
			UserID:     assignment.UserID,
			CompanyID:  assignment.Estate.CompanyID,
			EstateID:   &assignment.EstateID,
			AssignedBy: assignment.AssignedBy,
			IsActive:   assignment.IsActive,
			CreatedAt:  assignment.CreatedAt,
			UpdatedAt:  assignment.UpdatedAt,
			Role:       domain.Role(user.Role),
		}

		domainAssignment.Estate = &domain.Estate{
			ID:        assignment.Estate.ID,
			CompanyID: assignment.Estate.CompanyID,
			Name:      assignment.Estate.Name,
			Code:      assignment.Estate.Code,
			IsActive:  assignment.Estate.IsActive,
		}

		domainUser.Assignments = append(domainUser.Assignments, domainAssignment)
	}

	// Map division assignments
	for _, assignment := range user.DivisionAssignments {
		if assignment.Division == nil {
			continue
		}
		domainAssignment := domain.Assignment{
			ID:         assignment.ID,
			UserID:     assignment.UserID,
			CompanyID:  assignment.Division.CompanyID,
			DivisionID: &assignment.DivisionID,
			AssignedBy: assignment.AssignedBy,
			IsActive:   assignment.IsActive,
			CreatedAt:  assignment.CreatedAt,
			UpdatedAt:  assignment.UpdatedAt,
			Role:       domain.Role(user.Role),
		}
		if assignment.Division.EstateID != nil {
			domainAssignment.EstateID = assignment.Division.EstateID
		}

		domainAssignment.Division = &domain.Division{
			ID:        assignment.Division.ID,
			CompanyID: assignment.Division.CompanyID,
			EstateID:  assignment.Division.EstateID,
			Name:      assignment.Division.Name,
			Code:      assignment.Division.Code,
			IsActive:  assignment.Division.IsActive,
		}

		domainUser.Assignments = append(domainUser.Assignments, domainAssignment)
	}

	return domainUser
}

func (r *UserRepository) fromDomainUser(user *domain.User) *UserModel {
	modelUser := &UserModel{
		ID:        user.ID,
		Username:  user.Username,
		Name:      user.Name,
		Email:     user.Email,
		Phone:     user.Phone,
		AvatarURL: user.Avatar,
		Password:  user.Password,
		Role:      string(user.Role),
		IsActive:  user.IsActive,
		ManagerID: user.ManagerID,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}

	for _, assignment := range user.Assignments {
		if assignment.EstateID != nil {
			modelAssignment := UserEstateAssignmentModel{
				ID:         assignment.ID,
				UserID:     assignment.UserID,
				EstateID:   *assignment.EstateID,
				IsActive:   assignment.IsActive,
				AssignedBy: assignment.AssignedBy,
				CreatedAt:  assignment.CreatedAt,
				UpdatedAt:  assignment.UpdatedAt,
			}
			if modelAssignment.UserID == "" {
				modelAssignment.UserID = user.ID
			}
			modelUser.EstateAssignments = append(modelUser.EstateAssignments, modelAssignment)
		} else if assignment.DivisionID != nil {
			modelAssignment := UserDivisionAssignmentModel{
				ID:         assignment.ID,
				UserID:     assignment.UserID,
				DivisionID: *assignment.DivisionID,
				IsActive:   assignment.IsActive,
				AssignedBy: assignment.AssignedBy,
				CreatedAt:  assignment.CreatedAt,
				UpdatedAt:  assignment.UpdatedAt,
			}
			if modelAssignment.UserID == "" {
				modelAssignment.UserID = user.ID
			}
			modelUser.DivisionAssignments = append(modelUser.DivisionAssignments, modelAssignment)
		} else {
			modelAssignment := UserCompanyAssignmentModel{
				ID:         assignment.ID,
				UserID:     assignment.UserID,
				CompanyID:  assignment.CompanyID,
				IsActive:   assignment.IsActive,
				AssignedBy: assignment.AssignedBy,
				CreatedAt:  assignment.CreatedAt,
				UpdatedAt:  assignment.UpdatedAt,
			}
			if modelAssignment.UserID == "" {
				modelAssignment.UserID = user.ID
			}
			modelUser.CompanyAssignments = append(modelUser.CompanyAssignments, modelAssignment)
		}
	}

	return modelUser
}

func dedupeCompanyAssignmentsByUniqueKey(assignments []UserCompanyAssignmentModel) []UserCompanyAssignmentModel {
	seen := make(map[string]int, len(assignments))
	unique := make([]UserCompanyAssignmentModel, 0, len(assignments))
	for _, assignment := range assignments {
		key := fmt.Sprintf("%s|%s", assignment.UserID, assignment.CompanyID)
		if idx, exists := seen[key]; exists {
			unique[idx] = assignment
			continue
		}
		seen[key] = len(unique)
		unique = append(unique, assignment)
	}
	return unique
}

func dedupeEstateAssignmentsByUniqueKey(assignments []UserEstateAssignmentModel) []UserEstateAssignmentModel {
	seen := make(map[string]int, len(assignments))
	unique := make([]UserEstateAssignmentModel, 0, len(assignments))
	for _, assignment := range assignments {
		key := fmt.Sprintf("%s|%s", assignment.UserID, assignment.EstateID)
		if idx, exists := seen[key]; exists {
			unique[idx] = assignment
			continue
		}
		seen[key] = len(unique)
		unique = append(unique, assignment)
	}
	return unique
}

func dedupeDivisionAssignmentsByUniqueKey(assignments []UserDivisionAssignmentModel) []UserDivisionAssignmentModel {
	seen := make(map[string]int, len(assignments))
	unique := make([]UserDivisionAssignmentModel, 0, len(assignments))
	for _, assignment := range assignments {
		key := fmt.Sprintf("%s|%s", assignment.UserID, assignment.DivisionID)
		if idx, exists := seen[key]; exists {
			unique[idx] = assignment
			continue
		}
		seen[key] = len(unique)
		unique = append(unique, assignment)
	}
	return unique
}
