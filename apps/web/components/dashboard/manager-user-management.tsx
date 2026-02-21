'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  MapPin,
  Grid3x3,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { User, UserRole, PERMISSIONS, USER_ROLE_LABELS } from '@/types/auth';
import { useAuth } from '@/hooks/use-auth';
import { HierarchicalUserForm } from '@/components/dashboard/hierarchical-user-form';
import { HierarchicalRoleManager } from '@/lib/auth/hierarchical-roles';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: Record<UserRole, number>;
  byEstate: Record<string, number>;
  byDivision: Record<string, number>;
}

interface FilterState {
  search: string;
  role: string;
  estate: string;
  division: string;
  status: string;
}

export function ManagerUserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    role: 'all',
    estate: 'all',
    division: 'all',
    status: 'all'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filters]);

  const loadUsers = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      // Get ONLY users that this manager can manage based on hierarchical scope
      const managedUsers = await HierarchicalRoleManager.getManagedUsers(currentUser);
      const roleStats = await HierarchicalRoleManager.getRoleStatistics(currentUser);
      
      setUsers(managedUsers);
      
      // Calculate stats for manager's scope only
      const userStats: UserStats = {
        total: roleStats.total,
        active: roleStats.active,
        inactive: roleStats.inactive,
        suspended: roleStats.suspended,
        byRole: roleStats.byRole,
        byEstate: roleStats.byEstate,
        byDivision: roleStats.byDivision
      };
      
      setStats(userStats);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data pengguna',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.employeeId?.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.estate?.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.divisi?.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.assignedEstateNames?.some(estate => 
          estate.toLowerCase().includes(filters.search.toLowerCase())
        ) ||
        user.assignedDivisionNames?.some(division => 
          division.toLowerCase().includes(filters.search.toLowerCase())
        )
      );
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Estate filter - only show estates that manager is assigned to
    if (filters.estate !== 'all') {
      filtered = filtered.filter(user => 
        user.estate === filters.estate || 
        user.assignedEstateNames?.includes(filters.estate)
      );
    }

    // Division filter
    if (filters.division !== 'all') {
      filtered = filtered.filter(user => 
        user.divisi === filters.division ||
        user.assignedDivisionNames?.includes(filters.division)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(user => (user.status || 'active') === filters.status);
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async (userData: Partial<User>) => {
    if (!currentUser) return;
    
    try {
      const newUser = await HierarchicalRoleManager.createUser(currentUser, userData);
      setUsers(prev => [...prev, newUser]);
      setIsAddDialogOpen(false);
      
      toast({
        title: 'Berhasil',
        description: `User ${newUser.name} berhasil dibuat`,
      });
      
      // Refresh stats
      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal membuat user',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async (userData: Partial<User>) => {
    if (!currentUser || !selectedUser) return;
    
    try {
      const updatedUser = await HierarchicalRoleManager.updateUser(
        currentUser, 
        selectedUser.id, 
        userData
      );
      
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      
      toast({
        title: 'Berhasil',
        description: `User ${updatedUser.name} berhasil diperbarui`,
      });
      
      // Refresh stats
      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal memperbarui user',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!currentUser || !selectedUser) return;
    
    // Check if current user can delete the target user
    if (!HierarchicalRoleManager.canDeleteUser(currentUser, selectedUser)) {
      toast({
        title: 'Error',
        description: 'Anda tidak memiliki izin untuk menghapus user ini',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      
      toast({
        title: 'Berhasil',
        description: `User ${selectedUser.name} berhasil dihapus`,
      });
      
      // Refresh stats
      loadUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus user',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status || 'active') {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Aktif</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Tidak Aktif</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Suspended</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      'manager': 'bg-green-100 text-green-800 border-green-200',
      'asisten': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'mandor': 'bg-orange-100 text-orange-800 border-orange-200',
      'satpam': 'bg-red-100 text-red-800 border-red-200',
    };
    
    return (
      <Badge className={colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        {USER_ROLE_LABELS[role]}
      </Badge>
    );
  };

  const getUniqueValues = (field: keyof User) => {
    const values = new Set<string>();
    
    users.forEach(user => {
      // Add single field value
      const singleValue = user[field];
      if (singleValue && typeof singleValue === 'string') {
        values.add(singleValue);
      }
      
      // Add multi-assignment values
      if (field === 'estate' && user.assignedEstateNames) {
        user.assignedEstateNames.forEach(estate => values.add(estate));
      }
      
      if (field === 'divisi' && user.assignedDivisionNames) {
        user.assignedDivisionNames.forEach(division => values.add(division));
      }
    });
    
    // For Manager role, filter estates to only those assigned to current manager
    if (field === 'estate' && currentUser?.assignedEstateNames) {
      const managerEstates = new Set(currentUser.assignedEstateNames);
      return Array.from(values).filter(estate => managerEstates.has(estate)).sort();
    }
    
    return Array.from(values).sort();
  };

  const manageableRoles = currentUser ? HierarchicalRoleManager.getManageableRoles(currentUser) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelola Pengguna Estate</h1>
          <p className="text-gray-600 mt-1">
            Kelola pengguna dalam estate yang Anda kelola: {currentUser?.assignedEstateNames?.join(', ') || currentUser?.estate || 'N/A'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Tambah User
          </Button>
        </div>
      </div>

      {/* Estate Assignment Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Estate Assignment Anda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentUser?.assignedEstateNames && currentUser.assignedEstateNames.length > 0 ? (
                currentUser.assignedEstateNames.map((estate, index) => (
                  <Badge key={index} className="bg-blue-100 text-blue-800 border-blue-300">
                    {estate}
                  </Badge>
                ))
              ) : (
                <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                  {currentUser?.estate || 'No Estate Assigned'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-blue-700 mt-2">
              Anda hanya dapat mengelola pengguna dalam estate yang ditugaskan kepada Anda.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total User</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Dalam estate Anda
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Aktif</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-muted-foreground">
                  Dapat mengakses sistem
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Divisi</CardTitle>
                <Grid3x3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(stats.byDivision).length}</div>
                <p className="text-xs text-muted-foreground">
                  Divisi dengan user
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
                <p className="text-xs text-muted-foreground">
                  User suspended
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, ID karyawan..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select 
                value={filters.role} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  {manageableRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {USER_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={filters.estate} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, estate: value }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Estate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Estate</SelectItem>
                  {getUniqueValues('estate').map(estate => (
                    <SelectItem key={estate as string} value={estate as string}>
                      {estate as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={filters.division} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, division: value }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Divisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Divisi</SelectItem>
                  {getUniqueValues('divisi').map(division => (
                    <SelectItem key={division as string} value={division as string}>
                      {division as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar User ({filteredUsers.length})</CardTitle>
          <CardDescription>
            User yang dapat Anda kelola dalam estate yang ditugaskan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Estate</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Users className="h-8 w-8 text-gray-400" />
                        <p className="text-gray-500">
                          {filters.search || filters.role !== 'all' || filters.estate !== 'all' || filters.status !== 'all'
                            ? 'Tidak ada user yang sesuai filter'
                            : 'Belum ada user dalam estate yang Anda kelola'
                          }
                        </p>
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
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {user.employeeId && (
                              <div className="text-xs text-gray-400">ID: {user.employeeId}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <div className="text-sm">
                            {user.assignedEstateNames && user.assignedEstateNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.assignedEstateNames.slice(0, 2).map((estate, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {estate}
                                  </Badge>
                                ))}
                                {user.assignedEstateNames.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{user.assignedEstateNames.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span>{user.estate || '-'}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Grid3x3 className="h-3 w-3 text-gray-400" />
                          <div className="text-sm">
                            {user.assignedDivisionNames && user.assignedDivisionNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.assignedDivisionNames.slice(0, 2).map((division, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {division}
                                  </Badge>
                                ))}
                                {user.assignedDivisionNames.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{user.assignedDivisionNames.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span>{user.divisi || '-'}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
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
                            {currentUser && HierarchicalRoleManager.canDeleteUser(currentUser, user) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            )}
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

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
            <DialogDescription>
              Tambahkan user baru dalam estate yang Anda kelola
            </DialogDescription>
          </DialogHeader>
          {currentUser && (
            <HierarchicalUserForm
              onSubmit={handleCreateUser}
              onCancel={() => setIsAddDialogOpen(false)}
              restrictedToCompany={currentUser.companyId}
              allowedRoles={manageableRoles}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Perbarui informasi user {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          {currentUser && selectedUser && (
            <HierarchicalUserForm
              user={selectedUser}
              onSubmit={handleUpdateUser}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedUser(null);
              }}
              restrictedToCompany={currentUser.companyId}
              allowedRoles={manageableRoles}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus User</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus user {selectedUser?.name}? 
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}