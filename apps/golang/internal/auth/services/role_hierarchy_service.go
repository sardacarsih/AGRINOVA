// Package services provides role hierarchy management for the Agrinova GraphQL API server.
// This package implements a comprehensive hierarchical role system with level-based permissions,
// role comparison functions, and access control validation.
//
// Key Components:
// - Role Hierarchy Definition: Level 1 (highest) to Level 9 (lowest) with specific permissions
// - Permission System: Higher level roles can access lower level role data and functions
// - Access Control: Cross-level permission validation and role-based resource access
// - Role Management: Role assignment validation, upgrade/downgrade restrictions
//
// The hierarchical role system supports:
// - Level 1: SUPER_ADMIN - System administrator with full access
// - Level 2: AREA_MANAGER - Multi-company access and oversight
// - Level 3: COMPANY_ADMIN - Company-level administration
// - Level 4: MANAGER - Estate management and reporting
// - Level 5: ASISTEN - Division approval and monitoring
// - Level 6: MANDOR - Field supervision and data input
// - Level 7: SATPAM - Gate check operations and security
// - Level 8: TIMBANGAN - PKS weighing station operations
// - Level 9: GRADING - PKS quality grading operations

package services

import (
	"fmt"

	"agrinovagraphql/server/internal/graphql/domain/auth"
)

// RoleLevel represents the hierarchical level of a role (1 = highest authority)
type RoleLevel int

const (
	// Level 1: System administrator with full access
	LevelSuperAdmin RoleLevel = 1
	// Level 2: Area manager overseeing multiple companies
	LevelAreaManager RoleLevel = 2
	// Level 3: Company administrator with user management rights
	LevelCompanyAdmin RoleLevel = 3
	// Level 4: Estate manager with monitoring and reporting access
	LevelManager RoleLevel = 4
	// Level 5: Assistant manager who approves/rejects harvest records
	LevelAsisten RoleLevel = 5
	// Level 6: Field supervisor responsible for harvest data input
	LevelMandor RoleLevel = 6
	// Level 7: Security personnel managing gate check operations
	LevelSatpam RoleLevel = 7
	// Level 8: Weighing station operator responsible for TBS weighing
	LevelTimbangan RoleLevel = 8
	// Level 9: Quality grading officer responsible for TBS quality control
	LevelGrading RoleLevel = 9
)

// RoleHierarchyService manages role hierarchy and permissions
type RoleHierarchyService struct{}

// NewRoleHierarchyService creates a new role hierarchy service
func NewRoleHierarchyService() *RoleHierarchyService {
	return &RoleHierarchyService{}
}

// RoleInfo contains information about a role including its level and permissions
type RoleInfo struct {
	Role         auth.UserRole `json:"role"`
	Level        RoleLevel     `json:"level"`
	Name         string        `json:"name"`
	Description  string        `json:"description"`
	Permissions  []string      `json:"permissions"`
	WebAccess    bool          `json:"web_access"`
	MobileAccess bool          `json:"mobile_access"`
}

// roleHierarchy defines the complete role hierarchy with levels and permissions
var roleHierarchy = map[auth.UserRole]RoleInfo{
	auth.UserRoleSuperAdmin: {
		Role:         auth.UserRoleSuperAdmin,
		Level:        LevelSuperAdmin,
		Name:         "Super Administrator",
		Description:  "System administrator with full access to all companies and functions",
		Permissions:  []string{"*"}, // Wildcard permission for everything
		WebAccess:    true,
		MobileAccess: false,
	},
	auth.UserRoleAreaManager: {
		Role:        auth.UserRoleAreaManager,
		Level:       LevelAreaManager,
		Name:        "Area Manager",
		Description: "Area manager overseeing multiple companies with cross-company access",
		Permissions: []string{
			"companies:read", "companies:manage",
			"estates:read", "estates:manage",
			"users:read", "users:manage",
			"harvest:read", "harvest:approve",
			"gate:read", "gate:manage",
			"reports:read", "reports:generate",
		},
		WebAccess:    true,
		MobileAccess: true,
	},
	auth.UserRoleCompanyAdmin: {
		Role:        auth.UserRoleCompanyAdmin,
		Level:       LevelCompanyAdmin,
		Name:        "Company Administrator",
		Description: "Company administrator with user management and company-level access",
		Permissions: []string{
			"company:read", "company:manage",
			"estates:read", "estates:manage",
			"users:read", "users:create", "users:update",
			"harvest:read", "harvest:approve",
			"gate:read",
			"reports:read", "reports:generate",
		},
		WebAccess:    true,
		MobileAccess: false,
	},
	auth.UserRoleManager: {
		Role:        auth.UserRoleManager,
		Level:       LevelManager,
		Name:        "Estate Manager",
		Description: "Estate manager with monitoring, reporting, and multi-estate access",
		Permissions: []string{
			"estates:read", "divisions:read", "blocks:read",
			"harvest:read", "harvest:approve",
			"users:read",
			"gate:read",
			"reports:read", "reports:generate",
		},
		WebAccess:    true,
		MobileAccess: true,
	},
	auth.UserRoleAsisten: {
		Role:        auth.UserRoleAsisten,
		Level:       LevelAsisten,
		Name:        "Assistant Manager",
		Description: "Assistant manager who approves/rejects harvest records with multi-division access",
		Permissions: []string{
			"divisions:read", "blocks:read",
			"harvest:read", "harvest:approve", "harvest:reject",
			"users:read",
			"reports:read",
		},
		WebAccess:    true,
		MobileAccess: true,
	},
	auth.UserRoleMandor: {
		Role:        auth.UserRoleMandor,
		Level:       LevelMandor,
		Name:        "Field Supervisor",
		Description: "Field supervisor responsible for harvest data input and field operations",
		Permissions: []string{
			"blocks:read",
			"harvest:create", "harvest:read", "harvest:update",
			"reports:read",
		},
		WebAccess:    false,
		MobileAccess: true,
	},
	auth.UserRoleSatpam: {
		Role:        auth.UserRoleSatpam,
		Level:       LevelSatpam,
		Name:        "Security Personnel",
		Description: "Security personnel managing gate check operations and vehicle access",
		Permissions: []string{
			"gate:create", "gate:read", "gate:update", "gate:complete",
			"qr:generate", "qr:scan",
			"reports:read",
		},
		WebAccess:    true,
		MobileAccess: true,
	},
	auth.UserRoleTimbangan: {
		Role:        auth.UserRoleTimbangan,
		Level:       LevelTimbangan,
		Name:        "Timbangan",
		Description: "Weighing station operator responsible for TBS weighing and recording",
		Permissions: []string{
			"weighing:create", "weighing:read", "weighing:update",
			"reports:read",
		},
		WebAccess:    false,
		MobileAccess: true,
	},
	auth.UserRoleGrading: {
		Role:        auth.UserRoleGrading,
		Level:       LevelGrading,
		Name:        "Grading",
		Description: "Quality control staff responsible for TBS grading and classification",
		Permissions: []string{
			"grading:create", "grading:read", "grading:update", "grading:approve", "grading:reject",
			"reports:read",
		},
		WebAccess:    false,
		MobileAccess: true,
	},
}

// GetRoleInfo returns the role information for a given role
func (s *RoleHierarchyService) GetRoleInfo(role auth.UserRole) (*RoleInfo, error) {
	info, exists := roleHierarchy[role]
	if !exists {
		return nil, fmt.Errorf("role %s not found in hierarchy", role)
	}
	return &info, nil
}

// GetRoleLevel returns the hierarchical level of a role
func (s *RoleHierarchyService) GetRoleLevel(role auth.UserRole) (RoleLevel, error) {
	info, err := s.GetRoleInfo(role)
	if err != nil {
		return 0, err
	}
	return info.Level, nil
}

// GetAllRoles returns all roles ordered by hierarchy level
func (s *RoleHierarchyService) GetAllRoles() []RoleInfo {
	roles := make([]RoleInfo, 0, len(roleHierarchy))

	// Add roles in hierarchy order (level 1 to 9)
	for level := RoleLevel(1); level <= LevelGrading; level++ {
		for _, info := range roleHierarchy {
			if info.Level == level {
				roles = append(roles, info)
				break
			}
		}
	}

	return roles
}

// CanAccess checks if requesterRole can access targetRole data/functions
// Higher level roles (lower number) can access lower level roles (higher number)
func (s *RoleHierarchyService) CanAccess(requesterRole, targetRole auth.UserRole) bool {
	requesterLevel, err := s.GetRoleLevel(requesterRole)
	if err != nil {
		return false
	}

	targetLevel, err := s.GetRoleLevel(targetRole)
	if err != nil {
		return false
	}

	// Super admin can access everything
	if requesterLevel == LevelSuperAdmin {
		return true
	}

	// Higher level (lower number) can access lower level (higher number)
	// Same level can access same level
	return requesterLevel <= targetLevel
}

// CanManage checks if requesterRole can manage (create/update/delete) targetRole
// Only higher level roles can manage lower level roles
func (s *RoleHierarchyService) CanManage(requesterRole, targetRole auth.UserRole) bool {
	requesterLevel, err := s.GetRoleLevel(requesterRole)
	if err != nil {
		return false
	}

	targetLevel, err := s.GetRoleLevel(targetRole)
	if err != nil {
		return false
	}

	// Super admin can manage everything except other super admins
	if requesterLevel == LevelSuperAdmin {
		return targetLevel > LevelSuperAdmin
	}

	// Only higher level roles can manage lower level roles (strict hierarchy)
	return requesterLevel < targetLevel
}

// CanAssignRole checks if requesterRole can assign targetRole to users
// Uses same logic as CanManage but with additional role-specific restrictions
func (s *RoleHierarchyService) CanAssignRole(requesterRole, targetRole auth.UserRole) bool {
	// Basic hierarchy check
	if !s.CanManage(requesterRole, targetRole) {
		return false
	}

	// Additional restrictions:
	// Only super admin can assign area manager roles
	if targetRole == auth.UserRoleAreaManager {
		return requesterRole == auth.UserRoleSuperAdmin
	}

	// Only super admin and area manager can assign company admin roles
	if targetRole == auth.UserRoleCompanyAdmin {
		requesterLevel, _ := s.GetRoleLevel(requesterRole)
		return requesterLevel <= LevelAreaManager
	}

	return true
}

// GetAccessibleRoles returns all roles that the requester can access
func (s *RoleHierarchyService) GetAccessibleRoles(requesterRole auth.UserRole) []auth.UserRole {
	var accessible []auth.UserRole

	for role := range roleHierarchy {
		if s.CanAccess(requesterRole, role) {
			accessible = append(accessible, role)
		}
	}

	return accessible
}

// GetManageableRoles returns all roles that the requester can manage
func (s *RoleHierarchyService) GetManageableRoles(requesterRole auth.UserRole) []auth.UserRole {
	var manageable []auth.UserRole

	for role := range roleHierarchy {
		if s.CanManage(requesterRole, role) {
			manageable = append(manageable, role)
		}
	}

	return manageable
}

// GetAssignableRoles returns all roles that the requester can assign
func (s *RoleHierarchyService) GetAssignableRoles(requesterRole auth.UserRole) []auth.UserRole {
	var assignable []auth.UserRole

	for role := range roleHierarchy {
		if s.CanAssignRole(requesterRole, role) {
			assignable = append(assignable, role)
		}
	}

	return assignable
}

// HasPermission checks if a role has a specific permission
func (s *RoleHierarchyService) HasPermission(role auth.UserRole, permission string) bool {
	info, err := s.GetRoleInfo(role)
	if err != nil {
		return false
	}

	// Check for wildcard permission (super admin)
	for _, perm := range info.Permissions {
		if perm == "*" || perm == permission {
			return true
		}
	}

	return false
}

// GetRolePermissions returns all permissions for a role
func (s *RoleHierarchyService) GetRolePermissions(role auth.UserRole) ([]string, error) {
	info, err := s.GetRoleInfo(role)
	if err != nil {
		return nil, err
	}

	return info.Permissions, nil
}

// HasWebAccess checks if a role has web dashboard access
func (s *RoleHierarchyService) HasWebAccess(role auth.UserRole) bool {
	info, err := s.GetRoleInfo(role)
	if err != nil {
		return false
	}

	return info.WebAccess
}

// HasMobileAccess checks if a role has mobile access
func (s *RoleHierarchyService) HasMobileAccess(role auth.UserRole) bool {
	info, err := s.GetRoleInfo(role)
	if err != nil {
		return false
	}

	return info.MobileAccess
}

// ValidateRoleAssignment validates if a role assignment is valid
func (s *RoleHierarchyService) ValidateRoleAssignment(requesterRole, targetRole auth.UserRole) error {
	// Check if requester can assign this role
	if !s.CanAssignRole(requesterRole, targetRole) {
		requesterInfo, _ := s.GetRoleInfo(requesterRole)
		targetInfo, _ := s.GetRoleInfo(targetRole)
		return fmt.Errorf("role %s cannot assign role %s", requesterInfo.Name, targetInfo.Name)
	}

	// Validate role exists in hierarchy
	if _, err := s.GetRoleInfo(targetRole); err != nil {
		return fmt.Errorf("invalid role: %s", targetRole)
	}

	return nil
}

// ValidateRoleUpgrade validates if a role can be upgraded
func (s *RoleHierarchyService) ValidateRoleUpgrade(requesterRole, currentRole, newRole auth.UserRole) error {
	// Check if this is actually an upgrade (lower level number = higher authority)
	currentLevel, err := s.GetRoleLevel(currentRole)
	if err != nil {
		return err
	}

	newLevel, err := s.GetRoleLevel(newRole)
	if err != nil {
		return err
	}

	if newLevel >= currentLevel {
		return fmt.Errorf("role change from %s to %s is not an upgrade", currentRole, newRole)
	}

	// Check if requester can assign new role
	if err := s.ValidateRoleAssignment(requesterRole, newRole); err != nil {
		return fmt.Errorf("upgrade not allowed: %v", err)
	}

	return nil
}

// ValidateRoleDowngrade validates if a role can be downgraded
func (s *RoleHierarchyService) ValidateRoleDowngrade(requesterRole, currentRole, newRole auth.UserRole) error {
	// Check if this is actually a downgrade (higher level number = lower authority)
	currentLevel, err := s.GetRoleLevel(currentRole)
	if err != nil {
		return err
	}

	newLevel, err := s.GetRoleLevel(newRole)
	if err != nil {
		return err
	}

	if newLevel <= currentLevel {
		return fmt.Errorf("role change from %s to %s is not a downgrade", currentRole, newRole)
	}

	// Check if requester can manage current role (needed for downgrade)
	if !s.CanManage(requesterRole, currentRole) {
		requesterInfo, _ := s.GetRoleInfo(requesterRole)
		currentInfo, _ := s.GetRoleInfo(currentRole)
		return fmt.Errorf("role %s cannot downgrade role %s", requesterInfo.Name, currentInfo.Name)
	}

	// Check if requester can assign new role
	if err := s.ValidateRoleAssignment(requesterRole, newRole); err != nil {
		return fmt.Errorf("downgrade not allowed: %v", err)
	}

	return nil
}

// GetRoleHierarchyTree returns the complete hierarchy as a tree structure
func (s *RoleHierarchyService) GetRoleHierarchyTree() map[RoleLevel][]RoleInfo {
	tree := make(map[RoleLevel][]RoleInfo)

	for _, info := range roleHierarchy {
		tree[info.Level] = append(tree[info.Level], info)
	}

	return tree
}

// IsValidRoleTransition checks if a role transition is valid
func (s *RoleHierarchyService) IsValidRoleTransition(requesterRole, fromRole, toRole auth.UserRole) bool {
	// Same role - no transition needed
	if fromRole == toRole {
		return true
	}

	fromLevel, err := s.GetRoleLevel(fromRole)
	if err != nil {
		return false
	}

	toLevel, err := s.GetRoleLevel(toRole)
	if err != nil {
		return false
	}

	// Determine if upgrade or downgrade
	if toLevel < fromLevel {
		// Upgrade
		return s.ValidateRoleUpgrade(requesterRole, fromRole, toRole) == nil
	} else {
		// Downgrade
		return s.ValidateRoleDowngrade(requesterRole, fromRole, toRole) == nil
	}
}

// GetHierarchicalSuperiors returns all roles that are hierarchically superior
func (s *RoleHierarchyService) GetHierarchicalSuperiors(role auth.UserRole) []auth.UserRole {
	var superiors []auth.UserRole

	roleLevel, err := s.GetRoleLevel(role)
	if err != nil {
		return superiors
	}

	for otherRole := range roleHierarchy {
		otherLevel, err := s.GetRoleLevel(otherRole)
		if err != nil {
			continue
		}

		// Lower level number = higher authority = superior
		if otherLevel < roleLevel {
			superiors = append(superiors, otherRole)
		}
	}

	return superiors
}

// GetHierarchicalSubordinates returns all roles that are hierarchically subordinate
func (s *RoleHierarchyService) GetHierarchicalSubordinates(role auth.UserRole) []auth.UserRole {
	var subordinates []auth.UserRole

	roleLevel, err := s.GetRoleLevel(role)
	if err != nil {
		return subordinates
	}

	for otherRole := range roleHierarchy {
		otherLevel, err := s.GetRoleLevel(otherRole)
		if err != nil {
			continue
		}

		// Higher level number = lower authority = subordinate
		if otherLevel > roleLevel {
			subordinates = append(subordinates, otherRole)
		}
	}

	return subordinates
}
