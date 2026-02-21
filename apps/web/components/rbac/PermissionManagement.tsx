'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react/hooks';
import { User } from '@/types/auth';
import {
  LIST_FEATURES,
  CREATE_FEATURE,
  UPDATE_FEATURE,
  DELETE_FEATURE,
  GET_FEATURE_HIERARCHY,
  GET_FEATURE_STATS
} from '@/lib/apollo/queries/rbac';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrashIcon, PencilIcon, PlusIcon, FolderIcon, TagIcon } from '@heroicons/react/24/outline';

interface FeatureManagementProps {
  user: User;
  permissionManager: any;
  permissionValidator: any;
  canManage: boolean;
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
  parent?: Feature;
  children?: Feature[];
}

export default function FeatureManagement({ user, permissionManager, permissionValidator, canManage }: FeatureManagementProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featureHierarchy, setFeatureHierarchy] = useState<any[]>([]);
  const [featureStats, setFeatureStats] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    module: '',
    parentId: '',
    isActive: true,
    resourceType: '',
    actions: [] as string[],
    requiredScope: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterSystem, setFilterSystem] = useState<boolean | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Queries
  const { data: featuresData, loading: featuresLoading, refetch: refetchFeatures } = useQuery(LIST_FEATURES, {
    variables: {
      filter: {
        search: searchTerm || undefined,
        module: filterModule || undefined,
        isActive: formData.isActive || undefined,
        isSystem: filterSystem
      },
      page: currentPage,
      limit: 50
    },
    fetchPolicy: 'cache-and-network',
  });

  const { data: hierarchyData } = useQuery(GET_FEATURE_HIERARCHY, {
    variables: { module: filterModule || undefined },
    fetchPolicy: 'cache-and-network',
  });

  const { data: statsData } = useQuery(GET_FEATURE_STATS, {
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [createFeatureMutation] = useMutation(CREATE_FEATURE);
  const [updateFeatureMutation] = useMutation(UPDATE_FEATURE);
  const [deleteFeatureMutation] = useMutation(DELETE_FEATURE);

  useEffect(() => {
    if (featuresData?.listFeatures) {
      setFeatures(featuresData.listFeatures.features);
      setTotalPages(featuresData.listFeatures.pageInfo.totalPages);
      setLoading(false);
    }
  }, [featuresData]);

  useEffect(() => {
    if (hierarchyData?.getFeatureHierarchy) {
      setFeatureHierarchy(hierarchyData.getFeatureHierarchy);
    }
  }, [hierarchyData]);

  useEffect(() => {
    if (statsData?.getFeatureStats) {
      setFeatureStats(statsData.getFeatureStats);
    }
  }, [statsData]);

  useEffect(() => {
    if (featuresLoading) {
      setLoading(true);
    }
  }, [featuresLoading]);

  // Get unique modules for filter
  const uniqueModules = Array.from(new Set(features.map(f => f.module))).sort();

  const handleCreateFeature = async () => {
    try {
      // Validate form data
      if (!formData.name || !formData.displayName || !formData.module) {
        setError('Name, Display Name, and Module are required');
        return;
      }

      // Check permissions
      if (!canManage) {
        setError('You do not have permission to create features');
        return;
      }

      await createFeatureMutation({
        variables: {
          input: {
            name: formData.name,
            displayName: formData.displayName,
            description: formData.description,
            module: formData.module,
            parentId: formData.parentId || null,
            isActive: formData.isActive,
            metadata: {
              resourceType: formData.resourceType || null,
              actions: formData.actions.length > 0 ? formData.actions : null,
              requiredScope: formData.requiredScope || null
            }
          }
        }
      });

      setSuccess('Feature created successfully');
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        displayName: '',
        description: '',
        module: '',
        parentId: '',
        isActive: true,
        resourceType: '',
        actions: [],
        requiredScope: ''
      });
      refetchFeatures();
      setError(null);
    } catch (error: any) {
      console.error('Failed to create feature:', error);
      setError(error.message || 'Failed to create feature');
      setSuccess(null);
    }
  };

  const handleUpdateFeature = async () => {
    try {
      if (!selectedFeature) return;

      if (!canManage) {
        setError('You do not have permission to update features');
        return;
      }

      await updateFeatureMutation({
        variables: {
          input: {
            id: selectedFeature.id,
            displayName: formData.displayName,
            description: formData.description,
            isActive: formData.isActive,
            metadata: {
              resourceType: formData.resourceType || null,
              actions: formData.actions.length > 0 ? formData.actions : null,
              requiredScope: formData.requiredScope || null
            }
          }
        }
      });

      setSuccess('Feature updated successfully');
      setIsEditDialogOpen(false);
      setSelectedFeature(null);
      setFormData({
        name: '',
        displayName: '',
        description: '',
        module: '',
        parentId: '',
        isActive: true,
        resourceType: '',
        actions: [],
        requiredScope: ''
      });
      refetchFeatures();
      setError(null);
    } catch (error: any) {
      console.error('Failed to update feature:', error);
      setError(error.message || 'Failed to update feature');
      setSuccess(null);
    }
  };

  const handleDeleteFeature = async (feature: Feature) => {
    try {
      if (!canManage) {
        setError('You do not have permission to delete features');
        return;
      }

      if (feature.isSystem) {
        setError('Cannot delete system features');
        return;
      }

      if (!confirm(`Are you sure you want to delete the feature "${feature.displayName}"? This action cannot be undone.`)) {
        return;
      }

      await deleteFeatureMutation({
        variables: {
          id: feature.id,
        },
      });

      setSuccess('Feature deleted successfully');
      refetchFeatures();
      setError(null);
    } catch (error: any) {
      console.error('Failed to delete feature:', error);
      setError(error.message || 'Failed to delete feature');
      setSuccess(null);
    }
  };

  const openEditDialog = (feature: Feature) => {
    setSelectedFeature(feature);
    setFormData({
      name: feature.name,
      displayName: feature.displayName,
      description: feature.description,
      module: feature.module,
      parentId: feature.parentId || '',
      isActive: feature.isActive,
      resourceType: feature.metadata.resourceType || '',
      actions: feature.metadata.actions || [],
      requiredScope: feature.metadata.requiredScope || ''
    });
    setIsEditDialogOpen(true);
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

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'create': 'bg-green-100 text-green-800',
      'read': 'bg-blue-100 text-blue-800',
      'update': 'bg-yellow-100 text-yellow-800',
      'delete': 'bg-red-100 text-red-800',
      'manage': 'bg-purple-100 text-purple-800',
      'approve': 'bg-emerald-100 text-emerald-800',
      'reject': 'bg-red-100 text-red-800',
      'view': 'bg-blue-100 text-blue-800',
      'edit': 'bg-yellow-100 text-yellow-800',
      'admin': 'bg-purple-100 text-purple-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Management</h2>
          <p className="text-gray-600">Manage system features and access controls</p>
        </div>
        {canManage && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <PlusIcon className="h-4 w-4" />
                <span>Create Feature</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Feature</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Feature Code</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., harvest.create, gatecheck.view"
                    />
                  </div>
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="e.g., Create Harvest, View Gate Check"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="module">Module</Label>
                  <select
                    id="module"
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Module</option>
                    <option value="system">System</option>
                    <option value="user">User Management</option>
                    <option value="company">Company Management</option>
                    <option value="estate">Estate Management</option>
                    <option value="division">Division Management</option>
                    <option value="block">Block Management</option>
                    <option value="harvest">Harvest Management</option>
                    <option value="gate_check">Gate Check</option>
                    <option value="weighing">Weighing</option>
                    <option value="grading">Grading</option>
                    <option value="reports">Reports</option>
                    <option value="rbac">RBAC Management</option>
                    <option value="auth">Authentication</option>
                    <option value="dashboard">Dashboard</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="parentId">Parent Feature (Optional)</Label>
                  <select
                    id="parentId"
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Parent (Root Feature)</option>
                    {features.filter(f => f.module === formData.module || !formData.module).map(feature => (
                      <option key={feature.id} value={feature.id}>
                        {feature.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Feature description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="resourceType">Resource Type</Label>
                    <Input
                      id="resourceType"
                      value={formData.resourceType}
                      onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                      placeholder="e.g., harvest_record, gate_check"
                    />
                  </div>
                  <div>
                    <Label htmlFor="requiredScope">Required Scope</Label>
                    <select
                      id="requiredScope"
                      value={formData.requiredScope}
                      onChange={(e) => setFormData({ ...formData, requiredScope: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No Scope Required</option>
                      <option value="company">Company</option>
                      <option value="estate">Estate</option>
                      <option value="division">Division</option>
                      <option value="block">Block</option>
                      <option value="global">Global</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex space-x-3">
                  <Button onClick={handleCreateFeature}>Create Feature</Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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
        <select
          value={filterSystem?.toString() || ''}
          onChange={(e) => setFilterSystem(e.target.value === '' ? undefined : e.target.value === 'true')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Features</option>
          <option value="true">System Features</option>
          <option value="false">Custom Features</option>
        </select>
      </div>

      {/* Feature Stats */}
      {featureStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{featureStats.totalFeatures}</div>
              <div className="text-sm text-gray-600">Total Features</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{featureStats.activeFeatures}</div>
              <div className="text-sm text-gray-600">Active Features</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{featureStats.systemFeatures}</div>
              <div className="text-sm text-gray-600">System Features</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{uniqueModules.length}</div>
              <div className="text-sm text-gray-600">Modules</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions/Scope
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {canManage && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {features.map((feature) => (
                <tr key={feature.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {feature.parentId ? (
                        <FolderIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <TagIcon className="h-4 w-4 text-gray-600" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{feature.displayName}</div>
                        <div className="text-xs text-gray-500">{feature.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getModuleColor(feature.module)}>
                      {feature.module}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {feature.metadata.actions?.map((action) => (
                        <Badge key={action} variant="outline" className={getActionColor(action)}>
                          {action}
                        </Badge>
                      ))}
                      {feature.metadata.requiredScope && (
                        <Badge variant="secondary" className="text-xs">
                          {feature.metadata.requiredScope}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{feature.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={feature.isSystem ? 'default' : 'secondary'}>
                      {feature.isSystem ? 'System' : 'Custom'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={feature.isActive ? 'default' : 'secondary'}>
                      {feature.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(feature)}
                          className="flex items-center space-x-1"
                        >
                          <PencilIcon className="h-3 w-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteFeature(feature)}
                          disabled={feature.isSystem}
                          className="flex items-center space-x-1"
                        >
                          <TrashIcon className="h-3 w-3" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 py-1 text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Feature Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Feature: {selectedFeature?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-displayName">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Feature display name"
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Feature Code</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  disabled
                  className="bg-gray-50"
                  placeholder="Feature code (read-only)"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Feature description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-resourceType">Resource Type</Label>
                <Input
                  id="edit-resourceType"
                  value={formData.resourceType}
                  onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                  placeholder="e.g., harvest_record, gate_check"
                />
              </div>
              <div>
                <Label htmlFor="edit-requiredScope">Required Scope</Label>
                <select
                  id="edit-requiredScope"
                  value={formData.requiredScope}
                  onChange={(e) => setFormData({ ...formData, requiredScope: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Scope Required</option>
                  <option value="company">Company</option>
                  <option value="estate">Estate</option>
                  <option value="division">Division</option>
                  <option value="block">Block</option>
                  <option value="global">Global</option>
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleUpdateFeature}>Update Feature</Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}