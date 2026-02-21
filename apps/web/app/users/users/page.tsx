'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_USERS_BY_COMPANY,
  TOGGLE_USER_STATUS,
  DELETE_USER,
  type User,
  type UserMutationResponse,
  type GetUsersByCompanyResponse
} from '@/lib/apollo/queries/user-management';
import { useAuth } from '@/hooks/use-auth';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  Edit,
  Eye,
  Trash2,
  Users,
  Shield,
  Activity,
  Filter,
  UserCog
} from 'lucide-react';

// User management page for Company Admin
export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // GraphQL queries and mutations
  const { data, loading, error, refetch } = useQuery<GetUsersByCompanyResponse>(
    GET_USERS_BY_COMPANY,
    {
      variables: { companyId: user?.companyId },
      skip: !user?.companyId,
    }
  );

  const [toggleUserStatus, { loading: toggleLoading }] = useMutation<{ toggleUserStatus: UserMutationResponse }>(
    TOGGLE_USER_STATUS,
    {
      onCompleted: (data) => {
        if (data.toggleUserStatus.success) {
          toast.success(data.toggleUserStatus.message);
          refetch();
        } else {
          toast.error(data.toggleUserStatus.message);
        }
      },
      onError: (error) => {
        toast.error(`Failed to update user status: ${error.message}`);
      },
    }
  );

  const [deleteUser, { loading: deleteLoading }] = useMutation<{ deleteUser: UserMutationResponse }>(
    DELETE_USER,
    {
      onCompleted: (data) => {
        if (data.deleteUser.success) {
          toast.success(data.deleteUser.message);
          refetch();
        } else {
          toast.error(data.deleteUser.message);
        }
      },
      onError: (error) => {
        toast.error(`Failed to delete user: ${error.message}`);
      },
    }
  );

  const users = data?.usersByCompany || [];

  // Filter users based on search, role, and status
  const filteredUsers = React.useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Get role counts for stats
  const roleStats = React.useMemo(() => {
    const stats = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return stats;
  }, [users]);

  // Handle user status toggle
  const handleToggleStatus = async (userId: string) => {
    try {
      await toggleUserStatus({ variables: { id: userId } });
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser({ variables: { id: userId } });
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'COMPANY_ADMIN': 'Company Admin',
      'AREA_MANAGER': 'Area Manager',
      'MANAGER': 'Manager',
      'ASISTEN': 'Asisten',
      'MANDOR': 'Mandor',
      'SATPAM': 'Satpam',
    };
    return roleNames[role] || role;
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, string> = {
      'SUPER_ADMIN': 'destructive',
      'COMPANY_ADMIN': 'default',
      'AREA_MANAGER': 'secondary',
      'MANAGER': 'outline',
      'ASISTEN': 'secondary',
      'MANDOR': 'outline',
      'SATPAM': 'secondary',
    };
    return variants[role] || 'outline';
  };

  if (error) {
    return (
      <CompanyAdminDashboardLayout
        title="User Management"
        description="Manage company users and permissions"
      >
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading users: {error.message}</p>
              <Button onClick={() => refetch()} className="mt-4" variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </CompanyAdminDashboardLayout>
    );
  }

  return (
    <CompanyAdminDashboardLayout
      title="User Management"
      description="Manage company users and permissions"
      actions={
        <Button onClick={() => router.push('/users/add')}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16" /> : users.length}
              </div>
              <p className="text-xs text-muted-foreground">
                All system users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  users.filter(u => u.isActive).length
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Managers</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  (roleStats['MANAGER'] || 0) + (roleStats['AREA_MANAGER'] || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Management roles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Field Workers</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  (roleStats['MANDOR'] || 0) + (roleStats['ASISTEN'] || 0) + (roleStats['SATPAM'] || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Operational roles
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>User Directory</CardTitle>
            <CardDescription>
              View and manage all users in your company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="all">All Roles</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ASISTEN">Asisten</option>
                    <option value="MANDOR">Mandor</option>
                    <option value="SATPAM">Satpam</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
              <Button onClick={() => refetch()} variant="outline">
                <UserCog className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' ? 'No users match your filters' : 'No users found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role) as any}>
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => router.push(`/users/${user.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/users/${user.id}/edit`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(user.id)}
                                disabled={toggleLoading}
                              >
                                {user.isActive ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{user.name}"?
                                      This action cannot be undone and will remove all user data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      disabled={deleteLoading}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {deleteLoading ? 'Deleting...' : 'Delete User'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyAdminDashboardLayout>
  );
}