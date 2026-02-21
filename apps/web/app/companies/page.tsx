'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PermissionManager } from '@/lib/auth/permissions';
import { PERMISSIONS } from '@/types/auth';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';
import {
  GET_COMPANIES,
  GET_COMPANY,
  CREATE_COMPANY,
  UPDATE_COMPANY,
  DELETE_COMPANY
} from '@/lib/apollo/queries/company';
import { apolloClient } from '@/lib/apollo/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Pencil,
  Trash2,
  Building,
  Users,
  MapPin,
  Phone,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  CircleAlert,
  Bug,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCompanySubscriptions } from '@/hooks/use-company-subscriptions';

// GraphQL types based on schema
interface Company {
  id: string;
  code: string;
  name: string;
  description?: string;
  logoUrl?: string;
  alamat?: string; // Mapped from address
  telepon?: string; // Mapped from phone
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isActive: boolean;
  users: Array<{
    id: string;
    username: string;
  }>;
  estates: Array<{
    id: string;
    name: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Form validation schema
const companySchema = z.object({
  code: z.string().min(2, 'Kode perusahaan minimal 2 karakter'),
  name: z.string().min(2, 'Nama perusahaan minimal 2 karakter'),
  description: z.string().optional(),
  logoUrl: z.string().max(10 * 1024 * 1024, 'Ukuran logo terlalu besar').optional(),
  alamat: z.string().optional(),
  telepon: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  isActive: z.boolean().default(true),
});

// Define form data type with explicit types to match Company interface
type CompanyFormData = {
  code: string;
  name: string;
  description?: string;
  logoUrl?: string;
  alamat?: string;
  telepon?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isActive?: boolean;
};

function mapDeleteCompanyErrorMessage(message?: string): string {
  const rawMessage = message || '';
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    (normalizedMessage.includes('masih memiliki') || normalizedMessage.includes('has estates')) &&
    normalizedMessage.includes('estate')
  ) {
    return 'Perusahaan tidak dapat dihapus karena masih memiliki estate. Hapus atau pindahkan semua estate terlebih dahulu.';
  }

  if (
    (normalizedMessage.includes('masih memiliki') || normalizedMessage.includes('has users')) &&
    (normalizedMessage.includes('pengguna') || normalizedMessage.includes('user'))
  ) {
    return 'Perusahaan tidak dapat dihapus karena masih memiliki pengguna. Nonaktifkan atau pindahkan pengguna tersebut terlebih dahulu.';
  }

  if (normalizedMessage.includes('assignment') && normalizedMessage.includes('company')) {
    return 'Perusahaan tidak dapat dihapus karena masih memiliki assignment user-company. Hapus assignment tersebut terlebih dahulu.';
  }

  if (normalizedMessage.includes('access denied') || normalizedMessage.includes('permission')) {
    return 'Anda tidak memiliki izin untuk menghapus perusahaan ini.';
  }

  if (normalizedMessage.includes('not found')) {
    return 'Perusahaan tidak ditemukan atau sudah dihapus sebelumnya.';
  }

  if (normalizedMessage.includes('dependency')) {
    return 'Perusahaan tidak dapat dihapus karena masih digunakan oleh data lain.';
  }

  return rawMessage || 'Gagal menghapus perusahaan.';
}

// Loading skeleton component
function CompaniesTableSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: Company['status'] }) {
  const variants = {
    ACTIVE: {
      variant: 'default' as const,
      icon: CheckCircle,
      text: 'Aktif',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    INACTIVE: {
      variant: 'secondary' as const,
      icon: XCircle,
      text: 'Tidak Aktif',
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    },
    SUSPENDED: {
      variant: 'destructive' as const,
      icon: CircleAlert,
      text: 'Ditangguhkan',
      className: 'bg-red-100 text-red-800 border-red-200'
    },
  };

  const data = variants[status] || variants.ACTIVE;
  const Icon = data.icon;
  const text = data.text;
  const className = data.className;

  return (
    <Badge className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {text}
    </Badge>
  );
}

// Company form dialog component
function CompanyFormDialog({
  company,
  open,
  onOpenChange,
  onSubmit
}: {
  company?: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CompanyFormData) => Promise<void>;
}) {
  const [logoPreview, setLogoPreview] = useState<string>(company?.logoUrl || '');

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      code: company?.code || '',
      name: company?.name || '',
      description: company?.description || '',
      logoUrl: company?.logoUrl || '',
      alamat: company?.alamat || '',
      telepon: company?.telepon || '',
      status: company?.status || 'ACTIVE',
      isActive: company?.isActive !== undefined ? company.isActive : true,
    },
  });

  // Reset form when company changes or dialog opens
  React.useEffect(() => {
    form.reset({
      code: company?.code || '',
      name: company?.name || '',
      description: company?.description || '',
      logoUrl: company?.logoUrl || '',
      alamat: company?.alamat || '',
      telepon: company?.telepon || '',
      status: company?.status || 'ACTIVE',
      isActive: company?.isActive !== undefined ? company.isActive : true,
    });
    setLogoPreview(company?.logoUrl || '');
  }, [company, open, form]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      form.setError('logoUrl', {
        type: 'manual',
        message: 'File harus berupa gambar',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      form.setError('logoUrl', {
        type: 'manual',
        message: 'Ukuran file maksimal 2MB',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      form.setValue('logoUrl', reader.result, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.clearErrors('logoUrl');
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (data: CompanyFormData) => {
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Form submission error:', error);
      // Don't close dialog if there's an error
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {company ? 'Edit Perusahaan' : 'Buat Perusahaan Baru'}
          </DialogTitle>
          <DialogDescription>
            {company
              ? 'Perbarui informasi perusahaan di bawah ini.'
              : 'Isi detail untuk membuat perusahaan baru.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Perusahaan *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Masukkan kode perusahaan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Perusahaan *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Masukkan nama perusahaan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Masukkan deskripsi perusahaan"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo Perusahaan</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                        {logoPreview && (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={logoPreview}
                              alt="Preview logo perusahaan"
                              className="h-14 w-14 rounded-md object-cover border"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                field.onChange('');
                                setLogoPreview('');
                                form.clearErrors('logoUrl');
                              }}
                            >
                              Hapus Logo
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alamat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Masukkan alamat perusahaan"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="telepon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Telepon</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Masukkan nomor telepon"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Aktif</SelectItem>
                          <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
                          <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                )}
                {company ? 'Perbarui Perusahaan' : 'Buat Perusahaan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Main companies dashboard component
function CompaniesDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | undefined>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(0);

  // GraphQL queries and mutations
  const { data, loading, error, refetch } = useQuery(GET_COMPANIES, {
    variables: {
      search: searchTerm || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'ACTIVE',
      page,
      limit,
    },
    errorPolicy: 'all',
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    context: { forceRefresh },
  });

  // Calculate derived state after query is defined
  const isInitialLoading = loading && !data;

  // Real-time subscription integration
  const companySubscriptions = useCompanySubscriptions({
    enabled: realTimeEnabled,
    showToasts: true,
    callbacks: {
      onCompanyCreated: (company) => {
        console.log('🏢 Real-time: Company created', company);
        // Refresh the companies list to include the new company
        refetch();
      },
      onCompanyUpdated: (company) => {
        console.log('🏢 Real-time: Company updated', company);
        // Refresh the companies list to reflect updates
        refetch();
      },
      onCompanyDeleted: (companyId) => {
        console.log('🏢 Real-time: Company deleted', companyId);
        // Refresh the companies list to remove the deleted company
        refetch();
        // If the deleted company was selected, clear the selection
        if (selectedCompany && selectedCompany.id === companyId) {
          setSelectedCompany(undefined);
          setIsEditDialogOpen(false);
        }
      },
      onCompanyStatusChanged: (company) => {
        console.log('🏢 Real-time: Company status changed', company);
        // Refresh the companies list to reflect status changes
        refetch();
      },
    },
  });

  // Debug logging for authentication and permissions
  useEffect(() => {
    console.log('🔍 [CompaniesDashboard] User auth state:', {
      user: user ? {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      } : null,
      isAuthenticated: !!user
    });
  }, [user]);

  // Debug logging for GraphQL query state
  useEffect(() => {
    console.log('🔍 [CompaniesDashboard] GraphQL query state:', {
      loading,
      hasData: !!data,
      dataLength: (data as any)?.companies?.length || 0,
      error: error?.message,
      isInitialLoading,
      userPresent: !!user
    });
  }, [loading, data, error, isInitialLoading, user]);

  // Check permissions using PERMISSIONS constants
  const canCreate = PermissionManager.hasPermission(user as any, PERMISSIONS.COMPANY_CREATE);
  const canUpdate = PermissionManager.hasPermission(user as any, PERMISSIONS.COMPANY_UPDATE);
  const canDelete = PermissionManager.hasPermission(user as any, PERMISSIONS.COMPANY_DELETE);

  // Debug logging for permissions
  useEffect(() => {
    console.log('🔍 [CompaniesDashboard] Permission check results:', {
      canCreate,
      canUpdate,
      canDelete,
      userRole: user?.role,
      permissionDebug: user ? PermissionManager.debugPermissionCheck(user as any, PERMISSIONS.COMPANY_CREATE) : null
    });
  }, [user, canCreate, canUpdate, canDelete]);

  // Enhanced error handling with retry logic
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Handle query errors with automatic retry
  useEffect(() => {
    if (error) {
      console.error('Companies query error:', error);

      // Network error - attempt automatic retry
      if ((error as any).networkError && retryCount < maxRetries) {
        console.log(`🔄 Network error detected. Attempting retry ${retryCount + 1}/${maxRetries}`);

        // Exponential backoff: 1s, 2s, 4s
        const retryDelay = Math.pow(2, retryCount) * 1000;

        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          refetch();
        }, retryDelay);

        toast({
          title: 'Masalah Koneksi',
          description: `Mencoba lagi... (${retryCount + 1}/${maxRetries})`,
        });
      } else {
        // Show user-friendly error message
        let errorMessage = 'Unable to load companies';
        const err = error as any;

        if (err.networkError) {
          errorMessage = 'Network connection failed. Please check your internet connection.';
        } else if (err.graphQLErrors?.length > 0) {
          const graphQLError = err.graphQLErrors[0];
          if (graphQLError.message.includes('authentication')) {
            errorMessage = 'Your session has expired. Please login again.';
          } else if (graphQLError.message.includes('permission')) {
            errorMessage = 'You do not have permission to view companies.';
          } else {
            errorMessage = graphQLError.message;
          }
        }

        toast({
          title: 'Gagal Memuat Perusahaan',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } else {
      // Reset retry count on successful query
      setRetryCount(0);
    }
  }, [error, retryCount, maxRetries, refetch, toast]);

  const [createCompany] = useMutation(CREATE_COMPANY, {
    optimisticResponse: (variables) => ({
      createCompany: {
        id: `temp-${Date.now()}`,
        code: variables.input.companyCode || '',
        name: variables.input.name,
        description: variables.input.description || '',
        logoUrl: variables.input.logoUrl || '',
        isActive: variables.input.isActive ?? true,
        alamat: variables.input.address || '',
        telepon: variables.input.phone || '',
        status: variables.input.status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        __typename: 'Company',
      },
    }),
    // Let Apollo Client handle cache updates automatically
    // The refetch will ensure latest data with proper field resolution
    refetchQueries: [{ query: GET_COMPANIES }],
    onCompleted: (data) => {
      console.log('✅ [CompaniesDashboard] Create company completed:', data);
      toast({
        title: 'Berhasil',
        description: 'Perusahaan berhasil dibuat',
      });
      // Refetch to ensure data consistency, but UI already updated optimistically
      refetch();
    },
    onError: (error, clientOptions) => {
      console.error('❌ [CompaniesDashboard] Create company error:', error);
      const err = error as any;
      console.error('❌ [CompaniesDashboard] Create error details:', {
        message: err.message,
        graphQLErrors: err.graphQLErrors,
        networkError: err.networkError,
        extraInfo: err.extraInfo
      });

      // Enhanced error message based on error type
      let errorMessage = err.message;
      let canRetry = false;

      if (err.networkError) {
        errorMessage = 'Network connection failed. The company creation will be retried automatically.';
        canRetry = true;
      } else if (err.message.includes('insufficient permissions')) {
        errorMessage = 'You do not have permission to create companies';
      } else if (err.message.includes('duplicate') || err.message.includes('already exists')) {
        errorMessage = 'A company with this name already exists';
      } else if (err.message.includes('invalid input')) {
        errorMessage = 'Please check your input data and try again';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
        canRetry = true;
      }

      toast({
        title: 'Gagal Membuat Perusahaan',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const [updateCompany] = useMutation(UPDATE_COMPANY, {
    optimisticResponse: (variables) => ({
      updateCompany: {
        id: variables.input.id,
        code: variables.input.companyCode || selectedCompany?.code || '',
        name: variables.input.name || selectedCompany?.name || '',
        description: variables.input.description || selectedCompany?.description || '',
        logoUrl: variables.input.logoUrl || selectedCompany?.logoUrl || '',
        isActive: selectedCompany?.isActive ?? true,
        alamat: variables.input.address || selectedCompany?.alamat || '',
        telepon: variables.input.phone || selectedCompany?.telepon || '',
        status: variables.input.status || selectedCompany?.status || 'ACTIVE',
        createdAt: selectedCompany?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        __typename: 'Company',
      },
    }),
    // Let Apollo Client handle cache updates automatically
    // The refetch will ensure latest data with proper field resolution
    refetchQueries: [{ query: GET_COMPANIES }],
    onCompleted: (data) => {
      console.log('✅ [CompaniesDashboard] Update company completed:', data);
      toast({
        title: 'Berhasil',
        description: 'Perusahaan berhasil diperbarui',
      });
      // Refetch to ensure data consistency, but UI already updated optimistically
      refetch();
    },
    onError: (error) => {
      console.error('❌ [CompaniesDashboard] Update company error:', error);
      const err = error as any;
      console.error('❌ [CompaniesDashboard] Update error details:', {
        message: err.message,
        graphQLErrors: err.graphQLErrors,
        networkError: err.networkError,
        extraInfo: err.extraInfo
      });

      // Enhanced error message based on error type
      let errorMessage = err.message;
      if (error.message.includes('access denied')) {
        errorMessage = 'You do not have permission to update this company';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Company not found or has been deleted';
      } else if (error.message.includes('invalid input')) {
        errorMessage = 'Please check your input data and try again';
      }

      toast({
        title: 'Gagal Memperbarui Perusahaan',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const [deleteCompany] = useMutation(DELETE_COMPANY, {
    optimisticResponse: (variables) => ({
      deleteCompany: true,
    }),
    update: (cache, { data }, { variables }) => {
      if ((data as any)?.deleteCompany && variables?.id) {
        try {
          // Read the current companies from cache
          const existingCompanies = cache.readQuery({ query: GET_COMPANIES });
          if (existingCompanies && (existingCompanies as any).companies) {
            // Remove the deleted company from cache
            const companies = (existingCompanies as any).companies.filter(
              (company: Company) => company.id !== variables.id
            );

            // Write updated data to cache immediately
            cache.writeQuery({
              query: GET_COMPANIES,
              data: { companies },
            });

            console.log('🗑️ [Cache Update] Successfully removed company from cache:', variables.id);
          }
        } catch (cacheError) {
          console.error('❌ [Cache Update] Failed to update cache:', cacheError);
          // If cache update fails, we'll rely on refetch to get fresh data
        }
      }
    },
    onCompleted: (data) => {
      console.log('✅ [CompaniesDashboard] Delete company completed:', data);
      toast({
        title: 'Berhasil',
        description: 'Perusahaan berhasil dihapus',
      });

      // Force a network refetch to ensure data consistency
      // Use a slight delay to ensure cache updates are processed
      setTimeout(() => {
        refetch({
          // Force network request by overriding fetch policy
          fetchPolicy: 'network-only'
        }).then(() => {
          console.log('🔄 [CompaniesDashboard] Refetch completed after deletion');
          setForceRefresh(prev => prev + 1); // Force query re-execution
        }).catch((error) => {
          console.error('❌ [CompaniesDashboard] Refetch failed after deletion:', error);
        });
      }, 100);
    },
    onError: (error) => {
      console.error('❌ [CompaniesDashboard] Delete company error:', error);
      const err = error as any;
      console.error('❌ [CompaniesDashboard] Delete error details:', {
        message: err.message,
        graphQLErrors: err.graphQLErrors,
        networkError: err.networkError,
        extraInfo: err.extraInfo
      });

      toast({
        title: 'Gagal Menghapus Perusahaan',
        description: mapDeleteCompanyErrorMessage(error.message),
        variant: 'destructive',
      });
    },
  });

  // Handle form submissions
  const handleCreateCompany = async (formData: CompanyFormData) => {
    try {
      console.log('🔧 [CompaniesDashboard] Creating company with data:', formData);
      console.log('🔧 [CompaniesDashboard] User context:', {
        user: user ? {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        } : null,
        permissions: { canCreate, canUpdate, canDelete }
      });

      const result = await createCompany({
        variables: {
          input: {
            name: formData.name,
            companyCode: formData.code,
            description: formData.description || undefined,
            logoUrl: formData.logoUrl || undefined,
            address: formData.alamat || undefined,
            phone: formData.telepon || undefined,
            status: formData.status,
            isActive: formData.isActive,
          },
        },
      });
      console.log('✅ [CompaniesDashboard] Company created successfully:', result);
    } catch (error) {
      console.error('❌ [CompaniesDashboard] Error creating company:', error);
      throw error; // Re-throw to prevent dialog from closing
    }
  };

  const handleUpdateCompany = async (formData: CompanyFormData) => {
    if (!selectedCompany) return;

    try {
      console.log('🔧 [CompaniesDashboard] Updating company with data:', formData, 'Company ID:', selectedCompany.id);
      console.log('🔧 [CompaniesDashboard] Update context:', {
        selectedCompany: selectedCompany,
        user: user ? {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        } : null,
        permissions: { canCreate, canUpdate, canDelete }
      });

      const result = await updateCompany({
        variables: {
          input: {
            id: selectedCompany.id,
            name: formData.name,
            companyCode: formData.code,
            description: formData.description || undefined,
            logoUrl: formData.logoUrl || undefined,
            address: formData.alamat || undefined,
            phone: formData.telepon || undefined,
            status: formData.status,
          },
        },
      });
      console.log('✅ [CompaniesDashboard] Company updated successfully:', result);
      setSelectedCompany(undefined);
    } catch (error) {
      console.error('❌ [CompaniesDashboard] Error updating company:', error);
      throw error; // Re-throw to prevent dialog from closing
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      console.log('🔧 [CompaniesDashboard] Deleting company with ID:', companyId);
      console.log('🔧 [CompaniesDashboard] Delete context:', {
        companyId: companyId,
        user: user ? {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        } : null,
        permissions: { canCreate, canUpdate, canDelete }
      });

      const result = await deleteCompany({
        variables: {
          id: companyId,
        },
      });
      console.log('✅ [CompaniesDashboard] Company deleted successfully:', result);
    } catch (error) {
      console.error('❌ [CompaniesDashboard] Error deleting company:', error);
      // For delete, we don't re-throw as the dialog should close
    }
  };

  // Handle data extraction from paginated response
  const companiesRes = (data as any)?.companies;
  const companies: Company[] = companiesRes?.data || [];
  const pagination = companiesRes?.pagination;
  const totalCount = pagination?.total || 0;
  const totalPages = pagination?.pages || 1;

  // Companies are already filtered by the server
  const filteredCompanies = companies;

  // Show loading skeleton while user is loading or query is loading
  const isLoading = loading || isInitialLoading;

  // Error state (only show if we have a real error and no cached data)
  if (error && !data && !loading) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Gagal Memuat Perusahaan</CardTitle>
            <CardDescription className="text-red-700">
              {error.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building className="h-8 w-8 text-blue-600" />
            Manajemen Perusahaan
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola perusahaan, lihat detail, dan atur akses di seluruh organisasi
          </p>
        </div>

        <div className="flex gap-2">
          {/* Real-time status indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border">
            {companySubscriptions.isConnected ? (
              <>
                <Activity className="h-4 w-4 text-green-600 animate-pulse" />
                <span className="text-sm text-green-700">Live</span>
              </>
            ) : companySubscriptions.hasErrors ? (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">Offline</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">Menghubungkan...</span>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRealTimeEnabled(!realTimeEnabled)}
              className="h-6 w-6 p-0"
            >
              {realTimeEnabled ? (
                <Activity className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  console.log('🔧 [Debug] Testing authentication and permissions...');
                  console.log('User:', user);
                  console.log('Permissions:', { canCreate, canUpdate, canDelete });
                  console.log('Real-time subscriptions:', companySubscriptions);
                  console.log('Permission debug:', user ? PermissionManager.debugPermissionCheck(user as any, 'company:create') : 'No user');
                  toast({
                    title: 'Debug Info',
                    description: `User: ${user?.username || 'Not logged in'}, Role: ${user?.role || 'None'}, Real-time: ${companySubscriptions.isConnected}`,
                  });
                }}
              >
                <Bug className="h-4 w-4 mr-2" />
                Debug Auth
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  console.log('🔄 [Debug] Force cache clear and refetch...');
                  apolloClient.clearStore();
                  setForceRefresh(prev => prev + 1);
                  refetch({
                    fetchPolicy: 'network-only'
                  }).then(() => {
                    toast({
                      title: 'Cache Cleared',
                      description: 'Apollo cache cleared and data refetched from network',
                    });
                  }).catch((error) => {
                    console.error('Force refresh failed:', error);
                    toast({
                      title: 'Refresh Failed',
                      description: 'Failed to force refresh data',
                      variant: 'destructive',
                    });
                  });
                }}
              >
                <Activity className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </>
          )}

          {canCreate && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Perusahaan
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari nama, alamat, atau telepon..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <Select value={statusFilter} onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1); // Reset to first page on filter change
              }}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
                  <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <CompaniesTableSkeleton />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <Building className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Tidak Ada Perusahaan
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Tidak ada perusahaan yang cocok dengan filter Anda.'
                  : 'Mulai dengan membuat perusahaan pertama Anda.'
                }
              </p>
              {canCreate && !searchTerm && statusFilter === 'all' && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Perusahaan Pertama
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Perusahaan</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Kebun</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {company.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-md border bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                          {company.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={company.logoUrl}
                              alt={`Logo ${company.name}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                        <div className="font-medium text-gray-900">
                          {company.name}
                        </div>
                        {company.alamat && (
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {company.alamat.length > 50
                              ? `${company.alamat.substring(0, 50)}...`
                              : company.alamat
                            }
                          </div>
                        )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.telepon && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-3 w-3 mr-1" />
                          {company.telepon}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={company.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        <span>{company.users ? company.users.length : 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-1 text-gray-400" />
                        <span>{company.estates ? company.estates.length : 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(company.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCompany(company);
                            // For now, just show in console - can be extended to view modal
                            console.log('Viewing company:', company);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCompany(company);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Perusahaan</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus "{company.name}"?
                                  Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi semua
                                  pengguna dan kebun yang terkait.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCompany(company.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Hapus Perusahaan
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-4 bg-gray-50/50">
            <div className="text-sm text-gray-500">
              Menampilkan {companies.length} dari {totalCount} perusahaan
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1 || loading}
              >
                Sebelumnya
              </Button>
              <div className="text-sm font-medium px-2">
                Halaman {page} dari {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages || loading}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Company Dialog */}
      <CompanyFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateCompany}
      />

      {/* Edit Company Dialog */}
      <CompanyFormDialog
        company={selectedCompany}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedCompany(undefined);
        }}
        onSubmit={handleUpdateCompany}
      />
    </div>
  );
}

// Main page component with protection
export default function CompaniesPage() {
  return (
    <ProtectedRoute
      allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']}
      requiredPermissions={[PERMISSIONS.COMPANY_READ]}
      fallbackPath="/dashboard"
    >
      <SuperAdminDashboardLayout
        title="Manajemen Perusahaan"
        description="Kelola perusahaan, lihat detail, dan atur akses di seluruh organisasi"
        breadcrumbItems={[
          { label: 'Perusahaan', href: '/companies' }
        ]}
      >
        <CompaniesDashboard />
      </SuperAdminDashboardLayout>
    </ProtectedRoute>
  );
}
