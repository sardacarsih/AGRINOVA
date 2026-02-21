'use client';

import * as React from 'react';
import { User, UserRole, ROLE_PERMISSIONS, USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CircleAlert, Eye, EyeOff, Save, X } from 'lucide-react';

interface UserFormProps {
  user?: User;
  onSubmit: (userData: Partial<User>) => void;
  onCancel: () => void;
  showMultiEstate?: boolean;
}

interface FormData {
  name: string;
  email: string;
  username: string;
  password?: string;
  role: UserRole;
  company: string;
  estate: string;
  divisi: string;
  employeeId: string;
  phoneNumber: string;
  position: string;
  status: 'active' | 'inactive' | 'suspended';
  notes: string;
}

const COMPANIES = [
  'PT Agrinova Sentosa',
  'PT Agrinova Mandiri',
  'PT Agrinova Sejahtera'
];

const ESTATES = [
  'Estate Sawit Jaya',
  'Estate Sawit Makmur', 
  'Estate Sawit Harapan',
  'Estate Sawit Indah',
  'Estate Sawit Berkah'
];

const DIVISIONS = [
  'Divisi A',
  'Divisi B', 
  'Divisi C',
  'Divisi D',
  'Divisi E'
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif', description: 'Pengguna dapat mengakses sistem' },
  { value: 'inactive', label: 'Tidak Aktif', description: 'Pengguna tidak dapat login' },
  { value: 'suspended', label: 'Suspended', description: 'Akses ditangguhkan sementara' }
];

export function UserForm({ user, onSubmit, onCancel, showMultiEstate = false }: UserFormProps) {
  const [formData, setFormData] = React.useState<FormData>({
    name: user?.name || '',
    email: user?.email || '',
    username: user?.username || '',
    password: '',
    role: user?.role || 'MANDOR',
    company: user?.company || 'PT Agrinova Sentosa',
    estate: user?.estate || 'Estate Sawit Jaya',
    divisi: user?.divisi || 'Divisi A',
    employeeId: user?.employeeId || '',
    phoneNumber: user?.phoneNumber || '',
    position: user?.position || '',
    status: (user?.status as any) || 'active',
    notes: user?.notes || ''
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Nama wajib diisi';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username wajib diisi';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username minimal 3 karakter';
    }

    if (!user && !formData.password) {
      newErrors.password = 'Password wajib diisi untuk pengguna baru';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password minimal 6 karakter';
    }

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'ID Karyawan wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const userData: Partial<User> = {
        name: formData.name,
        email: formData.email,
        username: formData.username,
        role: formData.role,
        company: formData.company,
        estate: formData.estate,
        divisi: formData.divisi,
        employeeId: formData.employeeId,
        phoneNumber: formData.phoneNumber,
        position: formData.position,
        status: formData.status as any,
        notes: formData.notes,
        permissions: ROLE_PERMISSIONS[formData.role],
      };

      // Include password only if provided
      if (formData.password) {
        (userData as any).password = formData.password;
      }

      await onSubmit(userData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleInfo = (role: UserRole) => {
    return {
      label: USER_ROLE_LABELS[role],
      description: USER_ROLE_DESCRIPTIONS[role],
      permissions: ROLE_PERMISSIONS[role]
    };
  };

  const selectedRoleInfo = getRoleInfo(formData.role);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Informasi Dasar</h3>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Masukkan nama lengkap"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600 flex items-center">
                <CircleAlert className="h-4 w-4 mr-1" />
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="nama@agrinova.com"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-600 flex items-center">
                <CircleAlert className="h-4 w-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Masukkan username"
              className={errors.username ? 'border-red-500' : ''}
            />
            {errors.username && (
              <p className="text-sm text-red-600 flex items-center">
                <CircleAlert className="h-4 w-4 mr-1" />
                {errors.username}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {user ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Masukkan password"
                className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600 flex items-center">
                <CircleAlert className="h-4 w-4 mr-1" />
                {errors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeId">ID Karyawan *</Label>
            <Input
              id="employeeId"
              value={formData.employeeId}
              onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
              placeholder="EMP001"
              className={errors.employeeId ? 'border-red-500' : ''}
            />
            {errors.employeeId && (
              <p className="text-sm text-red-600 flex items-center">
                <CircleAlert className="h-4 w-4 mr-1" />
                {errors.employeeId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Nomor Telepon</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="08123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Jabatan</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              placeholder="Contoh: Kepala Mandor"
            />
          </div>
        </div>

        {/* Role & Organization */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Role & Organisasi</h3>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center space-x-2">
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-600">{selectedRoleInfo.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Perusahaan</Label>
            <Select value={formData.company} onValueChange={(value) => setFormData(prev => ({ ...prev, company: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih perusahaan" />
              </SelectTrigger>
              <SelectContent>
                {COMPANIES.map((company) => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estate">Estate</Label>
            <Select value={formData.estate} onValueChange={(value) => setFormData(prev => ({ ...prev, estate: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih estate" />
              </SelectTrigger>
              <SelectContent>
                {ESTATES.map((estate) => (
                  <SelectItem key={estate} value={estate}>{estate}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="divisi">Divisi</Label>
            <Select value={formData.divisi} onValueChange={(value) => setFormData(prev => ({ ...prev, divisi: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih divisi" />
              </SelectTrigger>
              <SelectContent>
                {DIVISIONS.map((divisi) => (
                  <SelectItem key={divisi} value={divisi}>{divisi}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex flex-col">
                      <span>{status.label}</span>
                      <span className="text-xs text-gray-500">{status.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Role Permissions Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Izin Akses Role: {selectedRoleInfo.label}</CardTitle>
          <CardDescription>
            Berikut adalah izin yang akan diberikan kepada pengguna
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {selectedRoleInfo.permissions.map((permission) => (
              <Badge key={permission} variant="secondary" className="text-xs">
                {permission.replace(':', ': ').replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Catatan tambahan tentang pengguna ini..."
          rows={3}
        />
      </div>

      <Separator />

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Menyimpan...' : user ? 'Perbarui' : 'Simpan'}
        </Button>
      </div>
    </form>
  );
}