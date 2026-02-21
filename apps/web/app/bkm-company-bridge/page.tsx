'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Link2,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BkmCompanyBridgeItem,
  CREATE_BKM_COMPANY_BRIDGE,
  DELETE_BKM_COMPANY_BRIDGE,
  GET_BKM_COMPANY_BRIDGES,
  GetBkmCompanyBridgesData,
  GetBkmCompanyBridgesVars,
  UPDATE_BKM_COMPANY_BRIDGE,
} from '@/lib/apollo/queries/bkm-company-bridge';
import { GET_COMPANIES } from '@/lib/apollo/queries/company';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
const ALL_FILTER_VALUE = 'ALL';

type BridgeFormState = {
  sourceSystem: string;
  iddataPrefix: string;
  estateKey: string;
  divisiKey: string;
  companyId: string;
  priority: string;
  isActive: boolean;
  notes: string;
};

type BridgeFormErrors = Partial<Record<'sourceSystem' | 'iddataPrefix' | 'companyId' | 'priority', string>>;

type CompaniesQueryData = {
  companies?: {
    data?: Array<{
      id: string;
      code?: string;
      name: string;
    }>;
  };
};

function optionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized === '' ? undefined : normalized;
}

function formatDateTime(value: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID');
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function toFormState(item?: BkmCompanyBridgeItem): BridgeFormState {
  if (!item) {
    return {
      sourceSystem: 'BKM',
      iddataPrefix: '',
      estateKey: '',
      divisiKey: '',
      companyId: '',
      priority: '100',
      isActive: true,
      notes: '',
    };
  }

  return {
    sourceSystem: item.sourceSystem || 'BKM',
    iddataPrefix: item.iddataPrefix || '',
    estateKey: item.estateKey || '',
    divisiKey: item.divisiKey || '',
    companyId: item.companyId || '',
    priority: String(item.priority || 100),
    isActive: Boolean(item.isActive),
    notes: item.notes || '',
  };
}

function validateBridgeForm(
  sourceSystem: string,
  iddataPrefix: string,
  companyId: string,
  priority: number,
  isCompanySelectable: boolean
): BridgeFormErrors {
  const errors: BridgeFormErrors = {};

  if (!sourceSystem) {
    errors.sourceSystem = 'Source system wajib diisi.';
  }
  if (!iddataPrefix) {
    errors.iddataPrefix = 'IDData prefix wajib diisi.';
  }
  if (!companyId) {
    errors.companyId = 'Perusahaan wajib dipilih.';
  } else if (!isCompanySelectable) {
    errors.companyId = 'Daftar perusahaan belum tersedia.';
  }
  if (!Number.isFinite(priority) || priority < 1) {
    errors.priority = 'Priority minimal 1.';
  }

  return errors;
}

export default function BkmCompanyBridgePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState(ALL_FILTER_VALUE);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER_VALUE);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BkmCompanyBridgeItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<BkmCompanyBridgeItem | null>(null);
  const [formState, setFormState] = useState<BridgeFormState>(toFormState());
  const [formErrors, setFormErrors] = useState<BridgeFormErrors>({});

  const variables = useMemo<GetBkmCompanyBridgesVars>(() => {
    const filter: NonNullable<GetBkmCompanyBridgesVars['filter']> = {};

    if (search.trim()) {
      filter.search = search.trim();
    }
    if (companyFilter !== ALL_FILTER_VALUE) {
      filter.companyId = companyFilter;
    }
    if (statusFilter !== ALL_FILTER_VALUE) {
      filter.isActive = statusFilter === 'ACTIVE';
    }

    return {
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      page,
      pageSize: PAGE_SIZE,
    };
  }, [search, companyFilter, statusFilter, page]);

  const { data, loading, error, refetch } = useQuery<GetBkmCompanyBridgesData, GetBkmCompanyBridgesVars>(
    GET_BKM_COMPANY_BRIDGES,
    {
      variables,
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    }
  );

  const {
    data: companiesData,
    loading: companiesLoading,
    error: companiesError,
  } = useQuery<CompaniesQueryData>(GET_COMPANIES, {
    variables: {
      page: 1,
      limit: 1000,
    },
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });

  const [createBridge, { loading: creating }] = useMutation(CREATE_BKM_COMPANY_BRIDGE);
  const [updateBridge, { loading: updating }] = useMutation(UPDATE_BKM_COMPANY_BRIDGE);
  const [deleteBridge, { loading: deleting }] = useMutation(DELETE_BKM_COMPANY_BRIDGE);

  const listData = data?.bkmCompanyBridges;
  const rows = listData?.data || [];
  const totalCount = listData?.totalCount || 0;
  const hasMore = listData?.hasMore || false;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const companies = useMemo(
    () => companiesData?.companies?.data ?? [],
    [companiesData?.companies?.data]
  );
  const isSubmitting = creating || updating;
  const formSourceSystem = formState.sourceSystem.trim().toUpperCase();
  const formIddataPrefix = formState.iddataPrefix.trim();
  const formCompanyId = formState.companyId.trim();
  const formPriority = Number(formState.priority);
  const isCompanySelectable = companies.length > 0 && !companiesLoading;
  const isFormValid = Boolean(
    formSourceSystem &&
    formIddataPrefix &&
    formCompanyId &&
    Number.isFinite(formPriority) &&
    formPriority >= 1 &&
    isCompanySelectable
  );

  const companyOptions = useMemo(() => {
    const options = [...companies];
    if (
      formState.companyId &&
      !options.some((company) => company.id === formState.companyId)
    ) {
      options.unshift({
        id: formState.companyId,
        code: '',
        name: `${formState.companyId} (tidak ditemukan di master perusahaan)`,
      });
    }
    return options;
  }, [companies, formState.companyId]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormErrors({});
    const defaultState = toFormState();
    if (companies.length === 1) {
      defaultState.companyId = companies[0].id;
    }
    setFormState(defaultState);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: BkmCompanyBridgeItem) => {
    setEditingItem(item);
    setFormErrors({});
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    const sourceSystem = formSourceSystem;
    const iddataPrefix = formIddataPrefix;
    const companyId = formCompanyId;
    const priority = formPriority;

    const nextErrors = validateBridgeForm(
      sourceSystem,
      iddataPrefix,
      companyId,
      priority,
      isCompanySelectable
    );
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error(nextErrors.companyId || nextErrors.sourceSystem || nextErrors.iddataPrefix || nextErrors.priority || 'Lengkapi form terlebih dahulu.');
      return;
    }

    const payload = {
      sourceSystem,
      iddataPrefix,
      estateKey: optionalString(formState.estateKey),
      divisiKey: optionalString(formState.divisiKey),
      companyId,
      priority,
      isActive: formState.isActive,
      notes: optionalString(formState.notes),
    };

    try {
      if (editingItem) {
        await updateBridge({
          variables: {
            input: {
              id: editingItem.id,
              ...payload,
            },
          },
        });
        toast.success('Rule bridge berhasil diperbarui.');
      } else {
        await createBridge({
          variables: {
            input: payload,
          },
        });
        toast.success('Rule bridge berhasil ditambahkan.');
      }

      setIsFormOpen(false);
      setEditingItem(null);
      setFormErrors({});
      setFormState(toFormState());
      await refetch();
    } catch (mutationError: unknown) {
      toast.error(getErrorMessage(mutationError, 'Gagal menyimpan rule bridge.'));
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteBridge({
        variables: {
          id: itemToDelete.id,
        },
      });
      toast.success('Rule bridge berhasil dihapus.');
      setItemToDelete(null);

      if (rows.length === 1 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        await refetch();
      }
    } catch (mutationError: unknown) {
      toast.error(getErrorMessage(mutationError, 'Gagal menghapus rule bridge.'));
    }
  };

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']} fallbackPath="/dashboard">
      <SuperAdminDashboardLayout
        title="BKM Company Bridge"
        description="Kelola mapping bridge untuk source BKM ke perusahaan internal"
        breadcrumbItems={[
          { label: 'Master Data', href: '/companies' },
          { label: 'BKM Company Bridge', href: '/bkm-company-bridge' },
        ]}
      >
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Bridge Mapping Rules
              </CardTitle>
              <CardDescription>
                Mapping ini dipakai untuk menentukan company pada data BKM di halaman Analytics dan Reports.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="w-full lg:max-w-xs space-y-1">
                  <label className="text-sm font-medium">Cari Rule</label>
                  <Input
                    value={search}
                    placeholder="Source/prefix/company/notes..."
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                <div className="w-full lg:max-w-xs space-y-1">
                  <label className="text-sm font-medium">Perusahaan</label>
                  <Select
                    value={companyFilter}
                    onValueChange={(value) => {
                      setCompanyFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua perusahaan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>Semua perusahaan</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.code ? `${company.code} - ${company.name}` : company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full lg:max-w-[200px] space-y-1">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>Semua status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex w-full justify-end gap-2 lg:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Rule
                  </Button>
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Gagal memuat data bridge: {error.message}
                </div>
              )}

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>IDData Prefix</TableHead>
                      <TableHead>Estate Key</TableHead>
                      <TableHead>Divisi Key</TableHead>
                      <TableHead>Perusahaan</TableHead>
                      <TableHead className="text-right">Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!loading && rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Belum ada data bridge.
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.sourceSystem}</TableCell>
                        <TableCell className="font-mono">{item.iddataPrefix}</TableCell>
                        <TableCell>{item.estateKey || '-'}</TableCell>
                        <TableCell>{item.divisiKey || '-'}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.companyName || '-'}</div>
                          <div className="text-xs text-muted-foreground">{item.companyCode || item.companyId}</div>
                        </TableCell>
                        <TableCell className="text-right">{item.priority}</TableCell>
                        <TableCell>
                          {item.isActive ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setItemToDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  Total {totalCount} rule
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </Button>
                  <span>
                    Halaman {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasMore || loading}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SuperAdminDashboardLayout>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Rule Bridge' : 'Tambah Rule Bridge'}</DialogTitle>
            <DialogDescription>
              Tentukan pola prefix/iddata untuk dipetakan ke perusahaan target.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Source System *</label>
              <Input
                value={formState.sourceSystem}
                className={cn(formErrors.sourceSystem && 'border-red-500 focus-visible:ring-red-500')}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormState((prev) => ({ ...prev, sourceSystem: value }));
                  if (formErrors.sourceSystem && value.trim()) {
                    setFormErrors((prev) => ({ ...prev, sourceSystem: undefined }));
                  }
                }}
              />
              {formErrors.sourceSystem && <p className="text-xs text-red-600">{formErrors.sourceSystem}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">IDData Prefix *</label>
              <Input
                value={formState.iddataPrefix}
                className={cn(formErrors.iddataPrefix && 'border-red-500 focus-visible:ring-red-500')}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormState((prev) => ({ ...prev, iddataPrefix: value }));
                  if (formErrors.iddataPrefix && value.trim()) {
                    setFormErrors((prev) => ({ ...prev, iddataPrefix: undefined }));
                  }
                }}
              />
              {formErrors.iddataPrefix && <p className="text-xs text-red-600">{formErrors.iddataPrefix}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Perusahaan *</label>
              <Select
                value={formState.companyId}
                onValueChange={(value) => {
                  setFormState((prev) => ({ ...prev, companyId: value }));
                  if (formErrors.companyId) {
                    setFormErrors((prev) => ({ ...prev, companyId: undefined }));
                  }
                }}
                disabled={!isCompanySelectable}
              >
                <SelectTrigger className={cn(formErrors.companyId && 'border-red-500 focus:ring-red-500')}>
                  <SelectValue
                    placeholder={companiesLoading ? 'Memuat perusahaan...' : 'Pilih perusahaan'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {companyOptions.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.code ? `${company.code} - ${company.name}` : company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {companiesError && (
                <p className="text-xs text-red-600">
                  Gagal memuat perusahaan: {companiesError.message}
                </p>
              )}
              {formErrors.companyId && <p className="text-xs text-red-600">{formErrors.companyId}</p>}
              {!companiesLoading && companies.length === 0 && (
                <p className="text-xs text-amber-700">
                  Data perusahaan kosong. Tambahkan perusahaan terlebih dahulu di menu Companies.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Priority *</label>
              <Input
                type="number"
                min={1}
                value={formState.priority}
                className={cn(formErrors.priority && 'border-red-500 focus-visible:ring-red-500')}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormState((prev) => ({ ...prev, priority: value }));
                  if (formErrors.priority && Number(value) >= 1) {
                    setFormErrors((prev) => ({ ...prev, priority: undefined }));
                  }
                }}
              />
              {formErrors.priority && <p className="text-xs text-red-600">{formErrors.priority}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Estate Key</label>
              <Input
                value={formState.estateKey}
                onChange={(event) => setFormState((prev) => ({ ...prev, estateKey: event.target.value }))}
                placeholder="Opsional"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Divisi Key</label>
              <Input
                value={formState.divisiKey}
                onChange={(event) => setFormState((prev) => ({ ...prev, divisiKey: event.target.value }))}
                placeholder="Opsional"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={formState.isActive ? 'ACTIVE' : 'INACTIVE'}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, isActive: value === 'ACTIVE' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Opsional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !isFormValid}>
              {isSubmitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(itemToDelete)} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus rule bridge?</AlertDialogTitle>
            <AlertDialogDescription>
              Rule untuk prefix <strong>{itemToDelete?.iddataPrefix}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
}
