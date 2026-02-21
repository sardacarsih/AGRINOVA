import '../config/app_config.dart';

class RoleService {
  /// Get display name for a role
  static String getRoleDisplayName(String role) {
    return AppConfig.roleDisplayNames[role.toLowerCase()] ?? role;
  }
  
  /// Get permissions for a role
  static List<String> getRolePermissions(String role) {
    return AppConfig.rolePermissions[role.toLowerCase()] ?? [];
  }
  
  /// Check if a role has a specific permission
  static bool hasPermission(String role, String permission) {
    final permissions = getRolePermissions(role);
    return permissions.contains(permission);
  }
  
  /// Get reporting hierarchy for a role
  static List<String> getReportingHierarchy(String role) {
    return AppConfig.roleHierarchy[role.toLowerCase()] ?? [];
  }
  
  /// Check if role supports offline mode
  static bool supportsOfflineMode(String role) {
    return hasPermission(role, 'offline_mode');
  }
  
  /// Check if role has realtime notifications
  static bool hasRealtimeNotifications(String role) {
    return hasPermission(role, 'realtime_notifications');
  }
  
  /// Check if role has harvest input capabilities
  static bool canInputHarvest(String role) {
    return hasPermission(role, 'harvest_input');
  }
  
  /// Check if role has harvest approval capabilities
  static bool canApproveHarvest(String role) {
    return hasPermission(role, 'harvest_approval');
  }
  
  /// Check if role has gate check capabilities
  static bool canPerformGateCheck(String role) {
    return hasPermission(role, 'gate_check');
  }
  
  /// Check if role has QR scanner access
  static bool canUseQRScanner(String role) {
    return hasPermission(role, 'qr_scanner');
  }
  
  /// Check if role has user management capabilities
  static bool canManageUsers(String role) {
    return hasPermission(role, 'user_management') || 
           hasPermission(role, 'user_management_global');
  }
  
  /// Check if role has system administration capabilities
  static bool canAdministerSystem(String role) {
    return hasPermission(role, 'system_administration');
  }
  
  /// Check if role has multi-company access
  static bool hasMultiCompanyAccess(String role) {
    return hasPermission(role, 'multi_company_access');
  }
  
  /// Get scope of data access for role
  static String getDataAccessScope(String role) {
    final roleLower = role.toLowerCase();
    
    if (hasPermission(roleLower, 'harvest_view_all')) {
      return 'global';
    } else if (hasPermission(roleLower, 'harvest_view_company')) {
      return 'company';
    } else if (hasPermission(roleLower, 'harvest_view_multi_estate')) {
      return 'multi_estate';
    } else if (hasPermission(roleLower, 'harvest_view_estate')) {
      return 'estate';
    } else if (hasPermission(roleLower, 'harvest_view_division')) {
      return 'division';
    } else if (hasPermission(roleLower, 'harvest_view_own')) {
      return 'own';
    } else {
      return 'none';
    }
  }
  
  /// Check if role can view data at specific scope
  static bool canViewDataAtScope(String role, String scope) {
    final currentScope = getDataAccessScope(role);
    
    // Define scope hierarchy (higher levels can access lower levels)
    const scopeHierarchy = {
      'global': 6,
      'company': 5,
      'multi_estate': 4,
      'estate': 3,
      'division': 2,
      'own': 1,
      'none': 0,
    };
    
    final currentLevel = scopeHierarchy[currentScope] ?? 0;
    final requestedLevel = scopeHierarchy[scope] ?? 0;
    
    return currentLevel >= requestedLevel;
  }
  
  /// Get list of all available roles
  static List<String> getAllRoles() {
    return AppConfig.roleDisplayNames.keys.toList();
  }
  
  /// Get list of roles with specific permission
  static List<String> getRolesWithPermission(String permission) {
    final rolesWithPermission = <String>[];
    
    for (final entry in AppConfig.rolePermissions.entries) {
      if (entry.value.contains(permission)) {
        rolesWithPermission.add(entry.key);
      }
    }
    
    return rolesWithPermission;
  }
  
  /// Get role hierarchy level (0 = highest, 6 = lowest)
  static int getRoleLevel(String role) {
    const roleLevels = {
      'super_admin': 0,
      'company_admin': 1,
      'area_manager': 2,
      'manager': 3,
      'asisten': 4,
      'satpam': 4, // Same level as asisten
      'mandor': 5,
    };
    
    return roleLevels[role.toLowerCase()] ?? 6;
  }
  
  /// Check if first role has higher authority than second role
  static bool hasHigherAuthority(String role1, String role2) {
    return getRoleLevel(role1) < getRoleLevel(role2);
  }
  
  /// Check if role can manage another role
  static bool canManageRole(String managerRole, String targetRole) {
    // Super admin can manage all roles
    if (managerRole.toLowerCase() == 'super_admin') return true;
    
    // Company admin can manage roles below area manager
    if (managerRole.toLowerCase() == 'company_admin') {
      return getRoleLevel(targetRole) > 1;
    }
    
    // Area manager can manage roles below manager
    if (managerRole.toLowerCase() == 'area_manager') {
      return getRoleLevel(targetRole) > 2;
    }
    
    // Manager can manage asisten, satpam, mandor
    if (managerRole.toLowerCase() == 'manager') {
      return getRoleLevel(targetRole) > 3;
    }
    
    // Asisten can manage mandor (in their division)
    if (managerRole.toLowerCase() == 'asisten') {
      return targetRole.toLowerCase() == 'mandor';
    }
    
    return false;
  }
  
  /// Get dashboard features available for role
  static List<String> getDashboardFeatures(String role) {
    final features = <String>[];
    final permissions = getRolePermissions(role);
    
    // Add features based on permissions
    if (permissions.contains('harvest_input')) {
      features.add('harvest_input');
    }
    
    if (permissions.contains('harvest_approval')) {
      features.add('approval_workflow');
    }
    
    if (permissions.contains('gate_check')) {
      features.add('gate_check');
    }
    
    if (permissions.contains('qr_scanner')) {
      features.add('qr_scanner');
    }
    
    if (permissions.any((p) => p.contains('monitoring'))) {
      features.add('monitoring');
    }
    
    if (permissions.any((p) => p.contains('reporting'))) {
      features.add('reporting');
    }
    
    if (permissions.contains('user_management') || 
        permissions.contains('user_management_global')) {
      features.add('user_management');
    }
    
    if (permissions.contains('system_configuration') ||
        permissions.contains('system_administration')) {
      features.add('system_admin');
    }
    
    return features;
  }
  
  /// Check if role is operational (field-based) or administrative
  static bool isOperationalRole(String role) {
    const operationalRoles = ['mandor', 'asisten', 'satpam', 'manager'];
    return operationalRoles.contains(role.toLowerCase());
  }
  
  /// Check if role is administrative
  static bool isAdministrativeRole(String role) {
    const adminRoles = ['area_manager', 'company_admin', 'super_admin'];
    return adminRoles.contains(role.toLowerCase());
  }
  
  /// Check if role has essential permissions for mobile app
  static bool hasEssentialPermissions(String role) {
    final permissions = getRolePermissions(role);
    
    // Every role should have at least basic permissions
    if (permissions.isEmpty) return false;
    
    // Operational roles need offline mode
    if (isOperationalRole(role)) {
      return permissions.contains('offline_mode');
    }
    
    // Administrative roles need user management or reporting
    if (isAdministrativeRole(role)) {
      return permissions.any((p) => 
        p.contains('user_management') || 
        p.contains('reporting') || 
        p.contains('monitoring')
      );
    }
    
    return true;
  }
  
  /// Get role-specific dashboard features for mobile
  static List<String> getMobileDashboardFeatures(String role) {
    final features = <String>[];
    final permissions = getRolePermissions(role);
    
    // Add mobile-optimized features based on permissions
    if (permissions.contains('harvest_input')) {
      features.addAll(['harvest_form', 'employee_selection', 'tbs_quality']);
    }
    
    if (permissions.contains('harvest_approval')) {
      features.addAll(['approval_queue', 'swipe_approval', 'quality_review']);
    }
    
    if (permissions.contains('gate_check')) {
      features.addAll(['gate_form', 'qr_scanner', 'vehicle_tracker']);
    }
    
    if (permissions.any((p) => p.contains('monitoring'))) {
      features.addAll(['dashboard_cards', 'performance_charts', 'quick_stats']);
    }
    
    if (permissions.any((p) => p.contains('reporting'))) {
      features.addAll(['mobile_reports', 'export_data', 'analytics_view']);
    }
    
    if (permissions.contains('user_management')) {
      features.addAll(['team_directory', 'user_profiles', 'assignment_view']);
    }
    
    // Common mobile features
    features.addAll(['notifications', 'profile_settings', 'sync_status']);
    
    // Offline features for operational roles
    if (isOperationalRole(role)) {
      features.addAll(['offline_indicator', 'sync_queue', 'conflict_resolution']);
    }
    
    return features;
  }
  
  /// Check if role can access specific mobile feature
  static bool canAccessMobileFeature(String role, String feature) {
    final mobileFeatures = getMobileDashboardFeatures(role);
    return mobileFeatures.contains(feature);
  }
  
  /// Get role-specific navigation items for mobile
  static List<String> getMobileNavigationItems(String role) {
    final items = <String>['dashboard'];
    final permissions = getRolePermissions(role);
    
    if (permissions.contains('harvest_input')) {
      items.add('harvest');
    }
    
    if (permissions.contains('harvest_approval')) {
      items.add('approvals');
    }
    
    if (permissions.contains('gate_check')) {
      items.add('gate_check');
    }
    
    if (permissions.any((p) => p.contains('monitoring'))) {
      items.add('monitoring');
    }
    
    if (permissions.any((p) => p.contains('reporting'))) {
      items.add('reports');
    }
    
    if (permissions.contains('user_management')) {
      items.add('users');
    }
    
    // Always include profile
    items.add('profile');
    
    return items;
  }
  
  /// Get offline capabilities for role
  static Map<String, dynamic> getOfflineCapabilities(String role) {
    final permissions = getRolePermissions(role);
    
    return {
      'canWorkOffline': permissions.contains('offline_mode'),
      'canInputData': permissions.contains('harvest_input') || permissions.contains('gate_check'),
      'canApproveOffline': permissions.contains('harvest_approval'),
      'canViewReports': permissions.any((p) => p.contains('monitoring') || p.contains('reporting')),
      'canSyncData': permissions.contains('offline_mode'),
      'offlineDurationDays': _getOfflineDuration(role)['days'],
    };
  }
  
  static Map<String, dynamic> _getOfflineDuration(String role) {
    switch (role.toLowerCase()) {
      case 'mandor':
        return {'days': 30, 'description': '30-day offline operation'};
      case 'asisten':
        return {'days': 14, 'description': '14-day offline operation'};  
      case 'satpam':
        return {'days': 30, 'description': '30-day offline operation'};
      case 'manager':
        return {'days': 7, 'description': '7-day offline operation'};
      default:
        return {'days': 1, 'description': '1-day offline operation'};
    }
  }
}