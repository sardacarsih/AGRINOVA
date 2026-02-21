import { UserRole } from '@/types/auth';

export interface DashboardConfig {
  role: UserRole;
  title: string;
  description: string;
  features: DashboardFeature[];
  layout: DashboardLayoutConfig;
  permissions: string[];
}

export interface DashboardFeature {
  id: string;
  label: string;
  icon: string;
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  permissions?: string[];
  enabled: boolean;
}

export interface DashboardLayoutConfig {
  sidebar: {
    width: string;
    collapsible: boolean;
    defaultCollapsed: boolean;
  };
  header: {
    showBreadcrumbs: boolean;
    showNotifications: boolean;
    showUserMenu: boolean;
  };
  content: {
    maxWidth: string;
    padding: string;
  };
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  pendingApprovals: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'harvest' | 'approval' | 'gate_check' | 'user_action';
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    id: string;
    name: string;
    role: UserRole;
  };
  metadata?: Record<string, any>;
}

export interface DashboardWidget {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  size: 'small' | 'medium' | 'large' | 'full';
  order: number;
  enabled: boolean;
  permissions?: string[];
}

export interface DashboardRoute {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  exact?: boolean;
  permissions?: string[];
}

export type DashboardContextType = {
  config: DashboardConfig;
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refreshMetrics: () => Promise<void>;
  updateConfig: (updates: Partial<DashboardConfig>) => void;
};

export type RoleDashboardProps = {
  role: UserRole;
  user?: any;
  className?: string;
};