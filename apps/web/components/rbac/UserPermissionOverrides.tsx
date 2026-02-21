'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react/hooks';
import { User } from '@/types/auth';
import {
  LIST_FEATURES,
  GET_USER_FEATURES,
  GET_USER_FEATURE_OVERRIDES,
  GRANT_USER_FEATURE,
  DENY_USER_FEATURE,
  REVOKE_USER_FEATURE,
  CLEAR_USER_FEATURES
} from '@/lib/apollo/queries/rbac';
import { GET_USERS } from '@/lib/apollo/queries/user-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrashIcon,
  PlusIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Select } from '@/components/ui/select';

interface UserFeatureOverridesProps {
  user: User;
  permissionManager: any;
  permissionValidator: any;
}

interface UserFeatureOverride {
  id: string;
  userId: string;
  featureId: string;
  feature: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    module: string;
    metadata: {
      resourceType?: string;
      actions?: string[];
      requiredScope?: string;
    };
  };
  isGranted: boolean;
  scopeType?: string;
  scopeId?: string;
  effectiveFrom?: string;
  expiresAt?: string;
  grantedBy: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

interface Feature {
  id: string;
  name: string;
  displayName: string;
  description: string;
  module: string;
  isActive: boolean;
  isSystem: boolean;
  metadata: {
    resourceType?: string;
    actions?: string[];
    requiredScope?: string;
  };
}

interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  companyId: string;
  company: {
    id: string;
    name: string;
  };
}

export default function UserFeatureOverrides({
  user,
  permissionManager,
  permissionValidator
}: UserFeatureOverridesProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [overrides, setOverrides] = useState<UserFeatureOverride[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [userFeatures, setUserFeatures] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for adding override
  const [formData, setFormData] = useState({
    featureName: '',
    isGranted: true,
    scopeType: '',
    scopeId: '',
    effectiveFrom: '',
    expiresAt: '',
    reason: '',
  });

  // Queries
  const { data: usersData, loading: usersLoading } = useQuery(GET_USERS, {
    variables: {
      search: userSearchTerm || undefined,
      limit: 50,
    },
    skip: !userSearchTerm,
  });

  const { data: featuresData } = useQuery(LIST_FEATURES, {
    variables: {
      filter: {
        isActive: true,
        module: filterModule || undefined,
        search: searchTerm || undefined
      },
      limit: 1000
    },
  });

  const { data: userFeaturesData, refetch: refetchUserFeatures } = useQuery(GET_USER_FEATURES, {
    variables: {
      userId: selectedUserId,
      scope: formData.scopeType && formData.scopeId ? {
        type: formData.scopeType,
        id: formData.scopeId
      } : undefined
    },
    skip: !selectedUserId,
  });

  const { data: overridesData, refetch: refetchOverrides } = useQuery(GET_USER_FEATURE_OVERRIDES, {
    variables: { userId: selectedUserId || '' },
    skip: !selectedUserId,
    fetchPolicy: 'network-only',
  });

  // Mutations
  const [grantUserFeatureMutation] = useMutation(GRANT_USER_FEATURE);
  const [denyUserFeatureMutation] = useMutation(DENY_USER_FEATURE);
  const [revokeUserFeatureMutation] = useMutation(REVOKE_USER_FEATURE);
  const [clearUserFeaturesMutation] = useMutation(CLEAR_USER_FEATURES);

  // Load features
  useEffect(() => {
    if (featuresData?.listFeatures?.features) {
      setFeatures(featuresData.listFeatures.features);
    }
  }, [featuresData]);

  // Load user features
  useEffect(() => {
    if (userFeaturesData?.getUserFeatures) {
      setUserFeatures(userFeaturesData.getUserFeatures.features || []);
    }
  }, [userFeaturesData]);

  // Load overrides
  useEffect(() => {
    if (overridesData?.getUserFeatureOverrides) {
      setOverrides(overridesData.getUserFeatureOverrides);
    }
  }, [overridesData]);

  // Filter features for search
  const filteredFeatures = useMemo(() => {
    return features.filter(feature => {
      const matchesSearch = searchTerm === '' ||
        feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [features, searchTerm]);

  // Get unique modules for filter
  const uniqueModules = useMemo(() => {
    return Array.from(new Set(features.map(f => f.module))).sort();
  }, [features]);

  // Select user
  const handleSelectUser = (user: UserInfo) => {
    setSelectedUser(user);
    setSelectedUserId(user.id);
    setError(null);
    setSuccess(null);
  };

  // Add feature override
  const handleAddOverride = async () => {
    try {
      if (!selectedUserId || !formData.featureName) {
        setError('Please select a user and feature');
        return;
      }

      const input: any = {
        userId: selectedUserId,
        feature: formData.featureName,
        reason: formData.reason || undefined,
      };

      if (formData.scopeType && formData.scopeId) {
        input.scope = {
          type: formData.scopeType,
          id: formData.scopeId,
        };
      }

      if (formData.effectiveFrom) {
        input.effectiveFrom = new Date(formData.effectiveFrom).toISOString();
      }

      if (formData.expiresAt) {
        input.expiresAt = new Date(formData.expiresAt).toISOString();
      }

      let mutation;
      if (formData.isGranted) {
        mutation = grantUserFeatureMutation;
      } else {
        mutation = denyUserFeatureMutation;
      }

      await mutation({
        variables: { input },
      });

      setSuccess('Feature override added successfully');
      setIsAddDialogOpen(false);
      setFormData({
        featureName: '',
        isGranted: true,
        scopeType: '',
        scopeId: '',
        effectiveFrom: '',
        expiresAt: '',
        reason: '',
      });
      refetchOverrides();
      refetchUserFeatures();
    } catch (err: any) {
      console.error('Failed to add feature override:', err);
      setError(err.message || 'Failed to add feature override');
    }
  };

  // Remove feature override
  const handleRemoveOverride = async (override: UserFeatureOverride) => {
    try {
      if (!confirm(`Are you sure you want to remove this feature override?`)) {
        return;
      }

      const variables: any = {
        userId: override.userId,
        feature: override.feature.name,
      };

      if (override.scopeType && override.scopeId) {
        variables.scope = {
          type: override.scopeType,
          id: override.scopeId,
        };
      }

      await revokeUserFeatureMutation({
        variables,
      });

      setSuccess('Feature override removed successfully');
      refetchOverrides();
      refetchUserFeatures();
    } catch (err: any) {
      console.error('Failed to remove feature override:', err);
      setError(err.message || 'Failed to remove feature override');
    }
  };

  // Clear all overrides for user
  const handleClearAllOverrides = async () => {
    try {
      if (!selectedUserId) return;

      if (!confirm(`Are you sure you want to clear all feature overrides for ${selectedUser?.name}? This action cannot be undone.`)) {
        return;
      }

      await clearUserFeaturesMutation({
        variables: { userId: selectedUserId },
      });

      setSuccess('All feature overrides cleared successfully');
      refetchOverrides();
      refetchUserFeatures();
    } catch (err: any) {
      console.error('Failed to clear feature overrides:', err);
      setError(err.message || 'Failed to clear feature overrides');
    }
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

  const isExpired = (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Feature Overrides</h2>
          <p className="text-gray-600">
            Grant or deny specific features for individual users
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1 text-sm text-blue-900">
              <p className="font-medium mb-1">Feature Override System</p>
              <p>
                Feature overrides allow you to grant or deny specific features to individual users,
                overriding their role's default features. You can also scope features to specific
                resources (company, estate, division, block) and set expiration dates for temporary access.
                Features provide more granular control than traditional permissions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Select User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="userSearch">Search Users</Label>
              <Input
                id="userSearch"
                placeholder="Search by name or username..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>

            {usersLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {usersData?.users?.users && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {usersData.users.users.map((u: UserInfo) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left p-3 rounded-lg border ${
                      selectedUserId === u.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <UserCircleIcon className="h-8 w-8 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                        <p className="text-xs text-gray-500">@{u.username}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {u.role}
                          </Badge>
                          {u.company && (
                            <span className="text-xs text-gray-500">{u.company.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{selectedUser.name}</p>
                    <p className="text-gray-600">@{selectedUser.username}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline">{selectedUser.role}</Badge>
                      <span className="text-xs text-gray-500">
                        {userFeatures.length} base features
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Feature Overrides */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">
                {selectedUser ? `Overrides for ${selectedUser.name}` : 'Feature Overrides'}
              </CardTitle>
              {selectedUserId && (
                <div className="flex items-center space-x-2">
                  {overrides.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleClearAllOverrides}>
                      Clear All
                    </Button>
                  )}
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex items-center space-x-2">
                        <PlusIcon className="h-4 w-4" />
                        <span>Add Override</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add Feature Override</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="feature">Feature</Label>
                          <select
                            id="feature"
                            value={formData.featureName}
                            onChange={(e) => setFormData({ ...formData, featureName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select a feature...</option>
                            {filteredFeatures.map(feature => (
                              <option key={feature.id} value={feature.name}>
                                {feature.displayName} ({feature.name})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="action">Action</Label>
                          <select
                            id="action"
                            value={formData.isGranted ? 'grant' : 'deny'}
                            onChange={(e) => setFormData({ ...formData, isGranted: e.target.value === 'grant' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="grant">Grant Feature</option>
                            <option value="deny">Deny Feature</option>
                          </select>
                        </div>

                        <div>
                          <Label htmlFor="scopeType">Scope Type (Optional)</Label>
                          <select
                            id="scopeType"
                            value={formData.scopeType}
                            onChange={(e) => setFormData({ ...formData, scopeType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Global (all resources)</option>
                            <option value="company">Company</option>
                            <option value="estate">Estate</option>
                            <option value="division">Division</option>
                            <option value="block">Block</option>
                          </select>
                        </div>

                        {formData.scopeType && (
                          <div>
                            <Label htmlFor="scopeId">Scope ID</Label>
                            <Input
                              id="scopeId"
                              value={formData.scopeId}
                              onChange={(e) => setFormData({ ...formData, scopeId: e.target.value })}
                              placeholder="Enter resource ID..."
                            />
                          </div>
                        )}

                        <div>
                          <Label htmlFor="effectiveFrom">Effective From (Optional)</Label>
                          <Input
                            id="effectiveFrom"
                            type="datetime-local"
                            value={formData.effectiveFrom}
                            onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                          />
                          <p className="text-xs text-gray-500 mt-1">Leave empty for immediate effect</p>
                        </div>

                        <div>
                          <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                          <Input
                            id="expiresAt"
                            type="datetime-local"
                            value={formData.expiresAt}
                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                          />
                          <p className="text-xs text-gray-500 mt-1">Leave empty for permanent override</p>
                        </div>

                        <div>
                          <Label htmlFor="reason">Reason (Optional)</Label>
                          <Input
                            id="reason"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            placeholder="Enter reason for this override..."
                          />
                        </div>

                        <div className="flex space-x-3">
                          <Button onClick={handleAddOverride}>Add Override</Button>
                          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <div className="text-center py-12 text-gray-500">
                <UserCircleIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Select a user to view and manage their feature overrides</p>
              </div>
            ) : overrides.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No feature overrides for this user</p>
                <p className="text-sm mt-1">Click "Add Override" to create one</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overrides.map((override) => {
                  const expired = isExpired(override.expiresAt);
                  const effective = !override.effectiveFrom || new Date(override.effectiveFrom) <= new Date();

                  return (
                    <div
                      key={override.id}
                      className={`border rounded-lg p-4 ${
                        !effective ? 'border-yellow-300 bg-yellow-50' :
                        expired ? 'border-gray-300 bg-gray-50 opacity-60' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            {override.isGranted ? (
                              <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                            ) : (
                              <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {override.feature.displayName}
                              </p>
                              <p className="text-xs text-gray-500">{override.feature.name}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge className={getModuleColor(override.feature.module)}>
                                  {override.feature.module}
                                </Badge>
                                <Badge
                                  variant={override.isGranted ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {override.isGranted ? 'Granted' : 'Denied'}
                                </Badge>
                                {!effective && (
                                  <Badge variant="secondary" className="text-xs">
                                    Pending
                                  </Badge>
                                )}
                                {expired && (
                                  <Badge variant="secondary" className="text-xs">
                                    Expired
                                  </Badge>
                                )}
                              </div>

                              {override.feature.description && (
                                <div className="mt-2 text-xs text-gray-600">
                                  {override.feature.description}
                                </div>
                              )}

                              {override.reason && (
                                <div className="mt-2 text-xs text-gray-600">
                                  <span className="font-medium">Reason:</span> {override.reason}
                                </div>
                              )}

                              {override.scopeType && override.scopeId && (
                                <div className="mt-2 text-xs text-gray-600">
                                  <span className="font-medium">Scope:</span> {override.scopeType} ({override.scopeId})
                                </div>
                              )}

                              {override.effectiveFrom && (
                                <div className="mt-1 text-xs text-gray-600">
                                  <span className="font-medium">Effective From:</span>{' '}
                                  {new Date(override.effectiveFrom).toLocaleString()}
                                </div>
                              )}

                              {override.expiresAt && (
                                <div className="mt-1 text-xs text-gray-600">
                                  <span className="font-medium">Expires:</span>{' '}
                                  {new Date(override.expiresAt).toLocaleString()}
                                </div>
                              )}

                              <div className="mt-2 text-xs text-gray-500">
                                Created by {override.grantedBy} on{' '}
                                {new Date(override.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveOverride(override)}
                          className="ml-3"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
