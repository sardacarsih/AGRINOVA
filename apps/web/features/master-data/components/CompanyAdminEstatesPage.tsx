'use client';

import React, { useMemo, useState } from 'react';
import { gql } from 'graphql-tag';
import { useMutation, useQuery } from '@apollo/client/react';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { MapPin, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

interface CompanyAdminEstatesPageProps {
  user?: any;
  locale?: string;
}

interface CompanyNode {
  id: string;
  name: string;
}

interface EstateNode {
  id: string;
  code?: string | null;
  name: string;
  location?: string | null;
  luasHa?: number | null;
  companyId: string;
  company?: CompanyNode | null;
  createdAt: string;
  updatedAt: string;
}

const GET_COMPANY_CONTEXT = gql`
  query GetCompanyContext {
    companies(page: 1, limit: 100) {
      data {
        id
        name
      }
    }
  }
`;

const GET_ESTATES = gql`
  query GetEstatesForCompanyAdmin {
    estates {
      id
      code
      name
      location
      luasHa
      companyId
      company {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

const CREATE_ESTATE = gql`
  mutation CreateEstateForCompanyAdmin($input: CreateEstateInput!) {
    createEstate(input: $input) {
      id
      code
      name
      location
      luasHa
      companyId
      company {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_ESTATE = gql`
  mutation UpdateEstateForCompanyAdmin($input: UpdateEstateInput!) {
    updateEstate(input: $input) {
      id
      code
      name
      location
      luasHa
      companyId
      company {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

const DELETE_ESTATE = gql`
  mutation DeleteEstateForCompanyAdmin($id: ID!) {
    deleteEstate(id: $id)
  }
`;

function mapDeleteEstateErrorMessage(message?: string): string {
  const rawMessage = message || '';
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    (normalizedMessage.includes('masih memiliki') ||
      normalizedMessage.includes('dependency') ||
      normalizedMessage.includes('dependencies')) &&
    (normalizedMessage.includes('division') || normalizedMessage.includes('divisi'))
  ) {
    return 'Estate tidak dapat dihapus karena masih memiliki divisi. Hapus atau pindahkan semua divisi terlebih dahulu.';
  }

  if (normalizedMessage.includes('assignment') && normalizedMessage.includes('estate')) {
    return 'Estate tidak dapat dihapus karena masih memiliki assignment user. Hapus assignment tersebut terlebih dahulu.';
  }

  if (normalizedMessage.includes('not found')) {
    return 'Estate tidak ditemukan atau sudah dihapus sebelumnya.';
  }

  if (normalizedMessage.includes('access denied') || normalizedMessage.includes('permission')) {
    return 'Anda tidak memiliki izin untuk menghapus estate ini.';
  }

  return rawMessage || 'Gagal menghapus estate.';
}

export default function CompanyAdminEstatesPage({ user }: CompanyAdminEstatesPageProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEstate, setEditingEstate] = useState<EstateNode | null>(null);
  const [deletingEstate, setDeletingEstate] = useState<EstateNode | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formLuasHa, setFormLuasHa] = useState('');

  const {
    data: companyData,
    loading: loadingCompanies,
    refetch: refetchCompanies,
  } = useQuery<{ companies: { data: CompanyNode[] } }>(GET_COMPANY_CONTEXT);
  const {
    data: estateData,
    loading: loadingEstates,
    refetch: refetchEstates,
  } = useQuery<{ estates: EstateNode[] }>(GET_ESTATES);

  const [createEstate, { loading: creating }] = useMutation(CREATE_ESTATE, {
    onCompleted: () => {
      toast({
        title: 'Estate created',
        description: 'Estate berhasil dibuat.',
      });
      setIsCreateOpen(false);
      resetForm();
      refetchEstates();
    },
    onError: (error) => {
      toast({
        title: 'Create failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [updateEstate, { loading: updating }] = useMutation(UPDATE_ESTATE, {
    onCompleted: () => {
      toast({
        title: 'Estate updated',
        description: 'Estate berhasil diperbarui.',
      });
      setEditingEstate(null);
      resetForm();
      refetchEstates();
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [deleteEstate, { loading: deleting }] = useMutation(DELETE_ESTATE, {
    onCompleted: () => {
      toast({
        title: 'Estate deleted',
        description: 'Estate berhasil dihapus.',
      });
      setDeletingEstate(null);
      refetchEstates();
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: mapDeleteEstateErrorMessage(error.message),
        variant: 'destructive',
      });
    },
  });

  const companies = companyData?.companies?.data || [];
  const companyIdFromUser =
    user?.companyId || user?.company?.id || user?.companies?.[0]?.id || null;
  const currentCompanyId = companyIdFromUser || companies[0]?.id || null;

  const estates = useMemo(() => {
    const base = estateData?.estates || [];
    const byCompany = currentCompanyId
      ? base.filter((estate) => estate.companyId === currentCompanyId)
      : base;
    if (!search.trim()) {
      return byCompany;
    }
    const q = search.toLowerCase();
    return byCompany.filter(
      (estate) =>
        (estate.code || '').toLowerCase().includes(q) ||
        estate.name.toLowerCase().includes(q) ||
        (estate.location || '').toLowerCase().includes(q),
    );
  }, [estateData?.estates, currentCompanyId, search]);

  function resetForm() {
    setFormName('');
    setFormCode('');
    setFormLocation('');
    setFormLuasHa('');
  }

  function openCreateDialog() {
    resetForm();
    setIsCreateOpen(true);
  }

  function openEditDialog(estate: EstateNode) {
    setEditingEstate(estate);
    setFormName(estate.name);
    setFormCode(estate.code || '');
    setFormLocation(estate.location || '');
    setFormLuasHa(
      estate.luasHa === null || estate.luasHa === undefined ? '' : String(estate.luasHa),
    );
  }

  function parseLuasHaInput(): number | undefined {
    if (!formLuasHa.trim()) {
      return undefined;
    }
    const num = Number(formLuasHa);
    if (Number.isNaN(num)) {
      throw new Error('Luas Ha harus berupa angka.');
    }
    return num;
  }

  async function handleCreate() {
    if (!currentCompanyId) {
      toast({
        title: 'Missing company context',
        description: 'Company context tidak ditemukan untuk COMPANY_ADMIN.',
        variant: 'destructive',
      });
      return;
    }
    if (!formName.trim()) {
      toast({
        title: 'Validation',
        description: 'Nama estate wajib diisi.',
        variant: 'destructive',
      });
      return;
    }
    if (!formCode.trim()) {
      toast({
        title: 'Validation',
        description: 'Kode estate wajib diisi.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const luasHa = parseLuasHaInput();
      await createEstate({
        variables: {
          input: {
            name: formName.trim(),
            code: formCode.trim(),
            location: formLocation.trim() || null,
            luasHa: luasHa ?? null,
            companyId: currentCompanyId,
          },
        },
      });
    } catch (error: any) {
      toast({
        title: 'Validation',
        description: error.message || 'Input tidak valid.',
        variant: 'destructive',
      });
    }
  }

  async function handleUpdate() {
    if (!editingEstate) return;
    if (!formName.trim()) {
      toast({
        title: 'Validation',
        description: 'Nama estate wajib diisi.',
        variant: 'destructive',
      });
      return;
    }
    if (!formCode.trim()) {
      toast({
        title: 'Validation',
        description: 'Kode estate wajib diisi.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const luasHa = parseLuasHaInput();
      await updateEstate({
        variables: {
          input: {
            id: editingEstate.id,
            name: formName.trim(),
            code: formCode.trim(),
            location: formLocation.trim() || null,
            luasHa: luasHa ?? null,
          },
        },
      });
    } catch (error: any) {
      toast({
        title: 'Validation',
        description: error.message || 'Input tidak valid.',
        variant: 'destructive',
      });
    }
  }

  return (
    <CompanyAdminDashboardLayout
      title="Estate Management"
      description="CRUD estate untuk company yang Anda kelola"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              refetchCompanies();
              refetchEstates();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Estate
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Estates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search estates..."
                className="pl-9"
              />
            </div>

            <div className="overflow-x-auto rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Luas (Ha)</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(loadingCompanies || loadingEstates) && (
                    <TableRow>
                      <TableCell colSpan={6}>Loading estates...</TableCell>
                    </TableRow>
                  )}
                  {!loadingCompanies && !loadingEstates && estates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>No estates found.</TableCell>
                    </TableRow>
                  )}
                  {estates.map((estate) => (
                    <TableRow key={estate.id}>
                      <TableCell className="font-mono">{estate.code || '-'}</TableCell>
                      <TableCell className="font-medium">{estate.name}</TableCell>
                      <TableCell>{estate.location || '-'}</TableCell>
                      <TableCell className="text-right">
                        {estate.luasHa === null || estate.luasHa === undefined
                          ? '-'
                          : estate.luasHa.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {estate.company?.name || companies.find((c) => c.id === estate.companyId)?.name || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(estate)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingEstate(estate)}
                          >
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
            <DialogTitle>Create Estate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Estate name"
            />
            <Input
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="Estate code"
            />
            <Input
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              placeholder="Location"
            />
            <Input
              value={formLuasHa}
              onChange={(e) => setFormLuasHa(e.target.value)}
              placeholder="Luas Ha (optional)"
            />
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

      <Dialog open={!!editingEstate} onOpenChange={(open) => !open && setEditingEstate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Estate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Estate name"
            />
            <Input
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="Estate code"
            />
            <Input
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              placeholder="Location"
            />
            <Input
              value={formLuasHa}
              onChange={(e) => setFormLuasHa(e.target.value)}
              placeholder="Luas Ha (optional)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEstate(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEstate} onOpenChange={(open) => !open && setDeletingEstate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete estate?</AlertDialogTitle>
            <AlertDialogDescription>
              Estate "{deletingEstate?.name}" akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => {
                if (deletingEstate) {
                  deleteEstate({ variables: { id: deletingEstate.id } });
                }
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CompanyAdminDashboardLayout>
  );
}
