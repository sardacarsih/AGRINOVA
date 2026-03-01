'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { gql } from 'graphql-tag';
import { useMutation, useQuery } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
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
import { Badge } from '@/components/ui/badge';
import { PageLoading } from '@/components/ui/page-loading';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

type BlockEditorMode = 'create' | 'edit';

interface CompanyAdminBlockEditorPageProps {
  mode: BlockEditorMode;
  blockId?: string;
}

interface CompanyNode {
  id: string;
  name: string;
}

interface EstateNode {
  id: string;
  name: string;
  companyId: string;
}

interface DivisionNode {
  id: string;
  name: string;
  code?: string | null;
  estateId: string;
}

interface LandTypeNode {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface TarifBlokNode {
  id: string;
  companyId: string;
  perlakuan: string;
  tarifCode?: string | null;
  schemeType?: string | null;
  landTypeId?: string | null;
  bjrMinKg?: number | null;
  bjrMaxKg?: number | null;
  basis?: number | null;
  tarifUpah?: number | null;
  premi?: number | null;
  tarifPremi1?: number | null;
  isActive: boolean;
  landType?: LandTypeNode | null;
}

interface BlockNode {
  id: string;
  blockCode: string;
  name: string;
  luasHa?: number | null;
  cropType?: string | null;
  plantingYear?: number | null;
  status: string;
  istm: string;
  landTypeId?: string | null;
  tarifBlokId?: string | null;
  tarifBlok?: TarifBlokNode | null;
  divisionId: string;
}

const GET_COMPANY_CONTEXT = gql`
  query GetCompanyContextForBlocksEditor {
    companies(page: 1, limit: 100) {
      data {
        id
        name
      }
    }
  }
`;

const GET_ESTATES = gql`
  query GetEstatesForBlockEditor {
    estates {
      id
      name
      companyId
    }
  }
`;

const GET_DIVISIONS = gql`
  query GetDivisionsForBlockEditor {
    divisions {
      id
      name
      code
      estateId
      estate {
        id
        name
        companyId
      }
    }
  }
`;

const GET_TARIF_BLOKS = gql`
  query GetTarifBloksForBlockEditor {
    tarifBloks {
      id
      companyId
      perlakuan
      tarifCode
      schemeType
      landTypeId
      bjrMinKg
      bjrMaxKg
      basis
      tarifUpah
      premi
      tarifPremi1
      landType {
        id
        code
        name
        isActive
      }
      isActive
    }
  }
`;

const GET_LAND_TYPES = gql`
  query GetLandTypesForBlockEditor {
    landTypes {
      id
      code
      name
      isActive
    }
  }
`;

const GET_BLOCK_BY_ID = gql`
  query GetBlockByIdForEditor($id: ID!) {
    block(id: $id) {
      id
      blockCode
      name
      luasHa
      cropType
      plantingYear
      status
      istm
      landTypeId
      tarifBlokId
      divisionId
      tarifBlok {
        id
        companyId
        perlakuan
        tarifCode
        schemeType
        landTypeId
        bjrMinKg
        bjrMaxKg
        basis
        tarifUpah
        premi
        tarifPremi1
        landType {
          id
          code
          name
          isActive
        }
        isActive
      }
    }
  }
`;

const CREATE_BLOCK = gql`
  mutation CreateBlockForCompanyAdminEditor($input: CreateBlockInput!) {
    createBlock(input: $input) {
      id
      perlakuan
      landTypeId
      tarifBlokId
      tarifBlok {
        id
        perlakuan
        tarifCode
        schemeType
        landTypeId
        landType {
          id
          code
          name
          isActive
        }
        isActive
      }
    }
  }
`;

const UPDATE_BLOCK = gql`
  mutation UpdateBlockForCompanyAdminEditor($input: UpdateBlockInput!) {
    updateBlock(input: $input) {
      id
      perlakuan
      landTypeId
      tarifBlokId
      tarifBlok {
        id
        perlakuan
        tarifCode
        schemeType
        landTypeId
        landType {
          id
          code
          name
          isActive
        }
        isActive
      }
    }
  }
`;

function schemeTypeLabel(schemeType?: string | null): string {
  if (!schemeType) return '-';
  const normalized = schemeType.trim();
  if (!normalized) return '-';
  return normalized.replace(/_/g, ' ').toUpperCase();
}

function resolveSchemeType(tarif?: TarifBlokNode | null): string | null {
  if (!tarif) return null;
  return tarif.schemeType || tarif.landType?.code || null;
}

function formatBJRRange(min?: number | null, max?: number | null): string {
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `>= ${min.toLocaleString('id-ID')} - < ${max.toLocaleString('id-ID')} Kg`;
  }
  if (min !== null && min !== undefined) {
    return `>= ${min.toLocaleString('id-ID')} Kg`;
  }
  if (max !== null && max !== undefined) {
    return `< ${max.toLocaleString('id-ID')} Kg`;
  }
  return '-';
}

function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return value.toLocaleString('id-ID');
}

function buildTarifOptionLabel(tarif: TarifBlokNode): string {
  const code = (tarif.tarifCode || '-').trim().toUpperCase();
  const scheme = schemeTypeLabel(resolveSchemeType(tarif));
  const range = formatBJRRange(tarif.bjrMinKg, tarif.bjrMaxKg);
  return `${code} | ${scheme} | ${range}`;
}

export default function CompanyAdminBlockEditorPage({
  mode,
  blockId,
}: CompanyAdminBlockEditorPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditMode = mode === 'edit';

  const [formBlockCode, setFormBlockCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDivisionId, setFormDivisionId] = useState('');
  const [formLuasHa, setFormLuasHa] = useState('');
  const [formCropType, setFormCropType] = useState('');
  const [formPlantingYear, setFormPlantingYear] = useState('');
  const [formStatus, setFormStatus] = useState<'INTI' | 'KKPA'>('INTI');
  const [formISTM, setFormISTM] = useState<'Y' | 'N'>('N');
  const [formLandTypeID, setFormLandTypeID] = useState('');
  const [formTarifBlokID, setFormTarifBlokID] = useState('');

  const {
    data: companyData,
    loading: loadingCompanies,
    error: companyError,
  } = useQuery<{ companies: { data: CompanyNode[] } }>(GET_COMPANY_CONTEXT);
  const {
    data: estateData,
    loading: loadingEstates,
    error: estateError,
  } = useQuery<{ estates: EstateNode[] }>(GET_ESTATES);
  const {
    data: divisionData,
    loading: loadingDivisions,
    error: divisionError,
  } = useQuery<{ divisions: DivisionNode[] }>(GET_DIVISIONS);
  const {
    data: tarifBlokData,
    loading: loadingTarifBloks,
    error: tarifBlokError,
  } = useQuery<{ tarifBloks: TarifBlokNode[] }>(GET_TARIF_BLOKS);
  const {
    data: landTypeData,
    loading: loadingLandTypes,
    error: landTypeError,
  } = useQuery<{ landTypes: LandTypeNode[] }>(GET_LAND_TYPES);
  const {
    data: blockDetailData,
    loading: loadingBlock,
    error: blockError,
  } = useQuery<{ block: BlockNode | null }>(GET_BLOCK_BY_ID, {
    variables: { id: blockId },
    skip: !isEditMode || !blockId,
  });

  const [createBlock, { loading: creating }] = useMutation(CREATE_BLOCK);
  const [updateBlock, { loading: updating }] = useMutation(UPDATE_BLOCK);

  const companies = companyData?.companies?.data || [];
  const companyIdFromUser =
    (user as any)?.companyId ||
    (user as any)?.company?.id ||
    (user as any)?.companies?.[0]?.id ||
    null;
  const currentCompanyId = companyIdFromUser || companies[0]?.id || null;

  const estates = useMemo(() => {
    const base = estateData?.estates || [];
    return currentCompanyId ? base.filter((estate) => estate.companyId === currentCompanyId) : base;
  }, [estateData?.estates, currentCompanyId]);

  const divisions = useMemo(() => {
    const base = divisionData?.divisions || [];
    const estateIDs = new Set(estates.map((estate) => estate.id));
    return base.filter((division) => estateIDs.has(division.estateId));
  }, [divisionData?.divisions, estates]);

  const tarifBloks = useMemo(() => {
    const base = tarifBlokData?.tarifBloks || [];
    const filtered = currentCompanyId
      ? base.filter((tarif) => tarif.companyId === currentCompanyId)
      : base;
    return filtered.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return Number(b.isActive) - Number(a.isActive);
      }
      const schemeOrder = (a.schemeType || '').localeCompare(b.schemeType || '');
      if (schemeOrder !== 0) return schemeOrder;
      return (a.tarifCode || '').localeCompare(b.tarifCode || '');
    });
  }, [tarifBlokData?.tarifBloks, currentCompanyId]);

  const landTypes = useMemo(() => landTypeData?.landTypes || [], [landTypeData?.landTypes]);

  const filteredTarifBloks = useMemo(() => {
    return tarifBloks.filter((tarif) => {
      if (formLandTypeID && tarif.landTypeId !== formLandTypeID) {
        return false;
      }
      return tarif.isActive || tarif.id === formTarifBlokID;
    });
  }, [formLandTypeID, formTarifBlokID, tarifBloks]);

  const selectedTarifBlok = useMemo(
    () => tarifBloks.find((item) => item.id === formTarifBlokID) || null,
    [formTarifBlokID, tarifBloks],
  );
  const selectedLandType = useMemo(
    () => landTypes.find((item) => item.id === formLandTypeID) || null,
    [formLandTypeID, landTypes],
  );

  const isSubmitting = creating || updating;
  const isLoadingReference =
    loadingCompanies ||
    loadingEstates ||
    loadingDivisions ||
    loadingLandTypes ||
    loadingTarifBloks ||
    (isEditMode && loadingBlock);
  const queryError = companyError || estateError || divisionError || landTypeError || tarifBlokError || blockError;

  useEffect(() => {
    if (!isEditMode) return;
    const block = blockDetailData?.block;
    if (!block) return;

    setFormBlockCode(block.blockCode || '');
    setFormName(block.name || '');
    setFormDivisionId(block.divisionId || '');
    setFormLuasHa(block.luasHa === null || block.luasHa === undefined ? '' : String(block.luasHa));
    setFormCropType(block.cropType || '');
    setFormPlantingYear(
      block.plantingYear === null || block.plantingYear === undefined ? '' : String(block.plantingYear),
    );
    setFormStatus(block.status === 'KKPA' ? 'KKPA' : 'INTI');
    setFormISTM(block.istm === 'Y' ? 'Y' : 'N');
    setFormLandTypeID(block.landTypeId || block.tarifBlok?.landTypeId || '');
    setFormTarifBlokID(block.tarifBlokId || block.tarifBlok?.id || '');
  }, [blockDetailData?.block, isEditMode]);

  function parseLuasHaInput(): number | undefined {
    if (!formLuasHa.trim()) return undefined;
    const num = Number(formLuasHa);
    if (Number.isNaN(num)) {
      throw new Error('Luas Ha harus berupa angka.');
    }
    return num;
  }

  function parsePlantingYearInput(): number | undefined {
    if (!formPlantingYear.trim()) return undefined;
    const num = Number(formPlantingYear);
    if (Number.isNaN(num)) {
      throw new Error('Tahun tanam harus berupa angka.');
    }
    return num;
  }

  function handleLandTypeSelection(value: string) {
    const nextLandTypeID = value === '__NONE__' ? '' : value;
    setFormLandTypeID(nextLandTypeID);

    if (!formTarifBlokID) return;
    const selectedTarif = tarifBloks.find((item) => item.id === formTarifBlokID);
    if (!selectedTarif) return;
    if (nextLandTypeID && selectedTarif.landTypeId !== nextLandTypeID) {
      setFormTarifBlokID('');
    }
  }

  function handleTarifSelection(value: string) {
    const nextTarifID = value === '__NONE__' ? '' : value;
    setFormTarifBlokID(nextTarifID);
    if (!nextTarifID) return;
    const selectedTarif = tarifBloks.find((item) => item.id === nextTarifID);
    if (selectedTarif?.landTypeId) {
      setFormLandTypeID(selectedTarif.landTypeId);
    }
  }

  async function handleSubmit() {
    if (!formName.trim()) {
      toast({
        title: 'Validation',
        description: 'Nama blok wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    if (!isEditMode && !formDivisionId) {
      toast({
        title: 'Validation',
        description: 'Divisi wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    if (isEditMode && !formBlockCode.trim()) {
      toast({
        title: 'Validation',
        description: 'Kode blok wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const luasHa = parseLuasHaInput();
      const plantingYear = parsePlantingYearInput();

      if (isEditMode) {
        if (!blockId) return;
        await updateBlock({
          variables: {
            input: {
              id: blockId,
              blockCode: formBlockCode.trim(),
              name: formName.trim(),
              luasHa: luasHa ?? null,
              cropType: formCropType.trim() || null,
              plantingYear: plantingYear ?? null,
              status: formStatus,
              istm: formISTM,
              landTypeId: formLandTypeID || null,
              tarifBlokId: formTarifBlokID || null,
            },
          },
        });
        toast({
          title: 'Block updated',
          description: 'Blok berhasil diperbarui.',
        });
      } else {
        await createBlock({
          variables: {
            input: {
              blockCode: '',
              name: formName.trim(),
              divisionId: formDivisionId,
              luasHa: luasHa ?? null,
              cropType: formCropType.trim() || null,
              plantingYear: plantingYear ?? null,
              status: formStatus,
              istm: formISTM,
              landTypeId: formLandTypeID || null,
              tarifBlokId: formTarifBlokID || null,
            },
          },
        });
        toast({
          title: 'Block created',
          description: 'Blok berhasil dibuat.',
        });
      }

      router.push('/blocks?tab=blocks');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Input tidak valid.';
      toast({
        title: isEditMode ? 'Update failed' : 'Create failed',
        description: message || 'Input tidak valid.',
        variant: 'destructive',
      });
    }
  }

  if (isLoadingReference) {
    return <PageLoading />;
  }

  if (queryError) {
    return (
      <CompanyAdminDashboardLayout
        title={isEditMode ? 'Edit Block' : 'Create Block'}
        description="Kelola data blok secara terpisah dari halaman daftar."
      >
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Gagal memuat data form blok: {queryError.message}
        </div>
      </CompanyAdminDashboardLayout>
    );
  }

  if (isEditMode && !blockDetailData?.block) {
    return (
      <CompanyAdminDashboardLayout
        title="Edit Block"
        description="Blok tidak ditemukan."
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Data blok tidak ditemukan atau sudah dihapus.</p>
          <Button variant="outline" onClick={() => router.push('/blocks?tab=blocks')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke daftar blok
          </Button>
        </div>
      </CompanyAdminDashboardLayout>
    );
  }

  return (
    <CompanyAdminDashboardLayout
      title={isEditMode ? 'Edit Block' : 'Create Block'}
      description="Kelola data blok pada halaman mandiri."
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="outline" size="sm" onClick={() => router.push('/blocks?tab=blocks')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke daftar blok
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Form Edit Blok' : 'Form Blok Baru'}</CardTitle>
            <CardDescription>
              {isEditMode
                ? 'Perbarui data blok dan aturan tarifnya.'
                : 'Kode blok akan dibuat otomatis berdasarkan divisi.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditMode && (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Kode blok dibuat otomatis saat simpan (format: kode divisi + nomor urut).
              </div>
            )}

            {isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="edit-block-code-page">Kode Blok</Label>
                <Input
                  id="edit-block-code-page"
                  value={formBlockCode}
                  onChange={(e) => setFormBlockCode(e.target.value)}
                  placeholder="Block code"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="block-name-page">Nama Blok</Label>
              <Input
                id="block-name-page"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Block name"
              />
            </div>

            {!isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="create-block-division-page">Divisi</Label>
                <Select value={formDivisionId} onValueChange={setFormDivisionId}>
                  <SelectTrigger id="create-block-division-page">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="block-luas-page">Luas (Ha)</Label>
              <Input
                id="block-luas-page"
                value={formLuasHa}
                onChange={(e) => setFormLuasHa(e.target.value)}
                placeholder="Luas Ha (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-planting-year-page">Tahun Tanam</Label>
              <Input
                id="block-planting-year-page"
                value={formPlantingYear}
                onChange={(e) => setFormPlantingYear(e.target.value)}
                placeholder="Planting year (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-crop-type-page">Jenis Tanaman</Label>
              <Input
                id="block-crop-type-page"
                value={formCropType}
                onChange={(e) => setFormCropType(e.target.value)}
                placeholder="Crop type (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-status-page">Status</Label>
              <Select
                value={formStatus}
                onValueChange={(value) => setFormStatus(value as 'INTI' | 'KKPA')}
              >
                <SelectTrigger id="block-status-page">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTI">INTI</SelectItem>
                  <SelectItem value="KKPA">KKPA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-istm-page">ISTM</Label>
              <Select
                value={formISTM}
                onValueChange={(value) => setFormISTM(value as 'Y' | 'N')}
              >
                <SelectTrigger id="block-istm-page">
                  <SelectValue placeholder="ISTM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Y">Y</SelectItem>
                  <SelectItem value="N">N</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              Pilih tipe lahan terlebih dulu lalu pilih rule tarif. Perlakuan blok mengikuti rule tarif.
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-land-type-page">Tipe Lahan</Label>
              <Select
                value={formLandTypeID || '__NONE__'}
                onValueChange={handleLandTypeSelection}
                disabled={loadingLandTypes}
              >
                <SelectTrigger id="block-land-type-page">
                  <SelectValue placeholder="Tipe Lahan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">- Pilih Tipe Lahan -</SelectItem>
                  {landTypes.map((landType) => (
                    <SelectItem key={landType.id} value={landType.id}>
                      {landType.code} - {landType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="block-tarif-rule-page">Rule Tarif</Label>
              <Select
                value={formTarifBlokID || '__NONE__'}
                onValueChange={handleTarifSelection}
                disabled={loadingTarifBloks}
              >
                <SelectTrigger id="block-tarif-rule-page">
                  <SelectValue placeholder="Rule Tarif (Master Tarif Blok)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">- Pilih Rule Tarif -</SelectItem>
                  {filteredTarifBloks.map((tarif) => (
                    <SelectItem key={tarif.id} value={tarif.id}>
                      {buildTarifOptionLabel(tarif)}
                      {!tarif.isActive ? ' (INACTIVE)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!loadingTarifBloks && formLandTypeID && filteredTarifBloks.length === 0 && (
              <p className="text-xs text-destructive">
                Belum ada rule tarif untuk tipe lahan {selectedLandType?.code || '-'}.
              </p>
            )}

            {selectedTarifBlok && (
              <div className="rounded-md border bg-background p-3 text-xs">
                <p className="mb-2 font-medium text-foreground">Detail Rule Tarif Terpilih</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                  <span>Kode BJR</span>
                  <span className="text-foreground">{(selectedTarifBlok.tarifCode || '-').toUpperCase()}</span>
                  <span>Scheme</span>
                  <span className="text-foreground">{schemeTypeLabel(resolveSchemeType(selectedTarifBlok))}</span>
                  <span>Range BJR</span>
                  <span className="text-foreground">{formatBJRRange(selectedTarifBlok.bjrMinKg, selectedTarifBlok.bjrMaxKg)}</span>
                  <span>Basis</span>
                  <span className="text-foreground">{formatNumber(selectedTarifBlok.basis)}</span>
                  <span>Tarif Upah</span>
                  <span className="text-foreground">{formatNumber(selectedTarifBlok.tarifUpah)}</span>
                  <span>Premi</span>
                  <span className="text-foreground">{formatNumber(selectedTarifBlok.premi)}</span>
                  <span>Tarif Premi 1</span>
                  <span className="text-foreground">{formatNumber(selectedTarifBlok.tarifPremi1)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">
                Setelah simpan, Anda akan kembali ke daftar blok.
              </div>
              <Badge variant="secondary">{isEditMode ? 'EDIT MODE' : 'NEW MODE'}</Badge>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => router.push('/blocks?tab=blocks')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyAdminDashboardLayout>
  );
}
