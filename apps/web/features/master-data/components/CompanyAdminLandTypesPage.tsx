'use client';

import React, { useMemo, useState } from 'react';
import { gql } from 'graphql-tag';
import { useMutation, useQuery } from '@apollo/client/react';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Layers3, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

interface CompanyAdminLandTypesPageProps {
  user?: unknown;
  locale?: string;
  withLayout?: boolean;
}

interface LandTypeNode {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const GET_LAND_TYPES = gql`
  query GetLandTypesForCompanyAdminCrud {
    landTypes {
      id
      code
      name
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

const CREATE_LAND_TYPE = gql`
  mutation CreateLandTypeForCompanyAdmin($input: CreateLandTypeInput!) {
    createLandType(input: $input) {
      id
      code
      name
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_LAND_TYPE = gql`
  mutation UpdateLandTypeForCompanyAdmin($input: UpdateLandTypeInput!) {
    updateLandType(input: $input) {
      id
      code
      name
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

const DELETE_LAND_TYPE = gql`
  mutation DeleteLandTypeForCompanyAdmin($id: ID!) {
    deleteLandType(id: $id)
  }
`;

function mapDeleteLandTypeErrorMessage(message?: string): string {
  const rawMessage = message || '';
  const normalized = rawMessage.toLowerCase();

  if (
    (normalized.includes('digunakan') || normalized.includes('used')) &&
    (normalized.includes('blok') || normalized.includes('tarif'))
  ) {
    return 'Land type tidak dapat dihapus karena masih dipakai di data blok atau tarif blok.';
  }

  if (normalized.includes('not found')) {
    return 'Land type tidak ditemukan atau sudah dihapus sebelumnya.';
  }

  if (normalized.includes('access denied') || normalized.includes('permission')) {
    return 'Anda tidak memiliki izin untuk menghapus land type ini.';
  }

  return rawMessage || 'Gagal menghapus land type.';
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('id-ID');
}

export default function CompanyAdminLandTypesPage({ withLayout = true }: CompanyAdminLandTypesPageProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLandType, setEditingLandType] = useState<LandTypeNode | null>(null);
  const [deletingLandType, setDeletingLandType] = useState<LandTypeNode | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const { data, loading, error, refetch } = useQuery<{ landTypes: LandTypeNode[] }>(GET_LAND_TYPES);

  const [createLandType, { loading: creating }] = useMutation(CREATE_LAND_TYPE, {
    onCompleted: () => {
      toast({
        title: 'Land type created',
        description: 'Master land type berhasil dibuat.',
      });
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Create failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [updateLandType, { loading: updating }] = useMutation(UPDATE_LAND_TYPE, {
    onCompleted: () => {
      toast({
        title: 'Land type updated',
        description: 'Master land type berhasil diperbarui.',
      });
      setEditingLandType(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [deleteLandType, { loading: deleting }] = useMutation(DELETE_LAND_TYPE, {
    onCompleted: () => {
      toast({
        title: 'Land type deleted',
        description: 'Master land type berhasil dihapus.',
      });
      setDeletingLandType(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: mapDeleteLandTypeErrorMessage(error.message),
        variant: 'destructive',
      });
    },
  });

  const landTypes = useMemo(() => {
    const base = data?.landTypes || [];
    const query = search.trim().toLowerCase();

    return base
      .filter((item) => {
        if (statusFilter === 'ACTIVE' && !item.isActive) return false;
        if (statusFilter === 'INACTIVE' && item.isActive) return false;
        if (!query) return true;
        return (
          item.code.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          (item.description || '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [data?.landTypes, search, statusFilter]);

  function resetForm() {
    setFormCode('');
    setFormName('');
    setFormDescription('');
    setFormStatus('ACTIVE');
  }

  function openCreateDialog() {
    resetForm();
    setIsCreateOpen(true);
  }

  function openEditDialog(item: LandTypeNode) {
    setEditingLandType(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormStatus(item.isActive ? 'ACTIVE' : 'INACTIVE');
  }

  function buildPayload() {
    const code = formCode.trim().toUpperCase();
    const name = formName.trim();
    const description = formDescription.trim();

    if (!code) throw new Error('Kode land type wajib diisi.');
    if (!name) throw new Error('Nama land type wajib diisi.');

    return {
      code,
      name,
      description: description || null,
      isActive: formStatus === 'ACTIVE',
    };
  }

  async function handleCreate() {
    try {
      const payload = buildPayload();
      await createLandType({
        variables: {
          input: payload,
        },
      });
    } catch (error: unknown) {
      toast({
        title: 'Validation',
        description: error instanceof Error ? error.message : 'Input tidak valid.',
        variant: 'destructive',
      });
    }
  }

  async function handleUpdate() {
    if (!editingLandType) return;
    try {
      const payload = buildPayload();
      await updateLandType({
        variables: {
          input: {
            id: editingLandType.id,
            ...payload,
          },
        },
      });
    } catch (error: unknown) {
      toast({
        title: 'Validation',
        description: error instanceof Error ? error.message : 'Input tidak valid.',
        variant: 'destructive',
      });
    }
  }

  const allLandTypes = data?.landTypes || [];
  const activeCount = allLandTypes.filter((item) => item.isActive).length;
  const inactiveCount = allLandTypes.length - activeCount;
  const queryErrorMessage = error?.message
    ? `Gagal memuat data land type: ${error.message}`
    : null;

  const content = (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Land Type
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5" />
              Master Land Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Land Type</p>
                <p className="text-xl font-semibold">{allLandTypes.length}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-semibold">{activeCount}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Inactive</p>
                <p className="text-xl font-semibold">{inactiveCount}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kode/nama/keterangan..."
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {queryErrorMessage && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {queryErrorMessage}
              </div>
            )}

            <div className="overflow-x-auto rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {error && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-destructive">
                        {queryErrorMessage}
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={6}>Loading land types...</TableCell>
                    </TableRow>
                  )}
                  {!loading && !error && landTypes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>No land type found.</TableCell>
                    </TableRow>
                  )}
                  {landTypes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="max-w-[320px] whitespace-normal">{item.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? 'default' : 'secondary'}>
                          {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeletingLandType(item)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Land Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-land-type-code">Kode</Label>
                <Input
                  id="create-land-type-code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Kode (contoh: KATEGORI_BJR)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-land-type-name">Nama</Label>
                <Input
                  id="create-land-type-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama land type"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-land-type-description">Keterangan</Label>
              <Input
                id="create-land-type-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Keterangan (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-land-type-status">Status</Label>
              <Select value={formStatus} onValueChange={(value) => setFormStatus(value as 'ACTIVE' | 'INACTIVE')}>
                <SelectTrigger id="create-land-type-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Saving...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLandType} onOpenChange={(open) => !open && setEditingLandType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Land Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-land-type-code">Kode</Label>
                <Input
                  id="edit-land-type-code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Kode (contoh: KATEGORI_BJR)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-land-type-name">Nama</Label>
                <Input
                  id="edit-land-type-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama land type"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-land-type-description">Keterangan</Label>
              <Input
                id="edit-land-type-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Keterangan (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-land-type-status">Status</Label>
              <Select value={formStatus} onValueChange={(value) => setFormStatus(value as 'ACTIVE' | 'INACTIVE')}>
                <SelectTrigger id="edit-land-type-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLandType(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingLandType}
        onOpenChange={(open) => !open && setDeletingLandType(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete land type?</AlertDialogTitle>
            <AlertDialogDescription>
              Land type &quot;{deletingLandType?.code} - {deletingLandType?.name}&quot; akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => {
                if (deletingLandType) {
                  deleteLandType({ variables: { id: deletingLandType.id } });
                }
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (!withLayout) {
    return content;
  }

  return (
    <CompanyAdminDashboardLayout
      title="Land Type Management"
      description="Kelola master tipe lahan untuk blok dan tarif blok"
    >
      {content}
    </CompanyAdminDashboardLayout>
  );
}
