'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PERMISSIONS } from '@/types/auth';
import {
  Building,
  MapPin,
  Grid3x3,
  Filter,
  Plus,
  Search,
  LayoutGrid,
  List,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_ROLES,
  GET_ROLE_HIERARCHY,
  GET_RBAC_STATS,
  CREATE_ROLE,
  UPDATE_ROLE,
  DELETE_ROLE,
  ASSIGN_ROLE_PERMISSIONS
} from '@/lib/apollo/queries/rbac';
import UserPermissionOverrides from '@/components/rbac/UserPermissionOverrides';
import { PermissionManager } from '@/lib/auth/permissions';
import { PermissionValidator } from '@/lib/auth/permission-validator';

// New Components
import { RoleHierarchy } from '@/components/rbac/RoleHierarchy';
import { RoleTable, RoleData } from '@/components/rbac/RoleTable';
import { PermissionPanel } from '@/components/rbac/PermissionPanel';
import { UserAssignmentModal } from '@/components/rbac/UserAssignmentModal';
import { RoleFormModal } from '@/components/rbac/RoleFormModal';
import { PermissionMatrix } from '@/components/rbac/PermissionMatrix';
import { FeatureGroupsTab } from '@/components/rbac/FeatureGroupsTab';
import { UserAssignmentsTab } from '@/components/rbac/UserAssignmentsTab';
import { toast } from 'sonner';

// GraphQL Queries moved inside component

// Transform GraphQL data to component format
// Redundant roles removed

// Redundant hierarchy removed

export default function RBACManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('roles');
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');

  // State for modals/sidebars
  const [permissionPanelOpen, setPermissionPanelOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);

  // Filters
  const [companyFilter, setCompanyFilter] = useState('all');
  const [estateFilter, setEstateFilter] = useState('all');

  // GraphQL Queries
  const { data: rolesData, loading: rolesLoading, error: rolesError, refetch: refetchRoles } = useQuery(GET_ROLES);
  const { data: hierarchyData, loading: hierarchyLoading, refetch: refetchHierarchy } = useQuery(GET_ROLE_HIERARCHY);
  const { data: statsData } = useQuery(GET_RBAC_STATS);

  // Mutations
  const [createRole, { loading: createLoading }] = useMutation(CREATE_ROLE);
  const [updateRole, { loading: updateLoading }] = useMutation(UPDATE_ROLE);
  const [deleteRole, { loading: deleteLoading }] = useMutation(DELETE_ROLE);

  // Transform GraphQL data to component format
  const roles: RoleData[] = rolesData?.roles?.map((r: any) => ({
    id: r.id,
    name: r.name,
    displayName: r.displayName,
    description: r.description || '',
    scope: 'GLOBAL', // TODO: Add scope to backend model if needed, default to GLOBAL for now
    usersCount: 0, // TODO: Add user count to backend model
    featuresCount: 0, // TODO: Add permission count
    isSystem: r.level <= 1, // Assume level 1 (Super Admin) is system
    level: r.level
  })) || [];

  const hierarchy = hierarchyData?.rbacHierarchyTree?.map((node: any) => ({
    id: node.role.id,
    name: node.role.name,
    displayName: node.role.displayName,
    level: node.level,
    description: node.role.description,
    userCount: 0, // Placeholder
    children: node.children?.map((child: any) => ({
      id: child.role.id,
      name: child.role.name,
      displayName: child.role.displayName,
      level: child.level,
      description: child.role.description,
      userCount: 0,
      children: child.children?.map((grandChild: any) => ({
        id: grandChild.role.id,
        name: grandChild.role.name,
        displayName: grandChild.role.displayName,
        level: grandChild.level,
        description: grandChild.role.description,
        userCount: 0
      }))
    }))
  })) || [];

  const handleAddRole = () => {
    setSelectedRole(null);
    setRoleFormOpen(true);
  };

  const handleEditRole = (role: RoleData) => {
    setSelectedRole(role);
    setRoleFormOpen(true);
  };

  const handleDeleteRole = async (role: RoleData) => {
    if (confirm(`Are you sure you want to delete role ${role.displayName}? This action cannot be undone.`)) {
      try {
        await deleteRole({ variables: { name: role.name } });
        toast.success('Role deleted successfully');
        refetchRoles();
        refetchHierarchy();
      } catch (error: any) {
        toast.error(`Failed to delete role: ${error.message}`);
      }
    }
  };

  const handleRoleSubmit = async (values: any) => {
    try {
      if (selectedRole) {
        // Update
        await updateRole({
          variables: {
            name: selectedRole.name, // ID/Name cannot be changed usually
            displayName: values.displayName,
            description: values.description,
            isActive: true
          }
        });
        toast.success('Role updated successfully');
      } else {
        // Create
        await createRole({
          variables: {
            name: values.name,
            displayName: values.displayName,
            level: Number(values.level),
            description: values.description
          }
        });
        toast.success('Role created successfully');
      }
      refetchRoles();
      refetchHierarchy();
      setRoleFormOpen(false);
    } catch (error: any) {
      toast.error(`Failed to save role: ${error.message}`);
    }
  };

  const [assignRolePermissions] = useMutation(ASSIGN_ROLE_PERMISSIONS);

  const handleManagePermissions = (role: RoleData) => {
    setSelectedRole(role);
    setPermissionPanelOpen(true);
  };

  const handleViewUsers = (role: RoleData) => {
    setSelectedRole(role);
    setUserModalOpen(true);
  };

  const handleSavePermissions = async (roleId: string, permissions: string[]) => {
    try {
      await assignRolePermissions({
        variables: {
          input: {
            roleId,
            permissions
          }
        }
      });
      toast.success('Permissions updated successfully');
      refetchRoles(); // Optional: if permissions affect role metadata
    } catch (error: any) {
      toast.error(`Failed to update permissions: ${error.message}`);
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={['SUPER_ADMIN']}
      requiredPermissions={[PERMISSIONS.SYSTEM_CONFIG]}
      fallbackPath="/dashboard"
    >
      <SuperAdminDashboardLayout
        title="RBAC Management"
        description="Manage roles, permissions, and access control policies"
        breadcrumbItems={[
          { label: 'System', href: '/system' },
          { label: 'RBAC Management', href: '/rbac-management' }
        ]}
      >
        <div className="space-y-6">
          {/* Header Actions & Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search roles..." className="pl-9" />
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('hierarchy')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'hierarchy' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <Building className="w-3.5 h-3.5 mr-2 text-gray-500" />
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  <SelectItem value="agrinova">Agrinova Pusat</SelectItem>
                  <SelectItem value="plasma">Plasma Inti</SelectItem>
                </SelectContent>
              </Select>

              <Select value={estateFilter} onValueChange={setEstateFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <MapPin className="w-3.5 h-3.5 mr-2 text-gray-500" />
                  <SelectValue placeholder="Estate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Estates</SelectItem>
                  <SelectItem value="estate-a">Estate A</SelectItem>
                  <SelectItem value="estate-b">Estate B</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                onClick={handleAddRole}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Role
              </Button>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-white border border-gray-200 p-1 h-auto w-full md:w-auto flex-wrap justify-start">
              <TabsTrigger value="roles" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                Roles & Hierarchy
              </TabsTrigger>
              <TabsTrigger value="permissions" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                Permissions Matrix
              </TabsTrigger>
              <TabsTrigger value="groups" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                Feature Groups
              </TabsTrigger>
              <TabsTrigger value="assignments" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                User Assignments
              </TabsTrigger>
              <TabsTrigger value="overrides" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                User Overrides
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Role List/Table Area */}
                <div className={viewMode === 'hierarchy' ? 'lg:col-span-2' : 'lg:col-span-3'}>
                  {rolesLoading ? (
                    <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    </div>
                  ) : rolesError ? (
                    <div className="flex items-center justify-center h-64 bg-red-50 rounded-xl border border-red-200 text-red-600">
                      Error loading roles: {rolesError.message}
                    </div>
                  ) : viewMode === 'list' ? (
                    <RoleTable
                      roles={roles}
                      onEdit={handleEditRole}
                      onDelete={handleDeleteRole}
                      onManagePermissions={handleManagePermissions}
                      onViewUsers={handleViewUsers}
                      onDuplicate={() => { }}
                    />
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[500px] flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <h3 className="font-medium text-gray-900">Interactive Hierarchy View</h3>
                        <p className="text-sm mt-1">Select a node in the tree to view details</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hierarchy Tree Sidebar (Visible in Hierarchy Mode) */}
                {viewMode === 'hierarchy' && (
                  <div className="lg:col-span-1">
                    {hierarchyLoading ? (
                      <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                      </div>
                    ) : (
                      <RoleHierarchy
                        roles={hierarchy}
                        onRoleSelect={(id) => console.log('Selected', id)}
                      />
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissions">
              <PermissionMatrix />
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <FeatureGroupsTab />
            </TabsContent>

            <TabsContent value="assignments" className="space-y-4">
              <UserAssignmentsTab />
            </TabsContent>

            <TabsContent value="overrides" className="space-y-4">
              {user && (
                <UserPermissionOverrides
                  user={user}
                  permissionManager={PermissionManager}
                  permissionValidator={new PermissionValidator()}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebars & Modals */}
        <PermissionPanel
          open={permissionPanelOpen}
          onOpenChange={setPermissionPanelOpen}
          role={selectedRole}
          onSave={handleSavePermissions}
        />

        <UserAssignmentModal
          open={userModalOpen}
          onOpenChange={setUserModalOpen}
          role={selectedRole}
        />

        <RoleFormModal
          open={roleFormOpen}
          onOpenChange={setRoleFormOpen}
          role={selectedRole}
          onSubmit={handleRoleSubmit}
          isSubmitting={createLoading || updateLoading}
        />
      </SuperAdminDashboardLayout>
    </ProtectedRoute>
  );
}
