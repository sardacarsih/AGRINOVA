package services

import (
	"fmt"

	"agrinovagraphql/server/internal/auth/models"
	"agrinovagraphql/server/internal/graphql/domain/auth"
)

// RoleAuthorizationService handles role-based authorization for user management
type RoleAuthorizationService struct{}

// Role Conversion Methods

// ConvertEnumToString converts GraphQL UserRole enum to standardized string format
func (s *RoleAuthorizationService) ConvertEnumToString(role auth.UserRole) string {
	switch role {
	case auth.UserRoleSuperAdmin:
		return models.RoleStringAdmin
	case auth.UserRoleCompanyAdmin:
		return models.RoleStringCompanyAdmin
	case auth.UserRoleAreaManager:
		return models.RoleStringAreaManager
	case auth.UserRoleManager:
		return models.RoleStringManager
	case auth.UserRoleAsisten:
		return models.RoleStringAsisten
	case auth.UserRoleMandor:
		return models.RoleStringMandor
	case auth.UserRoleSatpam:
		return models.RoleStringSatpam
	case auth.UserRoleTimbangan:
		return models.RoleStringTimbangan
	case auth.UserRoleGrading:
		return models.RoleStringGrading
	default:
		return string(role)
	}
}

// ConvertStringToEnum converts standardized string to GraphQL UserRole enum
func (s *RoleAuthorizationService) ConvertStringToEnum(roleStr string) (auth.UserRole, error) {
	switch roleStr {
	case models.RoleStringAdmin:
		return auth.UserRoleSuperAdmin, nil
	case models.RoleStringCompanyAdmin:
		return auth.UserRoleCompanyAdmin, nil
	case models.RoleStringAreaManager:
		return auth.UserRoleAreaManager, nil
	case models.RoleStringManager:
		return auth.UserRoleManager, nil
	case models.RoleStringAsisten:
		return auth.UserRoleAsisten, nil
	case models.RoleStringMandor:
		return auth.UserRoleMandor, nil
	case models.RoleStringSatpam:
		return auth.UserRoleSatpam, nil
	case models.RoleStringTimbangan:
		return auth.UserRoleTimbangan, nil
	case models.RoleStringGrading:
		return auth.UserRoleGrading, nil
	default:
		return auth.UserRoleSuperAdmin, fmt.Errorf("invalid role string: %s", roleStr)
	}
}

// ValidateRoleString checks if role string is in correct format
func (s *RoleAuthorizationService) ValidateRoleString(roleStr string) bool {
	return models.IsValidRoleString(roleStr)
}

// GetStandardizedRoleString returns role in standardized string format
func (s *RoleAuthorizationService) GetStandardizedRoleString(role interface{}) (string, error) {
	switch r := role.(type) {
	case auth.UserRole:
		return s.ConvertEnumToString(r), nil
	case string:
		if s.ValidateRoleString(r) {
			return r, nil
		}
		return "", fmt.Errorf("invalid role string: %s", r)
	case models.Role:
		return r.ToStandardString(), nil
	default:
		return "", fmt.Errorf("invalid role type: %T", role)
	}
}

// NewRoleAuthorizationService creates a new role authorization service
func NewRoleAuthorizationService() *RoleAuthorizationService {
	return &RoleAuthorizationService{}
}

// RoleHierarchy defines the hierarchy levels for roles (lower number = higher authority)
var RoleHierarchy = map[auth.UserRole]int{
	auth.UserRoleSuperAdmin:   1,
	auth.UserRoleCompanyAdmin: 2,
	auth.UserRoleAreaManager:  3,
	auth.UserRoleManager:      4,
	auth.UserRoleAsisten:      5,
	auth.UserRoleMandor:       6,
	auth.UserRoleSatpam:       7,
	// TODO: Add back if needed
	// auth.UserRoleTimbangan:    8,
	// auth.UserRoleGrading:      9
}

// RolePermissions defines what operations each role can perform
var RolePermissions = map[auth.UserRole][]string{
	auth.UserRoleSuperAdmin: {
		"user:create", "user:read", "user:update", "user:delete",
		"user:manage_all", "user:reset_password", "user:toggle_status",
	},
	auth.UserRoleCompanyAdmin: {
		"user:create", "user:read", "user:update", "user:delete",
		"user:manage_company", "user:reset_password", "user:toggle_status",
		"create:estate", "read:estate", "update:estate", "delete:estate",
		"create:division", "read:division", "update:division", "delete:division",
		"create:block", "read:block", "update:block", "delete:block",
		"create:employee", "read:employee", "update:employee", "delete:employee",
		"read:harvest", "view:reports", "export:reports",
	},
	auth.UserRoleAreaManager: {
		"user:read", "user:update_own",
		"read:harvest", "read:division", "view:reports", "export:reports",
	},
	auth.UserRoleManager: {
		"user:read", "user:update_own",
		"read:harvest", "read:division", "view:reports",
	},
	auth.UserRoleAsisten: {
		"user:read", "user:update_own",
		"read:division", "write:division", "read:harvest", "approve:harvest",
	},
	auth.UserRoleMandor: {
		"user:read", "user:update_own",
		"read:division", "write:division", "read:harvest", "create:harvest",
	},
	auth.UserRoleSatpam: {
		"user:read", "user:update_own",
		"create:gate_check", "read:gate_check", "update:gate_check",
	},
	// TODO: Add back if needed
	// auth.UserRoleTimbangan: {
	// 	"user:read", "user:update_own",
	// 	"create:weighing", "read:weighing", "update:weighing", "view:reports",
	// },
	// auth.UserRoleGrading: {
	// 	"user:read", "user:update_own",
	// 	"create:grading", "read:grading", "update:grading",
	// 	"approve:grading", "reject:grading",
	// 	"read:weighing", // TBS only
	// 	"view:reports",
	// },
}

// CanCreateUser checks if a role can create users of a specific target role
func (s *RoleAuthorizationService) CanCreateUser(requesterRole, targetRole auth.UserRole) bool {
	// Super admin can create any user
	if requesterRole == auth.UserRoleSuperAdmin {
		return true
	}

	// Company admin can create users except super admin
	if requesterRole == auth.UserRoleCompanyAdmin {
		return targetRole != auth.UserRoleSuperAdmin
	}

	// Other roles cannot create users
	return false
}

// CanUpdateUser checks if a role can update a specific user
func (s *RoleAuthorizationService) CanUpdateUser(requesterRole auth.UserRole, requesterUserID string, targetRole auth.UserRole, targetUserID string) bool {
	// Super admin can update any user
	if requesterRole == auth.UserRoleSuperAdmin {
		return true
	}

	// Company admin can update users except super admin
	if requesterRole == auth.UserRoleCompanyAdmin {
		return targetRole != auth.UserRoleSuperAdmin
	}

	// Users can update their own profile
	if requesterUserID == targetUserID {
		return true
	}

	return false
}

// CanDeleteUser checks if a role can delete a specific user
func (s *RoleAuthorizationService) CanDeleteUser(requesterRole, targetRole auth.UserRole) bool {
	// Super admin can delete any user except themselves (should be checked separately)
	if requesterRole == auth.UserRoleSuperAdmin {
		return true
	}

	// Company admin can delete users except super admin
	if requesterRole == auth.UserRoleCompanyAdmin {
		return targetRole != auth.UserRoleSuperAdmin
	}

	// Other roles cannot delete users
	return false
}

// CanViewUsers checks if a role can view users
func (s *RoleAuthorizationService) CanViewUsers(requesterRole auth.UserRole) bool {
	permissions := RolePermissions[requesterRole]
	for _, permission := range permissions {
		if permission == "user:read" || permission == "user:manage_all" || permission == "user:manage_company" {
			return true
		}
	}
	return false
}

// CanResetPassword checks if a role can reset passwords
func (s *RoleAuthorizationService) CanResetPassword(requesterRole, targetRole auth.UserRole) bool {
	// Super admin can reset any password
	if requesterRole == auth.UserRoleSuperAdmin {
		return true
	}

	// Company admin can reset passwords except super admin
	if requesterRole == auth.UserRoleCompanyAdmin {
		return targetRole != auth.UserRoleSuperAdmin
	}

	return false
}

// CanToggleUserStatus checks if a role can toggle user status
func (s *RoleAuthorizationService) CanToggleUserStatus(requesterRole, targetRole auth.UserRole) bool {
	// Super admin can toggle any status
	if requesterRole == auth.UserRoleSuperAdmin {
		return true
	}

	// Company admin can toggle status except super admin
	if requesterRole == auth.UserRoleCompanyAdmin {
		return targetRole != auth.UserRoleSuperAdmin
	}

	return false
}

// GetAccessibleRoles returns roles that the requester can manage
func (s *RoleAuthorizationService) GetAccessibleRoles(requesterRole auth.UserRole) []auth.UserRole {
	switch requesterRole {
	case auth.UserRoleSuperAdmin:
		return []auth.UserRole{
			auth.UserRoleSuperAdmin,
			auth.UserRoleCompanyAdmin,
			auth.UserRoleAreaManager,
			auth.UserRoleManager,
			auth.UserRoleAsisten,
			auth.UserRoleMandor,
			auth.UserRoleSatpam,
			// auth.UserRoleTimbangan,
			// auth.UserRoleGrading,
		}
	case auth.UserRoleCompanyAdmin:
		return []auth.UserRole{
			auth.UserRoleCompanyAdmin,
			auth.UserRoleAreaManager,
			auth.UserRoleManager,
			auth.UserRoleAsisten,
			auth.UserRoleMandor,
			auth.UserRoleSatpam,
			// auth.UserRoleTimbangan,
			// auth.UserRoleGrading,
		}
	default:
		return []auth.UserRole{requesterRole} // Can only manage themselves
	}
}

// GetManageableRoles returns roles that the requester can create/delete
func (s *RoleAuthorizationService) GetManageableRoles(requesterRole auth.UserRole) []auth.UserRole {
	switch requesterRole {
	case auth.UserRoleSuperAdmin:
		return []auth.UserRole{
			auth.UserRoleCompanyAdmin,
			auth.UserRoleAreaManager,
			auth.UserRoleManager,
			auth.UserRoleAsisten,
			auth.UserRoleMandor,
			auth.UserRoleSatpam,
		}
	case auth.UserRoleCompanyAdmin:
		return []auth.UserRole{
			auth.UserRoleAreaManager,
			auth.UserRoleManager,
			auth.UserRoleAsisten,
			auth.UserRoleMandor,
			auth.UserRoleSatpam,
			// auth.UserRoleTimbangan,
			// auth.UserRoleGrading,
		}
	default:
		return []auth.UserRole{} // Cannot manage others
	}
}

// GetAssignableRoles returns roles that can be assigned by the requester
func (s *RoleAuthorizationService) GetAssignableRoles(requesterRole auth.UserRole) []auth.UserRole {
	return s.GetManageableRoles(requesterRole)
}

// CheckRoleAccess performs comprehensive role access check
func (s *RoleAuthorizationService) CheckRoleAccess(requesterRole, targetRole auth.UserRole) *auth.RoleAccessCheck {
	canAccess := s.canAccessRole(requesterRole, targetRole)
	canManage := s.CanUpdateUser(requesterRole, "", targetRole, "")
	canAssignRole := s.CanCreateUser(requesterRole, targetRole)

	explanation := s.generateAccessExplanation(requesterRole, targetRole, canAccess, canManage, canAssignRole)

	return &auth.RoleAccessCheck{
		CanAccess:     canAccess,
		CanManage:     canManage,
		CanAssignRole: canAssignRole,
		RequesterRole: requesterRole,
		TargetRole:    targetRole,
		Explanation:   &explanation,
	}
}

// canAccessRole checks if requester can access target role
func (s *RoleAuthorizationService) canAccessRole(requesterRole, targetRole auth.UserRole) bool {
	requesterLevel := RoleHierarchy[requesterRole]
	targetLevel := RoleHierarchy[targetRole]

	// Can access roles at same level or lower (higher number)
	return requesterLevel <= targetLevel
}

// generateAccessExplanation provides human-readable explanation
func (s *RoleAuthorizationService) generateAccessExplanation(requesterRole, targetRole auth.UserRole, canAccess, canManage, canAssignRole bool) string {
	if requesterRole == auth.UserRoleSuperAdmin {
		return "Super Admin has full access to all roles and operations"
	}

	if requesterRole == auth.UserRoleCompanyAdmin {
		if targetRole == auth.UserRoleSuperAdmin {
			return "Company Admin cannot access Super Admin role"
		}
		return "Company Admin can manage all roles except Super Admin"
	}

	if canAccess {
		return fmt.Sprintf("%s can view %s but has limited management permissions", requesterRole, targetRole)
	}

	return fmt.Sprintf("%s does not have permission to access %s", requesterRole, targetRole)
}

// GetRoleInfo returns detailed information about a role
func (s *RoleAuthorizationService) GetRoleInfo(role auth.UserRole) *auth.RoleInfo {
	level := RoleHierarchy[role]
	permissions := RolePermissions[role]

	// Determine access permissions
	webAccess := true // All roles have web access in this system
	mobileAccess := role != auth.UserRoleSuperAdmin && role != auth.UserRoleCompanyAdmin

	return &auth.RoleInfo{
		Role:         role,
		Level:        int32(level),
		Name:         s.getRoleName(role),
		Description:  s.getRoleDescription(role),
		Permissions:  permissions,
		WebAccess:    webAccess,
		MobileAccess: mobileAccess,
	}
}

// getRoleName returns human-readable role name
func (s *RoleAuthorizationService) getRoleName(role auth.UserRole) string {
	switch role {
	case auth.UserRoleSuperAdmin:
		return "Super Administrator"
	case auth.UserRoleCompanyAdmin:
		return "Company Administrator"
	case auth.UserRoleAreaManager:
		return "Area Manager"
	case auth.UserRoleManager:
		return "Manager"
	case auth.UserRoleAsisten:
		return "Assistant"
	case auth.UserRoleMandor:
		return "Supervisor"
	case auth.UserRoleSatpam:
		return "Security Guard"
	// TODO: Add back if needed
	// case auth.UserRoleTimbangan:
	// 	return "Weighing Officer"
	// case auth.UserRoleGrading:
	// 	return "Grading Officer"
	default:
		return string(role)
	}
}

// getRoleDescription returns role description
func (s *RoleAuthorizationService) getRoleDescription(role auth.UserRole) string {
	switch role {
	case auth.UserRoleSuperAdmin:
		return "System-wide administrative access with full control over all operations"
	case auth.UserRoleCompanyAdmin:
		return "Company-level administrative access with control over company operations"
	case auth.UserRoleAreaManager:
		return "Multi-company monitoring access for area oversight"
	case auth.UserRoleManager:
		return "Estate-level management with access to multiple estates"
	case auth.UserRoleAsisten:
		return "Division-level assistant with approval and rejection capabilities"
	case auth.UserRoleMandor:
		return "Field-level supervisor responsible for harvest data input"
	case auth.UserRoleSatpam:
		return "Security personnel with gate check and vehicle monitoring access"
	// TODO: Add back if needed
	// case auth.UserRoleTimbangan:
	// 	return "Weighing officer responsible for TBS weighing and vehicle weight recording"
	// case auth.UserRoleGrading:
	// 	return "Grading officer responsible for TBS quality inspection and grading"
	default:
		return "System user role"
	}
}
