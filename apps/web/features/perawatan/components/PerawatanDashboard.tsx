'use client';

import React from 'react';
import {
  FlaskConical,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  PerawatanMaterialCategory,
  PerawatanMaterialUnit,
  useCreatePerawatanMaterialUsageMutation,
  useDeletePerawatanMaterialUsageMutation,
  useGetPerawatanMaterialUsageRecordsByRecordQuery,
  useGetPerawatanMaterialUsageRecordsQuery,
  useGetPerawatanRecordsQuery,
  useUpdatePerawatanMaterialUsageMutation,
} from '@/gql/graphql';
import { MandorDashboardLayout } from '@/components/layouts/role-layouts/MandorDashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

type MaterialFormState = {
  materialCategory: PerawatanMaterialCategory;
  materialName: string;
  quantity: string;
  unit: PerawatanMaterialUnit;
  unitPrice: string;
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const createDefaultFormState = (): MaterialFormState => ({
  materialCategory: PerawatanMaterialCategory.Pupuk,
  materialName: '',
  quantity: '',
  unit: PerawatanMaterialUnit.Kg,
  unitPrice: '',
});

const formatDate = (value?: string | Date | null) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return dateFormatter.format(date);
};

const getCategoryLabel = (value: PerawatanMaterialCategory) =>
  value === PerawatanMaterialCategory.Pupuk ? 'Pupuk' : 'Herbisida';

const getUnitLabel = (value: PerawatanMaterialUnit) =>
  value === PerawatanMaterialUnit.Kg ? 'Kg' : 'Liter';

export function PerawatanDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedRecordId, setSelectedRecordId] = React.useState('');
  const [editingUsageId, setEditingUsageId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<MaterialFormState>(
    createDefaultFormState()
  );
  const [isSelectingRecord, startRecordTransition] = React.useTransition();

  const {
    data: recordsData,
    loading: recordsLoading,
    error: recordsError,
    refetch: refetchRecords,
  } = useGetPerawatanRecordsQuery({
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: summaryData,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetPerawatanMaterialUsageRecordsQuery({
    fetchPolicy: 'cache-and-network',
  });

  const deferredRecordId = React.useDeferredValue(selectedRecordId);
  const byRecordQuery = useGetPerawatanMaterialUsageRecordsByRecordQuery(
    deferredRecordId
      ? {
          variables: { perawatanRecordId: deferredRecordId },
          fetchPolicy: 'cache-and-network',
        }
      : { skip: true }
  );

  const [createMaterialUsage, createState] = useCreatePerawatanMaterialUsageMutation();
  const [updateMaterialUsage, updateState] = useUpdatePerawatanMaterialUsageMutation();
  const [deleteMaterialUsage, deleteState] = useDeletePerawatanMaterialUsageMutation();

  const records = recordsData?.perawatanRecords ?? [];
  const summary = summaryData?.perawatanMaterialUsageRecords ?? [];
  const byRecord = byRecordQuery.data?.perawatanMaterialUsageRecordsByRecord ?? [];
  const selectedRecord = records.find((record) => record.id === selectedRecordId) ?? null;

  React.useEffect(() => {
    if (records.length === 0) {
      if (selectedRecordId) {
        setSelectedRecordId('');
      }
      return;
    }

    if (!records.some((record) => record.id === selectedRecordId)) {
      const firstRecord = records[0];
      if (firstRecord) {
        setSelectedRecordId(firstRecord.id);
      }
    }
  }, [records, selectedRecordId]);

  const resetForm = () => {
    setEditingUsageId(null);
    setFormState(createDefaultFormState());
  };

  const refetchAll = async () => {
    const tasks: Array<Promise<unknown>> = [refetchRecords(), refetchSummary()];

    if (selectedRecordId) {
      tasks.push(byRecordQuery.refetch({ perawatanRecordId: selectedRecordId }));
    }

    await Promise.all(tasks);
  };

  const handleRecordSelection = (recordId: string) => {
    startRecordTransition(() => {
      setSelectedRecordId(recordId);
      resetForm();
    });
  };

  const handleEdit = (usage: (typeof byRecord)[number]) => {
    setEditingUsageId(usage.id);
    setFormState({
      materialCategory: usage.materialCategory,
      materialName: usage.materialName,
      quantity: usage.quantity.toString(),
      unit: usage.unit,
      unitPrice: usage.unitPrice.toString(),
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRecordId) {
      toast({
        title: 'Pilih record dahulu',
        description: 'Material usage harus terhubung ke satu record perawatan.',
        variant: 'destructive',
      });
      return;
    }

    const materialName = formState.materialName.trim();
    const quantity = Number(formState.quantity);
    const unitPrice = Number(formState.unitPrice);

    if (!materialName || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      toast({
        title: 'Input material belum valid',
        description: 'Pastikan nama terisi, kuantitas > 0, dan harga tidak negatif.',
        variant: 'destructive',
      });
      return;
    }

    const input = {
      perawatanRecordId: selectedRecordId,
      materialCategory: formState.materialCategory,
      materialName,
      quantity,
      unit: formState.unit,
      unitPrice,
    };
    const currentEditingId = editingUsageId;

    try {
      if (currentEditingId) {
        await updateMaterialUsage({
          variables: {
            input: {
              id: currentEditingId,
              ...input,
            },
          },
        });
      } else {
        await createMaterialUsage({
          variables: { input },
        });
      }

      resetForm();
      await refetchAll();

      toast({
        title: currentEditingId ? 'Material diperbarui' : 'Material ditambahkan',
        description: materialName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Permintaan gagal diproses.';
      toast({
        title: 'Gagal menyimpan material',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (usageId: string, materialName: string) => {
    if (!window.confirm(`Hapus material ${materialName}?`)) {
      return;
    }

    try {
      await deleteMaterialUsage({
        variables: { id: usageId },
      });

      if (editingUsageId === usageId) {
        resetForm();
      }

      await refetchAll();

      toast({
        title: 'Material dihapus',
        description: materialName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Permintaan gagal diproses.';
      toast({
        title: 'Gagal menghapus material',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const totalArea = records.reduce((sum, record) => sum + record.luasArea, 0);
  const totalCost = summary.reduce((sum, item) => sum + item.totalCost, 0);
  const activeRecords = records.filter((record) => String(record.status) !== 'COMPLETED').length;
  const isMutating = createState.loading || updateState.loading || deleteState.loading;
  const pageError = recordsError || summaryError || byRecordQuery.error;
  const pageLoading =
    authLoading ||
    (recordsLoading && records.length === 0) ||
    (summaryLoading && summary.length === 0);

  return (
    <MandorDashboardLayout
      title="Perawatan Lapangan"
      description="Dashboard khusus mandor perawatan untuk record dan material usage."
      breadcrumbItems={[{ label: 'Perawatan' }]}
      maxWidthClass="max-w-7xl"
      contentPaddingClass="px-3 py-4 sm:px-4 lg:px-6"
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void refetchAll();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Muat Ulang
        </Button>
      }
    >
      {user?.effectiveMandorType !== 'PERAWATAN' ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardHeader>
            <CardTitle>Akses khusus mandor perawatan</CardTitle>
            <CardDescription>
              Halaman ini hanya untuk user MANDOR dengan subtype PERAWATAN.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-emerald-200 bg-emerald-50/70">
              <CardHeader className="pb-3">
                <CardDescription>Record</CardDescription>
                <CardTitle className="text-3xl">{records.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-emerald-900/80">
                {activeRecords} record aktif dalam assignment saat ini.
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/70">
              <CardHeader className="pb-3">
                <CardDescription>Total Luas</CardDescription>
                <CardTitle className="text-3xl">{numberFormatter.format(totalArea)} ha</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-amber-200 bg-amber-50/70">
              <CardHeader className="pb-3">
                <CardDescription>Material Usage</CardDescription>
                <CardTitle className="text-3xl">{summary.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-3">
                <CardDescription>Total Biaya</CardDescription>
                <CardTitle className="text-2xl">{currencyFormatter.format(totalCost)}</CardTitle>
              </CardHeader>
            </Card>
          </section>

          {pageError ? (
            <Card className="border-red-200 bg-red-50/70">
              <CardHeader>
                <CardTitle>Gagal memuat data perawatan</CardTitle>
                <CardDescription>{pageError.message}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1fr_1.35fr]">
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Daftar Record</CardTitle>
                    <CardDescription>
                      Pilih record untuk membuka material usage per transaksi.
                    </CardDescription>
                  </div>
                  {isSelectingRecord || pageLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {records.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-muted-foreground">
                    Belum ada record perawatan.
                  </div>
                ) : (
                  records.map((record) => {
                    const isActive = record.id === selectedRecordId;

                    return (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => {
                          handleRecordSelection(record.id);
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isActive
                            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {record.block.blockCode} - {record.block.name}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {record.jenisPerawatan} pada {formatDate(record.tanggalPerawatan)}
                            </p>
                          </div>
                          <Badge variant={isActive ? 'default' : 'outline'}>
                            {String(record.status)}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{numberFormatter.format(record.luasArea)} ha</span>
                          <span>{record.pekerja.name}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Material per Record</CardTitle>
                  <CardDescription>
                    {selectedRecord
                      ? `${selectedRecord.block.blockCode} - ${selectedRecord.block.name}`
                      : 'Pilih record dari panel kiri.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {selectedRecord ? (
                    <>
                      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Jenis</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {selectedRecord.jenisPerawatan}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tanggal</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {formatDate(selectedRecord.tanggalPerawatan)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {String(selectedRecord.status)}
                          </p>
                        </div>
                      </div>

                      <form className="space-y-4 rounded-2xl border border-slate-200 p-4" onSubmit={handleSubmit}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {editingUsageId ? 'Edit Material' : 'Tambah Material'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Semua create, update, dan delete sudah memakai API generik baru.
                            </p>
                          </div>
                          {editingUsageId ? (
                            <Button type="button" variant="ghost" onClick={resetForm}>
                              Batal
                            </Button>
                          ) : null}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="material-category">Kategori</Label>
                            <Select
                              value={formState.materialCategory}
                              onValueChange={(value) => {
                                setFormState((current) => ({
                                  ...current,
                                  materialCategory: value as PerawatanMaterialCategory,
                                }));
                              }}
                            >
                              <SelectTrigger id="material-category">
                                <SelectValue placeholder="Pilih kategori" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={PerawatanMaterialCategory.Pupuk}>Pupuk</SelectItem>
                                <SelectItem value={PerawatanMaterialCategory.Herbisida}>Herbisida</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="material-name">Nama Material</Label>
                            <Input
                              id="material-name"
                              value={formState.materialName}
                              onChange={(event) => {
                                setFormState((current) => ({
                                  ...current,
                                  materialName: event.target.value,
                                }));
                              }}
                              placeholder="Contoh: Urea"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="material-quantity">Kuantitas</Label>
                            <Input
                              id="material-quantity"
                              inputMode="decimal"
                              value={formState.quantity}
                              onChange={(event) => {
                                setFormState((current) => ({
                                  ...current,
                                  quantity: event.target.value,
                                }));
                              }}
                              placeholder="0.0"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="material-unit">Satuan</Label>
                            <Select
                              value={formState.unit}
                              onValueChange={(value) => {
                                setFormState((current) => ({
                                  ...current,
                                  unit: value as PerawatanMaterialUnit,
                                }));
                              }}
                            >
                              <SelectTrigger id="material-unit">
                                <SelectValue placeholder="Pilih satuan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={PerawatanMaterialUnit.Kg}>Kg</SelectItem>
                                <SelectItem value={PerawatanMaterialUnit.Liter}>Liter</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="material-unit-price">Harga Satuan</Label>
                            <Input
                              id="material-unit-price"
                              inputMode="decimal"
                              value={formState.unitPrice}
                              onChange={(event) => {
                                setFormState((current) => ({
                                  ...current,
                                  unitPrice: event.target.value,
                                }));
                              }}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button type="submit" disabled={isMutating}>
                            {isMutating ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <FlaskConical className="mr-2 h-4 w-4" />
                            )}
                            {editingUsageId ? 'Simpan Perubahan' : 'Tambah Material'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              void refetchAll();
                            }}
                          >
                            Sinkronkan
                          </Button>
                        </div>
                      </form>

                      <div className="space-y-3">
                        {byRecord.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-muted-foreground">
                            Belum ada material usage untuk record ini.
                          </div>
                        ) : (
                          byRecord.map((usage) => (
                            <div
                              key={usage.id}
                              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {usage.materialName}
                                    </p>
                                    <Badge variant="outline">
                                      {getCategoryLabel(usage.materialCategory)}
                                    </Badge>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    <span>
                                      {numberFormatter.format(usage.quantity)} {getUnitLabel(usage.unit)}
                                    </span>
                                    <span>{currencyFormatter.format(usage.unitPrice)} / unit</span>
                                    <span>{formatDate(usage.createdAt)}</span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {currencyFormatter.format(usage.totalCost)}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      handleEdit(usage);
                                    }}
                                  >
                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                    Edit
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      void handleDelete(usage.id, usage.materialName);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Hapus
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-muted-foreground">
                      Pilih satu record untuk menampilkan material usage.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Snapshot Material Terbaru</CardTitle>
                  <CardDescription>Ringkasan lintas record untuk audit cepat.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {summary.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-muted-foreground">
                      Belum ada material usage.
                    </div>
                  ) : (
                    summary.slice(0, 5).map((usage) => (
                      <div
                        key={usage.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{usage.materialName}</p>
                          <p className="text-xs text-muted-foreground">
                            {usage.perawatanRecord.block.blockCode} - {getCategoryLabel(usage.materialCategory)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {currencyFormatter.format(usage.totalCost)}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      )}
    </MandorDashboardLayout>
  );
}
