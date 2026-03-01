'use client';

import Link from 'next/link';
import React from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Check, ClipboardCheck, Download, Pencil, Plus, RefreshCw, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
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
  downloadXlsxTemplate,
  getRowString,
  isSpreadsheetFile,
  normalizeLookupKey,
  parseFirstWorksheetRows,
  parseOptionalNumberValue,
} from '@/features/master-data/utils/xlsx-import';
import {
  CREATE_MANAGER_BLOCK_PRODUCTION_BUDGET,
  DELETE_MANAGER_BLOCK_PRODUCTION_BUDGET,
  GET_MANAGER_BLOCK_OPTIONS,
  GET_MANAGER_BLOCK_PRODUCTION_BUDGETS,
  UPDATE_MANAGER_BLOCK_PRODUCTION_BUDGET,
  type CreateManagerBlockProductionBudgetInput,
  type CreateManagerBlockProductionBudgetResponse,
  type DeleteManagerBlockProductionBudgetResponse,
  type GetManagerBlockOptionsResponse,
  type GetManagerBlockProductionBudgetsResponse,
  type ManagerBlockOption,
  type ManagerBlockProductionBudget,
  type ManagerBudgetWorkflowStatus,
  type UpdateManagerBlockProductionBudgetInput,
  type UpdateManagerBlockProductionBudgetResponse,
} from '@/lib/apollo/queries/manager-block-production-budget';
import {
  GET_MANAGER_DIVISION_PRODUCTION_BUDGETS,
  type GetManagerDivisionProductionBudgetsResponse,
} from '@/lib/apollo/queries/manager-division-production-budget';

type DivisionOption = {
  id: string;
  name: string;
};

type ImportFailureDetail = {
  row: number;
  record: string;
  reason: string;
};

type ImportSummary = {
  created: number;
  updated: number;
  failed: number;
  failedRows: ImportFailureDetail[];
  importedAt: string;
};

type BudgetFormValues = {
  blockId: string;
  period: string;
  targetTon: string;
  plannedCost: string;
  actualCost: string;
  workflowStatus: ManagerBudgetWorkflowStatus;
  notes: string;
};

const EMPTY_FORM: BudgetFormValues = {
  blockId: '',
  period: '',
  targetTon: '',
  plannedCost: '',
  actualCost: '',
  workflowStatus: 'DRAFT',
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

const formatBlockLabel = (block: ManagerBlockOption): string => {
  const code = normalizeText(block.blockCode) ? block.blockCode : '-';
  return `${code} - ${block.name}`;
};

const workflowBadgeVariant = (workflowStatus: ManagerBudgetWorkflowStatus): 'destructive' | 'secondary' | 'outline' => {
  if (workflowStatus === 'APPROVED') {
    return 'secondary';
  }
  if (workflowStatus === 'REVIEW') {
    return 'destructive';
  }
  return 'outline';
};

const parseImportWorkflowStatus = (value: string): ManagerBudgetWorkflowStatus | null => {
  const normalized = normalizeText(value).replace(/\s+/g, '_');
  if (!normalized) return null;
  if (normalized === 'draft') return 'DRAFT';
  if (normalized === 'review') return 'REVIEW';
  if (normalized === 'approved') return 'APPROVED';
  return null;
};

export default function ManagerBlockProductionBudgetPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const importInputRef = React.useRef<HTMLInputElement | null>(null);

  const {
    data: blockOptionsData,
    loading: blocksLoading,
    error: blocksError,
  } = useQuery<GetManagerBlockOptionsResponse>(GET_MANAGER_BLOCK_OPTIONS, {
    fetchPolicy: 'network-only',
  });

  const {
    data: budgetData,
    loading: budgetsLoading,
    error: budgetsError,
    refetch: refetchBudgets,
  } = useQuery<GetManagerBlockProductionBudgetsResponse>(GET_MANAGER_BLOCK_PRODUCTION_BUDGETS, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: divisionBudgetData } = useQuery<GetManagerDivisionProductionBudgetsResponse>(
    GET_MANAGER_DIVISION_PRODUCTION_BUDGETS,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  const [createBudgetMutation, { loading: creating }] = useMutation<CreateManagerBlockProductionBudgetResponse>(
    CREATE_MANAGER_BLOCK_PRODUCTION_BUDGET,
  );
  const [updateBudgetMutation, { loading: updating }] = useMutation<UpdateManagerBlockProductionBudgetResponse>(
    UPDATE_MANAGER_BLOCK_PRODUCTION_BUDGET,
  );
  const [deleteBudgetMutation, { loading: deleting }] = useMutation<DeleteManagerBlockProductionBudgetResponse>(
    DELETE_MANAGER_BLOCK_PRODUCTION_BUDGET,
  );

  const budgets = React.useMemo<ManagerBlockProductionBudget[]>(
    () => budgetData?.managerBlockProductionBudgets || [],
    [budgetData?.managerBlockProductionBudgets],
  );

  const divisionBudgets = React.useMemo(
    () => divisionBudgetData?.managerDivisionProductionBudgets || [],
    [divisionBudgetData?.managerDivisionProductionBudgets],
  );

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [importSummary, setImportSummary] = React.useState<ImportSummary | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [workflowFilter, setWorkflowFilter] = React.useState<'all' | ManagerBudgetWorkflowStatus>('all');
  const [divisionFilter, setDivisionFilter] = React.useState('all');
  const [blockFilter, setBlockFilter] = React.useState('all');
  const [periodFilter, setPeriodFilter] = React.useState('');
  const [formValues, setFormValues] = React.useState<BudgetFormValues>(EMPTY_FORM);

  const isMutating = creating || updating || deleting;

  const currentRole = normalizeText(user?.role);
  const isManagerRole = currentRole === 'manager';
  const isFieldRole = currentRole === 'asisten' || currentRole === 'mandor';
  const currentUserID = (user?.id || '').trim();

  const blockOptions = React.useMemo<ManagerBlockOption[]>(() => {
    const uniqueById = new Map<string, ManagerBlockOption>();
    (blockOptionsData?.managerBlockOptions || []).forEach((block) => {
      if (!block?.id || !block.name) return;

      uniqueById.set(String(block.id), {
        id: String(block.id),
        blockCode: String(block.blockCode || '-'),
        name: block.name,
        divisionId: String(block.divisionId || ''),
        divisionName: String(block.divisionName || '-'),
        estateId: String(block.estateId || ''),
        estateName: String(block.estateName || '-'),
      });
    });

    return Array.from(uniqueById.values()).sort(
      (a, b) =>
        a.estateName.localeCompare(b.estateName, 'id') ||
        a.divisionName.localeCompare(b.divisionName, 'id') ||
        a.blockCode.localeCompare(b.blockCode, 'id') ||
        a.name.localeCompare(b.name, 'id'),
    );
  }, [blockOptionsData?.managerBlockOptions]);

  const divisionOptions = React.useMemo<DivisionOption[]>(() => {
    const uniqueById = new Map<string, DivisionOption>();
    blockOptions.forEach((block) => {
      if (!block.divisionId || !block.divisionName) return;
      uniqueById.set(block.divisionId, {
        id: block.divisionId,
        name: block.divisionName,
      });
    });
    return Array.from(uniqueById.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }, [blockOptions]);

  const blockLookups = React.useMemo(() => {
    const byId = new Map<string, ManagerBlockOption>();
    const byCode = new Map<string, ManagerBlockOption>();
    const byName = new Map<string, ManagerBlockOption[]>();

    blockOptions.forEach((block) => {
      byId.set(block.id, block);

      const normalizedCode = normalizeLookupKey(block.blockCode || '');
      if (normalizedCode && !byCode.has(normalizedCode)) {
        byCode.set(normalizedCode, block);
      }

      const normalizedName = normalizeLookupKey(block.name || '');
      if (normalizedName) {
        const current = byName.get(normalizedName) ?? [];
        current.push(block);
        byName.set(normalizedName, current);
      }
    });

    return { byId, byCode, byName };
  }, [blockOptions]);

  const divisionBudgetByDivisionPeriod = React.useMemo(() => {
    const index = new Map<string, true>();
    divisionBudgets.forEach((item) => {
      if (!item?.divisionId || !item?.period) return;
      index.set(`${item.divisionId}::${item.period}`, true);
    });
    return index;
  }, [divisionBudgets]);

  const stats = React.useMemo(() => {
    const totalPlanned = budgets.reduce((sum, item) => sum + item.plannedCost, 0);
    const totalActual = budgets.reduce((sum, item) => sum + item.actualCost, 0);
    const blockCount = new Set(budgets.map((item) => item.blockId)).size;

    return {
      totalItems: budgets.length,
      totalPlanned,
      totalActual,
      blockCount,
      variance: totalActual - totalPlanned,
    };
  }, [budgets]);

  const managerApprovalStats = React.useMemo(() => {
    const draftCount = budgets.filter((item) => item.workflowStatus === 'DRAFT').length;
    const reviewCount = budgets.filter((item) => item.workflowStatus === 'REVIEW').length;
    const approvedCount = budgets.filter((item) => item.workflowStatus === 'APPROVED').length;
    const blockedActionableCount = budgets.filter((item) => {
      const isActionable = item.workflowStatus === 'DRAFT' || item.workflowStatus === 'REVIEW';
      if (!isActionable) return false;
      return !divisionBudgetByDivisionPeriod.has(`${item.divisionId}::${item.period}`);
    }).length;

    return {
      draftCount,
      reviewCount,
      approvedCount,
      actionableCount: draftCount + reviewCount,
      blockedActionableCount,
    };
  }, [budgets, divisionBudgetByDivisionPeriod]);

  const isOwnedDraft = React.useCallback(
    (item: ManagerBlockProductionBudget): boolean => {
      return item.workflowStatus === 'DRAFT' && currentUserID !== '' && item.createdById === currentUserID;
    },
    [currentUserID],
  );

  const canMutateItem = React.useCallback(
    (item: ManagerBlockProductionBudget): boolean => {
      if (isManagerRole) {
        return true;
      }
      if (isFieldRole) {
        return isOwnedDraft(item);
      }
      return false;
    },
    [isFieldRole, isManagerRole, isOwnedDraft],
  );

  const hasDivisionBudgetForPeriod = React.useCallback(
    (item: Pick<ManagerBlockProductionBudget, 'divisionId' | 'period'>): boolean => {
      return divisionBudgetByDivisionPeriod.has(`${item.divisionId}::${item.period}`);
    },
    [divisionBudgetByDivisionPeriod],
  );

  const filteredBudgets = React.useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    return [...budgets]
      .filter((item) => {
        const searchable = [
          item.blockCode,
          item.blockName,
          item.divisionName,
          item.estateName,
          item.notes,
          item.createdBy,
          item.period,
          item.workflowStatus,
        ]
          .join(' ')
          .toLowerCase();

        const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
        const matchesDivision = divisionFilter === 'all' || item.divisionId === divisionFilter;
        const matchesBlock = blockFilter === 'all' || item.blockId === blockFilter;
        const matchesPeriod = !periodFilter || item.period === periodFilter;
        const matchesWorkflow = workflowFilter === 'all' || item.workflowStatus === workflowFilter;
        return matchesSearch && matchesDivision && matchesBlock && matchesPeriod && matchesWorkflow;
      })
      .sort((a, b) => {
        if (isManagerRole) {
          const priority = { REVIEW: 0, DRAFT: 1, APPROVED: 2 } as const;
          const byWorkflowPriority = priority[a.workflowStatus] - priority[b.workflowStatus];
          if (byWorkflowPriority !== 0) return byWorkflowPriority;
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [blockFilter, budgets, divisionFilter, isManagerRole, periodFilter, searchTerm, workflowFilter]);

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

  const openEditForm = React.useCallback(
    (item: ManagerBlockProductionBudget) => {
      if (!canMutateItem(item)) {
        toast({
          title: 'Aksi tidak diizinkan',
          description: 'Role operasional hanya bisa mengubah draft milik sendiri.',
          variant: 'destructive',
        });
        return;
      }

      setEditingId(item.id);
      setFormValues({
        blockId: item.blockId || '',
        period: item.period,
        targetTon: String(item.targetTon),
        plannedCost: String(item.plannedCost),
        actualCost: String(item.actualCost),
        workflowStatus: item.workflowStatus,
        notes: item.notes || '',
      });
      setIsFormOpen(true);
    },
    [canMutateItem, toast],
  );

  const handleBlockSelect = React.useCallback((blockId: string) => {
    setFormValues((current) => ({
      ...current,
      blockId,
    }));
  }, []);

  const handleDelete = React.useCallback(
    async (item: ManagerBlockProductionBudget) => {
      if (!canMutateItem(item)) {
        toast({
          title: 'Aksi tidak diizinkan',
          description: 'Role operasional hanya bisa menghapus draft milik sendiri.',
          variant: 'destructive',
        });
        return;
      }

      const confirmed = window.confirm(`Hapus budget blok ${item.blockCode} (${item.blockName}) periode ${item.period}?`);
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
          description: `Data budget blok ${item.blockCode} berhasil dihapus.`,
        });
      } catch (error) {
        toast({
          title: 'Gagal menghapus budget',
          description: resolveErrorMessage(error, 'Terjadi kesalahan saat menghapus data budget blok.'),
          variant: 'destructive',
        });
      }
    },
    [canMutateItem, deleteBudgetMutation, refetchBudgets, toast],
  );

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!formValues.blockId) {
        toast({
          title: 'Data belum lengkap',
          description: 'Blok wajib dipilih dari daftar blok.',
          variant: 'destructive',
        });
        return;
      }

      const selectedBlock = blockOptions.find((block) => block.id === formValues.blockId);
      if (!selectedBlock) {
        toast({
          title: 'Blok tidak valid',
          description: 'Blok yang dipilih tidak ditemukan pada data assignment.',
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
        return item.blockId === selectedBlock.id && item.period === formValues.period;
      });

      if (duplicateItem) {
        toast({
          title: 'Duplikat tidak diizinkan',
          description: `Budget untuk blok ${selectedBlock.blockCode} periode ${formValues.period} sudah ada.`,
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

      const resolvedWorkflowStatus: ManagerBudgetWorkflowStatus = isManagerRole
        ? formValues.workflowStatus
        : 'DRAFT';

      if (editingId && isFieldRole) {
        const editingItem = budgets.find((item) => item.id === editingId);
        if (!editingItem || !canMutateItem(editingItem)) {
          toast({
            title: 'Aksi tidak diizinkan',
            description: 'Role operasional hanya bisa mengubah draft milik sendiri.',
            variant: 'destructive',
          });
          return;
        }
      }

      const payload: CreateManagerBlockProductionBudgetInput = {
        blockId: selectedBlock.id,
        period: formValues.period,
        targetTon,
        plannedCost,
        actualCost,
        workflowStatus: resolvedWorkflowStatus,
        notes: formValues.notes.trim(),
      };

      try {
        if (editingId) {
          const updatePayload: UpdateManagerBlockProductionBudgetInput = {
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
            description: `Data budget blok ${selectedBlock.blockCode} berhasil diperbarui.`,
          });
        } else {
          await createBudgetMutation({
            variables: {
              input: payload,
            },
          });
          toast({
            title: 'Budget ditambahkan',
            description: `Data budget blok ${selectedBlock.blockCode} berhasil disimpan.`,
          });
        }

        await refetchBudgets();
        resetForm();
      } catch (error) {
        toast({
          title: editingId ? 'Gagal memperbarui budget' : 'Gagal menambah budget',
          description: resolveErrorMessage(error, 'Terjadi kesalahan saat menyimpan data budget blok.'),
          variant: 'destructive',
        });
      }
    },
    [
      blockOptions,
      budgets,
      canMutateItem,
      createBudgetMutation,
      editingId,
      formValues,
      isFieldRole,
      isManagerRole,
      refetchBudgets,
      resetForm,
      toast,
      updateBudgetMutation,
    ],
  );

  const handleManagerWorkflowAction = React.useCallback(
    async (item: ManagerBlockProductionBudget, nextStatus: ManagerBudgetWorkflowStatus) => {
      if (!isManagerRole) {
        return;
      }

      if (item.workflowStatus === nextStatus) {
        return;
      }

      try {
        await updateBudgetMutation({
          variables: {
            input: {
              id: item.id,
              workflowStatus: nextStatus,
            },
          },
        });
        await refetchBudgets();
        toast({
          title: 'Workflow diperbarui',
          description: `${item.blockCode} (${formatPeriodLabel(item.period)}) diubah ke ${nextStatus}.`,
        });
      } catch (error) {
        toast({
          title: 'Gagal memperbarui workflow',
          description: resolveErrorMessage(error, 'Terjadi kesalahan saat memperbarui workflow approval.'),
          variant: 'destructive',
        });
      }
    },
    [isManagerRole, refetchBudgets, toast, updateBudgetMutation],
  );

  const handleDownloadTemplate = React.useCallback(async () => {
    setIsDownloadingTemplate(true);
    try {
      const templateBlock = blockOptions[0];
      await downloadXlsxTemplate('template_import_budget_blok.xlsx', [
        {
          block_id: templateBlock?.id || '',
          block_code: templateBlock?.blockCode || '',
          block_name: templateBlock?.name || 'Contoh Blok A',
          period: new Date().toISOString().slice(0, 7),
          target_ton: 125.5,
          planned_cost: 25000000,
          actual_cost: 23000000,
          workflow_status: isManagerRole ? 'REVIEW' : 'DRAFT',
          notes: 'Contoh import budget blok',
        },
      ]);
      toast({
        title: 'Template diunduh',
        description: 'Template import budget blok berhasil diunduh.',
      });
    } catch (error) {
      toast({
        title: 'Gagal mengunduh template',
        description: resolveErrorMessage(error, 'Terjadi kesalahan saat membuat file template.'),
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  }, [blockOptions, isManagerRole, toast]);

  const buildExportRows = React.useCallback((items: ManagerBlockProductionBudget[]) => {
    return items.map((item) => ({
      block_id: item.blockId,
      block_code: item.blockCode,
      block_name: item.blockName,
      division: item.divisionName,
      estate: item.estateName,
      period: item.period,
      target_ton: item.targetTon,
      planned_cost: item.plannedCost,
      actual_cost: item.actualCost,
      variance: item.actualCost - item.plannedCost,
      workflow_status: item.workflowStatus,
      notes: item.notes || '',
      created_by: item.createdBy,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    }));
  }, []);

  const exportRowsToXlsx = React.useCallback(
    async (items: ManagerBlockProductionBudget[], filePrefix: string, emptyDescription: string, successDescription: string) => {
      if (items.length === 0) {
        toast({
          title: 'Tidak ada data',
          description: emptyDescription,
        });
        return;
      }

      setIsExporting(true);
      try {
        const rows = buildExportRows(items);
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        await downloadXlsxTemplate(`${filePrefix}_${stamp}.xlsx`, rows);
        toast({
          title: 'Export berhasil',
          description: successDescription.replace('{count}', String(rows.length)),
        });
      } catch (error) {
        toast({
          title: 'Gagal export',
          description: resolveErrorMessage(error, 'Terjadi kesalahan saat menyiapkan file Excel.'),
          variant: 'destructive',
        });
      } finally {
        setIsExporting(false);
      }
    },
    [buildExportRows, toast],
  );

  const handleExportXlsx = React.useCallback(async () => {
    await exportRowsToXlsx(
      filteredBudgets,
      'budget_blok_filter',
      'Tidak ada budget blok yang bisa diexport untuk filter saat ini.',
      '{count} data budget blok hasil filter berhasil diexport ke Excel.',
    );
  }, [exportRowsToXlsx, filteredBudgets]);

  const handleExportAllXlsx = React.useCallback(async () => {
    await exportRowsToXlsx(
      budgets,
      'budget_blok_semua',
      'Tidak ada budget blok yang bisa diexport.',
      '{count} data budget blok berhasil diexport ke Excel.',
    );
  }, [budgets, exportRowsToXlsx]);

  const handleImportFile = React.useCallback(
    async (file: File) => {
      if (!isSpreadsheetFile(file.name)) {
        toast({
          title: 'Format file tidak didukung',
          description: 'Gunakan file .xlsx',
          variant: 'destructive',
        });
        return;
      }

      if (blockOptions.length === 0) {
        toast({
          title: 'Data blok belum tersedia',
          description: 'Import membutuhkan referensi blok dari assignment yang aktif.',
          variant: 'destructive',
        });
        return;
      }

      setIsImporting(true);
      setImportSummary(null);

      try {
        const rows = await parseFirstWorksheetRows(file);
        if (rows.length === 0) {
          toast({
            title: 'File kosong',
            description: 'Tidak ada data yang bisa diimpor dari file XLSX.',
            variant: 'destructive',
          });
          return;
        }

        const budgetIndex = new Map<string, ManagerBlockProductionBudget>();
        budgets.forEach((item) => {
          budgetIndex.set(`${item.blockId}::${item.period}`, item);
        });

        let created = 0;
        let updated = 0;
        let failed = 0;
        const failedRows: ImportFailureDetail[] = [];
        const errorMessages: string[] = [];

        const addFailed = (row: number, record: string, reason: string) => {
          failed += 1;
          errorMessages.push(`Baris ${row}: ${reason}`);
          failedRows.push({ row, record, reason });
        };

        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i];
          const excelRow = i + 2;

          const blockIdInput = getRowString(row, ['block_id', 'id_blok']);
          const blockCodeInput = getRowString(row, ['block_code', 'kode_blok', 'kode']);
          const blockNameInput = getRowString(row, ['block_name', 'nama_blok', 'blok', 'name']);
          const periodInput = getRowString(row, ['period', 'periode', 'bulan']);
          const targetTonInput = getRowString(row, ['target_ton', 'target', 'target_produksi_ton']);
          const plannedCostInput = getRowString(row, ['planned_cost', 'budget_rencana', 'rencana']);
          const actualCostInput = getRowString(row, ['actual_cost', 'budget_realisasi', 'realisasi']);
          const workflowInput = getRowString(row, ['workflow_status', 'workflow', 'status_workflow']);
          const notesInput = getRowString(row, ['notes', 'catatan', 'keterangan']);

          const recordLabel = `${blockCodeInput || blockIdInput || '-'} / ${periodInput || '-'}`;

          let selectedBlock: ManagerBlockOption | undefined;
          if (blockIdInput) {
            selectedBlock = blockLookups.byId.get(blockIdInput.trim());
          }
          if (!selectedBlock && blockCodeInput) {
            selectedBlock = blockLookups.byCode.get(normalizeLookupKey(blockCodeInput));
          }
          if (!selectedBlock && blockNameInput) {
            const nameMatches = blockLookups.byName.get(normalizeLookupKey(blockNameInput)) ?? [];
            if (nameMatches.length === 1) {
              selectedBlock = nameMatches[0];
            } else if (nameMatches.length > 1) {
              addFailed(
                excelRow,
                recordLabel,
                'nama blok ambigu. Gunakan block_id atau block_code agar blok bisa dikenali dengan pasti.',
              );
              continue;
            }
          }

          if (!selectedBlock) {
            addFailed(excelRow, recordLabel, 'blok tidak ditemukan. Isi block_id, block_code, atau block_name yang valid.');
            continue;
          }

          const period = periodInput.trim();
          if (!/^\d{4}-\d{2}$/.test(period)) {
            addFailed(excelRow, recordLabel, 'periode wajib format YYYY-MM.');
            continue;
          }

          const targetTon = parseOptionalNumberValue(targetTonInput);
          if (targetTon === undefined || Number.isNaN(targetTon) || targetTon <= 0) {
            addFailed(excelRow, recordLabel, 'target_ton harus berupa angka lebih dari 0.');
            continue;
          }

          const plannedCost = parseOptionalNumberValue(plannedCostInput);
          if (plannedCost === undefined || Number.isNaN(plannedCost) || plannedCost <= 0) {
            addFailed(excelRow, recordLabel, 'planned_cost harus berupa angka lebih dari 0.');
            continue;
          }

          let actualCost = 0;
          if (actualCostInput.trim()) {
            const parsedActualCost = parseOptionalNumberValue(actualCostInput);
            if (parsedActualCost === undefined || Number.isNaN(parsedActualCost) || parsedActualCost < 0) {
              addFailed(excelRow, recordLabel, 'actual_cost harus berupa angka 0 atau lebih.');
              continue;
            }
            actualCost = parsedActualCost;
          }

          const parsedWorkflowStatus = parseImportWorkflowStatus(workflowInput);
          if (workflowInput.trim() && parsedWorkflowStatus === null) {
            addFailed(excelRow, recordLabel, 'workflow_status tidak valid. Gunakan DRAFT, REVIEW, atau APPROVED.');
            continue;
          }

          const workflowStatus: ManagerBudgetWorkflowStatus = isManagerRole
            ? parsedWorkflowStatus || 'DRAFT'
            : 'DRAFT';

          const existingItem = budgetIndex.get(`${selectedBlock.id}::${period}`);
          if (existingItem && !canMutateItem(existingItem)) {
            addFailed(
              excelRow,
              recordLabel,
              'budget existing tidak bisa diubah oleh role saat ini. Operasional hanya dapat ubah draft milik sendiri.',
            );
            continue;
          }

          const payload: CreateManagerBlockProductionBudgetInput = {
            blockId: selectedBlock.id,
            period,
            targetTon,
            plannedCost,
            actualCost,
            workflowStatus,
            notes: notesInput.trim(),
          };

          try {
            if (existingItem) {
              const updatePayload: UpdateManagerBlockProductionBudgetInput = {
                id: existingItem.id,
                ...payload,
              };
              const result = await updateBudgetMutation({
                variables: {
                  input: updatePayload,
                },
              });
              const updatedItem = result.data?.updateManagerBlockProductionBudget;
              if (updatedItem) {
                budgetIndex.set(`${selectedBlock.id}::${period}`, updatedItem);
              }
              updated += 1;
            } else {
              const result = await createBudgetMutation({
                variables: {
                  input: payload,
                },
              });
              const createdItem = result.data?.createManagerBlockProductionBudget;
              if (createdItem) {
                budgetIndex.set(`${selectedBlock.id}::${period}`, createdItem);
              }
              created += 1;
            }
          } catch (error) {
            addFailed(excelRow, recordLabel, resolveErrorMessage(error, 'gagal menyimpan data budget blok.'));
          }
        }

        await refetchBudgets();
        setImportSummary({
          created,
          updated,
          failed,
          failedRows,
          importedAt: new Date().toISOString(),
        });

        if (failed === 0) {
          toast({
            title: 'Import selesai',
            description: `Berhasil create ${created} dan update ${updated} budget blok.`,
          });
        } else {
          const previewErrors = errorMessages.slice(0, 3).join(' | ');
          toast({
            title: 'Import selesai dengan error',
            description: `Create ${created}, update ${updated}, gagal ${failed}. ${previewErrors}`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Import gagal',
          description: resolveErrorMessage(error, 'Gagal membaca file XLSX.'),
          variant: 'destructive',
        });
      } finally {
        setIsImporting(false);
      }
    },
    [
      blockLookups,
      blockOptions.length,
      budgets,
      canMutateItem,
      createBudgetMutation,
      isManagerRole,
      refetchBudgets,
      toast,
      updateBudgetMutation,
    ],
  );

  const handleImportInputChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      await handleImportFile(file);
    },
    [handleImportFile],
  );

  return (
    <ManagerDashboardLayout
      title="Budget Produksi Per Blok"
      description="Kelola workflow budget blok: role operasional submit DRAFT, manager review/finalize."
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
              <CardDescription>Total Blok</CardDescription>
              <CardTitle>{stats.blockCount}</CardTitle>
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
                <CardTitle>Daftar Budget Produksi Blok</CardTitle>
                <CardDescription>Operasional input DRAFT, manager melakukan review/finalisasi workflow.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleImportInputChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate || blocksLoading}
                >
                  {isDownloadingTemplate ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Template XLSX
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => importInputRef.current?.click()}
                  disabled={isImporting || blockOptions.length === 0 || blocksLoading || isMutating}
                >
                  {isImporting ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {isImporting ? 'Importing...' : 'Import XLSX'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportXlsx}
                  disabled={isExporting || budgetsLoading || filteredBudgets.length === 0}
                >
                  {isExporting ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isExporting ? 'Exporting...' : 'Export Filter'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportAllXlsx}
                  disabled={isExporting || budgetsLoading || budgets.length === 0}
                >
                  {isExporting ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isExporting ? 'Exporting...' : 'Export Semua'}
                </Button>
                <Button onClick={openCreateForm} disabled={blockOptions.length === 0 || blocksLoading || isMutating}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Budget
                </Button>
              </div>
            </div>

            {(isFieldRole || isManagerRole) && (
              <div>
                <Badge variant="outline">
                  {isManagerRole
                    ? 'MANAGER dapat set DRAFT/REVIEW/APPROVED'
                    : 'ASISTEN/MANDOR hanya dapat input dan ubah DRAFT milik sendiri'}
                </Badge>
              </div>
            )}

            {isManagerRole && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Approval Queue Manager</p>
                    <p className="text-sm text-muted-foreground">
                      Fokuskan review ke item `REVIEW`, lalu selesaikan draft yang masih menunggu submit. Item yang belum punya pagu divisi akan ditandai langsung di tabel.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="destructive">Perlu Review: {managerApprovalStats.reviewCount}</Badge>
                    <Badge variant="outline">Draft: {managerApprovalStats.draftCount}</Badge>
                    <Badge variant="secondary">Approved: {managerApprovalStats.approvedCount}</Badge>
                    {managerApprovalStats.blockedActionableCount > 0 && (
                      <Badge variant="outline">Pagu Belum Diset: {managerApprovalStats.blockedActionableCount}</Badge>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setWorkflowFilter('REVIEW')}
                      disabled={managerApprovalStats.reviewCount === 0}
                    >
                      <ClipboardCheck className="mr-2 h-4 w-4" />
                      Buka Queue Review
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setWorkflowFilter('all')}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset Queue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Input
                placeholder="Cari blok, divisi, estate, workflow, catatan..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              <Select value={workflowFilter} onValueChange={(value) => setWorkflowFilter(value as 'all' | ManagerBudgetWorkflowStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter workflow" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Workflow</SelectItem>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                  <SelectItem value="REVIEW">REVIEW</SelectItem>
                  <SelectItem value="APPROVED">APPROVED</SelectItem>
                </SelectContent>
              </Select>

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

              <Select value={blockFilter} onValueChange={setBlockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter blok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Blok</SelectItem>
                  {blockOptions.map((block) => (
                    <SelectItem key={block.id} value={block.id}>
                      {formatBlockLabel(block)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input type="month" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {blocksError && (
              <p className="text-sm text-red-600">Gagal memuat daftar blok berdasarkan assignment manager.</p>
            )}

            {budgetsError && (
              <p className="text-sm text-red-600">Gagal memuat data budget blok dari database. Coba refresh halaman.</p>
            )}

            {importSummary && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>Ringkasan Import Budget Blok</CardTitle>
                  <CardDescription>Hasil proses import terakhir</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">Created: {importSummary.created}</Badge>
                    <Badge variant="secondary">Updated: {importSummary.updated}</Badge>
                    <Badge variant={importSummary.failed > 0 ? 'destructive' : 'secondary'}>
                      Failed: {importSummary.failed}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(importSummary.importedAt).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {importSummary.failedRows.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-red-600">Detail baris gagal</p>
                      <div className="space-y-1">
                        {importSummary.failedRows.slice(0, 10).map((detail) => (
                          <p key={`${detail.row}-${detail.record}`} className="text-sm text-muted-foreground">
                            Baris {detail.row} ({detail.record}): {detail.reason}
                          </p>
                        ))}
                        {importSummary.failedRows.length > 10 && (
                          <p className="text-sm text-muted-foreground">
                            Dan {importSummary.failedRows.length - 10} baris gagal lainnya.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!blocksError && !blocksLoading && blockOptions.length === 0 && (
              <p className="text-sm text-amber-600">
                Data blok tidak tersedia. Budget tidak bisa dibuat sebelum daftar blok tersedia.
              </p>
            )}

            {isFormOpen && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>{editingId ? 'Edit Budget Produksi Blok' : 'Tambah Budget Produksi Blok'}</CardTitle>
                  <CardDescription>Lengkapi data budget produksi per blok.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Pilih Blok</Label>
                      <Select value={formValues.blockId} onValueChange={handleBlockSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih blok dari data assignment" />
                        </SelectTrigger>
                        <SelectContent>
                          {blockOptions.map((block) => (
                            <SelectItem key={block.id} value={block.id}>
                              {formatBlockLabel(block)} ({block.divisionName} - {block.estateName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Periode</Label>
                        <Input
                          type="month"
                          value={formValues.period}
                          onChange={(event) => setFormValues((current) => ({ ...current, period: event.target.value }))}
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
                      <div className="space-y-2">
                        <Label>Workflow</Label>
                        {isManagerRole ? (
                          <Select
                            value={formValues.workflowStatus}
                            onValueChange={(value) =>
                              setFormValues((current) => ({
                                ...current,
                                workflowStatus: value as ManagerBudgetWorkflowStatus,
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
                        ) : (
                          <Input value="DRAFT" disabled readOnly />
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Budget Realisasi (IDR)</Label>
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
                          onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
                          placeholder="Catatan tambahan terkait budget blok"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="outline" onClick={resetForm} disabled={isMutating}>
                        Batal
                      </Button>
                      <Button type="submit" disabled={isMutating}>
                        {editingId ? 'Simpan Perubahan' : 'Simpan Budget'}
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
                    <TableHead>Blok</TableHead>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Estate</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Target (Ton)</TableHead>
                    <TableHead className="text-right">Rencana</TableHead>
                    <TableHead className="text-right">Realisasi</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Dibuat Oleh</TableHead>
                    <TableHead className="w-[120px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetsLoading && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-sm text-muted-foreground">
                        Memuat data budget blok...
                      </TableCell>
                    </TableRow>
                  )}

                  {!budgetsLoading && filteredBudgets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-sm text-muted-foreground">
                        Belum ada data budget blok untuk filter saat ini.
                      </TableCell>
                    </TableRow>
                  )}

                  {!budgetsLoading &&
                    filteredBudgets.map((item) => {
                      const variance = item.actualCost - item.plannedCost;
                      const canMutate = canMutateItem(item);
                      const isReviewItem = item.workflowStatus === 'REVIEW';
                      const isDraftItem = item.workflowStatus === 'DRAFT';
                      const isApprovedItem = item.workflowStatus === 'APPROVED';
                      const isApprovalBlocked =
                        isManagerRole && (isDraftItem || isReviewItem) && !hasDivisionBudgetForPeriod(item);
                      return (
                        <TableRow
                          key={item.id}
                          className={
                            isReviewItem
                              ? 'bg-amber-50/60'
                              : isDraftItem && isManagerRole
                                ? 'bg-blue-50/40'
                                : undefined
                          }
                        >
                          <TableCell className="font-medium">
                            {item.blockCode} - {item.blockName}
                          </TableCell>
                          <TableCell>{item.divisionName}</TableCell>
                          <TableCell>{item.estateName}</TableCell>
                          <TableCell>{formatPeriodLabel(item.period)}</TableCell>
                          <TableCell className="text-right">{item.targetTon.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(item.plannedCost)}</TableCell>
                          <TableCell className="text-right">{currencyFormatter.format(item.actualCost)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={variance > 0 ? 'destructive' : 'secondary'}>
                              {currencyFormatter.format(variance)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={workflowBadgeVariant(item.workflowStatus)}>{item.workflowStatus}</Badge>
                          </TableCell>
                          <TableCell>{item.createdBy}</TableCell>
                          <TableCell className="text-right">
                            {isManagerRole ? (
                              <div className="flex flex-col items-end gap-2">
                                {isApprovalBlocked && (
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge
                                      variant="outline"
                                      className="border-amber-300 bg-amber-50 text-amber-700"
                                    >
                                      Pagu divisi belum diset
                                    </Badge>
                                    <Link
                                      href="/budget-divisi"
                                      className="text-xs font-medium text-primary underline underline-offset-2"
                                    >
                                      Set di Budget Divisi
                                    </Link>
                                  </div>
                                )}
                                <div className="flex flex-wrap justify-end gap-1">
                                  {isDraftItem && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={isMutating || isApprovalBlocked}
                                      onClick={() => handleManagerWorkflowAction(item, 'REVIEW')}
                                    >
                                      <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                                      Review
                                    </Button>
                                  )}
                                  {isReviewItem && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={isMutating || isApprovalBlocked}
                                      onClick={() => handleManagerWorkflowAction(item, 'APPROVED')}
                                    >
                                      <Check className="mr-1 h-3.5 w-3.5" />
                                      Approve
                                    </Button>
                                  )}
                                  {!isDraftItem && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={isMutating}
                                      onClick={() => handleManagerWorkflowAction(item, isApprovedItem ? 'REVIEW' : 'DRAFT')}
                                    >
                                      {isApprovedItem ? 'Reopen' : 'Kembali Draft'}
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={isMutating}
                                    onClick={() => openEditForm(item)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={isMutating}
                                    onClick={() => handleDelete(item)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            ) : canMutate ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={isMutating}
                                  onClick={() => openEditForm(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={isMutating}
                                  onClick={() => handleDelete(item)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Read only</span>
                            )}
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
