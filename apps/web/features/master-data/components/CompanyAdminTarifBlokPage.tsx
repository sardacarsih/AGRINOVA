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
import { CircleDollarSign, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

interface CompanyAdminTarifBlokPageProps {
  user?: any;
  locale?: string;
  withLayout?: boolean;
}

interface CompanyNode {
  id: string;
  name: string;
}

interface TarifBlokNode {
  id: string;
  companyId: string;
  perlakuan: string;
  basis?: number | null;
  tarifUpah?: number | null;
  premi?: number | null;
  tarifPremi1?: number | null;
  tarifPremi2?: number | null;
  tarifLibur?: number | null;
  tarifLebaran?: number | null;
  isActive: boolean;
}

const GET_COMPANY_CONTEXT = gql`
  query GetCompanyContextForTarifBlok {
    companies(page: 1, limit: 100) {
      data {
        id
        name
      }
    }
  }
`;

const GET_TARIF_BLOKS = gql`
  query GetTarifBloksForCompanyAdmin {
    tarifBloks {
      id
      companyId
      perlakuan
      basis
      tarifUpah
      premi
      tarifPremi1
      tarifPremi2
      tarifLibur
      tarifLebaran
      isActive
    }
  }
`;

const CREATE_TARIF_BLOK = gql`
  mutation CreateTarifBlokForCompanyAdmin($input: CreateTarifBlokInput!) {
    createTarifBlok(input: $input) {
      id
      companyId
      perlakuan
      basis
      tarifUpah
      premi
      tarifPremi1
      tarifPremi2
      tarifLibur
      tarifLebaran
      isActive
    }
  }
`;

const UPDATE_TARIF_BLOK = gql`
  mutation UpdateTarifBlokForCompanyAdmin($input: UpdateTarifBlokInput!) {
    updateTarifBlok(input: $input) {
      id
      companyId
      perlakuan
      basis
      tarifUpah
      premi
      tarifPremi1
      tarifPremi2
      tarifLibur
      tarifLebaran
      isActive
    }
  }
`;

const DELETE_TARIF_BLOK = gql`
  mutation DeleteTarifBlokForCompanyAdmin($id: ID!) {
    deleteTarifBlok(id: $id)
  }
`;

function mapDeleteTarifBlokErrorMessage(message?: string): string {
  const rawMessage = message || '';
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    (normalizedMessage.includes('digunakan') || normalizedMessage.includes('used')) &&
    (normalizedMessage.includes('blok') || normalizedMessage.includes('block'))
  ) {
    return 'Master tarif blok tidak dapat dihapus karena masih digunakan oleh blok. Lepaskan relasi tarif dari blok terkait terlebih dahulu.';
  }

  if (normalizedMessage.includes('not found')) {
    return 'Master tarif blok tidak ditemukan atau sudah dihapus sebelumnya.';
  }

  if (normalizedMessage.includes('access denied') || normalizedMessage.includes('permission')) {
    return 'Anda tidak memiliki izin untuk menghapus master tarif blok ini.';
  }

  return rawMessage || 'Gagal menghapus master tarif blok.';
}

export default function CompanyAdminTarifBlokPage({ user, withLayout = true }: CompanyAdminTarifBlokPageProps) {
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTarifBlok, setEditingTarifBlok] = useState<TarifBlokNode | null>(null);
  const [deletingTarifBlok, setDeletingTarifBlok] = useState<TarifBlokNode | null>(null);

  const [formPerlakuan, setFormPerlakuan] = useState('');
  const [formBasis, setFormBasis] = useState('');
  const [formTarifUpah, setFormTarifUpah] = useState('');
  const [formPremi, setFormPremi] = useState('');
  const [formTarifPremi1, setFormTarifPremi1] = useState('');
  const [formTarifPremi2, setFormTarifPremi2] = useState('');
  const [formTarifLibur, setFormTarifLibur] = useState('');
  const [formTarifLebaran, setFormTarifLebaran] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const {
    data: companyData,
    loading: loadingCompanies,
    refetch: refetchCompanies,
  } = useQuery<{ companies: { data: CompanyNode[] } }>(GET_COMPANY_CONTEXT);

  const {
    data: tarifBlokData,
    loading: loadingTarifBloks,
    refetch: refetchTarifBloks,
  } = useQuery<{ tarifBloks: TarifBlokNode[] }>(GET_TARIF_BLOKS);

  const [createTarifBlok, { loading: creating }] = useMutation(CREATE_TARIF_BLOK, {
    onCompleted: () => {
      toast({
        title: 'Tarif blok created',
        description: 'Master tarif blok berhasil dibuat.',
      });
      setIsCreateOpen(false);
      resetForm();
      refetchTarifBloks();
    },
    onError: (error) => {
      toast({
        title: 'Create failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [updateTarifBlok, { loading: updating }] = useMutation(UPDATE_TARIF_BLOK, {
    onCompleted: () => {
      toast({
        title: 'Tarif blok updated',
        description: 'Master tarif blok berhasil diperbarui.',
      });
      setEditingTarifBlok(null);
      resetForm();
      refetchTarifBloks();
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [deleteTarifBlok, { loading: deleting }] = useMutation(DELETE_TARIF_BLOK, {
    onCompleted: () => {
      toast({
        title: 'Tarif blok deleted',
        description: 'Master tarif blok berhasil dihapus.',
      });
      setDeletingTarifBlok(null);
      refetchTarifBloks();
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: mapDeleteTarifBlokErrorMessage(error.message),
        variant: 'destructive',
      });
    },
  });

  const companies = companyData?.companies?.data || [];
  const companyIdFromUser =
    user?.companyId || user?.company?.id || user?.companies?.[0]?.id || null;
  const currentCompanyId = companyIdFromUser || companies[0]?.id || null;

  const tarifBloks = useMemo(() => {
    const base = tarifBlokData?.tarifBloks || [];
    const byCompany = currentCompanyId
      ? base.filter((tarif) => tarif.companyId === currentCompanyId)
      : base;

    if (!search.trim()) {
      return byCompany;
    }

    const q = search.toLowerCase();
    return byCompany.filter((tarif) => tarif.perlakuan.toLowerCase().includes(q));
  }, [tarifBlokData?.tarifBloks, currentCompanyId, search]);

  function resetForm() {
    setFormPerlakuan('');
    setFormBasis('');
    setFormTarifUpah('');
    setFormPremi('');
    setFormTarifPremi1('');
    setFormTarifPremi2('');
    setFormTarifLibur('');
    setFormTarifLebaran('');
    setFormStatus('ACTIVE');
  }

  function openCreateDialog() {
    resetForm();
    setIsCreateOpen(true);
  }

  function openEditDialog(tarif: TarifBlokNode) {
    setEditingTarifBlok(tarif);
    setFormPerlakuan(tarif.perlakuan || '');
    setFormBasis(tarif.basis === null || tarif.basis === undefined ? '' : String(tarif.basis));
    setFormTarifUpah(tarif.tarifUpah === null || tarif.tarifUpah === undefined ? '' : String(tarif.tarifUpah));
    setFormPremi(tarif.premi === null || tarif.premi === undefined ? '' : String(tarif.premi));
    setFormTarifPremi1(tarif.tarifPremi1 === null || tarif.tarifPremi1 === undefined ? '' : String(tarif.tarifPremi1));
    setFormTarifPremi2(tarif.tarifPremi2 === null || tarif.tarifPremi2 === undefined ? '' : String(tarif.tarifPremi2));
    setFormTarifLibur(tarif.tarifLibur === null || tarif.tarifLibur === undefined ? '' : String(tarif.tarifLibur));
    setFormTarifLebaran(tarif.tarifLebaran === null || tarif.tarifLebaran === undefined ? '' : String(tarif.tarifLebaran));
    setFormStatus(tarif.isActive ? 'ACTIVE' : 'INACTIVE');
  }

  function parseOptionalNumber(value: string, label: string): number | null {
    if (!value.trim()) return null;
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw new Error(`${label} harus berupa angka.`);
    }
    return num;
  }

  function formatTarifNumber(value?: number | null): string {
    if (value === null || value === undefined) {
      return '-';
    }
    return value.toLocaleString('id-ID');
  }

  async function handleCreate() {
    if (!currentCompanyId) {
      toast({
        title: 'Validation',
        description: 'Company context tidak ditemukan.',
        variant: 'destructive',
      });
      return;
    }

    if (!formPerlakuan.trim()) {
      toast({
        title: 'Validation',
        description: 'Perlakuan wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTarifBlok({
        variables: {
          input: {
            companyId: currentCompanyId,
            perlakuan: formPerlakuan.trim(),
            basis: parseOptionalNumber(formBasis, 'Basis'),
            tarifUpah: parseOptionalNumber(formTarifUpah, 'Tarif upah'),
            premi: parseOptionalNumber(formPremi, 'Premi'),
            tarifPremi1: parseOptionalNumber(formTarifPremi1, 'Tarif premi 1'),
            tarifPremi2: parseOptionalNumber(formTarifPremi2, 'Tarif premi 2'),
            tarifLibur: parseOptionalNumber(formTarifLibur, 'Tarif libur'),
            tarifLebaran: parseOptionalNumber(formTarifLebaran, 'Tarif lebaran'),
            isActive: formStatus === 'ACTIVE',
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
    if (!editingTarifBlok) return;

    if (!formPerlakuan.trim()) {
      toast({
        title: 'Validation',
        description: 'Perlakuan wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateTarifBlok({
        variables: {
          input: {
            id: editingTarifBlok.id,
            perlakuan: formPerlakuan.trim(),
            basis: parseOptionalNumber(formBasis, 'Basis'),
            tarifUpah: parseOptionalNumber(formTarifUpah, 'Tarif upah'),
            premi: parseOptionalNumber(formPremi, 'Premi'),
            tarifPremi1: parseOptionalNumber(formTarifPremi1, 'Tarif premi 1'),
            tarifPremi2: parseOptionalNumber(formTarifPremi2, 'Tarif premi 2'),
            tarifLibur: parseOptionalNumber(formTarifLibur, 'Tarif libur'),
            tarifLebaran: parseOptionalNumber(formTarifLebaran, 'Tarif lebaran'),
            isActive: formStatus === 'ACTIVE',
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

  const LayoutWrapper: React.ComponentType<any> = withLayout ? CompanyAdminDashboardLayout : React.Fragment;
  const layoutProps = withLayout
    ? {
        title: 'Tarif Blok Management',
        description: 'Master tarif blok per company',
      }
    : {};

  return (
    <LayoutWrapper {...layoutProps}>
      <div className="space-y-6">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              refetchCompanies();
              refetchTarifBloks();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Tarif Blok
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5" />
              Master Tarif Blok
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search perlakuan..."
                className="pl-9"
              />
            </div>

            <div className="overflow-x-auto rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Perlakuan</TableHead>
                    <TableHead className="text-right">Basis</TableHead>
                    <TableHead className="text-right">Tarif Upah</TableHead>
                    <TableHead className="text-right">Premi</TableHead>
                    <TableHead className="text-right">Tarif Premi 1</TableHead>
                    <TableHead className="text-right">Tarif Premi 2</TableHead>
                    <TableHead className="text-right">Tarif Libur</TableHead>
                    <TableHead className="text-right">Tarif Lebaran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(loadingCompanies || loadingTarifBloks) && (
                    <TableRow>
                      <TableCell colSpan={10}>Loading tarif blok...</TableCell>
                    </TableRow>
                  )}
                  {!loadingCompanies && !loadingTarifBloks && tarifBloks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10}>No tarif blok found.</TableCell>
                    </TableRow>
                  )}
                  {tarifBloks.map((tarif) => (
                    <TableRow key={tarif.id}>
                      <TableCell className="font-medium">{tarif.perlakuan}</TableCell>
                      <TableCell className="text-right">{formatTarifNumber(tarif.basis)}</TableCell>
                      <TableCell className="text-right">{formatTarifNumber(tarif.tarifUpah)}</TableCell>
                      <TableCell className="text-right">{formatTarifNumber(tarif.premi)}</TableCell>
                      <TableCell className="text-right">{formatTarifNumber(tarif.tarifPremi1)}</TableCell>
                      <TableCell className="text-right">{formatTarifNumber(tarif.tarifPremi2)}</TableCell>
                      <TableCell className="text-right">{formatTarifNumber(tarif.tarifLibur)}</TableCell>
                      <TableCell className="text-right">{formatTarifNumber(tarif.tarifLebaran)}</TableCell>
                      <TableCell>
                        <Badge variant={tarif.isActive ? 'default' : 'secondary'}>
                          {tarif.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(tarif)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingTarifBlok(tarif)}
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
            <DialogTitle>Create Tarif Blok</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={formPerlakuan}
              onChange={(e) => setFormPerlakuan(e.target.value)}
              placeholder="Perlakuan"
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input value={formBasis} onChange={(e) => setFormBasis(e.target.value)} placeholder="Basis (optional)" />
              <Input value={formTarifUpah} onChange={(e) => setFormTarifUpah(e.target.value)} placeholder="Tarif Upah (optional)" />
              <Input value={formPremi} onChange={(e) => setFormPremi(e.target.value)} placeholder="Premi (optional)" />
              <Input value={formTarifPremi1} onChange={(e) => setFormTarifPremi1(e.target.value)} placeholder="Tarif Premi 1 (optional)" />
              <Input value={formTarifPremi2} onChange={(e) => setFormTarifPremi2(e.target.value)} placeholder="Tarif Premi 2 (optional)" />
              <Input value={formTarifLibur} onChange={(e) => setFormTarifLibur(e.target.value)} placeholder="Tarif Libur (optional)" />
              <Input value={formTarifLebaran} onChange={(e) => setFormTarifLebaran(e.target.value)} placeholder="Tarif Lebaran (optional)" />
              <Select value={formStatus} onValueChange={(value) => setFormStatus(value as 'ACTIVE' | 'INACTIVE')}>
                <SelectTrigger>
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

      <Dialog open={!!editingTarifBlok} onOpenChange={(open) => !open && setEditingTarifBlok(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tarif Blok</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={formPerlakuan}
              onChange={(e) => setFormPerlakuan(e.target.value)}
              placeholder="Perlakuan"
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input value={formBasis} onChange={(e) => setFormBasis(e.target.value)} placeholder="Basis (optional)" />
              <Input value={formTarifUpah} onChange={(e) => setFormTarifUpah(e.target.value)} placeholder="Tarif Upah (optional)" />
              <Input value={formPremi} onChange={(e) => setFormPremi(e.target.value)} placeholder="Premi (optional)" />
              <Input value={formTarifPremi1} onChange={(e) => setFormTarifPremi1(e.target.value)} placeholder="Tarif Premi 1 (optional)" />
              <Input value={formTarifPremi2} onChange={(e) => setFormTarifPremi2(e.target.value)} placeholder="Tarif Premi 2 (optional)" />
              <Input value={formTarifLibur} onChange={(e) => setFormTarifLibur(e.target.value)} placeholder="Tarif Libur (optional)" />
              <Input value={formTarifLebaran} onChange={(e) => setFormTarifLebaran(e.target.value)} placeholder="Tarif Lebaran (optional)" />
              <Select value={formStatus} onValueChange={(value) => setFormStatus(value as 'ACTIVE' | 'INACTIVE')}>
                <SelectTrigger>
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
            <Button variant="outline" onClick={() => setEditingTarifBlok(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingTarifBlok}
        onOpenChange={(open) => !open && setDeletingTarifBlok(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tarif blok?</AlertDialogTitle>
            <AlertDialogDescription>
              Perlakuan "{deletingTarifBlok?.perlakuan}" akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => {
                if (deletingTarifBlok) {
                  deleteTarifBlok({ variables: { id: deletingTarifBlok.id } });
                }
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LayoutWrapper>
  );
}
