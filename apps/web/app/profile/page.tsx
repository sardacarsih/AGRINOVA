'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Grid3X3,
  CreditCard,
  Calendar,
  Clock,
  Settings,
  Bell,
  Shield,
  Eye,
  EyeOff,
  Save,
  Edit2,
  Camera,
  Globe,
  Moon,
  Sun,
  Monitor,
  RefreshCw,
  LogOut,
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { User as UserType, UserRole, USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from '@/types/auth';
import { useAuth } from '@/hooks/use-auth';
import { UpdateUserProfileInput, ChangePasswordInput } from '@/lib/apollo/queries/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { resolveMediaUrl } from '@/lib/utils/media-url';

interface ProfileFormData {
  name: string;
  email: string;
  phoneNumber: string;
  position: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  preferences: {
    language: 'id' | 'en';
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    dashboard: {
      defaultView: string;
      autoRefresh: boolean;
      refreshInterval: number;
    };
  };
}

export default function ProfilePage() {
  const { user, updateProfile, updateUserProfile, changePassword, logout, logoutAllDevices } = useAuth();
  const router = useRouter();
  const { toast, loading: toastLoading, dismiss: toastDismiss, success: toastSuccess } = useToast();

  const getUserPreferenceKey = (key: string): string => {
    if (!user?.id) {
      return key;
    }
    return `profile:${user.id}:${key}`;
  };

  const parseStoredBoolean = (value: string | null, fallback: boolean): boolean => {
    if (value === null) {
      return fallback;
    }
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const parseStoredNumber = (value: string | null, fallback: number): number => {
    if (!value) {
      return fallback;
    }
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const parseStoredLanguage = (value: string | null): 'id' | 'en' => {
    return value === 'en' ? 'en' : 'id';
  };

  const parseStoredTheme = (value: string | null): 'light' | 'dark' | 'auto' => {
    if (value === 'light' || value === 'dark' || value === 'auto') {
      return value;
    }
    return 'auto';
  };
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phoneNumber: '',
    position: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    preferences: {
      language: 'id',
      theme: 'auto',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      dashboard: {
        defaultView: 'overview',
        autoRefresh: true,
        refreshInterval: 30000,
      }
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLogoutAllDialogOpen, setIsLogoutAllDialogOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<string | undefined>(undefined);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        position: user.position || '',
        // Load preferences from localStorage or use defaults
        preferences: {
          language: parseStoredLanguage(
            localStorage.getItem(getUserPreferenceKey('app-language')) ??
            localStorage.getItem('app-language')
          ),
          theme: parseStoredTheme(
            localStorage.getItem(getUserPreferenceKey('app-theme')) ??
            localStorage.getItem('app-theme')
          ),
          notifications: {
            email: parseStoredBoolean(
              localStorage.getItem(getUserPreferenceKey('notifications-email')) ??
              localStorage.getItem('notifications-email'),
              true
            ),
            push: parseStoredBoolean(
              localStorage.getItem(getUserPreferenceKey('notifications-push')) ??
              localStorage.getItem('notifications-push'),
              true
            ),
            sms: parseStoredBoolean(
              localStorage.getItem(getUserPreferenceKey('notifications-sms')) ??
              localStorage.getItem('notifications-sms'),
              false
            ),
          },
          dashboard: {
            defaultView: (
              localStorage.getItem(getUserPreferenceKey('dashboard-default-view')) ??
              localStorage.getItem('dashboard-default-view')
            ) || 'overview',
            autoRefresh: parseStoredBoolean(
              localStorage.getItem(getUserPreferenceKey('dashboard-auto-refresh')) ??
              localStorage.getItem('dashboard-auto-refresh'),
              true
            ),
            refreshInterval: parseStoredNumber(
              localStorage.getItem(getUserPreferenceKey('dashboard-refresh-interval')) ??
              localStorage.getItem('dashboard-refresh-interval'),
              30000
            ),
          }
        }
      }));
      setAvatarPreview(null);
      setAvatarDraft(undefined);
    }
  }, [user]);

  // Redirect if no user
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      
      // Basic validation
      if (!formData.name.trim()) {
        toast({
          title: 'Error',
          description: 'Nama lengkap tidak boleh kosong',
          variant: 'destructive',
        });
        return;
      }

      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'User ID tidak ditemukan',
          variant: 'destructive',
        });
        return;
      }

      // Handle password change separately if provided
      let passwordChangeSuccess = true;
      if (formData.newPassword) {
        setIsChangingPassword(true);
        
        // Validate passwords
        if (!formData.currentPassword) {
          toast({
            title: 'Error',
            description: 'Password saat ini wajib diisi untuk mengubah password',
            variant: 'destructive',
          });
          return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
          toast({
            title: 'Error',
            description: 'Password baru dan konfirmasi password tidak sama',
            variant: 'destructive',
          });
          return;
        }
        if (formData.newPassword.length < 6) {
          toast({
            title: 'Error',
            description: 'Password minimal 6 karakter',
            variant: 'destructive',
          });
          return;
        }
        if (formData.newPassword === formData.currentPassword) {
          toast({
            title: 'Error',
            description: 'Password baru harus berbeda dengan password saat ini',
            variant: 'destructive',
          });
          return;
        }

        // Change password first
        const passwordInput: ChangePasswordInput = {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
          logoutOtherDevices: false
        };

        const passwordResult = await changePassword(passwordInput);
        if (!passwordResult.success) {
          toast({
            title: 'Error',
            description: passwordResult.message,
            variant: 'destructive',
          });
          passwordChangeSuccess = false;
        }
        setIsChangingPassword(false);
      }

      // Update profile information
      const profileInput: UpdateUserProfileInput = {
        id: user.id,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
      };
      if (avatarDraft !== undefined) {
        profileInput.avatar = avatarDraft;
      }

      const toastId = toastLoading('Memperbarui profil...');

      try {
        const profileResult = await updateUserProfile(profileInput);
        
        if (!profileResult.success) {
          throw new Error(profileResult.message);
        }
        
        // Save preferences to localStorage
        localStorage.setItem(getUserPreferenceKey('app-language'), formData.preferences.language);
        localStorage.setItem(getUserPreferenceKey('app-theme'), formData.preferences.theme);
        localStorage.setItem(getUserPreferenceKey('notifications-email'), JSON.stringify(formData.preferences.notifications.email));
        localStorage.setItem(getUserPreferenceKey('notifications-push'), JSON.stringify(formData.preferences.notifications.push));
        localStorage.setItem(getUserPreferenceKey('notifications-sms'), JSON.stringify(formData.preferences.notifications.sms));
        localStorage.setItem(getUserPreferenceKey('dashboard-default-view'), formData.preferences.dashboard.defaultView);
        localStorage.setItem(getUserPreferenceKey('dashboard-auto-refresh'), JSON.stringify(formData.preferences.dashboard.autoRefresh));
        localStorage.setItem(getUserPreferenceKey('dashboard-refresh-interval'), formData.preferences.dashboard.refreshInterval.toString());

        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        setAvatarPreview(null);
        setAvatarDraft(undefined);

        setIsEditing(false);
        toastDismiss(toastId);
        
        // Show success message
        if (formData.newPassword && passwordChangeSuccess) {
          toastSuccess('Profil dan password berhasil diperbarui!');
        } else if (formData.newPassword && !passwordChangeSuccess) {
          toastSuccess('Profil berhasil diperbarui, tetapi gagal mengubah password');
        } else {
          toastSuccess('Profil berhasil diperbarui');
        }

      } catch (updateError) {
        toastDismiss(toastId);
        throw updateError;
      }

    } catch (error: any) {
      console.error('Profile update error:', error);
      
      // Handle specific error messages
      let errorMessage = 'Gagal memperbarui profil';
      if (error?.message) {
        if (error.message.includes('Current password is incorrect')) {
          errorMessage = 'Password saat ini salah';
        } else if (error.message.includes('validation')) {
          errorMessage = 'Data yang dimasukkan tidak valid';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLogoutDialogOpen(false);
      const toastId = toastLoading('Melakukan logout...');
      await logout();
      toastDismiss(toastId);
      toastSuccess('Logout berhasil');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Error',
        description: 'Gagal logout',
        variant: 'destructive',
      });
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      setIsLogoutAllDialogOpen(false);
      const toastId = toastLoading('Logout dari semua perangkat...');
      const result = await logoutAllDevices();
      toastDismiss(toastId);
      
      if (result.success) {
        toastSuccess(result.message);
        router.push('/login');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Logout all devices error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal logout dari semua perangkat',
        variant: 'destructive',
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'File harus berupa gambar',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Ukuran file maksimal 5MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploadingAvatar(true);

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('failed to read image'));
        reader.readAsDataURL(file);
      });
      setAvatarPreview(dataUrl);
      setAvatarDraft(dataUrl);
      setIsEditing(true);

      toast({
        title: 'Info',
        description: 'Avatar diperbarui. Klik "Simpan Perubahan" untuk menyimpan.',
      });

    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengupload avatar',
        variant: 'destructive',
      });
      setAvatarPreview(null);
      setAvatarDraft(undefined);
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarDraft('');
    setIsEditing(true);
    toast({
      title: 'Info',
      description: 'Avatar akan dihapus setelah Anda klik "Simpan Perubahan".',
    });
  };

  const getRoleAssignmentDisplay = () => {
    if (!user) return 'N/A';
    
    const assignments: string[] = [];
    
    // Check for multi-company assignment (Area Manager)
    if (user.assignedCompanies && Array.isArray(user.assignedCompanies) && user.assignedCompanies.length > 1) {
      assignments.push(`${user.assignedCompanies.length} Perusahaan`);
    } else if (user.company) {
      assignments.push('1 Perusahaan');
    }
    
    // Check for multi-estate assignment (Manager)
    if (user.assignedEstates && Array.isArray(user.assignedEstates) && user.assignedEstates.length > 1) {
      assignments.push(`${user.assignedEstates.length} Estate`);
    } else if (user.estate) {
      assignments.push('1 Estate');
    }
    
    // Check for multi-division assignment (Asisten)
    if (user.assignedDivisions && Array.isArray(user.assignedDivisions) && user.assignedDivisions.length > 1) {
      assignments.push(`${user.assignedDivisions.length} Divisi`);
    } else if (user.divisi) {
      assignments.push('1 Divisi');
    }
    
    if (assignments.length === 0) {
      // For roles like Mandor and Satpam, show their specific assignment
      if (user.role === 'MANDOR' || user.role === 'SATPAM') {
        const parts: string[] = [];
        if (user.company) parts.push(typeof user.company === 'string' ? user.company : (user.company as any)?.name || (user.company as any)?.name || 'Unknown Company');
        if (user.estate) parts.push(typeof user.estate === 'string' ? user.estate : (user.estate as any)?.name || (user.estate as any)?.name || 'Unknown Estate');
        if (user.divisi) parts.push(typeof user.divisi === 'string' ? user.divisi : (user.divisi as any)?.name || (user.divisi as any)?.name || 'Unknown Divisi');
        return parts.length > 0 ? parts.join(' → ') : 'Belum ada assignment';
      }
      return 'Standard Assignment';
    }
    
    return assignments.length > 1 ? assignments.join(' • ') + ' (Multi-Assignment)' : assignments.join(' • ');
  };

  const getRoleSpecificInfo = () => {
    if (!user) return null;

    // Mock data for demonstration - in real implementation, this would come from API
    const roleStats = {
      super_admin: {
        totalCompanies: 25,
        totalUsers: 1250,
        systemUptime: '99.9%',
        activeAlerts: 3
      },
      company_admin: {
        totalUsers: 85,
        totalEstates: 12,
        activeEmployees: 320,
        pendingRequests: 5
      },
      area_manager: {
        companiesManaged: user.assignedCompanies?.length || 3,
        totalEstates: 28,
        monthlyReports: 45,
        teamEfficiency: '94%'
      },
      manager: {
        estatesManaged: user.assignedEstates?.length || 4,
        teamSize: 45,
        monthlyHarvest: '2,340 Ton',
        efficiency: '92%'
      },
      asisten: {
        divisionsManaged: user.assignedDivisions?.length || 6,
        pendingApprovals: 12,
        monthlyApprovals: 245,
        averageResponseTime: '2.3 jam'
      },
      mandor: {
        teamSize: 18,
        dailyHarvest: '8.5 Ton',
        monthlyTarget: '85%',
        qualityScore: '4.7/5'
      },
      satpam: {
        dailyChecks: 28,
        monthlyVehicles: 420,
        securityIncidents: 0,
        averageProcessTime: '3.2 menit'
      }
    };

    return roleStats[user.role] || null;
  };

  const formatLastLogin = (lastLogin?: Date) => {
    if (!lastLogin) return 'Belum pernah login';
    return new Date(lastLogin).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getThemeIcon = () => {
    switch (formData.preferences.theme) {
      case 'light': return Sun;
      case 'dark': return Moon;
      default: return Monitor;
    }
  };

  const normalizeScopeName = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') {
      const item = value as { name?: string; id?: string };
      return (item.name || item.id || '').trim();
    }
    return String(value).trim();
  };

  const getAssignedCompanyScopeNames = (): string[] => {
    if (!user) return [];

    const assignedCompanyNames = Array.isArray(user.assignedCompanyNames)
      ? user.assignedCompanyNames.map(normalizeScopeName).filter(Boolean)
      : [];

    const assignedCompaniesFallback = Array.isArray(user.assignedCompanies)
      ? user.assignedCompanies.map(normalizeScopeName).filter(Boolean)
      : [];

    const companyNames = [
      ...(assignedCompanyNames.length > 0 ? assignedCompanyNames : assignedCompaniesFallback),
      normalizeScopeName(user.company),
    ].filter(Boolean);

    return Array.from(new Set(companyNames));
  };

  const assignedCompanyScopeNames = getAssignedCompanyScopeNames();
  const isAreaManagerRole = (user?.role as string) === 'AREA_MANAGER' || (user?.role as string) === 'AREA_AMANAGER';

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profil Saya</h1>
            <p className="text-gray-600 mt-1">
              Kelola informasi profil dan preferensi akun Anda
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isLoading}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {isEditing ? 'Batalkan' : 'Edit Profil'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsLogoutDialogOpen(true)}
              className="text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Profile Overview */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start space-x-4">
              <div className="relative group">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {(avatarPreview || user.avatar) ? (
                    <img 
                      src={resolveMediaUrl(avatarPreview || user.avatar)} 
                      alt={user.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                
                {/* Avatar Upload Overlay */}
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <div className="flex space-x-1">
                    <label htmlFor="avatar-upload-header" className="cursor-pointer">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 hover:bg-white/30 transition-colors">
                        {isUploadingAvatar ? (
                          <RefreshCw className="h-3 w-3 text-white animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </label>
                    {(avatarPreview || user.avatar) && (
                      <button 
                        onClick={handleRemoveAvatar}
                        className="bg-red-500/70 backdrop-blur-sm rounded-full p-1.5 hover:bg-red-500/90 transition-colors"
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                    )}
                  </div>
                </div>
                
                <input
                  id="avatar-upload-header"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-bold">{user.name || 'User'}</h2>
                  {getRoleAssignmentDisplay().includes('Multi-Assignment') && (
                    <Badge variant="secondary" className="text-xs">
                      Multi-Assignment
                    </Badge>
                  )}
                  {(user.status === 'inactive' || user.status === 'suspended') && (
                    <Badge variant="destructive" className="text-xs">
                      {user.status === 'inactive' ? 'Tidak Aktif' : 'Suspended'}
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600">{user.email || 'No email'}</p>
                <div className="flex items-center space-x-4 mt-2 flex-wrap gap-y-1">
                  <Badge className="text-xs">
                    {user.role ? USER_ROLE_LABELS[user.role] || user.role : 'Unknown Role'}
                  </Badge>
                  {user.employeeId && (
                    <span className="text-sm text-gray-500">
                      ID: {user.employeeId}
                    </span>
                  )}
                  {user.company && (
                    <span className="text-sm text-gray-500 flex items-center">
                      <Building className="h-3 w-3 mr-1" />
                      {typeof user.company === 'string' ? user.company : (user.company as any)?.name || (user.company as any)?.name || 'Unknown Company'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-gray-500">Bergabung:</span>
                  <p className="font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : 'Tidak diketahui'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-gray-500">Login Terakhir:</span>
                  <p className="font-medium">
                    {formatLastLogin(user.lastLogin)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-gray-500">Status Akun:</span>
                  <p className="font-medium">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' :
                      user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.status === 'active' ? 'Aktif' :
                       user.status === 'inactive' ? 'Tidak Aktif' : 
                       user.status === 'suspended' ? 'Suspended' : 'Aktif'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Assignment:</span>
                <span className="font-medium text-gray-900">{getRoleAssignmentDisplay()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Informasi Dasar</TabsTrigger>
            <TabsTrigger value="role">Role & Assignment</TabsTrigger>
            <TabsTrigger value="statistics">Statistik & Kinerja</TabsTrigger>
            <TabsTrigger value="preferences">Preferensi</TabsTrigger>
            <TabsTrigger value="security">Keamanan</TabsTrigger>
          </TabsList>

          {/* Basic Information */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Personal</CardTitle>
                <CardDescription>
                  Informasi dasar tentang profil Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditing}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        value={formData.email}
                        disabled
                        className="pl-10 bg-gray-50"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Email tidak dapat diubah</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        value={formData.phoneNumber}
                        onChange={(e) => {
                          // Basic phone number formatting - only allow numbers and common separators
                          const value = e.target.value.replace(/[^\d\+\-\(\)\s]/g, '');
                          setFormData(prev => ({ ...prev, phoneNumber: value }));
                        }}
                        disabled={!isEditing}
                        className="pl-10"
                        placeholder="08123456789 atau +62123456789"
                        maxLength={20}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Format: 08123456789 atau +62123456789
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Jabatan</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                        disabled={!isEditing}
                        className="pl-10"
                        placeholder="Contoh: Kepala Mandor"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role & Assignment */}
          <TabsContent value="role" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Role & Hak Akses</CardTitle>
                <CardDescription>
                  Informasi tentang role dan assignment Anda dalam sistem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Role Saat Ini</Label>
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-blue-900">{user.role ? USER_ROLE_LABELS[user.role] || user.role : 'Unknown Role'}</h3>
                          <p className="text-sm text-blue-700">{user.role ? USER_ROLE_DESCRIPTIONS[user.role] || 'No description available' : 'No description available'}</p>
                        </div>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                          {user.role || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Company Assignment */}
                  {(user.company || (user.assignedCompanies && user.assignedCompanies.length > 0) || assignedCompanyScopeNames.length > 0) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Perusahaan</Label>
                      {isAreaManagerRole ? (
                        <>
                          <div className="mt-2 flex items-start space-x-2">
                            <Building className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div className="flex flex-wrap gap-2">
                              {assignedCompanyScopeNames.map((companyName, index) => (
                                <Badge key={`company-scope-${index}-${companyName}`} variant="secondary" className="text-xs">
                                  {companyName}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            Total: {assignedCompanyScopeNames.length} perusahaan dalam scope Anda
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mt-2 flex items-center space-x-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{assignedCompanyScopeNames[0] || 'N/A'}</span>
                            {assignedCompanyScopeNames.length > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                +{assignedCompanyScopeNames.length - 1} lainnya
                              </Badge>
                            )}
                          </div>
                          {assignedCompanyScopeNames.length > 1 && (
                            <div className="mt-1 text-xs text-gray-500">
                              Total: {assignedCompanyScopeNames.length} perusahaan
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Estate Assignment */}
                  {(user.estate || (user.assignedEstates && user.assignedEstates.length > 0)) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Estate</Label>
                      <div className="mt-2 flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{user.estate || (typeof user.assignedEstates?.[0] === 'string' ? user.assignedEstates[0] : (user.assignedEstates?.[0] as any)?.name || (user.assignedEstates?.[0] as any)?.name || 'N/A')}</span>
                        {user.assignedEstates && Array.isArray(user.assignedEstates) && user.assignedEstates.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            +{user.assignedEstates.length - 1} lainnya
                          </Badge>
                        )}
                      </div>
                      {user.assignedEstates && user.assignedEstates.length > 1 && (
                        <div className="mt-1 text-xs text-gray-500">
                          Total: {user.assignedEstates.length} estate
                        </div>
                      )}
                    </div>
                  )}

                  {/* Division Assignment */}
                  {(user.divisi || (user.assignedDivisions && user.assignedDivisions.length > 0)) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Divisi</Label>
                      <div className="mt-2 flex items-center space-x-2">
                        <Grid3X3 className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{user.divisi || (typeof user.assignedDivisions?.[0] === 'string' ? user.assignedDivisions[0] : (user.assignedDivisions?.[0] as any)?.name || (user.assignedDivisions?.[0] as any)?.name || 'N/A')}</span>
                        {user.assignedDivisions && Array.isArray(user.assignedDivisions) && user.assignedDivisions.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            +{user.assignedDivisions.length - 1} lainnya
                          </Badge>
                        )}
                      </div>
                      {user.assignedDivisions && user.assignedDivisions.length > 1 && (
                        <div className="mt-1 text-xs text-gray-500">
                          Total: {user.assignedDivisions.length} divisi
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reporting Relationship */}
                  {user.reportingToAreaManagerName && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Atasan Langsung</Label>
                      <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-orange-500" />
                          <span className="font-medium text-orange-900">{typeof user.reportingToAreaManagerName === 'string' ? user.reportingToAreaManagerName : (user.reportingToAreaManagerName as any)?.name || (user.reportingToAreaManagerName as any)?.name || 'Area Manager'}</span>
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                            Area Manager
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Permissions */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Hak Akses</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {user.permissions && Array.isArray(user.permissions) && user.permissions.slice(0, 8).map((permission, index) => (
                      <Badge key={`permission-${index}`} variant="secondary" className="text-xs">
                        {typeof permission === 'string' 
                          ? permission.replace(':', ': ').replace('_', ' ')
                          : (permission as any)?.name || (permission as any)?.name || String(permission || '')
                        }
                      </Badge>
                    ))}
                    {user.permissions && Array.isArray(user.permissions) && user.permissions.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{user.permissions.length - 8} lainnya
                      </Badge>
                    )}
                    {(!user.permissions || !Array.isArray(user.permissions) || user.permissions.length === 0) && (
                      <Badge variant="outline" className="text-xs">
                        Tidak ada permissions
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics & Performance */}
          <TabsContent value="statistics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistik & Kinerja</CardTitle>
                <CardDescription>
                  Informasi kinerja dan statistik berdasarkan role Anda dalam sistem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(() => {
                  const roleInfo = getRoleSpecificInfo();
                  
                  if (!roleInfo) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Tidak ada data statistik tersedia untuk role ini</p>
                      </div>
                    );
                  }

                  // Use type assertion to avoid TypeScript union type issues
                  const safeRoleInfo = roleInfo as any;

                  switch (user?.role) {
                    case 'SUPER_ADMIN':
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-1">Total Perusahaan</h4>
                            <p className="text-2xl font-bold text-blue-700">{safeRoleInfo.totalCompanies}</p>
                            <p className="text-xs text-blue-600">Perusahaan aktif</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-1">Total Pengguna</h4>
                            <p className="text-2xl font-bold text-green-700">{safeRoleInfo.totalUsers.toLocaleString()}</p>
                            <p className="text-xs text-green-600">Pengguna terdaftar</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-900 mb-1">System Uptime</h4>
                            <p className="text-2xl font-bold text-purple-700">{safeRoleInfo.systemUptime}</p>
                            <p className="text-xs text-purple-600">Dalam 30 hari terakhir</p>
                          </div>
                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <h4 className="font-medium text-orange-900 mb-1">Alert Aktif</h4>
                            <p className="text-2xl font-bold text-orange-700">{safeRoleInfo.activeAlerts}</p>
                            <p className="text-xs text-orange-600">Membutuhkan perhatian</p>
                          </div>
                        </div>
                      );
                      
                    case 'COMPANY_ADMIN':
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-1">Total Pengguna</h4>
                            <p className="text-2xl font-bold text-blue-700">{safeRoleInfo.totalUsers}</p>
                            <p className="text-xs text-blue-600">Dalam perusahaan</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-1">Total Estate</h4>
                            <p className="text-2xl font-bold text-green-700">{safeRoleInfo.totalEstates}</p>
                            <p className="text-xs text-green-600">Estate dikelola</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-900 mb-1">Karyawan Aktif</h4>
                            <p className="text-2xl font-bold text-purple-700">{safeRoleInfo.activeEmployees}</p>
                            <p className="text-xs text-purple-600">Karyawan lapangan</p>
                          </div>
                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <h4 className="font-medium text-orange-900 mb-1">Request Pending</h4>
                            <p className="text-2xl font-bold text-orange-700">{safeRoleInfo.pendingRequests}</p>
                            <p className="text-xs text-orange-600">Membutuhkan approval</p>
                          </div>
                        </div>
                      );
                      
                    case 'AREA_MANAGER':
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-1">Perusahaan Dikelola</h4>
                            <p className="text-2xl font-bold text-blue-700">{safeRoleInfo.companiesManaged}</p>
                            <p className="text-xs text-blue-600">Multi-company access</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-1">Total Estate</h4>
                            <p className="text-2xl font-bold text-green-700">{safeRoleInfo.totalEstates}</p>
                            <p className="text-xs text-green-600">Lintas perusahaan</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-900 mb-1">Laporan Bulanan</h4>
                            <p className="text-2xl font-bold text-purple-700">{safeRoleInfo.monthlyReports}</p>
                            <p className="text-xs text-purple-600">Report diproses</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-1">Efisiensi Tim</h4>
                            <p className="text-2xl font-bold text-green-700">{safeRoleInfo.teamEfficiency}</p>
                            <p className="text-xs text-green-600">Overall performance</p>
                          </div>
                        </div>
                      );
                      
                    case 'MANAGER':
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-1">Estate Dikelola</h4>
                            <p className="text-2xl font-bold text-blue-700">{safeRoleInfo.estatesManaged}</p>
                            <p className="text-xs text-blue-600">Estate assignment</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-1">Ukuran Tim</h4>
                            <p className="text-2xl font-bold text-green-700">{safeRoleInfo.teamSize}</p>
                            <p className="text-xs text-green-600">Anggota tim</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-900 mb-1">Panen Bulanan</h4>
                            <p className="text-2xl font-bold text-purple-700">{safeRoleInfo.monthlyHarvest}</p>
                            <p className="text-xs text-purple-600">Total produksi</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-1">Efisiensi</h4>
                            <p className="text-2xl font-bold text-green-700">{safeRoleInfo.efficiency}</p>
                            <p className="text-xs text-green-600">Target achievement</p>
                          </div>
                        </div>
                      );
                      
                    case 'ASISTEN':
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-1">Divisi Dikelola</h4>
                            <p className="text-2xl font-bold text-blue-700">{safeRoleInfo.divisionsManaged}</p>
                            <p className="text-xs text-blue-600">Multi-divisi access</p>
                          </div>
                          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <h4 className="font-medium text-orange-900 mb-1">Pending Approval</h4>
                            <p className="text-2xl font-bold text-orange-700">{safeRoleInfo.pendingApprovals}</p>
                            <p className="text-xs text-orange-600">Menunggu review</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-1">Approval Bulanan</h4>
                            <p className="text-2xl font-bold text-green-700">{safeRoleInfo.monthlyApprovals}</p>
                            <p className="text-xs text-green-600">Diproses bulan ini</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-900 mb-1">Avg Response Time</h4>
                            <p className="text-2xl font-bold text-purple-700">{safeRoleInfo.averageResponseTime}</p>
                            <p className="text-xs text-purple-600">Rata-rata response</p>
                          </div>
                        </div>
                      );
                      
                    case 'MANDOR':
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-1">Ukuran Tim</h4>
                            <p className="text-2xl font-bold text-blue-700">{safeRoleInfo.teamSize}</p>
                            <p className="text-xs text-blue-600">Karyawan bawahan</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-1">Panen Harian</h4>
                            <p className="text-2xl font-bold text-green-700">{safeRoleInfo.dailyHarvest}</p>
                            <p className="text-xs text-green-600">Rata-rata per hari</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-900 mb-1">Target Bulanan</h4>
                            <p className="text-2xl font-bold text-purple-700">{safeRoleInfo.monthlyTarget}</p>
                            <p className="text-xs text-purple-600">Achievement rate</p>
                          </div>
                          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h4 className="font-medium text-yellow-900 mb-1">Quality Score</h4>
                            <p className="text-2xl font-bold text-yellow-700">{safeRoleInfo.qualityScore}</p>
                            <p className="text-xs text-yellow-600">Rating kualitas</p>
                          </div>
                        </div>
                      );
                      
                    case 'SATPAM':
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-1">Gate Check Harian</h4>
                            <p className="text-2xl font-bold text-blue-700">{safeRoleInfo.dailyChecks}</p>
                            <p className="text-xs text-blue-600">Check hari ini</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-1">Kendaraan Bulanan</h4>
                            <p className="text-2xl font-bold text-green-700">{safeRoleInfo.monthlyVehicles}</p>
                            <p className="text-xs text-green-600">Processed bulan ini</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-medium text-green-900 mb-1">Security Incidents</h4>
                            <p className="text-2xl font-bold text-green-700">{safeRoleInfo.securityIncidents}</p>
                            <p className="text-xs text-green-600">Bulan ini</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h4 className="font-medium text-purple-900 mb-1">Avg Process Time</h4>
                            <p className="text-2xl font-bold text-purple-700">{safeRoleInfo.averageProcessTime}</p>
                            <p className="text-xs text-purple-600">Per kendaraan</p>
                          </div>
                        </div>
                      );
                      
                    default:
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Statistik tidak tersedia untuk role ini</p>
                        </div>
                      );
                  }
                })()}

                <Separator />

                {/* Recent Activity */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Aktivitas Terbaru</Label>
                  <div className="mt-3 space-y-3 max-h-48 overflow-y-auto">
                    {[
                      { action: 'Login berhasil', time: '5 menit yang lalu', status: 'success' },
                      { action: 'Profile diperbarui', time: '2 hari yang lalu', status: 'info' },
                      { action: 'Password diubah', time: '1 minggu yang lalu', status: 'warning' },
                      { action: 'Login dari device baru', time: '2 minggu yang lalu', status: 'info' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.status === 'success' ? 'bg-green-500' :
                            activity.status === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                            <p className="text-xs text-gray-500">{activity.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferensi Aplikasi</CardTitle>
                <CardDescription>
                  Sesuaikan pengalaman penggunaan aplikasi Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Bahasa</Label>
                      <Select 
                        value={formData.preferences.language}
                        onValueChange={(value: 'id' | 'en') => 
                          setFormData(prev => ({ 
                            ...prev, 
                            preferences: { ...prev.preferences, language: value }
                          }))
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-2">
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="id">Bahasa Indonesia</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Tema</Label>
                      <Select 
                        value={formData.preferences.theme}
                        onValueChange={(value: 'light' | 'dark' | 'auto') => 
                          setFormData(prev => ({ 
                            ...prev, 
                            preferences: { ...prev.preferences, theme: value }
                          }))
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-2">
                          <div className="flex items-center space-x-2">
                            {React.createElement(getThemeIcon(), { className: "h-4 w-4" })}
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">
                            <div className="flex items-center space-x-2">
                              <Sun className="h-4 w-4" />
                              <span>Light</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center space-x-2">
                              <Moon className="h-4 w-4" />
                              <span>Dark</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="auto">
                            <div className="flex items-center space-x-2">
                              <Monitor className="h-4 w-4" />
                              <span>Sistem</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Dashboard Default</Label>
                      <Select 
                        value={formData.preferences.dashboard.defaultView}
                        onValueChange={(value) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            preferences: { 
                              ...prev.preferences, 
                              dashboard: { ...prev.preferences.dashboard, defaultView: value }
                            }
                          }))
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overview">Overview</SelectItem>
                          <SelectItem value="analytics">Analytics</SelectItem>
                          <SelectItem value="reports">Reports</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Auto Refresh Dashboard</Label>
                        <p className="text-xs text-gray-500">Otomatis memuat data terbaru</p>
                      </div>
                      <Switch
                        checked={formData.preferences.dashboard.autoRefresh}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ 
                            ...prev, 
                            preferences: { 
                              ...prev.preferences, 
                              dashboard: { ...prev.preferences.dashboard, autoRefresh: checked }
                            }
                          }))
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Notifications */}
                <div>
                  <Label className="text-sm font-medium">Notifikasi</Label>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-xs text-gray-500">Terima notifikasi via email</p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.preferences.notifications.email}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ 
                            ...prev, 
                            preferences: { 
                              ...prev.preferences, 
                              notifications: { ...prev.preferences.notifications, email: checked }
                            }
                          }))
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Bell className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">Push Notification</p>
                          <p className="text-xs text-gray-500">Notifikasi langsung di browser</p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.preferences.notifications.push}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ 
                            ...prev, 
                            preferences: { 
                              ...prev.preferences, 
                              notifications: { ...prev.preferences.notifications, push: checked }
                            }
                          }))
                        }
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">SMS</p>
                          <p className="text-xs text-gray-500">Notifikasi via SMS (premium)</p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.preferences.notifications.sms}
                        onCheckedChange={(checked) =>
                          setFormData(prev => ({ 
                            ...prev, 
                            preferences: { 
                              ...prev.preferences, 
                              notifications: { ...prev.preferences.notifications, sms: checked }
                            }
                          }))
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Keamanan</CardTitle>
                <CardDescription>
                  Kelola password dan pengaturan keamanan akun Anda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Password Saat Ini</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        disabled={!isEditing}
                        placeholder={isEditing ? "Masukkan password saat ini" : "••••••••"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        disabled={!isEditing}
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                        disabled={!isEditing}
                        placeholder={isEditing ? "Masukkan password baru" : "••••••••"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        disabled={!isEditing}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Minimal 6 karakter</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        disabled={!isEditing}
                        placeholder={isEditing ? "Ulangi password baru" : "••••••••"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        disabled={!isEditing}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <Separator />

                <Separator />

                {/* Security Information */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Informasi Keamanan</Label>
                  <div className="mt-3 space-y-4">
                    {/* Current Session */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900">Sesi Aktif Saat Ini</h4>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-green-600">Browser:</span>
                              <p className="font-medium text-green-800">
                                {typeof navigator !== 'undefined' ? 
                                  `${navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                                    navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                                    navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown'} - ${
                                    navigator.userAgent.includes('Windows') ? 'Windows' :
                                    navigator.userAgent.includes('Mac') ? 'macOS' :
                                    navigator.userAgent.includes('Linux') ? 'Linux' : 'Unknown'
                                  }` : 'Unknown Browser'
                                }
                              </p>
                            </div>
                            <div>
                              <span className="text-green-600">IP Address:</span>
                              <p className="font-medium text-green-800">192.168.1.10 (Estimasi)</p>
                            </div>
                            <div>
                              <span className="text-green-600">Login:</span>
                              <p className="font-medium text-green-800">{formatLastLogin(user.lastLogin)}</p>
                            </div>
                            <div>
                              <span className="text-green-600">Status:</span>
                              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                                Aktif
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Login History */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Riwayat Login Terbaru</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[
                          { device: 'Chrome - Windows', location: 'Palangkaraya, Kalimantan Tengah', time: '5 menit yang lalu', status: 'current', ip: '192.168.1.10' },
                          { device: 'Chrome - Windows', location: 'Palangkaraya, Kalimantan Tengah', time: '1 hari yang lalu', status: 'success', ip: '192.168.1.10' },
                          { device: 'Firefox - Windows', location: 'Palangkaraya, Kalimantan Tengah', time: '3 hari yang lalu', status: 'success', ip: '192.168.1.15' },
                          { device: 'Chrome Mobile - Android', location: 'Palangkaraya, Kalimantan Tengah', time: '1 minggu yang lalu', status: 'success', ip: '192.168.1.25' },
                          { device: 'Safari - macOS', location: 'Jakarta, DKI Jakarta', time: '2 minggu yang lalu', status: 'suspicious', ip: '203.128.45.12' },
                        ].map((session, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            session.status === 'current' ? 'bg-green-50 border-green-200' :
                            session.status === 'suspicious' ? 'bg-red-50 border-red-200' :
                            'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <div className={`w-2 h-2 rounded-full mt-2 ${
                                  session.status === 'current' ? 'bg-green-500' :
                                  session.status === 'suspicious' ? 'bg-red-500' :
                                  'bg-gray-400'
                                }`} />
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <p className={`text-sm font-medium ${
                                      session.status === 'current' ? 'text-green-900' :
                                      session.status === 'suspicious' ? 'text-red-900' :
                                      'text-gray-900'
                                    }`}>
                                      {session.device}
                                    </p>
                                    {session.status === 'current' && (
                                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                        Saat ini
                                      </Badge>
                                    )}
                                    {session.status === 'suspicious' && (
                                      <Badge variant="destructive" className="text-xs">
                                        Mencurigakan
                                      </Badge>
                                    )}
                                  </div>
                                  <p className={`text-xs ${
                                    session.status === 'current' ? 'text-green-600' :
                                    session.status === 'suspicious' ? 'text-red-600' :
                                    'text-gray-500'
                                  }`}>
                                    {session.location} • {session.ip}
                                  </p>
                                  <p className={`text-xs ${
                                    session.status === 'current' ? 'text-green-600' :
                                    session.status === 'suspicious' ? 'text-red-600' :
                                    'text-gray-500'
                                  }`}>
                                    {session.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Device Trust Status */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Status Perangkat</h4>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <Shield className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-blue-900">Perangkat Terpercaya</p>
                            <p className="text-sm text-blue-700">
                              Perangkat ini telah diverifikasi dan terdaftar sebagai perangkat terpercaya.
                              Login tidak memerlukan verifikasi tambahan.
                            </p>
                            <div className="mt-2 flex items-center space-x-4 text-sm">
                              <span className="text-blue-600">
                                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                                  Device ID: {typeof window !== 'undefined' && sessionStorage.getItem('agrinova_device_id') ? 
                                    sessionStorage.getItem('agrinova_device_id')?.substring(0, 16) + '...' : 
                                    'web_' + Date.now().toString().substring(-6)
                                  }
                                </Badge>
                              </span>
                              <span className="text-blue-600">Terdaftar: {formatLastLogin(user.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Logout Options */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Logout Options</Label>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-3">
                        <LogOut className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Logout dari perangkat ini</p>
                          <p className="text-xs text-red-600">Keluar dari sesi saat ini</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsLogoutDialogOpen(true)}
                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                      >
                        Logout
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="text-sm font-medium text-orange-900">Logout dari semua perangkat</p>
                          <p className="text-xs text-orange-600">Keluar dari semua sesi aktif</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsLogoutAllDialogOpen(true)}
                        className="text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
                      >
                        Logout All
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Security Info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Tips Keamanan</h4>
                      <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                        <li>• Gunakan password yang kuat dengan kombinasi huruf, angka, dan simbol</li>
                        <li>• Jangan bagikan password Anda kepada siapapun</li>
                        <li>• Logout dari perangkat yang tidak dikenal</li>
                        <li>• Ganti password secara berkala</li>
                        <li>• Aktifkan "Logout dari perangkat lain" saat mengganti password</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end space-x-4 pt-4"
          >
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setAvatarPreview(null);
                setAvatarDraft(undefined);
              }}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button onClick={handleSaveProfile} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Logout</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin keluar dari aplikasi? 
              Anda akan diarahkan ke halaman login.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsLogoutDialogOpen(false)}
            >
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout All Devices Confirmation Dialog */}
      <Dialog open={isLogoutAllDialogOpen} onOpenChange={setIsLogoutAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logout dari Semua Perangkat</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin logout dari semua perangkat? 
              Tindakan ini akan mengakhiri semua sesi aktif dan mengharuskan login ulang dari semua perangkat.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
            <div className="flex">
              <Shield className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-900">
                  Ini adalah tindakan keamanan
                </p>
                <p className="mt-1 text-sm text-orange-700">
                  Gunakan fitur ini jika Anda curiga ada akses tidak sah ke akun Anda
                  atau jika Anda login dari perangkat umum/tidak aman.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsLogoutAllDialogOpen(false)}
            >
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleLogoutAllDevices}
            >
              <Shield className="h-4 w-4 mr-2" />
              Logout dari Semua Perangkat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
