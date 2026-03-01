'use client';

import Link from 'next/link';
import React from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  type ManagerBudgetWorkflowStatus,
  type ManagerDivisionProductionBudget,
  type UpdateManagerDivisionProductionBudgetInput,
  type UpdateManagerDivisionProductionBudgetResponse,
} from '@/lib/apollo/queries/manager-division-production-budget';
import {
  GET_MANAGER_BLOCK_PRODUCTION_BUDGETS,
  type GetManagerBlockProductionBudgetsResponse,
} from '@/lib/apollo/queries/manager-block-production-budget';

type DivisionOption = {
  id: string;
  name: string;
  estateId: string;
  estateName: string;
};

type BudgetFormValues = {
  divisionId: string;
  targetTon: string;
  plannedCost: string;
  workflowStatus: ManagerBudgetWorkflowStatus;
  overrideApproved: boolean;
  notes: string;
};

type ControlTowerRow = {
  divisionId: string;
  divisionName: string;
  estateName: string;
  period: string;
  budgetId?: string;
  paguTargetTon: number;
  paguPlannedCost: number;
  paguActualCost: number;
  workflowStatus: ManagerBudgetWorkflowStatus;
  overrideApproved: boolean;
  notes: string;
  hasPagu: boolean;
  rollupTargetTon: number;
  rollupPlannedCost: number;
  rollupActualCost: number;
};

const EMPTY_FORM: BudgetFormValues = {
  divisionId: '',
  targetTon: '',
  plannedCost: '',
  workflowStatus: 'DRAFT',
  overrideApproved: false,
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

const getCurrentPeriod = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
};

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

const isOverrideAllowed = (row: Pick<ControlTowerRow, 'workflowStatus' | 'overrideApproved'>): boolean =>
  row.workflowStatus === 'APPROVED' && row.overrideApproved;

export default function ManagerDivisionProductionBudgetPage() {
  const { toast } = useToast();

  const [selectedPeriod, setSelectedPeriod] = React.useState(getCurrentPeriod);

  const {
    data: divisionOptionsData,
    loading: divisionsLoading,
    error: divisionsError,
  } = useQuery<GetManagerDivisionOptionsResponse>(GET_MANAGER_DIVISION_OPTIONS, {
    fetchPolicy: 'network-only',
  });

  const {
    data: divisionBudgetData,
    loading: budgetsLoading,
    error: budgetsError,
    refetch: refetchDivisionBudgets,
  } = useQuery<GetManagerDivisionProductionBudgetsResponse>(GET_MANAGER_DIVISION_PRODUCTION_BUDGETS, {
    variables: {
      period: selectedPeriod,
    },
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: blockBudgetData,
    loading: blockBudgetsLoading,
    error: blockBudgetsError,
  } = useQuery<GetManagerBlockProductionBudgetsResponse>(GET_MANAGER_BLOCK_PRODUCTION_BUDGETS, {
    variables: {
      period: selectedPeriod,
    },
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
    () => divisionBudgetData?.managerDivisionProductionBudgets || [],
    [divisionBudgetData?.managerDivisionProductionBudgets],
  );

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

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [divisionFilter, setDivisionFilter] = React.useState('all');
  const [formValues, setFormValues] = React.useState<BudgetFormValues>(EMPTY_FORM);

  const isMutating = creating || updating || deleting;

  const controlRows = React.useMemo<ControlTowerRow[]>(() => {
    const blockBudgets = blockBudgetData?.managerBlockProductionBudgets || [];
    const rollupMap = new Map<string, { target: number; planned: number; actual: number }>();

    blockBudgets.forEach((item) => {
      const current = rollupMap.get(item.divisionId) || { target: 0, planned: 0, actual: 0 };
      rollupMap.set(item.divisionId, {
        target: current.target + item.targetTon,
        planned: current.planned + item.plannedCost,
        actual: current.actual + item.actualCost,
      });
    });

    const budgetMap = new Map<string, ManagerDivisionProductionBudget>();
    budgets.forEach((item) => {
      budgetMap.set(item.divisionId, item);
    });

    const rows: ControlTowerRow[] = divisionOptions.map((division) => {
      const existingBudget = budgetMap.get(division.id);
      const rollup = rollupMap.get(division.id) || { target: 0, planned: 0, actual: 0 };

      return {
        divisionId: division.id,
        divisionName: division.name,
        estateName: division.estateName,
        period: selectedPeriod,
        budgetId: existingBudget?.id,
        paguTargetTon: existingBudget?.targetTon || 0,
        paguPlannedCost: existingBudget?.plannedCost || 0,
        paguActualCost: existingBudget?.actualCost || 0,
        workflowStatus: existingBudget?.workflowStatus || 'DRAFT',
        overrideApproved: existingBudget?.overrideApproved || false,
        notes: existingBudget?.notes || '',
        hasPagu: Boolean(existingBudget),
        rollupTargetTon: rollup.target,
        rollupPlannedCost: rollup.planned,
        rollupActualCost: rollup.actual,
      };
    });

    budgets.forEach((item) => {
      if (rows.some((row) => row.divisionId === item.divisionId)) {
        return;
      }

      const rollup = rollupMap.get(item.divisionId) || { target: 0, planned: 0, actual: 0 };
      rows.push({
        divisionId: item.divisionId,
        divisionName: item.divisionName,
        estateName: item.estateName,
        period: item.period,
        budgetId: item.id,
        paguTargetTon: item.targetTon,
        paguPlannedCost: item.plannedCost,
        paguActualCost: item.actualCost,
        workflowStatus: item.workflowStatus,
        overrideApproved: item.overrideApproved,
        notes: item.notes || '',
        hasPagu: true,
        rollupTargetTon: rollup.target,
        rollupPlannedCost: rollup.planned,
        rollupActualCost: rollup.actual,
      });
    });

    return rows.sort(
      (a, b) => a.estateName.localeCompare(b.estateName, 'id') || a.divisionName.localeCompare(b.divisionName, 'id'),
    );
  }, [blockBudgetData?.managerBlockProductionBudgets, budgets, divisionOptions, selectedPeriod]);

  const summary = React.useMemo(() => {
    const totalPagu = controlRows.reduce((sum, row) => sum + row.paguPlannedCost, 0);
    const totalRollupPlanned = controlRows.reduce((sum, row) => sum + row.rollupPlannedCost, 0);
    const totalRollupActual = controlRows.reduce((sum, row) => sum + row.rollupActualCost, 0);
    const configured = controlRows.filter((row) => row.hasPagu).length;
    const overBudget = controlRows.filter(
      (row) => row.hasPagu && row.rollupPlannedCost > row.paguPlannedCost && !isOverrideAllowed(row),
    ).length;

    return {
      totalDivisions: controlRows.length,
      configured,
      totalPagu,
      totalRollupPlanned,
      totalRollupActual,
      gapPlannedVsPagu: totalRollupPlanned - totalPagu,
      overBudget,
    };
  }, [controlRows]);

  const filteredRows = React.useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    return controlRows.filter((row) => {
      const searchable = `${row.divisionName} ${row.estateName} ${row.notes}`.toLowerCase();
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesDivision = divisionFilter === 'all' || row.divisionId === divisionFilter;
      return matchesSearch && matchesDivision;
    });
  }, [controlRows, divisionFilter, searchTerm]);

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

  const openEditForm = React.useCallback((row: ControlTowerRow) => {
    setEditingId(row.budgetId || null);
    setFormValues({
      divisionId: row.divisionId,
      targetTon: row.paguTargetTon > 0 ? String(row.paguTargetTon) : '',
      plannedCost: row.paguPlannedCost > 0 ? String(row.paguPlannedCost) : '',
      workflowStatus: row.workflowStatus,
      overrideApproved: row.overrideApproved,
      notes: row.notes || '',
    });
    setIsFormOpen(true);
  }, []);

  const handleDeletePagu = React.useCallback(
    async (row: ControlTowerRow) => {
      if (!row.budgetId) {
        toast({
          title: 'Pagu belum tersedia',
          description: 'Divisi ini belum memiliki pagu yang bisa dihapus.',
          variant: 'destructive',
        });
        return;
      }

      const confirmed = window.confirm(`Hapus pagu divisi ${row.divisionName} untuk periode ${selectedPeriod}?`);
      if (!confirmed) return;

      try {
        await deleteBudgetMutation({ variables: { id: row.budgetId } });
        await refetchDivisionBudgets();
        toast({
          title: 'Pagu dihapus',
          description: `Pagu divisi ${row.divisionName} berhasil dihapus.`,
        });
      } catch (error) {
        toast({
          title: 'Gagal menghapus pagu',
          description: resolveErrorMessage(error, 'Terjadi kesalahan saat menghapus pagu divisi.'),
          variant: 'destructive',
        });
      }
    },
    [deleteBudgetMutation, refetchDivisionBudgets, selectedPeriod, toast],
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!formValues.divisionId) {
        toast({
          title: 'Data belum lengkap',
          description: 'Divisi wajib dipilih.',
          variant: 'destructive',
        });
        return;
      }

      const selectedDivision = divisionOptions.find((division) => division.id === formValues.divisionId);
      if (!selectedDivision) {
        toast({
          title: 'Divisi tidak valid',
          description: 'Divisi yang dipilih tidak ditemukan pada scope manager.',
          variant: 'destructive',
        });
        return;
      }

      const targetTon = numberParser(formValues.targetTon);
      const plannedCost = numberParser(formValues.plannedCost);
      if (targetTon <= 0 || plannedCost <= 0) {
        toast({
          title: 'Nilai tidak valid',
          description: 'Target ton dan pagu biaya harus lebih dari 0.',
          variant: 'destructive',
        });
        return;
      }

      const existing = budgets.find((item) => item.divisionId === selectedDivision.id);
      const workflowStatus = formValues.workflowStatus;
      const overrideApproved = workflowStatus === 'APPROVED' && formValues.overrideApproved;
      const payload: CreateManagerDivisionProductionBudgetInput = {
        divisionId: selectedDivision.id,
        period: selectedPeriod,
        targetTon,
        plannedCost,
        actualCost: existing?.actualCost || 0,
        workflowStatus,
        overrideApproved,
        notes: formValues.notes.trim(),
      };

      try {
        if (editingId || existing?.id) {
          const updatePayload: UpdateManagerDivisionProductionBudgetInput = {
            id: editingId || existing!.id,
            ...payload,
          };
          await updateBudgetMutation({ variables: { input: updatePayload } });
          toast({
            title: 'Pagu diperbarui',
            description: `Pagu divisi ${selectedDivision.name} berhasil diperbarui.`,
          });
        } else {
          await createBudgetMutation({ variables: { input: payload } });
          toast({
            title: 'Pagu ditambahkan',
            description: `Pagu divisi ${selectedDivision.name} berhasil disimpan.`,
          });
        }

        await refetchDivisionBudgets();
        resetForm();
      } catch (error) {
        toast({
          title: editingId ? 'Gagal memperbarui pagu' : 'Gagal menambah pagu',
          description: resolveErrorMessage(error, 'Terjadi kesalahan saat menyimpan pagu divisi.'),
          variant: 'destructive',
        });
      }
    },
    [
      budgets,
      createBudgetMutation,
      divisionOptions,
      editingId,
      formValues.divisionId,
      formValues.notes,
      formValues.plannedCost,
      formValues.targetTon,
      formValues.workflowStatus,
      formValues.overrideApproved,
      refetchDivisionBudgets,
      resetForm,
      selectedPeriod,
      toast,
      updateBudgetMutation,
    ],
  );

  return (
    <ManagerDashboardLayout
      title="Budget Divisi (Control Tower)"
      description="Divisi sebagai pagu, detail biaya dan realisasi dari rollup budget per blok."
    >
      <div className="space-y-6 p-4 md:p-6">
        <Card className="border-dashed">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Detail Operasional Per Blok</CardTitle>
              <CardDescription>
                Input detail dilakukan di halaman budget blok, halaman ini fokus untuk pagu divisi dan kontrol gap.
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/budget-blok">
                Buka Budget Blok
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Divisi</CardDescription>
              <CardTitle>{summary.totalDivisions}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">Pagu terkonfigurasi: {summary.configured}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Pagu Divisi</CardDescription>
              <CardTitle className="text-base">{currencyFormatter.format(summary.totalPagu)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rollup Rencana Blok</CardDescription>
              <CardTitle className="text-base">{currencyFormatter.format(summary.totalRollupPlanned)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rollup Realisasi Blok</CardDescription>
              <CardTitle className="text-base">{currencyFormatter.format(summary.totalRollupActual)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gap Rencana vs Pagu</CardDescription>
              <CardTitle className="text-base">{currencyFormatter.format(summary.gapPlannedVsPagu)}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant={summary.overBudget > 0 ? 'destructive' : 'secondary'}>{summary.overBudget} divisi over budget</Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Kontrol Pagu Divisi</CardTitle>
                <CardDescription>Set pagu divisi per periode, lalu monitor gap dari rollup budget blok.</CardDescription>
              </div>
              <Button onClick={openCreateForm} disabled={divisionOptions.length === 0 || divisionsLoading || isMutating}>
                <Plus className="mr-2 h-4 w-4" />
                Set Pagu Divisi
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                type="month"
                value={selectedPeriod}
                onChange={(event) => setSelectedPeriod(event.target.value)}
              />

              <Input
                placeholder="Cari divisi atau estate..."
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
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {divisionsError && <p className="text-sm text-red-600">Gagal memuat daftar divisi manager.</p>}
            {budgetsError && <p className="text-sm text-red-600">Gagal memuat data pagu divisi.</p>}
            {blockBudgetsError && <p className="text-sm text-red-600">Gagal memuat rollup budget blok.</p>}

            {isFormOpen && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>{editingId ? 'Edit Pagu Divisi' : 'Set Pagu Divisi'}</CardTitle>
                  <CardDescription>
                    Periode aktif: {formatPeriodLabel(selectedPeriod)}. Nilai ini menjadi batas kontrol budget dari detail blok.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Pilih Divisi</Label>
                      <Select
                        value={formValues.divisionId}
                        onValueChange={(divisionId) =>
                          setFormValues((current) => ({
                            ...current,
                            divisionId,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih divisi" />
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

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Pagu Target Produksi (Ton)</Label>
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
                        <Label>Pagu Budget Biaya (IDR)</Label>
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
                        <Label>Workflow Pagu</Label>
                        <Select
                          value={formValues.workflowStatus}
                          onValueChange={(value) =>
                            setFormValues((current) => ({
                              ...current,
                              workflowStatus: value as ManagerBudgetWorkflowStatus,
                              overrideApproved:
                                value === 'APPROVED' ? current.overrideApproved : false,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih status workflow" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">DRAFT</SelectItem>
                            <SelectItem value="REVIEW">REVIEW</SelectItem>
                            <SelectItem value="APPROVED">APPROVED</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                        <Checkbox
                          id="override-approved"
                          checked={formValues.workflowStatus === 'APPROVED' ? formValues.overrideApproved : false}
                          disabled={formValues.workflowStatus !== 'APPROVED'}
                          onCheckedChange={(checked) =>
                            setFormValues((current) => ({
                              ...current,
                              overrideApproved: checked === true,
                            }))
                          }
                        />
                        <div className="space-y-1">
                          <Label htmlFor="override-approved">Override over budget</Label>
                          <p className="text-xs text-muted-foreground">
                            Aktifkan hanya jika rollup blok boleh melewati pagu divisi.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Catatan Pagu</Label>
                      <Textarea
                        value={formValues.notes}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, notes: event.target.value }))
                        }
                        placeholder="Catatan kontrol budget divisi"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        disabled={isMutating}
                      >
                        Batal
                      </Button>
                      <Button type="submit" disabled={isMutating}>
                        {editingId ? 'Simpan Perubahan' : 'Simpan Pagu'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Estate</TableHead>
                    <TableHead className="text-right">Pagu Target</TableHead>
                    <TableHead className="text-right">Pagu Biaya</TableHead>
                    <TableHead className="text-right">Rollup Target</TableHead>
                    <TableHead className="text-right">Rollup Rencana</TableHead>
                    <TableHead className="text-right">Rollup Realisasi</TableHead>
                    <TableHead className="text-right">Gap Rencana-Pagu</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[132px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(budgetsLoading || blockBudgetsLoading) && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-sm text-muted-foreground">
                        Memuat control tower budget...
                      </TableCell>
                    </TableRow>
                  )}

                  {!budgetsLoading && !blockBudgetsLoading && filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-sm text-muted-foreground">
                        Tidak ada data untuk filter saat ini.
                      </TableCell>
                    </TableRow>
                  )}

                  {!budgetsLoading &&
                    !blockBudgetsLoading &&
                    filteredRows.map((row) => {
                      const gapPlannedVsPagu = row.rollupPlannedCost - row.paguPlannedCost;
                      const overBudget = row.hasPagu && gapPlannedVsPagu > 0;
                      const blockedByLimit = overBudget && !isOverrideAllowed(row);
                      return (
                        <TableRow key={`${row.divisionId}-${selectedPeriod}`}>
                          <TableCell className="font-medium">{row.divisionName}</TableCell>
                          <TableCell>{row.estateName}</TableCell>
                          <TableCell className="text-right">{row.paguTargetTon.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(row.paguPlannedCost)}</TableCell>
                          <TableCell className="text-right">{row.rollupTargetTon.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(row.rollupPlannedCost)}</TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(row.rollupActualCost)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={blockedByLimit ? 'destructive' : 'secondary'}>
                              {currencyFormatter.format(gapPlannedVsPagu)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.workflowStatus === 'APPROVED' ? 'secondary' : 'outline'}>
                              {row.workflowStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {!row.hasPagu && <Badge variant="outline">Pagu Belum Set</Badge>}
                            {row.hasPagu && blockedByLimit && <Badge variant="destructive">Over Budget (Blocked)</Badge>}
                            {row.hasPagu && overBudget && isOverrideAllowed(row) && (
                              <Badge variant="outline">Over Budget (Override)</Badge>
                            )}
                            {row.hasPagu && !overBudget && <Badge variant="secondary">Dalam Batas</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isMutating}
                                onClick={() => openEditForm(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isMutating || !row.budgetId}
                                onClick={() => handleDeletePagu(row)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ManagerDashboardLayout>
  );
}
