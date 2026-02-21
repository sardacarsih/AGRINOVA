# 🎯 Best Practice: Multi-Role Implementation di Next.js

**Enterprise-Grade, Clean, dan Scalable**

## 📋 Table of Contents

1. [Konsep Utama](#konsep-utama)
2. [Struktur Folder](#struktur-folder)
3. [Type Definitions](#type-definitions)
4. [Middleware & Route Protection](#middleware--route-protection)
5. [Dynamic Layouts](#dynamic-layouts)
6. [Role-Based Sidebar](#role-based-sidebar)
7. [Dashboard Components](#dashboard-components)
8. [Best Practices](#best-practices)

---

## 🎯 Konsep Utama

### 1. **Role disimpan di Session (JWT/NextAuth)**
```typescript
// types/auth.ts
export type UserRole = 'super_admin' | 'company_admin' | 'mandor' | 'asisten' | 'satpam' | 'manager' | 'area_manager';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  // ... other fields
}
```

### 2. **Middleware mengecek akses halaman**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get user session (from cookie/JWT)
  const session = getSession(request);
  
  // Check if user has access to this route
  if (!hasAccess(session?.user?.role, pathname)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

### 3. **Dynamic layout sesuai role**
```typescript
// app/[locale]/dashboard/layout.tsx
import { getRoleLayout } from '@/lib/layouts';

export default async function DashboardLayout({ children }: { children: React.Node }) {
  const session = await getServerSession();
  const RoleLayout = getRoleLayout(session.user.role);
  
  return <RoleLayout>{children}</RoleLayout>;
}
```

### 4. **Dashboard berbeda untuk setiap role**
```typescript
// app/[locale]/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { DEFAULT_DASHBOARD_PATHS } from '@/types/auth';

export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Redirect to role-specific dashboard
  redirect(DEFAULT_DASHBOARD_PATHS[session.user.role]);
}
```

### 5. **Sidebar otomatis menyesuaikan role**
```typescript
// components/layout/sidebar.tsx
import { ROLE_NAVIGATION } from '@/types/auth';

export function Sidebar({ userRole }: { userRole: UserRole }) {
  const navigationItems = ROLE_NAVIGATION[userRole];
  
  return (
    <nav>
      {navigationItems.map((item) => (
        <NavItem key={item.path} {...item} />
      ))}
    </nav>
  );
}
```

---

## 📁 Struktur Folder

```
apps/web/
├── app/
│   └── [locale]/
│       ├── dashboard/
│       │   ├── layout.tsx                    # Dynamic layout wrapper
│       │   ├── page.tsx                      # Redirects to role dashboard
│       │   ├── super-admin/
│       │   │   ├── layout.tsx                # Super Admin specific layout
│       │   │   ├── page.tsx                  # Super Admin dashboard
│       │   │   ├── companies/
│       │   │   ├── company-admins/
│       │   │   └── system-logs/
│       │   ├── company-admin/
│       │   │   ├── layout.tsx                # Company Admin specific layout
│       │   │   ├── page.tsx                  # Company Admin dashboard
│       │   │   ├── estates/
│       │   │   ├── divisions/
│       │   │   └── users/
│       │   ├── manager/
│       │   ├── area-manager/
│       │   ├── mandor/
│       │   ├── asisten/
│       │   └── satpam/
│       └── login/
├── components/
│   ├── layout/
│   │   ├── sidebar/
│   │   │   ├── UniversalSidebar.tsx          # Main sidebar component
│   │   │   ├── SuperAdminSidebar.tsx         # Super Admin sidebar
│   │   │   ├── CompanyAdminSidebar.tsx       # Company Admin sidebar
│   │   │   └── ...                           # Other role sidebars
│   │   ├── topbar.tsx
│   │   └── layouts/
│   │       ├── SuperAdminLayout.tsx
│   │       ├── CompanyAdminLayout.tsx
│   │       └── ...
│   └── dashboard/
│       ├── super-admin/
│       ├── company-admin/
│       └── ...
├── lib/
│   ├── auth/
│   │   ├── permissions.ts                    # Permission checking utilities
│   │   ├── session.ts                        # Session management
│   │   └── middleware-helpers.ts             # Middleware utilities
│   └── layouts/
│       └── get-role-layout.ts                # Layout resolver
├── types/
│   └── auth.ts                               # All auth-related types
└── middleware.ts                             # Route protection
```

---

## 🔧 Type Definitions

### Complete Auth Types (`types/auth.ts`)

```typescript
// Role definition
export type UserRole = 
  | 'super_admin' 
  | 'company_admin' 
  | 'mandor' 
  | 'asisten' 
  | 'satpam' 
  | 'manager' 
  | 'area_manager';

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  company?: string;
  companyId?: string;
  estate?: string;
  divisi?: string;
}

// Permission definitions
export const PERMISSIONS = {
  // Super Admin
  SUPER_ADMIN_ALL: 'super_admin:all',
  COMPANY_CREATE: 'company:create',
  COMPANY_READ: 'company:read',
  
  // Company Admin
  COMPANY_ADMIN_ALL: 'company_admin:all',
  ESTATE_CREATE: 'estate:create',
  ESTATE_READ: 'estate:read',
  
  // ... more permissions
} as const;

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  'super_admin': [
    PERMISSIONS.SUPER_ADMIN_ALL,
    PERMISSIONS.COMPANY_CREATE,
    // ... all super admin permissions
  ],
  'company_admin': [
    PERMISSIONS.COMPANY_ADMIN_ALL,
    PERMISSIONS.ESTATE_CREATE,
    // ... all company admin permissions
  ],
  // ... other roles
};

// Navigation configuration
export const ROLE_NAVIGATION: Record<UserRole, Array<{
  label: string;
  path: string;
  icon: string;
  permissions?: string[];
}>> = {
  'super_admin': [
    { label: 'items.dashboard', path: '/dashboard/super-admin', icon: 'BarChart3' },
    { label: 'items.companyManagement', path: '/dashboard/super-admin/companies', icon: 'Building' },
    // ... more navigation items
  ],
  // ... other roles
};

// Default dashboard paths
export const DEFAULT_DASHBOARD_PATHS: Record<UserRole, string> = {
  'super_admin': '/dashboard/super-admin',
  'company_admin': '/dashboard/company-admin',
  'mandor': '/dashboard/mandor',
  'asisten': '/dashboard/asisten',
  'satpam': '/dashboard/satpam',
  'manager': '/dashboard/manager',
  'area_manager': '/dashboard/area-manager',
};
```

---

## 🛡️ Middleware & Route Protection

### 1. **Main Middleware** (`middleware.ts`)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ROLE_PERMISSIONS } from '@/types/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get user token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  // Redirect to login if not authenticated
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Check role-based access
  if (token && pathname.startsWith('/dashboard')) {
    const userRole = token.role as UserRole;
    const allowedPath = isPathAllowedForRole(pathname, userRole);
    
    if (!allowedPath) {
      return NextResponse.redirect(
        new URL(DEFAULT_DASHBOARD_PATHS[userRole], request.url)
      );
    }
  }
  
  return NextResponse.next();
}

function isPathAllowedForRole(pathname: string, role: UserRole): boolean {
  // Extract role from path (e.g., /dashboard/super-admin/companies -> super-admin)
  const pathRole = pathname.split('/')[2];
  
  // Convert path role format to UserRole format
  const normalizedPathRole = pathRole.replace('-', '_') as UserRole;
  
  return normalizedPathRole === role;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 2. **Permission Checker** (`lib/auth/permissions.ts`)

```typescript
import { ROLE_PERMISSIONS, type UserRole } from '@/types/auth';

export class PermissionManager {
  static hasPermission(userRole: UserRole, permission: string): boolean {
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    return rolePermissions.includes(permission);
  }
  
  static hasAnyPermission(userRole: UserRole, permissions: string[]): boolean {
    return permissions.some(permission => 
      this.hasPermission(userRole, permission)
    );
  }
  
  static hasAllPermissions(userRole: UserRole, permissions: string[]): boolean {
    return permissions.every(permission => 
      this.hasPermission(userRole, permission)
    );
  }
  
  static canAccessRoute(userRole: UserRole, pathname: string): boolean {
    // Implement route-based permission checking
    const routePermissions = getRoutePermissions(pathname);
    return this.hasAnyPermission(userRole, routePermissions);
  }
}

function getRoutePermissions(pathname: string): string[] {
  // Map routes to required permissions
  const routePermissionMap: Record<string, string[]> = {
    '/dashboard/super-admin/companies': ['company:create', 'company:read'],
    '/dashboard/company-admin/estates': ['estate:create', 'estate:read'],
    // ... more routes
  };
  
  return routePermissionMap[pathname] || [];
}
```

---

## 🎨 Dynamic Layouts

### 1. **Layout Resolver** (`lib/layouts/get-role-layout.ts`)

```typescript
import type { UserRole } from '@/types/auth';
import SuperAdminLayout from '@/components/layout/layouts/SuperAdminLayout';
import CompanyAdminLayout from '@/components/layout/layouts/CompanyAdminLayout';
import ManagerLayout from '@/components/layout/layouts/ManagerLayout';
// ... import other layouts

export function getRoleLayout(role: UserRole) {
  const layoutMap = {
    'super_admin': SuperAdminLayout,
    'company_admin': CompanyAdminLayout,
    'manager': ManagerLayout,
    'area_manager': ManagerLayout, // Reuse manager layout
    'mandor': ManagerLayout,
    'asisten': ManagerLayout,
    'satpam': ManagerLayout,
  };
  
  return layoutMap[role] || ManagerLayout;
}
```

### 2. **Base Layout Component** (`components/layout/layouts/BaseLayout.tsx`)

```typescript
'use client';

import { ReactNode } from 'react';
import { Topbar } from '../topbar';
import { UniversalSidebar } from '../sidebar/UniversalSidebar';
import type { UserRole } from '@/types/auth';

interface BaseLayoutProps {
  children: ReactNode;
  userRole: UserRole;
  sidebarComponent?: ReactNode;
}

export function BaseLayout({ 
  children, 
  userRole,
  sidebarComponent 
}: BaseLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r">
        {sidebarComponent || <UniversalSidebar userRole={userRole} />}
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar userRole={userRole} />
        
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 3. **Role-Specific Layout** (`components/layout/layouts/SuperAdminLayout.tsx`)

```typescript
'use client';

import { ReactNode } from 'react';
import { BaseLayout } from './BaseLayout';
import { SuperAdminSidebar } from '../sidebar/SuperAdminSidebar';
import type { UserRole } from '@/types/auth';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return (
    <BaseLayout 
      userRole="super_admin"
      sidebarComponent={<SuperAdminSidebar />}
    >
      {children}
    </BaseLayout>
  );
}
```

---

## 📱 Role-Based Sidebar

### 1. **Universal Sidebar** (`components/layout/sidebar/UniversalSidebar.tsx`)

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { ROLE_NAVIGATION, type UserRole } from '@/types/auth';
import { NavItem } from './NavItem';

interface UniversalSidebarProps {
  userRole: UserRole;
}

export function UniversalSidebar({ userRole }: UniversalSidebarProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const navigationItems = ROLE_NAVIGATION[userRole];
  
  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">Agrinova</h1>
      </div>
      
      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        {navigationItems.map((item) => (
          <NavItem
            key={item.path}
            label={t(item.label)}
            path={item.path}
            icon={item.icon}
            isActive={pathname === item.path}
          />
        ))}
      </div>
      
      {/* User Info */}
      <div className="p-4 border-t">
        <p className="text-sm text-gray-600">
          {t(`roles.${userRole}.label`)}
        </p>
      </div>
    </nav>
  );
}
```

### 2. **Nav Item Component** (`components/layout/sidebar/NavItem.tsx`)

```typescript
'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface NavItemProps {
  label: string;
  path: string;
  icon: string;
  isActive?: boolean;
}

export function NavItem({ label, path, icon, isActive }: NavItemProps) {
  const Icon = Icons[icon as keyof typeof Icons] as any;
  
  return (
    <Link
      href={path}
      className={cn(
        'flex items-center gap-3 px-4 py-3 text-sm transition-colors',
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'text-gray-700 hover:bg-gray-100'
      )}
    >
      {Icon && <Icon className="h-5 w-5" />}
      <span>{label}</span>
    </Link>
  );
}
```

---

## 📊 Dashboard Components

### 1. **Main Dashboard Page** (`app/[locale]/dashboard/page.tsx`)

```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { DEFAULT_DASHBOARD_PATHS } from '@/types/auth';

export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Redirect to role-specific dashboard
  redirect(DEFAULT_DASHBOARD_PATHS[session.user.role]);
}
```

### 2. **Role-Specific Dashboard** (`app/[locale]/dashboard/super-admin/page.tsx`)

```typescript
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SuperAdminDashboard } from '@/components/dashboard/super-admin/SuperAdminDashboard';

export default async function SuperAdminDashboardPage() {
  const session = await getServerSession();
  const t = await getTranslations('dashboard');
  
  // Verify user has correct role
  if (session?.user?.role !== 'super_admin') {
    redirect('/dashboard');
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        {t('superAdmin.title')}
      </h1>
      
      <SuperAdminDashboard />
    </div>
  );
}
```

### 3. **Dashboard Client Component** (`components/dashboard/super-admin/SuperAdminDashboard.tsx`)

```typescript
'use client';

import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_STATS } from '@/graphql/queries';
import { StatsCard } from '@/components/ui/stats-card';
import { RecentActivity } from './RecentActivity';

export function SuperAdminDashboard() {
  const { data, loading } = useQuery(GET_DASHBOARD_STATS);
  
  if (loading) return <DashboardSkeleton />;
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Companies"
          value={data.totalCompanies}
          icon="Building"
        />
        <StatsCard
          title="Total Users"
          value={data.totalUsers}
          icon="Users"
        />
        {/* More stats */}
      </div>
      
      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}
```

---

## ✅ Best Practices

### 1. **Separation of Concerns**
- **Types**: Semua type definitions di `types/auth.ts`
- **Permissions**: Logic permission di `lib/auth/permissions.ts`
- **Layouts**: Layout components terpisah per role
- **Components**: Dashboard components terpisah per role

### 2. **Type Safety**
```typescript
// ✅ GOOD: Type-safe role checking
function getRoleDashboard(role: UserRole) {
  return DEFAULT_DASHBOARD_PATHS[role]; // TypeScript will catch errors
}

// ❌ BAD: String-based role checking
function getRoleDashboard(role: string) {
  return `/dashboard/${role}`; // No type safety
}
```

### 3. **Server Components for Auth**
```typescript
// ✅ GOOD: Check auth in Server Component
export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  // ...
}

// ❌ BAD: Check auth in Client Component
'use client';
export default function DashboardPage() {
  const { data: session } = useSession();
  // This causes flash of unauthorized content
}
```

### 4. **Permission-Based Rendering**
```typescript
// ✅ GOOD: Hide UI elements based on permissions
{PermissionManager.hasPermission(userRole, 'company:create') && (
  <CreateCompanyButton />
)}

// ❌ BAD: Show everything and disable
<CreateCompanyButton 
  disabled={!PermissionManager.hasPermission(userRole, 'company:create')}
/>
```

### 5. **Centralized Navigation Config**
```typescript
// ✅ GOOD: Single source of truth
const navigationItems = ROLE_NAVIGATION[userRole];

// ❌ BAD: Hardcoded navigation per component
const navigationItems = [
  { label: 'Dashboard', path: '/dashboard/super-admin' },
  // ...
];
```

### 6. **i18n Integration**
```typescript
// ✅ GOOD: Translation keys in navigation config
{ label: 'items.dashboard', path: '/dashboard/super-admin', icon: 'BarChart3' }

// Then in component:
const t = useTranslations('navigation');
<NavItem label={t(item.label)} />

// ❌ BAD: Hardcoded strings
{ label: 'Dashboard', path: '/dashboard/super-admin', icon: 'BarChart3' }
```

### 7. **Middleware Performance**
```typescript
// ✅ GOOD: Early returns
export async function middleware(request: NextRequest) {
  // Skip middleware for public routes
  if (isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  
  // Then check auth
  const token = await getToken({ req: request });
  // ...
}

// ❌ BAD: Always check everything
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const permissions = await getPermissions(token);
  // Unnecessary work for public routes
}
```

### 8. **Error Boundaries**
```typescript
// ✅ GOOD: Error boundary per dashboard
export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary fallback={<DashboardError />}>
      <BaseLayout userRole="super_admin">
        {children}
      </BaseLayout>
    </ErrorBoundary>
  );
}
```

---

## 🔄 Migration Path

### From Single Dashboard to Multi-Role:

1. **Phase 1: Setup Types**
   - Define `UserRole` type
   - Create `ROLE_PERMISSIONS` mapping
   - Create `ROLE_NAVIGATION` config

2. **Phase 2: Middleware**
   - Implement route protection
   - Add role-based redirects

3. **Phase 3: Layouts**
   - Create base layout
   - Create role-specific layouts
   - Implement layout resolver

4. **Phase 4: Dashboards**
   - Create role-specific dashboard routes
   - Implement dashboard components
   - Add permission checks

5. **Phase 5: Sidebar**
   - Create universal sidebar
   - Integrate navigation config
   - Add i18n support

---

## 📚 Additional Resources

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [RBAC Best Practices](https://auth0.com/docs/manage-users/access-control/rbac)

---

**Created by**: Agrinova Development Team  
**Last Updated**: 2025-11-30
