'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import { gql } from 'graphql-tag';
import { useAuth } from '@/lib/auth';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PERMISSIONS } from '@/types/auth';
import {
  Building,
  MapPin,
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
import { GET_COMPANIES } from '@/lib/apollo/queries/company';
import {
  GET_ROLE_HIERARCHY,
  CREATE_ROLE,
  UPDATE_ROLE,
  DELETE_ROLE,
  ASSIGN_ROLE_PERMISSIONS
} from '@/lib/apollo/queries/rbac';
import UserPermissionOverrides from '@/components/rbac/UserPermissionOverrides';
import { PermissionManager } from '@/lib/auth/permissions';
import { PermissionValidator } from '@/lib/auth/permission-validator';
import { RoleHierarchy } from '@/components/rbac/RoleHierarchy';
import { RoleTable, RoleData } from '@/components/rbac/RoleTable';
import { PermissionPanel } from '@/components/rbac/PermissionPanel';
import { UserAssignmentModal } from '@/components/rbac/UserAssignmentModal';
import { RoleFormModal } from '@/components/rbac/RoleFormModal';
import { PermissionMatrix } from '@/components/rbac/PermissionMatrix';
import { FeatureGroupsTab } from '@/components/rbac/FeatureGroupsTab';
import { UserAssignmentsTab } from '@/components/rbac/UserAssignmentsTab';
import { toast } from 'sonner';

const DEFAULT_ROLE_PAGE_SIZE = 10;

type RoleApiRecord = {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  isSystem: boolean;
  usersCount: number;
};

type RolesPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

type RolesResponse = {
  data: RoleApiRecord[];
  pagination: RolesPagination;
};

type CompanyOption = {
  id: string;
  name: string;
};

type CompaniesQueryData = {
  companies: {
    data: CompanyOption[];
  };
};

type EstateOption = {
  id: string;
  name: string;
  companyId: string;
};

type EstatesQueryData = {
  estates: EstateOption[];
};

type HierarchyRoleRecord = {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
};

type HierarchyNode = {
  role: HierarchyRoleRecord;
  level: number;
  children?: HierarchyNode[] | null;
};

type HierarchyQueryData = {
  rbacHierarchyTree: HierarchyNode[];
};

type RoleFormValues = {
  name: string;
  displayName: string;
  description?: string;
  level: number | string;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const GET_RBAC_FILTER_ESTATES = gql`
  query GetRbacFilterEstates {
    estates {
      id
      name
      companyId
    }
  }
`;

export default function RBACManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('roles');
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');

  const [permissionPanelOpen, setPermissionPanelOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleData | null>(null);

  const [companyFilter, setCompanyFilter] = useState('all');
  const [estateFilter, setEstateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_ROLE_PAGE_SIZE);
  const [rolesResponse, setRolesResponse] = useState<RolesResponse | null>(null);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesRefreshKey, setRolesRefreshKey] = useState(0);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const { data: companiesData, loading: companiesLoading } = useQuery<CompaniesQueryData>(GET_COMPANIES, {
    variables: {
      page: 1,
      limit: 200
    }
  });
  const { data: estatesData, loading: estatesLoading } = useQuery<EstatesQueryData>(GET_RBAC_FILTER_ESTATES);
  const { data: hierarchyData, loading: hierarchyLoading, refetch: refetchHierarchy } = useQuery<HierarchyQueryData>(GET_ROLE_HIERARCHY);

  const [createRole, { loading: createLoading }] = useMutation(CREATE_ROLE);
  const [updateRole, { loading: updateLoading }] = useMutation(UPDATE_ROLE);
  const [deleteRole] = useMutation(DELETE_ROLE);
  const [assignRolePermissions] = useMutation(ASSIGN_ROLE_PERMISSIONS);

  useEffect(() => {
    setPage(1);
  }, [companyFilter, deferredSearchTerm, estateFilter, pageSize]);

  useEffect(() => {
    let cancelled = false;

    const loadRoles = async () => {
      setRolesLoading(true);
      setRolesError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          activeOnly: 'true'
        });

        if (deferredSearchTerm.trim()) {
          params.set('search', deferredSearchTerm.trim());
        }
        if (companyFilter !== 'all') {
          params.set('companyId', companyFilter);
        }
        if (estateFilter !== 'all') {
          params.set('estateId', estateFilter);
        }

        const response = await fetch(`/api/admin/rbac-roles?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'include'
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Failed to load roles');
        }

        if (!cancelled) {
          const nextRoles = payload as RolesResponse;
          setRolesResponse(nextRoles);

          if (nextRoles.pagination.page !== page) {
            setPage(nextRoles.pagination.page);
          }
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setRolesError(getErrorMessage(error, 'Failed to load roles'));
        }
      } finally {
        if (!cancelled) {
          setRolesLoading(false);
        }
      }
    };

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [companyFilter, deferredSearchTerm, estateFilter, page, pageSize, rolesRefreshKey]);

  const companyOptions = companiesData?.companies?.data || [];
  const availableEstates = (estatesData?.estates || []).filter((estate) =>
    companyFilter === 'all' ? true : estate.companyId === companyFilter
  );

  const refreshRoles = () => {
    setRolesRefreshKey((current) => current + 1);
  };

  const roles: RoleData[] = rolesResponse?.data?.map((role) => ({
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    description: role.description || '',
    scope: 'GLOBAL',
    usersCount: role.usersCount,
    featuresCount: 0,
    isSystem: role.isSystem
  })) || [];

  const pagination = rolesResponse?.pagination || {
    page,
    pageSize,
    totalCount: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  };

  const showingFrom = pagination.totalCount === 0 ? 0 : ((pagination.page - 1) * pagination.pageSize) + 1;
  const showingTo = pagination.totalCount === 0
    ? 0
    : Math.min(((pagination.page - 1) * pagination.pageSize) + roles.length, pagination.totalCount);

  const hierarchy = hierarchyData?.rbacHierarchyTree?.map((node) => ({
    id: node.role.id,
    name: node.role.name,
    displayName: node.role.displayName,
    level: node.level,
    description: node.role.description,
    userCount: 0,
    children: node.children?.map((child) => ({
      id: child.role.id,
      name: child.role.name,
      displayName: child.role.displayName,
      level: child.level,
      description: child.role.description,
      userCount: 0,
      children: child.children?.map((grandChild) => ({
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
        refreshRoles();
        refetchHierarchy();
      } catch (error: unknown) {
        toast.error(`Failed to delete role: ${getErrorMessage(error, 'Delete request failed')}`);
      }
    }
  };

  const handleRoleSubmit = async (values: RoleFormValues) => {
    try {
      if (selectedRole) {
        await updateRole({
          variables: {
            name: selectedRole.name,
            displayName: values.displayName,
            description: values.description,
            isActive: true
          }
        });
        toast.success('Role updated successfully');
      } else {
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

      refreshRoles();
      refetchHierarchy();
      setRoleFormOpen(false);
    } catch (error: unknown) {
      toast.error(`Failed to save role: ${getErrorMessage(error, 'Save request failed')}`);
    }
  };

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
      refreshRoles();
    } catch (error: unknown) {
      toast.error(`Failed to update permissions: ${getErrorMessage(error, 'Permission update failed')}`);
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
        contentMaxWidthClass="max-w-none"
        contentPaddingClass="px-2 py-4 sm:px-3 sm:py-5 lg:px-4 lg:py-6"
        breadcrumbItems={[
          { label: 'System', href: '/system' },
          { label: 'RBAC Management', href: '/rbac-management' }
        ]}
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm md:flex-row md:items-center md:justify-between sm:p-4">
            <div className="flex w-full items-center gap-2 md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search roles by name or description..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`rounded-md p-2 transition-all ${viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('hierarchy')}
                  className={`rounded-md p-2 transition-all ${viewMode === 'hierarchy' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
              <Select
                value={companyFilter}
                onValueChange={(value) => {
                  setCompanyFilter(value);
                  setEstateFilter('all');
                }}
              >
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <Building className="mr-2 h-3.5 w-3.5 text-gray-500" />
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companyOptions.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={estateFilter} onValueChange={setEstateFilter}>
                <SelectTrigger className="h-9 w-[180px] text-xs" disabled={companiesLoading || estatesLoading}>
                  <MapPin className="mr-2 h-3.5 w-3.5 text-gray-500" />
                  <SelectValue placeholder="Estate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Estates</SelectItem>
                  {availableEstates.map((estate) => (
                    <SelectItem key={estate.id} value={estate.id}>
                      {estate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                className="h-9 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleAddRole}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="h-auto w-full flex-wrap justify-start border border-gray-200 bg-white p-1 md:w-auto">
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
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className={viewMode === 'hierarchy' ? 'lg:col-span-2' : 'lg:col-span-3'}>
                  {rolesLoading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                  ) : rolesError ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600">
                      Error loading roles: {rolesError}
                    </div>
                  ) : viewMode === 'list' ? (
                    <RoleTable
                      roles={roles}
                      onEdit={handleEditRole}
                      onDelete={handleDeleteRole}
                      onManagePermissions={handleManagePermissions}
                      onViewUsers={handleViewUsers}
                      onDuplicate={() => {}}
                      emptyMessage={
                        deferredSearchTerm.trim()
                          ? 'No roles match your current search.'
                          : 'No roles available.'
                      }
                      footer={
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                          <p className="text-sm text-muted-foreground">
                            Showing {showingFrom}-{showingTo} of {pagination.totalCount} roles
                          </p>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Rows</span>
                              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                                <SelectTrigger className="h-9 w-[88px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="20">20</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                                disabled={!pagination.hasPreviousPage || rolesLoading}
                              >
                                Previous
                              </Button>
                              <span className="min-w-[108px] text-center text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.totalPages}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((current) => current + 1)}
                                disabled={!pagination.hasNextPage || rolesLoading}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        </div>
                      }
                    />
                  ) : (
                    <div className="flex min-h-[500px] items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
                      <div className="text-center">
                        <LayoutGrid className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                        <h3 className="font-medium text-gray-900">Interactive Hierarchy View</h3>
                        <p className="mt-1 text-sm">Select a node in the tree to view details</p>
                      </div>
                    </div>
                  )}
                </div>

                {viewMode === 'hierarchy' && (
                  <div className="lg:col-span-1">
                    {hierarchyLoading ? (
                      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
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
