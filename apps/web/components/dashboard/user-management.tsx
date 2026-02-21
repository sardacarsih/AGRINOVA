'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  UserPlus,
  Users,
  Shield,
  CircleAlert,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { UserForm } from './user-form';
import { useAuth } from '@/hooks/use-auth';
import { User, UserRole, PERMISSIONS, USER_ROLE_LABELS, ROLE_PERMISSIONS } from '@/types/auth';
import { PermissionManager } from '@/lib/auth/permissions';
import { UserManagementAPI } from '@/lib/api/user-management-api';
import { User as ApiUser } from '@/lib/apollo/queries/users';
import { formatDate } from '@/lib/utils';

// Map API user to component User type
function mapApiUserToUser(apiUser: ApiUser): User {
  const role = apiUser.role as UserRole;
  return {
    id: apiUser.id,
    email: apiUser.email || '',
    username: apiUser.username,
    name: apiUser.name,
    role: role,
    company: apiUser.company?.name,
    companyId: apiUser.companyId,
    permissions: ROLE_PERMISSIONS[role] || [],
    createdAt: new Date(apiUser.createdAt),
    phoneNumber: apiUser.phoneNumber,
    status: apiUser.isActive ? 'active' : 'inactive',
    assignedEstates: apiUser.estates?.map(e => e.id),
    assignedEstateNames: apiUser.estates?.map(e => e.name),
    assignedDivisions: apiUser.divisions?.map(d => d.id),
    assignedDivisionNames: apiUser.divisions?.map(d => d.name),
    assignedCompanies: apiUser.companies?.map(c => c.id),
    assignedCompanyNames: apiUser.companies?.map(c => c.name),
  };
}

interface UserManagementProps {
  showMultiEstate?: boolean;
}

const ROLE_COLORS: Record<UserRole, string> = {
  'SUPER_ADMIN': 'bg-red-100 text-red-800',
  'COMPANY_ADMIN': 'bg-orange-100 text-orange-800',
  'AREA_MANAGER': 'bg-pink-100 text-pink-800',
  'MANAGER': 'bg-purple-100 text-purple-800',
  'ASISTEN': 'bg-green-100 text-green-800',
  'MANDOR': 'bg-blue-100 text-blue-800',
  'SATPAM': 'bg-yellow-100 text-yellow-800',
  'TIMBANGAN': 'bg-cyan-100 text-cyan-800',
  'GRADING': 'bg-indigo-100 text-indigo-800',
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800',
} as const;

export function UserManagement({ showMultiEstate = false }: UserManagementProps) {
  const { user } = useAuth();
  const [users, setUsers] = React.useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<string>('all');
  const [selectedEstate, setSelectedEstate] = React.useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // Load users from API
  React.useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await UserManagementAPI.getUsers({ limit: 100 });
        const mappedUsers = response.users.map(mapApiUserToUser);
        setUsers(mappedUsers);
        setFilteredUsers(mappedUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Filter users based on search and filters
  React.useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.estate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.divisi?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(u => u.role === selectedRole);
    }

    // Estate filter
    if (selectedEstate !== 'all') {
      filtered = filtered.filter(u => u.estate === selectedEstate);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedRole, selectedEstate]);

  const handleAddUser = async (userData: Partial<User>) => {
    try {
      // Map form data to API request format
      const createUserRequest = {
        username: userData.username || '',
        email: userData.email || '',
        fullName: userData.name || '',
        password: (userData as any).password || '',
        role: userData.role as UserRole,
        companyId: user?.companyId || 'PT Agrinova Sentosa',
        phone: userData.phoneNumber,
        employeeId: userData.employeeId,
        isActive: userData.status === 'active',
      };

      const newApiUser = await UserManagementAPI.createUser(createUserRequest);
      const newUser = mapApiUserToUser(newApiUser);
      setUsers(prev => [...prev, newUser]);
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleEditUser = async (userId: string, userData: Partial<User>) => {
    try {
      // Map form data to API request format
      const updateUserRequest = {
        username: userData.username,
        email: userData.email,
        fullName: userData.name,
        role: userData.role as UserRole,
        phone: userData.phoneNumber,
        employeeId: userData.employeeId,
        isActive: userData.status === 'active',
      };

      const updatedApiUser = await UserManagementAPI.updateUser(userId, updateUserRequest);
      const updatedUser = mapApiUserToUser(updatedApiUser);
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      return;
    }

    try {
      await UserManagementAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleToggleUserStatus = async (userId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const updatedApiUser = await UserManagementAPI.updateUser(userId, {
        isActive: newStatus === 'active'
      });
      const updatedUser = mapApiUserToUser(updatedApiUser);
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const getUniqueEstates = () => {
    return Array.from(new Set(users.map(u => u.estate).filter(Boolean)));
  };

  const getUserStats = () => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const byRole = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {} as Record<UserRole, number>);

    return { total, active, byRole };
  };

  const stats = getUserStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pengguna</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pengguna Aktif</p>
                  <p className="text-2xl font-bold text-green-900">{stats.active}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Role Terbanyak</p>
                  <p className="text-lg font-bold text-gray-900">
                    {Object.keys(stats.byRole).length > 0 
                      ? USER_ROLE_LABELS[Object.entries(stats.byRole).sort(([,a], [,b]) => b - a)[0][0] as UserRole]
                      : '-'
                    }
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <Shield className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Perlu Perhatian</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {users.filter(u => u.status === 'suspended').length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <CircleAlert className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* User Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daftar Pengguna</CardTitle>
                <CardDescription>
                  Kelola pengguna sistem Agrinova
                </CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Tambah Pengguna
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                    <DialogDescription>
                      Isi informasi lengkap untuk menambah pengguna baru
                    </DialogDescription>
                  </DialogHeader>
                  <UserForm 
                    onSubmit={handleAddUser} 
                    onCancel={() => setIsAddDialogOpen(false)}
                    showMultiEstate={showMultiEstate}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari pengguna..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showMultiEstate && (
                <Select value={selectedEstate} onValueChange={setSelectedEstate}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Semua Estate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Estate</SelectItem>
                    {getUniqueEstates().map(estate => (
                      <SelectItem key={estate} value={estate}>{estate}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Users Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    {showMultiEstate && <TableHead>Estate</TableHead>}
                    <TableHead>Divisi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Login Terakhir</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={showMultiEstate ? 8 : 7} className="text-center py-8">
                        <div className="flex flex-col items-center space-y-2">
                          <Users className="h-8 w-8 text-gray-400" />
                          <p className="text-gray-500">Tidak ada pengguna ditemukan</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {(user.name || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 font-mono">
                            {user.username || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={ROLE_COLORS[user.role]}>
                            {USER_ROLE_LABELS[user.role]}
                          </Badge>
                        </TableCell>
                        {showMultiEstate && (
                          <TableCell>
                            <span className="text-sm text-gray-600">{user.estate || '-'}</span>
                          </TableCell>
                        )}
                        <TableCell>
                          <span className="text-sm text-gray-600">{user.divisi || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[user.status || 'active']}>
                            {user.status === 'active' ? 'Aktif' : 
                             user.status === 'inactive' ? 'Tidak Aktif' : 'Suspended'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {user.lastLogin ? formatDate(user.lastLogin, { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status === 'active' ? (
                                <DropdownMenuItem
                                  onClick={() => handleToggleUserStatus(user.id, 'inactive')}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Non-aktifkan
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleToggleUserStatus(user.id, 'active')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aktifkan
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pengguna</DialogTitle>
            <DialogDescription>
              Ubah informasi pengguna {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <UserForm 
              user={selectedUser}
              onSubmit={(userData) => handleEditUser(selectedUser.id, userData)} 
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedUser(null);
              }}
              showMultiEstate={showMultiEstate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}