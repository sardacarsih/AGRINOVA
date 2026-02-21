'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react/hooks';
import { User } from '@/types/auth';
import {
  GET_ROLES,
  LIST_FEATURES,
  GET_ROLE_FEATURES,
  ASSIGN_ROLE_FEATURES,
  REMOVE_ROLE_FEATURES,
  GET_FEATURE_HIERARCHY
} from '@/lib/apollo/queries/rbac';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';

interface RoleFeatureMatrixProps {
  user: User;
  permissionManager: any;
  permissionValidator: any;
  canManage: boolean;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Feature {
  id: string;
  name: string;
  displayName: string;
  description: string;
  module: string;
  parentId: string | null;
  isActive: boolean;
  isSystem: boolean;
  metadata: {
    resourceType?: string;
    actions?: string[];
    requiredScope?: string;
    conditions?: any;
    uiMetadata?: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface RoleFeature {
  id: string;
  roleId: string;
  role: string;
  featureId: string;
  feature: Feature;
  inheritedFromRoleId: string | null;
  isDenied: boolean;
  grantedAt: string;
  grantedBy: string;
  expiresAt: string | null;
  createdAt: string;
}

interface MatrixCell {
  roleId: string;
  featureId: string;
  hasFeature: boolean;
  isInherited: boolean;
  isDenied: boolean;
  inheritedFrom?: string;
}

export default function RoleFeatureMatrix({
  user,
  permissionManager,
  permissionValidator,
  canManage
}: RoleFeatureMatrixProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [roleFeaturesMap, setRoleFeaturesMap] = useState<Map<string, RoleFeature[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Set<string>>>(new Map());

  // Queries
  const { data: rolesData, loading: rolesLoading, refetch: refetchRoles } = useQuery(GET_ROLES, {
    variables: { activeOnly: true },
  });
  const { data: featuresData, loading: featuresLoading, refetch: refetchFeatures } = useQuery(LIST_FEATURES, {
    variables: {
      filter: {
        isActive: true
      },
      limit: 1000 // Get all features for the matrix
    },
  });

  // Mutations
  const [assignRoleFeaturesMutation] = useMutation(ASSIGN_ROLE_FEATURES);
  const [removeRoleFeaturesMutation] = useMutation(REMOVE_ROLE_FEATURES);

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

  // Load role features for each role
  useEffect(() => {
    const loadRoleFeatures = async () => {
      if (!roles.length || !features.length) return;

      setLoading(true);
      const newMap = new Map<string, RoleFeature[]>();

      try {
        // Load features for each role
        for (const role of roles) {
          const { data } = await permissionManager.client.query({
            query: GET_ROLE_FEATURES,
            variables: { roleName: role.name },
            fetchPolicy: 'network-only',
          });

          if (data?.getRoleFeatures) {
            newMap.set(role.name, data.getRoleFeatures);
          }
        }

        setRoleFeaturesMap(newMap);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to load role features:', err);
        setError('Failed to load role features');
        setLoading(false);
      }
    };

    loadRoleFeatures();
  }, [roles, features, permissionManager]);

  // Filter features
  const filteredFeatures = useMemo(() => {
    return features.filter(feature => {
      const matchesSearch = searchTerm === '' ||
        feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesModule = filterModule === '' || feature.module === filterModule;

      return matchesSearch && matchesModule;
    });
  }, [features, searchTerm, filterModule]);

  // Get unique modules for filter
  const uniqueModules = useMemo(() => {
    return Array.from(new Set(features.map(f => f.module))).sort();
  }, [features]);

  // Check if a role has a feature
  const hasFeature = (roleName: string, featureName: string): boolean => {
    const roleFeats = roleFeaturesMap.get(roleName);
    if (!roleFeats) return false;
    return roleFeats.some(rf => rf.feature.name === featureName && !rf.isDenied);
  };

  // Check if a feature is inherited from a parent role
  const isInherited = (role: Role, featureName: string): boolean => {
    const roleFeats = roleFeaturesMap.get(role.name);
    if (!roleFeats) return false;

    const feature = roleFeats.find(rf => rf.feature.name === featureName && !rf.isDenied);
    if (!feature) return false;

    return !!feature.inheritedFromRoleId;
  };

  // Get the role that this feature is inherited from
  const getInheritedFrom = (role: Role, featureName: string): string | null => {
    const roleFeats = roleFeaturesMap.get(role.name);
    if (!roleFeats) return null;

    const feature = roleFeats.find(rf => rf.feature.name === featureName && !rf.isDenied);
    if (!feature || !feature.inheritedFromRoleId) return null;

    const parentRole = roles.find(r => r.id === feature.inheritedFromRoleId);
    return parentRole ? parentRole.displayName : null;
  };

  // Toggle feature for a role
  const toggleFeature = (roleName: string, featureName: string) => {
    if (!canManage) {
      setError('You do not have permission to modify role features');
      return;
    }

    // Update pending changes
    const newPendingChanges = new Map(pendingChanges);
    if (!newPendingChanges.has(roleName)) {
      newPendingChanges.set(roleName, new Set());
    }

    const roleChanges = newPendingChanges.get(roleName)!;
    if (roleChanges.has(featureName)) {
      roleChanges.delete(featureName);
    } else {
      roleChanges.add(featureName);
    }

    setPendingChanges(newPendingChanges);
  };

  // Apply pending changes
  const applyChanges = async () => {
    if (pendingChanges.size === 0) {
      setError('No changes to apply');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      for (const [roleName, featureNames] of pendingChanges.entries()) {
        const featuresArray = Array.from(featureNames);

        // Determine which features to add and which to remove
        const toAdd: string[] = [];
        const toRemove: string[] = [];

        for (const featName of featuresArray) {
          if (hasFeature(roleName, featName)) {
            toRemove.push(featName);
          } else {
            toAdd.push(featName);
          }
        }

        // Add features
        if (toAdd.length > 0) {
          await assignRoleFeaturesMutation({
            variables: {
              input: {
                roleName,
                features: toAdd,
              },
            },
          });
        }

        // Remove features
        if (toRemove.length > 0) {
          await removeRoleFeaturesMutation({
            variables: {
              roleName,
              features: toRemove,
            },
          });
        }
      }

      setSuccess('Features updated successfully');
      setPendingChanges(new Map());

      // Reload role features
      await refetchRoles();
      await refetchFeatures();

      // Reload role features map
      const newMap = new Map<string, RoleFeature[]>();
      for (const role of roles) {
        const { data } = await permissionManager.client.query({
          query: GET_ROLE_FEATURES,
          variables: { roleName: role.name },
          fetchPolicy: 'network-only',
        });

        if (data?.getRoleFeatures) {
          newMap.set(role.name, data.getRoleFeatures);
        }
      }
      setRoleFeaturesMap(newMap);

      setLoading(false);
    } catch (err: any) {
      console.error('Failed to update features:', err);
      setError(err.message || 'Failed to update features');
      setSuccess(null);
      setLoading(false);
    }
  };

  // Discard pending changes
  const discardChanges = () => {
    setPendingChanges(new Map());
    setSuccess(null);
    setError(null);
  };

  // Check if there are pending changes for a specific cell
  const hasPendingChange = (roleName: string, featureName: string): boolean => {
    return pendingChanges.get(roleName)?.has(featureName) || false;
  };

  // Get effective feature state (considering pending changes)
  const getEffectiveFeatureState = (roleName: string, featureName: string): boolean => {
    const currentState = hasFeature(roleName, featureName);
    return hasPendingChange(roleName, featureName) ? !currentState : currentState;
  };

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

  const getLevelColor = (level: number) => {
    if (level <= 2) return 'bg-red-100 text-red-800';
    if (level <= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading && !roles.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingChangeCount = Array.from(pendingChanges.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Role-Feature Matrix</h2>
          <p className="text-gray-600">
            Manage features for each role with hierarchical inheritance
          </p>
        </div>
        {canManage && pendingChangeCount > 0 && (
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="text-sm">
              {pendingChangeCount} pending change{pendingChangeCount !== 1 ? 's' : ''}
            </Badge>
            <Button variant="outline" onClick={discardChanges}>
              Discard
            </Button>
            <Button onClick={applyChanges} disabled={loading}>
              {loading ? 'Applying...' : 'Apply Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1 text-sm text-blue-900">
              <p className="font-medium mb-1">Hierarchical Feature Inheritance</p>
              <p>
                Roles inherit features from roles with higher authority (lower level numbers).
                Direct features are shown with a solid checkmark, while inherited features
                are shown with a lighter checkmark and indicate the source role.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Modules</option>
            {uniqueModules.map(module => (
              <option key={module} value={module}>{module}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Feature Matrix ({filteredFeatures.length} features × {roles.length} roles)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 min-w-[300px]">
                    Feature
                  </th>
                  {roles.map(role => (
                    <th
                      key={role.id}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <div className="font-semibold text-gray-900">{role.displayName}</div>
                        <Badge className={getLevelColor(role.level)} variant="outline">
                          L{role.level}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFeatures.map((feature, featureIndex) => (
                  <tr key={feature.id} className={featureIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-inherit z-10 border-r border-gray-200">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">{feature.displayName}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getModuleColor(feature.module)} variant="outline">
                            {feature.module}
                          </Badge>
                          <span className="text-xs text-gray-500">{feature.name}</span>
                        </div>
                        {feature.description && (
                          <div className="text-xs text-gray-500 mt-1">{feature.description}</div>
                        )}
                      </div>
                    </td>
                    {roles.map(role => {
                      const roleHasFeature = getEffectiveFeatureState(role.name, feature.name);
                      const inherited = isInherited(role, feature.name);
                      const inheritedFromRole = inherited ? getInheritedFrom(role, feature.name) : null;
                      const isPending = hasPendingChange(role.name, feature.name);

                      return (
                        <td
                          key={`${role.id}-${feature.id}`}
                          className={`px-4 py-4 text-center ${
                            canManage ? 'cursor-pointer hover:bg-blue-50' : ''
                          } ${isPending ? 'bg-yellow-50' : ''}`}
                          onClick={() => canManage && toggleFeature(role.name, feature.name)}
                        >
                          <div className="flex flex-col items-center space-y-1">
                            {roleHasFeature ? (
                              <>
                                <CheckCircleIcon
                                  className={`h-6 w-6 ${
                                    inherited ? 'text-blue-400' : 'text-green-600'
                                  } ${isPending ? 'opacity-50' : ''}`}
                                />
                                {inherited && inheritedFromRole && (
                                  <span className="text-xs text-gray-500">
                                    from {inheritedFromRole}
                                  </span>
                                )}
                                {isPending && (
                                  <Badge variant="destructive" className="text-xs">
                                    Remove
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <>
                                <XCircleIcon
                                  className={`h-6 w-6 ${
                                    canManage ? 'text-gray-300' : 'text-gray-200'
                                  } ${isPending ? 'opacity-50' : ''}`}
                                />
                                {isPending && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    Add
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span>Direct Feature</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-400" />
              <span>Inherited Feature</span>
            </div>
            <div className="flex items-center space-x-2">
              <XCircleIcon className="h-5 w-5 text-gray-300" />
              <span>No Feature</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-yellow-50 border border-yellow-200 rounded"></div>
              <span>Pending Change</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-red-100 text-red-800">L1-L2</Badge>
              <span>High Authority</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-yellow-100 text-yellow-800">L3-L4</Badge>
              <span>Medium Authority</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
