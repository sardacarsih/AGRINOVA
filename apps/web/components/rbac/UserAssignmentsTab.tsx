'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react/hooks';
import { GET_ROLES } from '@/lib/apollo/queries/rbac';
import { GET_USERS, UPDATE_USER } from '@/lib/apollo/queries/user-management';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  Search,
  Loader2,
  UserPlus,
  UserMinus,
  Shield,
  Filter,
  Download
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  company?: {
    id: string;
    name: string;
  };
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  level: number;
  description: string;
}

export function UserAssignmentsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<string>('');

  // Queries
  const { data: rolesData, loading: rolesLoading } = useQuery(GET_ROLES, {
    variables: { activeOnly: true }
  });

  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useQuery(GET_USERS, {
    variables: {
      limit: 1000,
    },
    fetchPolicy: 'network-only'
  });

  // Mutation
  const [updateUser, { loading: updateLoading }] = useMutation(UPDATE_USER);

  const roles: Role[] = rolesData?.roles || [];
  const users: User[] = usersData?.users?.users || [];

  // Get unique companies from users
  const companies = useMemo(() => {
    const companyMap = new Map();
    users.forEach(user => {
      if (user.company) {
        companyMap.set(user.company.id, user.company);
      }
    });
    return Array.from(companyMap.values());
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Role filter
      if (selectedRole !== 'all' && user.role !== selectedRole) {
        return false;
      }

      // Company filter
      if (selectedCompany !== 'all' && user.company?.id !== selectedCompany) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          user.name.toLowerCase().includes(query) ||
          user.username.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          user.company?.name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [users, selectedRole, selectedCompany, searchQuery]);

  // Group users by role
  const usersByRole = useMemo(() => {
    const grouped: Record<string, User[]> = {};
    filteredUsers.forEach(user => {
      if (!grouped[user.role]) {
        grouped[user.role] = [];
      }
      grouped[user.role].push(user);
    });
    return grouped;
  }, [filteredUsers]);

  // Role statistics
  const roleStats = useMemo(() => {
    const stats: Record<string, { total: number; active: number; inactive: number }> = {};
    users.forEach(user => {
      if (!stats[user.role]) {
        stats[user.role] = { total: 0, active: 0, inactive: 0 };
      }
      stats[user.role].total++;
      if (user.isActive) {
        stats[user.role].active++;
      } else {
        stats[user.role].inactive++;
      }
    });
    return stats;
  }, [users]);

  // Handle role change
  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) {
      toast.error('Please select a user and new role');
      return;
    }

    try {
      await updateUser({
        variables: {
          input: {
            id: selectedUser.id,
            role: newRole
          }
        }
      });

      toast.success(`Successfully changed ${selectedUser.name}'s role to ${newRole}`);
      setIsChangeRoleDialogOpen(false);
      setSelectedUser(null);
      setNewRole('');
      refetchUsers();
    } catch (error: any) {
      toast.error(`Failed to change role: ${error.message}`);
    }
  };

  // Export to CSV
  const handleExport = () => {
    const csv = [
      ['Name', 'Username', 'Email', 'Role', 'Company', 'Status'].join(','),
      ...filteredUsers.map(user => [
        user.name,
        user.username,
        user.email || '',
        user.role,
        user.company?.name || '',
        user.isActive ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-assignments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Exported user assignments to CSV');
  };

  const getRoleColor = (roleName: string) => {
    const colors: Record<string, string> = {
      'SUPER_ADMIN': 'bg-purple-100 text-purple-800 border-purple-300',
      'COMPANY_ADMIN': 'bg-blue-100 text-blue-800 border-blue-300',
      'AREA_MANAGER': 'bg-red-100 text-red-800 border-red-300',
      'MANAGER': 'bg-green-100 text-green-800 border-green-300',
      'ASISTEN': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'MANDOR': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'SATPAM': 'bg-orange-100 text-orange-800 border-orange-300',
      'TIMBANGAN': 'bg-pink-100 text-pink-800 border-pink-300',
      'GRADING': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (rolesLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-green-600">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Roles</p>
                <p className="text-2xl font-bold">{roles.length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Filtered Results</p>
                <p className="text-2xl font-bold">{filteredUsers.length}</p>
              </div>
              <Filter className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari user berdasarkan name, username, atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Role</SelectItem>
            {roles.map(role => (
              <SelectItem key={role.name} value={role.name}>
                {role.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter by Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Company</SelectItem>
            {companies.map((company: any) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="w-full md:w-auto"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Role Statistics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {roles.map(role => {
              const stats = roleStats[role.name] || { total: 0, active: 0, inactive: 0 };
              return (
                <div
                  key={role.name}
                  className="p-3 rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors cursor-pointer"
                  onClick={() => setSelectedRole(role.name)}
                >
                  <Badge className={`${getRoleColor(role.name)} mb-2`}>
                    {role.displayName}
                  </Badge>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-bold">{stats.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active:</span>
                      <span className="text-green-600 font-medium">{stats.active}</span>
                    </div>
                    {stats.inactive > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Inactive:</span>
                        <span className="text-red-600 font-medium">{stats.inactive}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
              User Assignments
              {selectedRole !== 'all' && (
                <Badge variant="outline" className="ml-2">
                  {roles.find(r => r.name === selectedRole)?.displayName}
                </Badge>
              )}
            </CardTitle>
            <div className="text-sm text-gray-500">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No users found matching your filters</p>
                      <p className="text-sm mt-1">Try adjusting your search or filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          {user.email && (
                            <span className="text-xs text-gray-500">{user.email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{user.username}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>
                          {roles.find(r => r.name === user.role)?.displayName || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.company ? (
                          <span className="text-sm">{user.company.name}</span>
                        ) : (
                          <span className="text-xs text-gray-400">No company</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role);
                            setIsChangeRoleDialogOpen(true);
                          }}
                        >
                          <Shield className="w-4 h-4 mr-1" />
                          Change Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={isChangeRoleDialogOpen} onOpenChange={setIsChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Current Role:</strong>{' '}
                <Badge className={getRoleColor(selectedUser?.role || '')}>
                  {roles.find(r => r.name === selectedUser?.role)?.displayName}
                </Badge>
              </AlertDescription>
            </Alert>

            <div>
              <label className="text-sm font-medium mb-2 block">New Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.name} value={role.name}>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(role.name)}>
                          {role.displayName}
                        </Badge>
                        <span className="text-xs text-gray-500">Level {role.level}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newRole && newRole !== selectedUser?.role && (
              <Alert>
                <AlertDescription className="text-sm">
                  ⚠️ Changing roles will immediately update the user's permissions.
                  Make sure this is intentional.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsChangeRoleDialogOpen(false);
                setSelectedUser(null);
                setNewRole('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={updateLoading || !newRole || newRole === selectedUser?.role}
            >
              {updateLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
