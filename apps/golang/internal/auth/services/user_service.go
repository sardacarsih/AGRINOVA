package services

import (
	"errors"
	"fmt"
	"time"

	"agrinovagraphql/server/internal/graphql/domain/auth"
	"agrinovagraphql/server/internal/graphql/domain/master"
	"agrinovagraphql/server/pkg/database"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateUserInput represents the input for creating a new user
type CreateUserInput struct {
	Username  string
	Name      string
	Email     string
	Role      auth.UserRole
	CompanyID string
	Password  string
}

// UpdateUserInput represents the input for updating an existing user
type UpdateUserInput struct {
	ID        string
	Username  string
	Name      string
	Email     string
	Role      *auth.UserRole
	CompanyID string
}

type UserService struct {
	db *gorm.DB
}

// NewUserService creates a new user service
func NewUserService() *UserService {
	return &UserService{
		db: database.GetDB(),
	}
}

// GetAllUsers retrieves all users with company information
func (s *UserService) GetAllUsers() ([]*auth.User, error) {
	var users []*auth.User
	err := s.db.Find(&users).Error
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve users: %v", err)
	}
	return users, nil
}

// GetUserByID retrieves a user by ID with related data
func (s *UserService) GetUserByID(id string) (*auth.User, error) {
	var user auth.User
	err := s.db.First(&user, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to retrieve user: %v", err)
	}
	return &user, nil
}

// GetUserByUsername retrieves a user by username
func (s *UserService) GetUserByUsername(username string) (*auth.User, error) {
	var user auth.User
	err := s.db.First(&user, "username = ?", username).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to retrieve user: %v", err)
	}
	return &user, nil
}

// CreateUser creates a new user with input validation
func (s *UserService) CreateUser(input CreateUserInput) (*auth.User, error) {
	// Validate company exists
	var company master.Company
	if err := s.db.First(&company, "id = ?", input.CompanyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("company not found")
		}
		return nil, fmt.Errorf("failed to validate company: %v", err)
	}

	// Check username uniqueness
	var existingUser auth.User
	if err := s.db.First(&existingUser, "username = ?", input.Username).Error; err == nil {
		return nil, fmt.Errorf("username already exists")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check username: %v", err)
	}

	// Create user model from input
	var email *string
	if input.Email != "" {
		email = &input.Email
	}

	user := &auth.User{
		Username: input.Username,
		Name:     input.Name,
		Email:    email,
		Role:     input.Role,
		// CompanyID removed
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Create user
	if err := s.db.Create(user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %v", err)
	}

	// Create company assignment
	assignment := auth.UserCompanyAssignment{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		CompanyID: input.CompanyID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := s.db.Create(&assignment).Error; err != nil {
		return nil, fmt.Errorf("failed to create user company assignment: %v", err)
	}

	// Reload with relationships
	return s.GetUserByID(user.ID)
}

// UpdateUser updates an existing user using input struct
func (s *UserService) UpdateUser(input UpdateUserInput) (*auth.User, error) {
	// Validate user exists
	var user auth.User
	if err := s.db.First(&user, "id = ?", input.ID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to find user: %v", err)
	}

	// Prepare updates map
	updates := make(map[string]interface{})

	// If username is being updated, check uniqueness
	if input.Username != "" && input.Username != user.Username {
		var existingUser auth.User
		if err := s.db.First(&existingUser, "username = ? AND id != ?", input.Username, input.ID).Error; err == nil {
			return nil, fmt.Errorf("username already exists")
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("failed to check username: %v", err)
		}
		updates["username"] = input.Username
	}

	// Update name if provided
	if input.Name != "" && input.Name != user.Name {
		updates["name"] = input.Name
	}

	// Update email if provided
	if input.Email != "" && (user.Email == nil || input.Email != *user.Email) {
		updates["email"] = &input.Email
	}

	// Update role if provided
	if input.Role != nil && *input.Role != user.Role {
		updates["role"] = *input.Role
	}

	// If company is being updated, validate it exists
	// If company is being updated, handle assignment
	if input.CompanyID != "" {
		// Verify company exists
		var company master.Company
		if err := s.db.First(&company, "id = ?", input.CompanyID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, fmt.Errorf("company not found")
			}
			return nil, fmt.Errorf("failed to validate company: %v", err)
		}

		// Check if assignment exists
		var assignment auth.UserCompanyAssignment
		if err := s.db.First(&assignment, "user_id = ? AND company_id = ?", user.ID, input.CompanyID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Create new assignment
				newAssignment := auth.UserCompanyAssignment{
					ID:        uuid.New().String(),
					UserID:    user.ID,
					CompanyID: input.CompanyID,
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}
				if err := s.db.Create(&newAssignment).Error; err != nil {
					return nil, fmt.Errorf("failed to create company assignment: %v", err)
				}
			} else {
				return nil, fmt.Errorf("failed to check existing assignment: %v", err)
			}
		}
	}

	// Only update if there are changes
	if len(updates) > 0 {
		if err := s.db.Model(&user).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update user: %v", err)
		}
	}

	// Reload with relationships
	return s.GetUserByID(input.ID)
}

// UpdateUserLegacy updates an existing user using map (kept for backward compatibility)
func (s *UserService) UpdateUserLegacy(id string, updates map[string]interface{}) (*auth.User, error) {
	// Validate user exists
	var user auth.User
	if err := s.db.First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to find user: %v", err)
	}

	// If username is being updated, check uniqueness
	if username, exists := updates["username"]; exists {
		var existingUser auth.User
		if err := s.db.First(&existingUser, "username = ? AND id != ?", username, id).Error; err == nil {
			return nil, fmt.Errorf("username already exists")
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("failed to check username: %v", err)
		}
	}

	// If company is being updated, validate it exists and handle assignment
	if companyID, exists := updates["company_id"]; exists {
		cID := companyID.(string)
		var company master.Company
		if err := s.db.First(&company, "id = ?", cID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, fmt.Errorf("company not found")
			}
			return nil, fmt.Errorf("failed to validate company: %v", err)
		}

		// Create assignment
		var assignment auth.UserCompanyAssignment
		if err := s.db.First(&assignment, "user_id = ? AND company_id = ?", id, cID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				newAssignment := auth.UserCompanyAssignment{
					ID:        uuid.New().String(),
					UserID:    id,
					CompanyID: cID,
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}
				if err := s.db.Create(&newAssignment).Error; err != nil {
					return nil, fmt.Errorf("failed to create company assignment: %v", err)
				}
			}
		}

		// Remove company_id from updates map as it's not on user table anymore
		delete(updates, "company_id")
	}

	// Update user
	if err := s.db.Model(&user).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update user: %v", err)
	}

	// Reload with relationships
	return s.GetUserByID(id)
}

// DeleteUser soft deletes a user
func (s *UserService) DeleteUser(id string) error {
	// Check if user exists
	var user auth.User
	if err := s.db.First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to find user: %v", err)
	}

	// Soft delete
	if err := s.db.Delete(&user).Error; err != nil {
		return fmt.Errorf("failed to delete user: %v", err)
	}

	return nil
}

// GetUsersByRole retrieves users by role
func (s *UserService) GetUsersByRole(role auth.UserRole) ([]*auth.User, error) {
	var users []*auth.User
	err := s.db.Where("role = ?", role).Find(&users).Error
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve users by role: %v", err)
	}
	return users, nil
}

// GetUsersByCompany retrieves users by company ID
func (s *UserService) GetUsersByCompany(companyID string) ([]*auth.User, error) {
	var users []*auth.User
	err := s.db.Joins("JOIN user_company_assignments ON user_company_assignments.user_id = users.id").
		Where("user_company_assignments.company_id = ?", companyID).
		Find(&users).Error
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve users by company: %v", err)
	}
	return users, nil
}

// GetUserCompanyAssignments retrieves company assignments for a user
func (s *UserService) GetUserCompanyAssignments(userID string) ([]*auth.UserCompanyAssignment, error) {
	var assignments []*auth.UserCompanyAssignment
	err := s.db.Where("user_id = ? AND is_active = ?", userID, true).Find(&assignments).Error
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve user company assignments: %v", err)
	}
	return assignments, nil
}

// DeleteUserSafe performs a safe deletion (soft delete) and returns a response
func (s *UserService) DeleteUserSafe(id string) (*UserMutationResponse, error) {
	if err := s.DeleteUser(id); err != nil {
		return nil, err
	}
	return &UserMutationResponse{Success: true, Message: "User deleted successfully"}, nil
}

// ToggleUserStatus toggles user active status
func (s *UserService) ToggleUserStatus(id string) (*UserMutationResponse, error) {
	user, err := s.GetUserByID(id)
	if err != nil {
		return nil, err
	}

	newStatus := !user.IsActive
	if err := s.db.Model(user).Update("is_active", newStatus).Error; err != nil {
		return nil, fmt.Errorf("failed to toggle user status: %v", err)
	}

	return &UserMutationResponse{Success: true, Message: "User status toggled successfully"}, nil
}

// AssignUserToEstate assigns a user to a specific estate
func (s *UserService) AssignUserToEstate(userID, companyID, estateID string) error {
	// 1. Ensure UserCompanyAssignment exists
	var compAssignment auth.UserCompanyAssignment
	err := s.db.Where("user_id = ? AND company_id = ?", userID, companyID).First(&compAssignment).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			compAssignment = auth.UserCompanyAssignment{
				ID:        uuid.New().String(),
				UserID:    userID,
				CompanyID: companyID,
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			if err := s.db.Create(&compAssignment).Error; err != nil {
				return fmt.Errorf("failed to create company assignment: %v", err)
			}
		} else {
			return fmt.Errorf("failed to check company assignment: %v", err)
		}
	}

	// 2. Create UserEstateAssignment
	estateAssignment := auth.UserEstateAssignment{
		ID:           uuid.New().String(),
		AssignmentID: compAssignment.ID,
		EstateID:     estateID,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.db.Create(&estateAssignment).Error; err != nil {
		return fmt.Errorf("failed to create estate assignment: %v", err)
	}

	return nil
}

// AssignUserToDivision assigns a user to a specific division
func (s *UserService) AssignUserToDivision(userID, companyID, estateID, divisionID string) error {
	// 1. Ensure UserEstateAssignment exists (which implies UserCompanyAssignment)
	var estateAssignment auth.UserEstateAssignment
	err := s.db.Joins("JOIN user_company_assignments ON user_company_assignments.id = user_estate_assignments.assignment_id").
		Where("user_company_assignments.user_id = ? AND user_company_assignments.company_id = ? AND user_estate_assignments.estate_id = ?",
			userID, companyID, estateID).
		First(&estateAssignment).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Need to create nested assignments
			if err := s.AssignUserToEstate(userID, companyID, estateID); err != nil {
				return err
			}
			// Re-fetch
			err = s.db.Joins("JOIN user_company_assignments ON user_company_assignments.id = user_estate_assignments.assignment_id").
				Where("user_company_assignments.user_id = ? AND user_company_assignments.company_id = ? AND user_estate_assignments.estate_id = ?",
					userID, companyID, estateID).
				First(&estateAssignment).Error
			if err != nil {
				return fmt.Errorf("failed to re-fetch estate assignment: %v", err)
			}
		} else {
			return fmt.Errorf("failed to check estate assignment: %v", err)
		}
	}

	// 2. Create UserDivisionAssignment
	divisionAssignment := auth.UserDivisionAssignment{
		ID:                 uuid.New().String(),
		EstateAssignmentID: estateAssignment.ID,
		DivisionID:         divisionID,
		IsActive:           true,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	if err := s.db.Create(&divisionAssignment).Error; err != nil {
		return fmt.Errorf("failed to create division assignment: %v", err)
	}

	return nil
}

// UserMutationResponse represents a response for user mutations
type UserMutationResponse struct {
	Success bool
	Message string
	User    *auth.User
}
