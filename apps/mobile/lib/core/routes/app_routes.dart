import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../di/service_locator.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/auth_wrapper.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../../features/dashboard/presentation/pages/mandor_page.dart';
import '../../features/dashboard/presentation/pages/asisten_page.dart';
import '../../features/dashboard/presentation/pages/manager_page.dart';
import '../../features/dashboard/presentation/pages/area_manager_page.dart';
import '../../features/dashboard/presentation/pages/satpam_page.dart';
import '../../features/dashboard/presentation/pages/company_admin_page.dart';
import '../../features/dashboard/presentation/pages/super_admin_page.dart';
import '../../features/settings/pages/settings_page.dart';
import '../../features/settings/pages/admin_settings_page.dart';
import '../../features/harvest/presentation/pages/harvest_input_screen.dart';
import '../../features/harvest/presentation/blocs/harvest_bloc.dart';
import '../../features/auth/presentation/pages/web_qr_login_page.dart';

class AppRoutes {
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();
  static const String login = '/login';
  static const String authWrapper = '/';
  static const String dashboard = '/dashboard';
  static const String mandor = '/mandor';
  static const String asisten = '/asisten';
  static const String manager = '/manager';
  static const String areaManager = '/area_manager';
  static const String satpam = '/satpam';
  static const String companyAdmin = '/company_admin';
  static const String superAdmin = '/super_admin';
  static const String settingsPage = '/settings';
  static const String adminSettingsPage = '/settings/admin';
  static const String harvestInput = '/harvest/input';
  static const String webQRLogin = '/web_qr_login';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case authWrapper:
        return MaterialPageRoute(builder: (_) => const AuthWrapper());
      case login:
        return MaterialPageRoute(builder: (_) => const LoginPage());
      case dashboard:
        return MaterialPageRoute(builder: (_) => const DashboardPage());
      case mandor:
        return MaterialPageRoute(builder: (_) => const MandorPage());
      case asisten:
        return MaterialPageRoute(builder: (_) => const AsistenPage());
      case manager:
        return MaterialPageRoute(builder: (_) => const ManagerPage());
      case areaManager:
        return MaterialPageRoute(builder: (_) => const AreaManagerPage());
      case satpam:
        return MaterialPageRoute(builder: (_) => const SatpamPage());
      case companyAdmin:
        return MaterialPageRoute(builder: (_) => const CompanyAdminPage());
      case superAdmin:
        return MaterialPageRoute(builder: (_) => const SuperAdminPage());
      case settingsPage:
        return MaterialPageRoute(builder: (_) => const SettingsPage());
      case adminSettingsPage:
        return MaterialPageRoute(builder: (_) => const AdminSettingsPage());
      case harvestInput:
        return MaterialPageRoute(
          builder: (_) => BlocProvider(
            create: (context) => ServiceLocator.get<HarvestBloc>(),
            child: const HarvestInputScreen(),
          ),
        );
      case webQRLogin:
        return MaterialPageRoute(builder: (_) => const WebQRLoginPage());
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(child: Text('No route defined for ${settings.name}')),
          ),
        );
    }
  }

  static String getDashboardRoute(String role) {
    switch (role) {
      case 'MANDOR':
        return mandor;
      case 'ASISTEN':
        return asisten;
      case 'MANAGER':
        return manager;
      case 'AREA_MANAGER':
        return areaManager;
      case 'SATPAM':
        return satpam;
      case 'COMPANY_ADMIN':
        return companyAdmin;
      case 'SUPER_ADMIN':
        return superAdmin;
      default:
        return dashboard;
    }
  }

  static List<String> get allRoutes {
    return [
      mandor,
      asisten,
      manager,
      areaManager,
      satpam,
      companyAdmin,
      superAdmin,
    ];
  }

  // Get route name from role
  static String getRouteFromRole(String role) {
    return getDashboardRoute(role);
  }

  // Get role from route name
  static String? getRoleFromRoute(String routeName) {
    switch (routeName) {
      case mandor:
        return 'MANDOR';
      case asisten:
        return 'ASISTEN';
      case manager:
        return 'MANAGER';
      case areaManager:
        return 'AREA_MANAGER';
      case satpam:
        return 'SATPAM';
      case companyAdmin:
        return 'COMPANY_ADMIN';
      case superAdmin:
        return 'SUPER_ADMIN';
      default:
        return null;
    }
  }
}
