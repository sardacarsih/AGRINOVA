'use client';

import React from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  CREATE_MANAGER_DIVISION_PRODUCTION_BUDGET,
  DELETE_MANAGER_DIVISION_PRODUCTION_BUDGET,
  GET_MANAGER_DIVISION_OPTIONS,
  GET_MANAGER_DIVISION_PRODUCTION_BUDGETS,
  UPDATE_MANAGER_DIVISION_PRODUCTION_BUDGET,
  type CreateManagerDivisionProductionBudgetInput,
  type CreateManagerDivisionProductionBudgetResponse,
  type DeleteManagerDivisionProductionBudgetResponse,
  type GetManagerDivisionOptionsResponse,
  type GetManagerDivisionProductionBudgetsResponse,
  type ManagerDivisionProductionBudget,
  type UpdateManagerDivisionProductionBudgetInput,
  type UpdateManagerDivisionProductionBudgetResponse,
} from '@/lib/apollo/queries/manager-division-production-budget';

type DivisionOption = {
  id: string;
  name: string;
  estateId: string;
  estateName: string;
};

type BudgetFormValues = {
  divisionId: string;
  period: string;
  targetTon: string;
  plannedCost: string;
  actualCost: string;
  notes: string;
};

const EMPTY_FORM: BudgetFormValues = {
  divisionId: '',
  period: '',
  targetTon: '',
  plannedCost: '',
  actualCost: '',
  notes: '',
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const numberParser = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(parsed, 0);
};

const normalizeText = (value?: string | null): string => (value || '').trim().toLowerCase();

const formatPeriodLabel = (period: string): string => {
  if (!period) return '-';
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  return `${month}/${year}`;
};

const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== 'object') return fallback;
  const withMessage = error as { message?: string; graphQLErrors?: Array<{ message?: string }> };
  if (withMessage.graphQLErrors && withMessage.graphQLErrors.length > 0) {
    const gqlMessage = withMessage.graphQLErrors[0]?.message;
    if (gqlMessage) return gqlMessage;
  }
  if (withMessage.message) return withMessage.message;
  return fallback;
};

export default function ManagerDivisionProductionBudgetPage() {
  const { toast } = useToast();

  const {
    data: divisionOptionsData,
    loading: divisionsLoading,
    error: divisionsError,
  } = useQuery<GetManagerDivisionOptionsResponse>(GET_MANAGER_DIVISION_OPTIONS, {
    fetchPolicy: 'network-only',
  });

  const {
    data: budgetData,
    loading: budgetsLoading,
    error: budgetsError,
    refetch: refetchBudgets,
  } = useQuery<GetManagerDivisionProductionBudgetsResponse>(GET_MANAGER_DIVISION_PRODUCTION_BUDGETS, {
    fetchPolicy: 'cache-and-network',
  });

  const [createBudgetMutation, { loading: creating }] = useMutation<CreateManagerDivisionProductionBudgetResponse>(
    CREATE_MANAGER_DIVISION_PRODUCTION_BUDGET,
  );
  const [updateBudgetMutation, { loading: updating }] = useMutation<UpdateManagerDivisionProductionBudgetResponse>(
    UPDATE_MANAGER_DIVISION_PRODUCTION_BUDGET,
  );
  const [deleteBudgetMutation, { loading: deleting }] = useMutation<DeleteManagerDivisionProductionBudgetResponse>(
    DELETE_MANAGER_DIVISION_PRODUCTION_BUDGET,
  );

  const budgets = React.useMemo<ManagerDivisionProductionBudget[]>(
    () => budgetData?.managerDivisionProductionBudgets || [],
    [budgetData?.managerDivisionProductionBudgets],
  );

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [divisionFilter, setDivisionFilter] = React.useState('all');
  const [periodFilter, setPeriodFilter] = React.useState('');
  const [formValues, setFormValues] = React.useState<BudgetFormValues>(EMPTY_FORM);

  const isMutating = creating || updating || deleting;

  const divisionOptions = React.useMemo(() => {
    const uniqueById = new Map<string, DivisionOption>();
    (divisionOptionsData?.managerDivisionOptions || []).forEach((division) => {
      if (!division?.id || !division.name) return;

      const estateId = String(division.estateId || '');
      const estateName = String(division.estateName || '-');
      uniqueById.set(String(division.id), {
        id: String(division.id),
        name: division.name,
        estateId,
        estateName,
      });
    });

    return Array.from(uniqueById.values()).sort(
      (a, b) => a.estateName.localeCompare(b.estateName, 'id') || a.name.localeCompare(b.name, 'id'),
    );
  }, [divisionOptionsData?.managerDivisionOptions]);

  const stats = React.useMemo(() => {
    const totalPlanned = budgets.reduce((sum, item) => sum + item.plannedCost, 0);
    const totalActual = budgets.reduce((sum, item) => sum + item.actualCost, 0);
    const divisionCount = new Set(budgets.map((item) => normalizeText(item.divisionName))).size;

    return {
      totalItems: budgets.length,
      totalPlanned,
      totalActual,
      divisionCount,
      variance: totalActual - totalPlanned,
    };
  }, [budgets]);

  const filteredBudgets = React.useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    return [...budgets]
      .filter((item) => {
        const searchable = [
          item.divisionName,
          item.estateName,
          item.notes,
          item.createdBy,
          item.period,
        ]
          .join(' ')
          .toLowerCase();

        const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
        const matchesDivision = divisionFilter === 'all' || item.divisionId === divisionFilter;
        const matchesPeriod = !periodFilter || item.period === periodFilter;
        return matchesSearch && matchesDivision && matchesPeriod;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [budgets, divisionFilter, periodFilter, searchTerm]);

  const resetForm = React.useCallback(() => {
    setFormValues(EMPTY_FORM);
    setEditingId(null);
    setIsFormOpen(false);
  }, []);

  const openCreateForm = React.useCallback(() => {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setIsFormOpen(true);
  }, []);

  const openEditForm = React.useCallback((item: ManagerDivisionProductionBudget) => {
    setEditingId(item.id);
    setFormValues({
      divisionId: item.divisionId || '',
      period: item.period,
      targetTon: String(item.targetTon),
      plannedCost: String(item.plannedCost),
      actualCost: String(item.actualCost),
      notes: item.notes || '',
    });
    setIsFormOpen(true);
  }, []);

  const handleDivisionSelect = React.useCallback((divisionId: string) => {
    setFormValues((current) => ({
      ...current,
      divisionId,
    }));
  }, []);

  const handleDelete = React.useCallback(async (item: ManagerDivisionProductionBudget) => {
    const confirmed = window.confirm(`Hapus budget divisi ${item.divisionName} periode ${item.period}?`);
    if (!confirmed) return;

    try {
      await deleteBudgetMutation({
        variables: {
          id: item.id,
        },
      });
      await refetchBudgets();
      toast({
        title: 'Budget dihapus',
        description: `Data budget ${item.divisionName} berhasil dihapus.`,
      });
    } catch (error) {
      toast({
        title: 'Gagal menghapus budget',
        description: resolveErrorMessage(error, 'Terjadi kesalahan saat menghapus data budget.'),
        variant: 'destructive',
      });
    }
  }, [deleteBudgetMutation, refetchBudgets, toast]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!formValues.divisionId) {
        toast({
          title: 'Data belum lengkap',
          description: 'Divisi wajib dipilih dari daftar divisi.',
          variant: 'destructive',
        });
        return;
      }

      const selectedDivision = divisionOptions.find((division) => division.id === formValues.divisionId);
      if (!selectedDivision) {
        toast({
          title: 'Divisi tidak valid',
          description: 'Divisi yang dipilih tidak ditemukan pada data assignment.',
          variant: 'destructive',
        });
        return;
      }

      if (!formValues.period) {
        toast({
          title: 'Data belum lengkap',
          description: 'Periode budget wajib dipilih.',
          variant: 'destructive',
        });
        return;
      }

      const duplicateItem = budgets.find((item) => {
        if (editingId && item.id === editingId) return false;
        return item.divisionId === selectedDivision.id && item.period === formValues.period;
      });

      if (duplicateItem) {
        toast({
          title: 'Duplikat tidak diizinkan',
          description: `Budget untuk ${selectedDivision.name} periode ${formValues.period} sudah ada.`,
          variant: 'destructive',
        });
        return;
      }

      const targetTon = numberParser(formValues.targetTon);
      const plannedCost = numberParser(formValues.plannedCost);
      const actualCost = numberParser(formValues.actualCost);

      if (targetTon <= 0 || plannedCost <= 0) {
        toast({
          title: 'Nilai tidak valid',
          description: 'Target produksi dan budget rencana harus lebih dari 0.',
          variant: 'destructive',
        });
        return;
      }

      if (actualCost < 0) {
        toast({
          title: 'Nilai tidak valid',
          description: 'Nilai realisasi tidak boleh negatif.',
          variant: 'destructive',
        });
        return;
      }

      const payload: CreateManagerDivisionProductionBudgetInput = {
        divisionId: selectedDivision.id,
        period: formValues.period,
        targetTon,
        plannedCost,
        actualCost,
        notes: formValues.notes.trim(),
      };

      try {
        if (editingId) {
          const updatePayload: UpdateManagerDivisionProductionBudgetInput = {
            id: editingId,
            ...payload,
          };
          await updateBudgetMutation({
            variables: {
              input: updatePayload,
            },
          });
          toast({
            title: 'Budget diperbarui',
            description: `Data budget ${selectedDivision.name} berhasil diperbarui.`,
          });
        } else {
          await createBudgetMutation({
            variables: {
              input: payload,
            },
          });
          toast({
            title: 'Budget ditambahkan',
            description: `Data budget ${selectedDivision.name} berhasil disimpan.`,
          });
        }

        await refetchBudgets();
        resetForm();
      } catch (error) {
        toast({
          title: editingId ? 'Gagal memperbarui budget' : 'Gagal menambah budget',
          description: resolveErrorMessage(error, 'Terjadi kesalahan saat menyimpan data budget.'),
          variant: 'destructive',
        });
      }
    },
    [budgets, createBudgetMutation, divisionOptions, editingId, formValues, refetchBudgets, resetForm, toast, updateBudgetMutation],
  );

  return (
    <ManagerDashboardLayout
      title="Budget Produksi Perdivisi"
      description="Kelola rencana dan realisasi budget produksi per divisi (CRUD)."
    >
      <div className="space-y-6 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Item Budget</CardDescription>
              <CardTitle>{stats.totalItems}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Divisi</CardDescription>
              <CardTitle>{stats.divisionCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Rencana</CardDescription>
              <CardTitle className="text-base">{currencyFormatter.format(stats.totalPlanned)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Realisasi</CardDescription>
              <CardTitle className="text-base">{currencyFormatter.format(stats.totalActual)}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant={stats.variance > 0 ? 'destructive' : 'secondary'}>
                Selisih {currencyFormatter.format(stats.variance)}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Daftar Budget Produksi Divisi</CardTitle>
                <CardDescription>Kelola data budget produksi per divisi untuk kebutuhan operasional.</CardDescription>
              </div>
              <Button onClick={openCreateForm} disabled={divisionOptions.length === 0 || divisionsLoading || isMutating}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Budget
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Cari divisi, estate, catatan..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter divisi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Divisi</SelectItem>
                  {divisionOptions.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="month"
                value={periodFilter}
                onChange={(event) => setPeriodFilter(event.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {divisionsError && (
              <p className="text-sm text-red-600">
                Gagal memuat daftar divisi berdasarkan assignment estate manager.
              </p>
            )}

            {budgetsError && (
              <p className="text-sm text-red-600">
                Gagal memuat data budget dari database. Coba refresh halaman.
              </p>
            )}

            {!divisionsError && !divisionsLoading && divisionOptions.length === 0 && (
              <p className="text-sm text-amber-600">
                Data divisi tidak tersedia. Budget tidak bisa dibuat sebelum daftar divisi tersedia.
              </p>
            )}

            {isFormOpen && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>{editingId ? 'Edit Budget Produksi' : 'Tambah Budget Produksi'}</CardTitle>
                  <CardDescription>Lengkapi data budget produksi per divisi.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Pilih Divisi</Label>
                      <Select value={formValues.divisionId} onValueChange={handleDivisionSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih divisi dari data assignment" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisionOptions.map((division) => (
                            <SelectItem key={division.id} value={division.id}>
                              {division.name} ({division.estateName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Periode</Label>
                        <Input
                          type="month"
                          value={formValues.period}
                          onChange={(event) =>
                            setFormValues((current) => ({ ...current, period: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Target Produksi (Ton)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formValues.targetTon}
                          onChange={(event) =>
                            setFormValues((current) => ({ ...current, targetTon: event.target.value }))
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Budget Rencana (IDR)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={formValues.plannedCost}
                          onChange={(event) =>
                            setFormValues((current) => ({ ...current, plannedCost: event.target.value }))
                          }
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Realisasi (IDR)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={formValues.actualCost}
                          onChange={(event) =>
                            setFormValues((current) => ({ ...current, actualCost: event.target.value }))
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Catatan</Label>
                        <Textarea
                          value={formValues.notes}
                          onChange={(event) =>
                            setFormValues((current) => ({ ...current, notes: event.target.value }))
                          }
                          placeholder="Catatan tambahan budget..."
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={isMutating}>
                        {editingId ? 'Simpan Perubahan' : 'Simpan Budget'}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetForm} disabled={isMutating}>
                        Batal
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Estate</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Target Ton</TableHead>
                    <TableHead className="text-right">Rencana</TableHead>
                    <TableHead className="text-right">Realisasi</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="w-28">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        {budgetsLoading
                          ? 'Memuat data budget...'
                          : 'Belum ada data budget. Klik "Tambah Budget" untuk mulai input.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBudgets.map((item) => {
                      const variance = item.actualCost - item.plannedCost;

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.divisionName}</TableCell>
                          <TableCell>{item.estateName}</TableCell>
                          <TableCell>{formatPeriodLabel(item.period)}</TableCell>
                          <TableCell className="text-right">{item.targetTon.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(item.plannedCost)}</TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(item.actualCost)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={variance > 0 ? 'destructive' : 'secondary'}>
                              {currencyFormatter.format(variance)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[260px] truncate">{item.notes || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditForm(item)}
                                disabled={isMutating}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  void handleDelete(item);
                                }}
                                disabled={isMutating}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ManagerDashboardLayout>
  );
}
