import { lazy, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import type { UserRole } from '@/types/user';
import type { RoleDashboardProps } from '@/features/dashboard/types/dashboard';

// Complete role-specific dashboard components with different layouts per role
// Each role gets completely different dashboard UI and functionality
// TEMPORARY: Using existing components as fallbacks until new ones are created

// Role-specific dashboard components are dynamically imported to isolate errors and reduce bundle size
const SuperAdminDashboard = lazy(() => import('@/features/super-admin-dashboard/components/SuperAdminDashboard'));
const CompanyAdminDashboard = lazy(() => import('@/features/company-admin-dashboard/components/CompanyAdminDashboard'));
const AreaManagerDashboard = lazy(() => import('@/features/area-manager-dashboard/components/AreaManagerDashboard'));
const ManagerDashboard = lazy(() => import('@/features/manager-dashboard/components/ManagerDashboard'));
const AsistenDashboard = lazy(() => import('@/features/asisten-dashboard/components/AsistenDashboard'));
const MandorDashboard = lazy(() => import('@/features/mandor-dashboard/components/MandorDashboard'));
const SatpamDashboard = lazy(() => import('@/features/satpam-dashboard/components/SatpamDashboard'));
const TimbangDashboard = lazy(() => import('@/features/timbangan-dashboard/components/TimbangDashboard'));
const GradingDashboard = lazy(() => import('@/features/grading-dashboard/components/GradingDashboard'));

export const DASHBOARD_COMPONENTS: Record<UserRole, LazyExoticComponent<ComponentType<RoleDashboardProps>>> = {
  'SUPER_ADMIN': SuperAdminDashboard,
  'COMPANY_ADMIN': CompanyAdminDashboard,
  'AREA_MANAGER': AreaManagerDashboard,
  'MANAGER': ManagerDashboard,
  'ASISTEN': AsistenDashboard,
  'MANDOR': MandorDashboard,
  'SATPAM': SatpamDashboard,
  'TIMBANGAN': TimbangDashboard,
  'GRADING': GradingDashboard,
};

// Helper function to get dashboard component for a role
export function getDashboardComponent(role: UserRole) {
  return DASHBOARD_COMPONENTS[role];
}

// Helper function to check if role has dashboard access
export function hasDashboardAccess(role: UserRole): boolean {
  return Object.keys(DASHBOARD_COMPONENTS).includes(role);
}

// Default dashboard component for fallback
export const DefaultDashboard = lazy(() => import('@/components/dashboard/DefaultDashboard'));

type LayoutUser = {
  name?: string | null;
  email?: string | null;
};

type LayoutWrapperProps = {
  children: ReactNode;
  role: UserRole;
  user?: LayoutUser;
};

function DashboardLayoutShell({ children }: LayoutWrapperProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="flex-1">{children}</div>
    </div>
  );
}

const ExecutiveLayout = ({ children, role, user }: LayoutWrapperProps) => (
  <DashboardLayoutShell role={role} user={user}>
    {children}
  </DashboardLayoutShell>
);

const ManagementLayout = ({ children, role, user }: LayoutWrapperProps) => (
  <DashboardLayoutShell role={role} user={user}>
    {children}
  </DashboardLayoutShell>
);

const OperationsLayout = ({ children, role, user }: LayoutWrapperProps) => (
  <DashboardLayoutShell role={role} user={user}>
    {children}
  </DashboardLayoutShell>
);

const SecurityLayout = ({ children, role, user }: LayoutWrapperProps) => (
  <DashboardLayoutShell role={role} user={user}>
    {children}
  </DashboardLayoutShell>
);

export const DASHBOARD_LAYOUTS = {
  // Executive layout - for admin roles
  EXECUTIVE: lazy(() => Promise.resolve({ default: ExecutiveLayout })),

  // Management layout - for manager and asisten roles
  MANAGEMENT: lazy(() => Promise.resolve({ default: ManagementLayout })),

  // Operations layout - for field roles
  OPERATIONS: lazy(() => Promise.resolve({ default: OperationsLayout })),

  // Security layout - for satpam role
  SECURITY: lazy(() => Promise.resolve({ default: SecurityLayout })),
};

// Helper function to get layout type for role
export function getDashboardLayoutType(role: UserRole): keyof typeof DASHBOARD_LAYOUTS {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'COMPANY_ADMIN':
    case 'AREA_MANAGER':
      return 'EXECUTIVE';

    case 'MANAGER':
    case 'ASISTEN':
      return 'MANAGEMENT';

    case 'MANDOR':
    case 'TIMBANGAN':
    case 'GRADING':
      return 'OPERATIONS';

    case 'SATPAM':
      return 'SECURITY';

    default:
      return 'OPERATIONS';
  }
}
