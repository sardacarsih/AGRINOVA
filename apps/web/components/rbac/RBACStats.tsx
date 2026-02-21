'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client/react/hooks';
import { User } from '@/types/auth';
import {
  GET_RBAC_STATS,
  GET_ROLES,
  LIST_FEATURES,
  GET_FEATURE_STATS
} from '@/lib/apollo/queries/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChartBarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CogIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

interface RBACStatsProps {
  user: User;
  permissionManager: any;
  permissionValidator: any;
}

interface RBACStatistics {
  totalRoles: number;
  activeRoles: number;
  totalPermissions: number;
  activePermissions: number;
  totalRolePermissions: number;
  totalUserOverrides: number;
  cacheStats?: {
    hitRate?: number;
    size?: number;
    lastCleanup?: string;
  };
}

interface FeatureStatistics {
  totalFeatures: number;
  activeFeatures: number;
  systemFeatures: number;
  customFeatures: number;
  totalRoleFeatures: number;
  totalUserOverrides: number;
  featuresByModule: Record<string, number>;
  cacheHitRate?: number;
  averageCheckLatencyMs?: number;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
  description: string;
  isActive: boolean;
}

interface Feature {
  id: string;
  name: string;
  displayName: string;
  module: string;
  description: string;
  isActive: boolean;
  isSystem: boolean;
}

export default function RBACStats({
  user,
  permissionManager,
  permissionValidator
}: RBACStatsProps) {
  const [stats, setStats] = useState<RBACStatistics | null>(null);
  const [featureStats, setFeatureStats] = useState<FeatureStatistics | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: statsData, loading: statsLoading } = useQuery(GET_RBAC_STATS, {
    fetchPolicy: 'network-only',
  });

  const { data: rolesData } = useQuery(GET_ROLES, {
    variables: { activeOnly: false },
  });

  const { data: featuresData } = useQuery(LIST_FEATURES, {
    variables: {
      filter: {},
      limit: 1000
    },
  });

  const { data: featureStatsData } = useQuery(GET_FEATURE_STATS, {
    fetchPolicy: 'network-only',
  });

  // Load stats
  useEffect(() => {
    if (statsData?.rbacStats) {
      setStats(statsData.rbacStats);
      setLoading(false);
    }
  }, [statsData]);

  // Load feature stats
  useEffect(() => {
    if (featureStatsData?.getFeatureStats) {
      setFeatureStats(featureStatsData.getFeatureStats);
    }
  }, [featureStatsData]);

  // Load roles
  useEffect(() => {
    if (rolesData?.roles) {
      setRoles(rolesData.roles);
    }
  }, [rolesData]);

  // Load features
  useEffect(() => {
    if (featuresData?.listFeatures?.features) {
      setFeatures(featuresData.listFeatures.features);
    }
  }, [featuresData]);

  // Calculate feature distribution by module
  const featuresByModule = useMemo(() => {
    const distribution: Record<string, number> = {};

    features.forEach(feature => {
      if (!distribution[feature.module]) {
        distribution[feature.module] = 0;
      }
      distribution[feature.module]++;
    });

    return Object.entries(distribution)
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count);
  }, [features]);

  // Calculate feature distribution by type (system vs custom)
  const featuresByType = useMemo(() => {
    const distribution: Record<string, number> = {
      'system': 0,
      'custom': 0
    };

    features.forEach(feature => {
      if (feature.isSystem) {
        distribution.system++;
      } else {
        distribution.custom++;
      }
    });

    return Object.entries(distribution)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [features]);

  // Calculate role distribution by level
  const rolesByLevel = useMemo(() => {
    const distribution: Record<number, number> = {};

    roles.forEach(role => {
      if (!distribution[role.level]) {
        distribution[role.level] = 0;
      }
      distribution[role.level]++;
    });

    return Object.entries(distribution)
      .map(([level, count]) => ({ level: parseInt(level), count }))
      .sort((a, b) => a.level - b.level);
  }, [roles]);

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      'system': 'bg-purple-100 text-purple-800',
      'user': 'bg-blue-100 text-blue-800',
      'company': 'bg-green-100 text-green-800',
      'estate': 'bg-yellow-100 text-yellow-800',
      'division': 'bg-orange-100 text-orange-800',
      'block': 'bg-red-100 text-red-800',
      'employee': 'bg-indigo-100 text-indigo-800',
      'harvest': 'bg-pink-100 text-pink-800',
      'gate_check': 'bg-gray-100 text-gray-800',
      'weighing': 'bg-cyan-100 text-cyan-800',
      'grading': 'bg-emerald-100 text-emerald-800',
      'reports': 'bg-teal-100 text-teal-800',
      'rbac': 'bg-rose-100 text-rose-800',
      'auth': 'bg-violet-100 text-violet-800',
      'dashboard': 'bg-slate-100 text-slate-800',
    };
    return colors[module] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'system': 'bg-purple-100 text-purple-800',
      'custom': 'bg-blue-100 text-blue-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getLevelText = (level: number) => {
    if (level === 1) return 'Super Admin';
    if (level === 2) return 'Company Admin';
    if (level === 3) return 'Area Manager';
    if (level === 4) return 'Manager';
    if (level === 5) return 'Asisten';
    if (level === 6) return 'Mandor';
    if (level === 7) return 'Satpam';
    if (level === 8) return 'Driver';
    if (level === 9) return 'Pekerja';
    return `Level ${level}`;
  };

  if (loading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">RBAC System Statistics</h2>
        <p className="text-gray-600">
          Overview of roles, features, and system usage
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Roles</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalRoles || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {stats?.activeRoles || 0} active
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Features</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{featureStats?.totalFeatures || 0}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {featureStats?.activeFeatures || 0} active
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CogIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Role Features</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{featureStats?.totalRoleFeatures || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Assigned</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">User Overrides</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalUserOverrides || 0}</p>
                <p className="text-sm text-gray-500 mt-1">Active</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cache Statistics */}
      {stats?.cacheStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <ServerIcon className="h-5 w-5" />
              <span>Cache Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.cacheStats.hitRate !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">Hit Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {(stats.cacheStats.hitRate * 100).toFixed(1)}%
                  </p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${stats.cacheStats.hitRate * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {stats.cacheStats.size !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">Cache Size</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.cacheStats.size.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">entries</p>
                </div>
              )}

              {stats.cacheStats.lastCleanup && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">Last Cleanup</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    {new Date(stats.cacheStats.lastCleanup).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((Date.now() - new Date(stats.cacheStats.lastCleanup).getTime()) / 60000)} min ago
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Features by Module */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Features by Module</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {featuresByModule.slice(0, 10).map(({ module, count }) => (
                <div key={module} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Badge className={getModuleColor(module)}>
                      {module}
                    </Badge>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(count / Math.max(...featuresByModule.map(p => p.count))) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 ml-3">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Features by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {featuresByType.map(({ type, count }) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Badge className={getTypeColor(type)}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Badge>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${(count / Math.max(...featuresByType.map(p => p.count))) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 ml-3">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Hierarchy Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Hierarchy Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rolesByLevel.map(({ level, count }) => (
              <div key={level} className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-24">
                    <Badge variant="outline" className="text-xs">
                      Level {level}
                    </Badge>
                  </div>
                  <div className="w-32">
                    <span className="text-sm font-medium text-gray-900">
                      {getLevelText(level)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          level <= 2 ? 'bg-red-600' : level <= 4 ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                        style={{
                          width: `${(count / Math.max(...rolesByLevel.map(r => r.count))) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 ml-3 w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Roles List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Roles ({roles.filter(r => r.isActive).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles
              .filter(role => role.isActive)
              .sort((a, b) => a.level - b.level)
              .map(role => (
                <div
                  key={role.id}
                  className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{role.displayName}</p>
                      <p className="text-xs text-gray-500 font-mono">{role.name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      L{role.level}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health Summary */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600" />
            <span>System Health Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Role Coverage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {((stats?.activeRoles || 0) / (stats?.totalRoles || 1) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Active roles</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Permission Coverage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {((stats?.activePermissions || 0) / (stats?.totalPermissions || 1) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Active permissions</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Avg Permissions/Role</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {((stats?.totalRolePermissions || 0) / (stats?.activeRoles || 1)).toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Assignments</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Override Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.totalUserOverrides || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Custom permissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
