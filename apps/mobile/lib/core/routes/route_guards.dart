import 'package:flutter/material.dart';
import 'package:logger/logger.dart';

import '../services/role_service.dart';
import '../../features/auth/presentation/pages/unauthorized_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import 'app_routes.dart';

class RouteGuard {
  static final Logger _logger = Logger();
  
  // Check if user can access a specific route
  static bool canAccessRoute(String route, String? userRole) {
    if (userRole == null) {
      _logger.w('User role is null, denying access to route: $route');
      return false;
    }
    
    // Get required permissions for the route
    final requiredPermissions = _getRoutePermissions(route);
    
    if (requiredPermissions.isEmpty) {
      // Public routes or routes that don't require specific permissions
      return true;
    }
    
    // Check if user has any of the required permissions
    final userPermissions = RoleService.getRolePermissions(userRole);
    final hasAccess = requiredPermissions.any(
      (required) => userPermissions.contains(required),
    );
    
    _logger.d('Route access check: $route, Role: $userRole, Access: $hasAccess');
    return hasAccess;
  }
  
  // Get required permissions for a route
  static List<String> _getRoutePermissions(String route) {
    switch (route) {
      // Auth routes - public
      case AppRoutes.login:
      case AppRoutes.initial:
        return [];
        
      // Dashboard routes - role-specific
      case AppRoutes.mandor:
        return ['harvest_input'];
        
      case AppRoutes.asisten:
        return ['harvest_approval'];
        
      case AppRoutes.manager:
        return ['harvest_view_estate', 'monitoring_estate'];
        
      case AppRoutes.areaManager:
        return ['harvest_view_multi_estate', 'monitoring_multi_estate'];
        
      case AppRoutes.satpam:
        return ['gate_check'];
        
      case AppRoutes.companyAdmin:
        return ['user_management', 'harvest_view_company'];
        
      case AppRoutes.superAdmin:
        return ['system_administration', 'multi_company_access'];
        
      // Feature routes
      case '/harvest':
        return ['harvest_input', 'harvest_approval'];
        
      case '/gate-check':
        return ['gate_check'];
        
      case '/approvals':
        return ['harvest_approval'];
        
      case '/monitoring':
        return ['monitoring_estate', 'monitoring_multi_estate', 'monitoring_company', 'monitoring_global'];
        
      case '/reports':
        return ['reporting_estate', 'reporting_multi_estate', 'reporting_company', 'reporting_global'];
        
      case '/users':
        return ['user_management', 'user_management_global'];
        
      case '/settings':
        return ['system_configuration', 'system_administration'];
        
      // Profile routes - accessible to all authenticated users
      case AppRoutes.profile:
      case AppRoutes.dashboard:
        return [];
        
      default:
        _logger.w('Unknown route permissions: $route');
        return ['authenticated']; // Require authentication for unknown routes
    }
  }
  
  // Create a route with access control
  static Route<dynamic> createGuardedRoute({
    required String routeName,
    required Widget Function(BuildContext) builder,
    required String? userRole,
    RouteSettings? settings,
  }) {
    return MaterialPageRoute(
      settings: settings,
      builder: (context) {
        // Check if user can access the route
        if (!canAccessRoute(routeName, userRole)) {
          _logger.w('Access denied for route: $routeName, role: $userRole');
          
          // If no user role (not logged in), redirect to login
          if (userRole == null) {
            return LoginPage();
          }
          
          // If logged in but no permission, show unauthorized page
          return UnauthorizedPage(
            attemptedRoute: routeName,
            userRole: userRole,
          );
        }
        
        return builder(context);
      },
    );
  }
  
  // Check if route exists and user has access
  static bool isRouteAccessible(String routeName, String? userRole) {
    if (!AppRoutes.routeExists(routeName)) {
      return false;
    }
    
    return canAccessRoute(routeName, userRole);
  }
  
  // Get accessible routes for a user role
  static List<String> getAccessibleRoutes(String userRole) {
    final allRoutes = AppRoutes.getAllDashboardRoutes();
    final accessibleRoutes = <String>[];
    
    for (final route in allRoutes) {
      if (canAccessRoute(route, userRole)) {
        accessibleRoutes.add(route);
      }
    }
    
    return accessibleRoutes;
  }
  
  // Get navigation items accessible to user role
  static List<NavigationItem> getAccessibleNavigation(String userRole) {
    final navigationItems = <NavigationItem>[];
    
    // Dashboard - always accessible for authenticated users
    navigationItems.add(NavigationItem(
      route: AppRoutes.dashboard,
      title: 'Dashboard',
      icon: Icons.dashboard,
    ));
    
    // Role-specific navigation items
    final permissions = RoleService.getRolePermissions(userRole);
    
    if (permissions.contains('harvest_input')) {
      navigationItems.add(NavigationItem(
        route: '/harvest',
        title: 'Harvest',
        icon: Icons.agriculture,
      ));
    }
    
    if (permissions.contains('harvest_approval')) {
      navigationItems.add(NavigationItem(
        route: '/approvals',
        title: 'Approvals',
        icon: Icons.approval,
      ));
    }
    
    if (permissions.contains('gate_check')) {
      navigationItems.add(NavigationItem(
        route: '/gate-check',
        title: 'Gate Check',
        icon: Icons.security,
      ));
    }
    
    if (permissions.any((p) => p.contains('monitoring'))) {
      navigationItems.add(NavigationItem(
        route: '/monitoring',
        title: 'Monitoring',
        icon: Icons.monitoring,
      ));
    }
    
    if (permissions.any((p) => p.contains('reporting'))) {
      navigationItems.add(NavigationItem(
        route: '/reports',
        title: 'Reports',
        icon: Icons.assessment,
      ));
    }
    
    if (permissions.contains('user_management') || permissions.contains('user_management_global')) {
      navigationItems.add(NavigationItem(
        route: '/users',
        title: 'Users',
        icon: Icons.people,
      ));
    }
    
    // Profile - always accessible
    navigationItems.add(NavigationItem(
      route: AppRoutes.profile,
      title: 'Profile',
      icon: Icons.person,
    ));
    
    return navigationItems;
  }
  
  // Validate navigation attempt
  static NavigationResult validateNavigation({
    required String fromRoute,
    required String toRoute,
    required String? userRole,
  }) {
    // Check if destination route is accessible
    if (!canAccessRoute(toRoute, userRole)) {
      return NavigationResult(
        allowed: false,
        reason: 'Insufficient permissions for route: $toRoute',
        redirectTo: userRole != null ? AppRoutes.getDashboardRoute(userRole) : AppRoutes.login,
      );
    }
    
    // Check for special navigation rules
    if (_hasNavigationRestrictions(fromRoute, toRoute, userRole)) {
      return NavigationResult(
        allowed: false,
        reason: 'Navigation restricted from $fromRoute to $toRoute',
        redirectTo: fromRoute,
      );
    }
    
    return NavigationResult(
      allowed: true,
      reason: 'Navigation allowed',
    );
  }
  
  // Check for special navigation restrictions
  static bool _hasNavigationRestrictions(String fromRoute, String toRoute, String? userRole) {
    // Add any special navigation restrictions here
    // For example, prevent certain role transitions, enforce workflows, etc.
    
    return false;
  }
  
  // Get default route for role
  static String getDefaultRoute(String userRole) {
    return AppRoutes.getDashboardRoute(userRole);
  }
  
  // Check if user can navigate between specific routes
  static bool canNavigateBetween(String fromRoute, String toRoute, String userRole) {
    final result = validateNavigation(
      fromRoute: fromRoute,
      toRoute: toRoute,
      userRole: userRole,
    );
    return result.allowed;
  }
}

class NavigationItem {
  final String route;
  final String title;
  final IconData icon;
  final String? badge;
  final bool isActive;
  
  const NavigationItem({
    required this.route,
    required this.title,
    required this.icon,
    this.badge,
    this.isActive = false,
  });
  
  NavigationItem copyWith({
    String? route,
    String? title,
    IconData? icon,
    String? badge,
    bool? isActive,
  }) {
    return NavigationItem(
      route: route ?? this.route,
      title: title ?? this.title,
      icon: icon ?? this.icon,
      badge: badge ?? this.badge,
      isActive: isActive ?? this.isActive,
    );
  }
}

class NavigationResult {
  final bool allowed;
  final String reason;
  final String? redirectTo;
  
  const NavigationResult({
    required this.allowed,
    required this.reason,
    this.redirectTo,
  });
}