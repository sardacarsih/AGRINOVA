'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { gql } from 'graphql-tag';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { CalendarDays, CircleDollarSign, Download, FileText, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

interface UserCompanyRef {
  id?: string | null;
  name?: string | null;
}

interface AuthUserLike {
  companyId?: string | null;
  company?: UserCompanyRef | string | null;
  companies?: Array<UserCompanyRef | null> | null;
  assignedCompanies?: string[] | null;
  assignedCompanyNames?: string[] | null;
}

interface CompanyAdminTarifBlokPageProps {
  user?: AuthUserLike | null;
  locale?: string;
  withLayout?: boolean;
}

interface CompanyNode {
  id: string;
  name: string;
}

type TarifSubTab = 'schemes' | 'rules' | 'overrides';
type TableDensity = 'comfortable' | 'compact';

const SUB_TAB_ORDER: TarifSubTab[] = ['schemes', 'rules', 'overrides'];

interface TarifSchemeGroup {
  key: string;
  schemeType: string | null;
  landTypeId: string | null;
  landTypeLabel: string;
  totalRules: number;
  activeRules: number;
  holidayOverrides: number;
  lebaranOverrides: number;
  codePreview: string;
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
  keterangan?: string | null;
  landTypeId?: string | null;
  landType?: LandTypeNode | null;
  tarifCode?: string | null;
  schemeType?: string | null;
  bjrMinKg?: number | null;
  bjrMaxKg?: number | null;
  targetLebihKg?: number | null;
  sortOrder?: number | null;
  basis?: number | null;
  tarifUpah?: number | null;
  premi?: number | null;
  tarifPremi1?: number | null;
  tarifPremi2?: number | null;
  tarifLibur?: number | null;
  tarifLebaran?: number | null;
  isActive: boolean;
}

type TariffOverrideType = 'NORMAL' | 'HOLIDAY' | 'LEBARAN';

interface TariffRuleOverrideNode {
  id: string;
  ruleId: string;
  overrideType: TariffOverrideType;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  tarifUpah?: number | null;
  premi?: number | null;
  tarifPremi1?: number | null;
  tarifPremi2?: number | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PostCreateOverrideCandidate {
  id: string;
  tarifCode?: string | null;
  perlakuan?: string | null;
}

interface BlockPrintNode {
  id: string;
  blockCode: string;
  name: string;
  luasHa?: number | null;
  plantingYear?: number | null;
  status: string;
  istm: string;
  tarifBlokId?: string | null;
  division?: {
    id: string;
    name: string;
    estate?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface BlockPrintPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface BlocksPaginatedPrintPayload {
  data: BlockPrintNode[];
  pagination: BlockPrintPagination;
}

type ZipCell = {
  type: 'string' | 'number';
  value: string | number;
};

type ZipcelxConfig = {
  filename: string;
  sheet: {
    data: ZipCell[][];
  };
};

type ZipcelxFn = (config: ZipcelxConfig) => Promise<void>;

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
      keterangan
      landTypeId
      landType {
        id
        code
        name
        isActive
      }
      tarifCode
      schemeType
      bjrMinKg
      bjrMaxKg
      targetLebihKg
      sortOrder
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

const GET_LAND_TYPES = gql`
  query GetLandTypesForTarifBlok {
    landTypes {
      id
      code
      name
      isActive
    }
  }
`;

const GET_TARIFF_RULE_OVERRIDES = gql`
  query GetTariffRuleOverridesForCompanyAdmin {
    tariffRuleOverrides {
      id
      ruleId
      overrideType
      effectiveFrom
      effectiveTo
      tarifUpah
      premi
      tarifPremi1
      tarifPremi2
      notes
      isActive
      createdAt
      updatedAt
    }
  }
`;

const GET_BLOCKS_PAGINATED_FOR_TARIF_PRINT = gql`
  query GetBlocksPaginatedForTarifPrint($companyId: ID, $page: Int, $limit: Int) {
    blocksPaginated(companyId: $companyId, page: $page, limit: $limit) {
      data {
        id
        blockCode
        name
        luasHa
        plantingYear
        status
        istm
        tarifBlokId
        division {
          id
          name
          estate {
            id
            name
          }
        }
      }
      pagination {
        page
        limit
        total
        pages
      }
    }
  }
`;

const CREATE_TARIF_BLOK = gql`
  mutation CreateTarifBlokForCompanyAdmin($input: CreateTarifBlokInput!) {
    createTarifBlok(input: $input) {
      id
      companyId
      perlakuan
      keterangan
      landTypeId
      landType {
        id
        code
        name
        isActive
      }
      tarifCode
      schemeType
      bjrMinKg
      bjrMaxKg
      targetLebihKg
      sortOrder
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
      keterangan
      landTypeId
      landType {
        id
        code
        name
        isActive
      }
      tarifCode
      schemeType
      bjrMinKg
      bjrMaxKg
      targetLebihKg
      sortOrder
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

const CREATE_TARIFF_RULE_OVERRIDE = gql`
  mutation CreateTariffRuleOverrideForCompanyAdmin($input: CreateTariffRuleOverrideInput!) {
    createTariffRuleOverride(input: $input) {
      id
      ruleId
      overrideType
      effectiveFrom
      effectiveTo
      tarifUpah
      premi
      tarifPremi1
      tarifPremi2
      notes
      isActive
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_TARIFF_RULE_OVERRIDE = gql`
  mutation UpdateTariffRuleOverrideForCompanyAdmin($input: UpdateTariffRuleOverrideInput!) {
    updateTariffRuleOverride(input: $input) {
      id
      ruleId
      overrideType
      effectiveFrom
      effectiveTo
      tarifUpah
      premi
      tarifPremi1
      tarifPremi2
      notes
      isActive
      createdAt
      updatedAt
    }
  }
`;

const DELETE_TARIFF_RULE_OVERRIDE = gql`
  mutation DeleteTariffRuleOverrideForCompanyAdmin($id: ID!) {
    deleteTariffRuleOverride(id: $id)
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

function schemeTypeLabel(schemeType?: string | null): string {
  if (!schemeType) return '-';
  const normalized = schemeType.trim();
  if (!normalized) return '-';
  return normalized.replace(/_/g, ' ').toUpperCase();
}

function buildPerlakuanLabel(tarifCode?: string | null, schemeType?: string | null): string {
  const code = (tarifCode || '').trim().toUpperCase();
  const scheme = schemeTypeLabel(schemeType);
  if (!code || scheme === '-') return '';
  return `${code} - ${scheme}`;
}

function resolveSchemeType(tarif: TarifBlokNode): string | null {
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function overrideTypeLabel(type: TariffOverrideType): string {
  if (type === 'NORMAL') return 'Normal';
  if (type === 'HOLIDAY') return 'Holiday';
  if (type === 'LEBARAN') return 'Lebaran';
  return type;
}

function formatDateLabel(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID');
}

function formatOverridePeriod(from?: string | null, to?: string | null): string {
  if (!from && !to) return 'Global';
  if (from && to) return `${formatDateLabel(from)} - ${formatDateLabel(to)}`;
  if (from) return `>= ${formatDateLabel(from)}`;
  return `<= ${formatDateLabel(to)}`;
}

function normalizeDateInput(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeFileNamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeText(value?: string | null): string {
  return String(value || '').trim();
}

type CompanyScopeOption = {
  id: string;
  name: string;
};

function buildCompanyScopeOptions(
  user: AuthUserLike | null | undefined,
  companies: CompanyNode[],
): CompanyScopeOption[] {
  const options = new Map<string, CompanyScopeOption>();

  const addOption = (idRaw?: string | null, nameRaw?: string | null) => {
    const id = normalizeText(idRaw);
    if (!id) return;

    const name = normalizeText(nameRaw) || id;
    const existing = options.get(id);
    if (!existing) {
      options.set(id, { id, name });
      return;
    }

    if ((existing.name === existing.id || !existing.name) && name !== id) {
      options.set(id, { id, name });
    }
  };

  const userCompany = user?.company;
  if (typeof userCompany === 'string') {
    addOption(user?.companyId || userCompany, userCompany);
  } else {
    addOption(user?.companyId || userCompany?.id, userCompany?.name);
  }

  (user?.companies || []).forEach((company) => {
    addOption(company?.id, company?.name);
  });

  const assignedCompanyIDs = Array.isArray(user?.assignedCompanies) ? user.assignedCompanies : [];
  const assignedCompanyNames = Array.isArray(user?.assignedCompanyNames) ? user.assignedCompanyNames : [];
  assignedCompanyIDs.forEach((companyID, index) => {
    addOption(companyID, assignedCompanyNames[index]);
  });

  if (options.size > 0) {
    companies.forEach((company) => {
      if (options.has(company.id)) {
        addOption(company.id, company.name);
      }
    });
  } else {
    companies.forEach((company) => addOption(company.id, company.name));
  }

  return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

function makeZipCell(value: unknown): ZipCell {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { type: 'number', value };
  }
  return { type: 'string', value: String(value ?? '') };
}

async function downloadTarifBlocksXlsx(
  fileName: string,
  tarif: TarifBlokNode,
  relatedBlocks: BlockPrintNode[],
) {
  const tarifCode = tarif.tarifCode || '-';
  const scheme = schemeTypeLabel(resolveSchemeType(tarif));
  const landType = tarif.landType ? `${tarif.landType.code} - ${tarif.landType.name}` : '-';
  const activeStatus = tarif.isActive ? 'ACTIVE' : 'INACTIVE';
  const generatedAt = new Date().toISOString();

  const headerSection: ZipCell[][] = [
    [makeZipCell('LIST_BLOK_TARIF')],
    [makeZipCell('Tarif Code'), makeZipCell(tarifCode)],
    [makeZipCell('Perlakuan'), makeZipCell(tarif.perlakuan)],
    [makeZipCell('Skema'), makeZipCell(scheme)],
    [makeZipCell('Tipe Lahan'), makeZipCell(landType)],
    [makeZipCell('Status Aktif Rule'), makeZipCell(activeStatus)],
    [makeZipCell('Basis'), makeZipCell(tarif.basis ?? '-')],
    [makeZipCell('Tarif Upah'), makeZipCell(tarif.tarifUpah ?? '-')],
    [makeZipCell('Premi'), makeZipCell(tarif.premi ?? '-')],
    [makeZipCell('Total Blok'), makeZipCell(relatedBlocks.length)],
    [makeZipCell('Generated At'), makeZipCell(generatedAt)],
    [makeZipCell('')],
  ];

  const tableHeader: ZipCell[] = [
    makeZipCell('No'),
    makeZipCell('Tarif Code'),
    makeZipCell('Perlakuan'),
    makeZipCell('Skema'),
    makeZipCell('Tipe Lahan'),
    makeZipCell('Status Aktif Rule'),
    makeZipCell('Basis'),
    makeZipCell('Tarif Upah'),
    makeZipCell('Premi'),
    makeZipCell('Kode Blok'),
    makeZipCell('Nama Blok'),
    makeZipCell('Estate'),
    makeZipCell('Divisi'),
    makeZipCell('Luas Ha'),
    makeZipCell('Tahun Tanam'),
    makeZipCell('Status'),
    makeZipCell('ISTM'),
  ];

  const bodyRows: ZipCell[][] = relatedBlocks.map((block, index) => [
    makeZipCell(index + 1),
    makeZipCell(tarifCode),
    makeZipCell(tarif.perlakuan),
    makeZipCell(scheme),
    makeZipCell(landType),
    makeZipCell(activeStatus),
    makeZipCell(tarif.basis ?? ''),
    makeZipCell(tarif.tarifUpah ?? ''),
    makeZipCell(tarif.premi ?? ''),
    makeZipCell(block.blockCode || '-'),
    makeZipCell(block.name || '-'),
    makeZipCell(block.division?.estate?.name || '-'),
    makeZipCell(block.division?.name || '-'),
    makeZipCell(block.luasHa ?? ''),
    makeZipCell(block.plantingYear ?? ''),
    makeZipCell(block.status || '-'),
    makeZipCell(block.istm || '-'),
  ]);

  const zipcelxModule = await import('zipcelx');
  const zipcelx = ((zipcelxModule as unknown as { default?: ZipcelxFn }).default || zipcelxModule) as ZipcelxFn;
  const normalizedName = fileName.toLowerCase().endsWith('.xlsx')
    ? fileName.slice(0, -5)
    : fileName;

  await zipcelx({
    filename: normalizedName || 'export_tarif_blok',
    sheet: {
      data: [...headerSection, tableHeader, ...bodyRows],
    },
  });
}

export default function CompanyAdminTarifBlokPage({ user, withLayout = true }: CompanyAdminTarifBlokPageProps) {
  const { toast } = useToast();
  const apolloClient = useApolloClient();

  const [search, setSearch] = useState('');
  const [schemeFilter, setSchemeFilter] = useState<'ALL' | string>('ALL');
  const [landTypeFilter, setLandTypeFilter] = useState<'ALL' | string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<TarifSubTab>('schemes');
  const [tableDensity, setTableDensity] = useState<TableDensity>('comfortable');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTarifBlok, setEditingTarifBlok] = useState<TarifBlokNode | null>(null);
  const [deletingTarifBlok, setDeletingTarifBlok] = useState<TarifBlokNode | null>(null);
  const [postCreateOverrideCandidate, setPostCreateOverrideCandidate] = useState<PostCreateOverrideCandidate | null>(null);
  const [isOverrideCreateOpen, setIsOverrideCreateOpen] = useState(false);
  const [editingOverride, setEditingOverride] = useState<TariffRuleOverrideNode | null>(null);
  const [deletingOverride, setDeletingOverride] = useState<TariffRuleOverrideNode | null>(null);
  const [exportingTarifId, setExportingTarifId] = useState<string | null>(null);

  const [formLandTypeId, setFormLandTypeId] = useState('');
  const [formTarifCode, setFormTarifCode] = useState('');
  const [formSchemeType, setFormSchemeType] = useState('');
  const [formBJRMinKg, setFormBJRMinKg] = useState('');
  const [formBJRMaxKg, setFormBJRMaxKg] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formBasis, setFormBasis] = useState('');
  const [formTarifUpah, setFormTarifUpah] = useState('');
  const [formPremi, setFormPremi] = useState('');
  const [formTarifPremi1, setFormTarifPremi1] = useState('');
  const [formTarifPremi2, setFormTarifPremi2] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [overrideRuleId, setOverrideRuleId] = useState('');
  const [overrideType, setOverrideType] = useState<TariffOverrideType>('HOLIDAY');
  const [overrideEffectiveFrom, setOverrideEffectiveFrom] = useState('');
  const [overrideEffectiveTo, setOverrideEffectiveTo] = useState('');
  const [overrideTarifUpah, setOverrideTarifUpah] = useState('');
  const [overridePremi, setOverridePremi] = useState('');
  const [overrideTarifPremi1, setOverrideTarifPremi1] = useState('');
  const [overrideTarifPremi2, setOverrideTarifPremi2] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const {
    data: companyData,
    loading: loadingCompanies,
    error: companyError,
    refetch: refetchCompanies,
  } = useQuery<{ companies: { data: CompanyNode[] } }>(GET_COMPANY_CONTEXT);

  const {
    data: tarifBlokData,
    loading: loadingTarifBloks,
    error: tarifBlokError,
    refetch: refetchTarifBloks,
  } = useQuery<{ tarifBloks: TarifBlokNode[] }>(GET_TARIF_BLOKS, {
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
  });
  const {
    data: landTypeData,
    loading: loadingLandTypes,
    error: landTypeError,
  } = useQuery<{ landTypes: LandTypeNode[] }>(GET_LAND_TYPES);
  const {
    data: tariffOverrideData,
    loading: loadingOverrides,
    error: overrideError,
    refetch: refetchOverrides,
  } = useQuery<{ tariffRuleOverrides: TariffRuleOverrideNode[] }>(GET_TARIFF_RULE_OVERRIDES);

  const [createTarifBlok, { loading: creating }] = useMutation<{ createTarifBlok?: TarifBlokNode }>(CREATE_TARIF_BLOK, {
    onCompleted: (payload) => {
      toast({
        title: 'Tarif blok created',
        description: 'Master tarif blok berhasil dibuat.',
      });
      setIsCreateOpen(false);
      resetForm();
      const createdRule = payload?.createTarifBlok;
      if (createdRule?.id) {
        setPostCreateOverrideCandidate({
          id: createdRule.id,
          tarifCode: createdRule.tarifCode,
          perlakuan: createdRule.perlakuan,
        });
      }
      refetchTarifBloks();
      refetchOverrides();
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
      refetchOverrides();
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
      refetchOverrides();
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: mapDeleteTarifBlokErrorMessage(error.message),
        variant: 'destructive',
      });
    },
  });

  const [createTariffRuleOverride, { loading: creatingOverride }] = useMutation(CREATE_TARIFF_RULE_OVERRIDE);

  const [updateTariffRuleOverride, { loading: updatingOverride }] = useMutation(UPDATE_TARIFF_RULE_OVERRIDE, {
    onCompleted: () => {
      toast({
        title: 'Override updated',
        description: 'Override tarif berhasil diperbarui.',
      });
      setEditingOverride(null);
      resetOverrideForm();
      refetchOverrides();
      refetchTarifBloks();
    },
    onError: (error) => {
      toast({
        title: 'Update override failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [deleteTariffRuleOverride, { loading: deletingOverrideLoading }] = useMutation(DELETE_TARIFF_RULE_OVERRIDE, {
    onCompleted: () => {
      toast({
        title: 'Override deleted',
        description: 'Override tarif berhasil dihapus.',
      });
      setDeletingOverride(null);
      refetchOverrides();
      refetchTarifBloks();
    },
    onError: (error) => {
      toast({
        title: 'Delete override failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const companies = useMemo(
    () => companyData?.companies?.data || [],
    [companyData?.companies?.data],
  );

  const companyScopeOptions = useMemo(
    () => buildCompanyScopeOptions(user, companies),
    [companies, user],
  );

  const defaultCompanyId = useMemo(() => {
    const companyFromUser =
      normalizeText(user?.companyId) ||
      normalizeText(
        typeof user?.company === 'string'
          ? user.company
          : user?.company?.id,
      ) ||
      normalizeText(user?.companies?.[0]?.id) ||
      normalizeText(user?.assignedCompanies?.[0]);

    if (companyFromUser && companyScopeOptions.some((item) => item.id === companyFromUser)) {
      return companyFromUser;
    }

    return companyScopeOptions[0]?.id || '';
  }, [companyScopeOptions, user]);

  const currentCompanyId = defaultCompanyId || null;

  const companyTarifBloks = useMemo(() => {
    const base = tarifBlokData?.tarifBloks || [];
    if (!currentCompanyId) {
      return [];
    }
    return base.filter((tarif) => tarif.companyId === currentCompanyId);
  }, [tarifBlokData?.tarifBloks, currentCompanyId]);

  const landTypes = useMemo(
    () => (landTypeData?.landTypes || []).filter((item) => item.isActive),
    [landTypeData?.landTypes],
  );

  const schemeOptions = useMemo(() => {
    const codeSet = new Set<string>();
    companyTarifBloks.forEach((tarif) => {
      const code = resolveSchemeType(tarif);
      if (code) codeSet.add(code);
    });
    return Array.from(codeSet).sort((a, b) => a.localeCompare(b));
  }, [companyTarifBloks]);

  const tarifBloks = useMemo(() => {
    let base = companyTarifBloks;
    if (schemeFilter !== 'ALL') {
      base = base.filter((tarif) => resolveSchemeType(tarif) === schemeFilter);
    }
    if (landTypeFilter !== 'ALL') {
      base = base.filter((tarif) => tarif.landTypeId === landTypeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (tarif) =>
          tarif.perlakuan.toLowerCase().includes(q) ||
          (tarif.keterangan || '').toLowerCase().includes(q) ||
          (tarif.tarifCode || '').toLowerCase().includes(q),
      );
    }

    return [...base].sort((a, b) => {
      const aOrder = a.sortOrder ?? 9999;
      const bOrder = b.sortOrder ?? 9999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aCode = a.tarifCode || '';
      const bCode = b.tarifCode || '';
      return aCode.localeCompare(bCode);
    });
  }, [companyTarifBloks, landTypeFilter, schemeFilter, search]);

  const allOverrideRows = useMemo(
    () => tariffOverrideData?.tariffRuleOverrides || [],
    [tariffOverrideData?.tariffRuleOverrides],
  );

  const companyRuleIDSet = useMemo(
    () => new Set(companyTarifBloks.map((tarif) => tarif.id)),
    [companyTarifBloks],
  );

  const companyOverrideRows = useMemo(
    () => allOverrideRows.filter((override) => companyRuleIDSet.has(override.ruleId)),
    [allOverrideRows, companyRuleIDSet],
  );

  const activeOverrideTypeByRuleID = useMemo(() => {
    const map = new Map<string, Set<TariffOverrideType>>();
    companyOverrideRows.forEach((override) => {
      if (!override.isActive) return;
      if (!map.has(override.ruleId)) {
        map.set(override.ruleId, new Set<TariffOverrideType>());
      }
      map.get(override.ruleId)?.add(override.overrideType);
    });
    return map;
  }, [companyOverrideRows]);

  const schemeGroups = useMemo<TarifSchemeGroup[]>(() => {
    const grouped = new Map<
      string,
      Omit<TarifSchemeGroup, 'codePreview'> & { codeSet: Set<string> }
    >();

    tarifBloks.forEach((tarif) => {
      const parsedSchemeType = resolveSchemeType(tarif);
      const landTypeId = tarif.landTypeId || null;
      const key = `${parsedSchemeType || 'UNKNOWN'}::${landTypeId || 'NONE'}`;
      const code = (tarif.tarifCode || '').trim().toUpperCase();

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          schemeType: parsedSchemeType,
          landTypeId,
          landTypeLabel: tarif.landType
            ? `${tarif.landType.code} - ${tarif.landType.name}`
            : 'Tanpa tipe lahan',
          totalRules: 0,
          activeRules: 0,
          holidayOverrides: 0,
          lebaranOverrides: 0,
          codeSet: new Set<string>(),
        });
      }

      const current = grouped.get(key);
      if (!current) return;

      current.totalRules += 1;
      if (tarif.isActive) current.activeRules += 1;
      const overrideTypes = activeOverrideTypeByRuleID.get(tarif.id);
      if (overrideTypes?.has('HOLIDAY')) current.holidayOverrides += 1;
      if (overrideTypes?.has('LEBARAN')) current.lebaranOverrides += 1;
      if (code) current.codeSet.add(code);
    });

    return Array.from(grouped.values())
      .map(({ codeSet, ...row }) => {
        const allCodes = Array.from(codeSet).sort((a, b) => a.localeCompare(b));
        const preview = allCodes.slice(0, 3).join(', ');
        const moreCount = Math.max(0, allCodes.length - 3);

        return {
          ...row,
          codePreview: preview ? `${preview}${moreCount > 0 ? ` +${moreCount}` : ''}` : '-',
        };
      })
      .sort((a, b) => {
        const schemeCompare = schemeTypeLabel(a.schemeType).localeCompare(
          schemeTypeLabel(b.schemeType),
        );
        if (schemeCompare !== 0) return schemeCompare;
        return a.landTypeLabel.localeCompare(b.landTypeLabel);
      });
  }, [activeOverrideTypeByRuleID, tarifBloks]);

  const ruleByID = useMemo(() => {
    const map = new Map<string, TarifBlokNode>();
    companyTarifBloks.forEach((tarif) => map.set(tarif.id, tarif));
    return map;
  }, [companyTarifBloks]);

  const filteredOverrideRows = useMemo(() => {
    const visibleRuleIDs = new Set(tarifBloks.map((tarif) => tarif.id));
    let base = companyOverrideRows.filter((override) => visibleRuleIDs.has(override.ruleId));

    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(
        (override) =>
          override.overrideType.toLowerCase().includes(q) ||
          (override.notes || '').toLowerCase().includes(q),
      );
    }

    return [...base].sort((a, b) => {
      const ruleCompare = a.ruleId.localeCompare(b.ruleId);
      if (ruleCompare !== 0) return ruleCompare;
      return (a.effectiveFrom || '').localeCompare(b.effectiveFrom || '');
    });
  }, [companyOverrideRows, search, tarifBloks]);

  const tabSummary = useMemo(() => ({
    schemes: schemeGroups.length,
    rules: tarifBloks.length,
    overrides: filteredOverrideRows.length,
  }), [filteredOverrideRows.length, schemeGroups.length, tarifBloks.length]);

  const activeSubTabIndex = SUB_TAB_ORDER.indexOf(activeSubTab);
  const canGoPrevStep = activeSubTabIndex > 0;
  const canGoNextStep = activeSubTabIndex < SUB_TAB_ORDER.length - 1;
  const tableDensityClass = tableDensity === 'compact'
    ? '[&_th]:py-1.5 [&_th]:text-[11px] [&_td]:py-1.5 [&_td]:text-xs'
    : '[&_th]:py-2.5 [&_td]:py-2';
  const resolvedPerlakuanValue = useMemo(() => {
    return buildPerlakuanLabel(formTarifCode.trim().toUpperCase(), formSchemeType);
  }, [formSchemeType, formTarifCode]);
  const queryErrorMessage = useMemo(() => {
    const firstError = companyError || tarifBlokError || landTypeError || overrideError;
    if (!firstError?.message) return null;
    return `Gagal memuat data tarif blok: ${firstError.message}`;
  }, [companyError, landTypeError, overrideError, tarifBlokError]);

  useEffect(() => {
    setSchemeFilter('ALL');
    setLandTypeFilter('ALL');
    setSearch('');
    setActiveSubTab('schemes');
  }, [currentCompanyId]);

  function resetForm() {
    setFormLandTypeId('');
    setFormTarifCode('');
    setFormSchemeType('');
    setFormBJRMinKg('');
    setFormBJRMaxKg('');
    setFormSortOrder('');
    setFormKeterangan('');
    setFormBasis('');
    setFormTarifUpah('');
    setFormPremi('');
    setFormTarifPremi1('');
    setFormTarifPremi2('');
    setFormStatus('ACTIVE');
  }

  function openCreateDialog() {
    resetForm();
    const firstLandType = landTypes[0];
    if (firstLandType) {
      setFormLandTypeId(firstLandType.id);
      setFormSchemeType(firstLandType.code);
    }
    setIsCreateOpen(true);
  }

  function applyFormLandType(nextLandTypeID: string) {
    setFormLandTypeId(nextLandTypeID);
    const selectedLandType = landTypes.find((item) => item.id === nextLandTypeID);
    if (selectedLandType) {
      setFormSchemeType(selectedLandType.code);
      return;
    }
    setFormSchemeType('');
  }

  function openEditDialog(tarif: TarifBlokNode) {
    setEditingTarifBlok(tarif);
    setFormLandTypeId(tarif.landTypeId || '');
    setFormTarifCode(tarif.tarifCode || '');
    setFormSchemeType(resolveSchemeType(tarif) || '');
    setFormBJRMinKg(tarif.bjrMinKg === null || tarif.bjrMinKg === undefined ? '' : String(tarif.bjrMinKg));
    setFormBJRMaxKg(tarif.bjrMaxKg === null || tarif.bjrMaxKg === undefined ? '' : String(tarif.bjrMaxKg));
    setFormSortOrder(tarif.sortOrder === null || tarif.sortOrder === undefined ? '' : String(tarif.sortOrder));
    setFormKeterangan(tarif.keterangan || '');
    setFormBasis(tarif.basis === null || tarif.basis === undefined ? '' : String(tarif.basis));
    setFormTarifUpah(tarif.tarifUpah === null || tarif.tarifUpah === undefined ? '' : String(tarif.tarifUpah));
    setFormPremi(tarif.premi === null || tarif.premi === undefined ? '' : String(tarif.premi));
    setFormTarifPremi1(tarif.tarifPremi1 === null || tarif.tarifPremi1 === undefined ? '' : String(tarif.tarifPremi1));
    setFormTarifPremi2(tarif.tarifPremi2 === null || tarif.tarifPremi2 === undefined ? '' : String(tarif.tarifPremi2));
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

  function parseOptionalText(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  function parseOptionalInt(value: string, label: string): number | null {
    if (!value.trim()) return null;
    const num = Number(value);
    if (!Number.isInteger(num)) {
      throw new Error(`${label} harus berupa bilangan bulat.`);
    }
    return num;
  }

  function formatTarifNumber(value?: number | null): string {
    if (value === null || value === undefined) {
      return '-';
    }
    return value.toLocaleString('id-ID');
  }

  async function fetchBlocksByTarifID(tarifBlokID: string): Promise<BlockPrintNode[]> {
    const collected: BlockPrintNode[] = [];
    let page = 1;
    const limit = 200;

    while (true) {
      const result = await apolloClient.query<{ blocksPaginated: BlocksPaginatedPrintPayload }>({
        query: GET_BLOCKS_PAGINATED_FOR_TARIF_PRINT,
        variables: {
          companyId: currentCompanyId || undefined,
          page,
          limit,
        },
        fetchPolicy: 'network-only',
      });

      const payload = result.data?.blocksPaginated;
      if (!payload) {
        break;
      }

      payload.data.forEach((block) => {
        if (block.tarifBlokId === tarifBlokID) {
          collected.push(block);
        }
      });

      if (page >= payload.pagination.pages || payload.data.length === 0) {
        break;
      }
      page += 1;
    }

    return collected.sort((a, b) => {
      const estateA = a.division?.estate?.name || '';
      const estateB = b.division?.estate?.name || '';
      const estateCompare = estateA.localeCompare(estateB);
      if (estateCompare !== 0) return estateCompare;
      const divisionCompare = (a.division?.name || '').localeCompare(b.division?.name || '');
      if (divisionCompare !== 0) return divisionCompare;
      return a.blockCode.localeCompare(b.blockCode);
    });
  }

  async function handleExportBlocksByTarif(tarif: TarifBlokNode) {
    if (!currentCompanyId) {
      toast({
        title: 'Scope perusahaan belum dipilih',
        description: 'Pilih perusahaan terlebih dahulu sebelum export list blok.',
        variant: 'destructive',
      });
      return;
    }

    setExportingTarifId(tarif.id);
    try {
      const relatedBlocks = await fetchBlocksByTarifID(tarif.id);
      if (relatedBlocks.length === 0) {
        toast({
          title: 'Tidak ada blok terkait',
          description: `Belum ada blok yang menggunakan tarif ${tarif.tarifCode || tarif.perlakuan}.`,
        });
        return;
      }

      const tarifCode = tarif.tarifCode || '';
      const generatedAt = new Date().toISOString();
      const fileNameCore = normalizeFileNamePart(tarifCode || tarif.perlakuan || 'tarif');
      const fileName = `list_blok_tarif_${fileNameCore || 'unknown'}.xlsx`;
      await downloadTarifBlocksXlsx(fileName, tarif, relatedBlocks);
      toast({
        title: 'Export berhasil',
        description: `${relatedBlocks.length} blok berhasil diexport ke Excel (${generatedAt}).`,
      });
    } catch (error: unknown) {
      toast({
        title: 'Gagal export list blok',
        description: getErrorMessage(error, 'Terjadi kesalahan saat menyiapkan file Excel.'),
        variant: 'destructive',
      });
    } finally {
      setExportingTarifId(null);
    }
  }

  function openRulesTabFromScheme(group: TarifSchemeGroup) {
    setSchemeFilter(group.schemeType || 'ALL');
    setLandTypeFilter(group.landTypeId || 'ALL');
    setActiveSubTab('rules');
  }

  function resetOverrideForm() {
    setOverrideRuleId('');
    setOverrideType('HOLIDAY');
    setOverrideEffectiveFrom('');
    setOverrideEffectiveTo('');
    setOverrideTarifUpah('');
    setOverridePremi('');
    setOverrideTarifPremi1('');
    setOverrideTarifPremi2('');
    setOverrideNotes('');
    setOverrideStatus('ACTIVE');
  }

  function openCreateOverrideDialog() {
    resetOverrideForm();
    setIsOverrideCreateOpen(true);
  }

  function goToPrevStep() {
    if (!canGoPrevStep) return;
    setActiveSubTab(SUB_TAB_ORDER[activeSubTabIndex - 1]);
  }

  function goToNextStep() {
    if (!canGoNextStep) return;
    setActiveSubTab(SUB_TAB_ORDER[activeSubTabIndex + 1]);
  }

  function openEditOverrideDialog(override: TariffRuleOverrideNode) {
    setEditingOverride(override);
    setOverrideRuleId(override.ruleId);
    setOverrideType(override.overrideType);
    setOverrideEffectiveFrom(normalizeDateInput(override.effectiveFrom));
    setOverrideEffectiveTo(normalizeDateInput(override.effectiveTo));
    setOverrideTarifUpah(override.tarifUpah === null || override.tarifUpah === undefined ? '' : String(override.tarifUpah));
    setOverridePremi(override.premi === null || override.premi === undefined ? '' : String(override.premi));
    setOverrideTarifPremi1(override.tarifPremi1 === null || override.tarifPremi1 === undefined ? '' : String(override.tarifPremi1));
    setOverrideTarifPremi2(override.tarifPremi2 === null || override.tarifPremi2 === undefined ? '' : String(override.tarifPremi2));
    setOverrideNotes(override.notes || '');
    setOverrideStatus(override.isActive ? 'ACTIVE' : 'INACTIVE');
  }

  function parseOptionalDate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Format tanggal tidak valid.');
    }
    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00:00Z`;
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
    if (!formLandTypeId) {
      toast({
        title: 'Validation',
        description: 'Tipe lahan wajib dipilih.',
        variant: 'destructive',
      });
      return;
    }
    if (!formSchemeType.trim()) {
      toast({
        title: 'Validation',
        description: 'Kode skema wajib tersedia dari tipe lahan.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedTarifCode = formTarifCode.trim().toUpperCase();
    if (!normalizedTarifCode) {
      toast({
        title: 'Validation',
        description: 'Kode tarif wajib diisi.',
        variant: 'destructive',
      });
      return;
    }
    const resolvedPerlakuan = buildPerlakuanLabel(normalizedTarifCode, formSchemeType);

    if (!resolvedPerlakuan) {
      toast({
        title: 'Validation',
        description: 'Perlakuan otomatis tidak valid. Periksa kode tarif dan tipe lahan.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const bjrMinKg = parseOptionalNumber(formBJRMinKg, 'BJR minimum');
      const bjrMaxKg = parseOptionalNumber(formBJRMaxKg, 'BJR maksimum');
      if (bjrMinKg !== null && bjrMaxKg !== null && bjrMinKg >= bjrMaxKg) {
        throw new Error('BJR minimum harus lebih kecil dari BJR maksimum.');
      }
      await createTarifBlok({
        variables: {
          input: {
            companyId: currentCompanyId,
            perlakuan: resolvedPerlakuan,
            keterangan: parseOptionalText(formKeterangan),
            landTypeId: formLandTypeId,
            tarifCode: parseOptionalText(normalizedTarifCode),
            schemeType: parseOptionalText(formSchemeType.toUpperCase()),
            bjrMinKg,
            bjrMaxKg,
            sortOrder: parseOptionalInt(formSortOrder, 'Urutan'),
            basis: parseOptionalNumber(formBasis, 'Basis'),
            tarifUpah: parseOptionalNumber(formTarifUpah, 'Tarif upah'),
            premi: parseOptionalNumber(formPremi, 'Premi'),
            tarifPremi1: parseOptionalNumber(formTarifPremi1, 'Tarif premi 1'),
            tarifPremi2: parseOptionalNumber(formTarifPremi2, 'Tarif premi 2'),
            isActive: formStatus === 'ACTIVE',
          },
        },
      });
    } catch (error: unknown) {
      toast({
        title: 'Validation',
        description: getErrorMessage(error, 'Input tidak valid.'),
        variant: 'destructive',
      });
    }
  }

  async function handleUpdate() {
    if (!editingTarifBlok) return;
    if (!formLandTypeId) {
      toast({
        title: 'Validation',
        description: 'Tipe lahan wajib dipilih.',
        variant: 'destructive',
      });
      return;
    }
    if (!formSchemeType.trim()) {
      toast({
        title: 'Validation',
        description: 'Kode skema wajib tersedia dari tipe lahan.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedTarifCode = formTarifCode.trim().toUpperCase();
    if (!normalizedTarifCode) {
      toast({
        title: 'Validation',
        description: 'Kode tarif wajib diisi.',
        variant: 'destructive',
      });
      return;
    }
    const resolvedPerlakuan = buildPerlakuanLabel(normalizedTarifCode, formSchemeType);

    if (!resolvedPerlakuan) {
      toast({
        title: 'Validation',
        description: 'Perlakuan otomatis tidak valid. Periksa kode tarif dan tipe lahan.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const bjrMinKg = parseOptionalNumber(formBJRMinKg, 'BJR minimum');
      const bjrMaxKg = parseOptionalNumber(formBJRMaxKg, 'BJR maksimum');
      if (bjrMinKg !== null && bjrMaxKg !== null && bjrMinKg >= bjrMaxKg) {
        throw new Error('BJR minimum harus lebih kecil dari BJR maksimum.');
      }
      await updateTarifBlok({
        variables: {
          input: {
            id: editingTarifBlok.id,
            perlakuan: resolvedPerlakuan,
            keterangan: parseOptionalText(formKeterangan),
            landTypeId: formLandTypeId,
            tarifCode: parseOptionalText(normalizedTarifCode),
            schemeType: parseOptionalText(formSchemeType.toUpperCase()),
            bjrMinKg,
            bjrMaxKg,
            sortOrder: parseOptionalInt(formSortOrder, 'Urutan'),
            basis: parseOptionalNumber(formBasis, 'Basis'),
            tarifUpah: parseOptionalNumber(formTarifUpah, 'Tarif upah'),
            premi: parseOptionalNumber(formPremi, 'Premi'),
            tarifPremi1: parseOptionalNumber(formTarifPremi1, 'Tarif premi 1'),
            tarifPremi2: parseOptionalNumber(formTarifPremi2, 'Tarif premi 2'),
            isActive: formStatus === 'ACTIVE',
          },
        },
      });
    } catch (error: unknown) {
      toast({
        title: 'Validation',
        description: getErrorMessage(error, 'Input tidak valid.'),
        variant: 'destructive',
      });
    }
  }

  async function handleCreateOverride() {
    const allActiveRuleIDs = companyTarifBloks
      .filter((rule) => rule.isActive)
      .map((rule) => rule.id);
    const targetRuleIDs = allActiveRuleIDs;

    if (targetRuleIDs.length === 0) {
      toast({
        title: 'Validation',
        description: 'Tidak ada rule aktif untuk diterapkan override.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const effectiveFrom = parseOptionalDate(overrideEffectiveFrom);
      const effectiveTo = parseOptionalDate(overrideEffectiveTo);
      const tarifUpah = parseOptionalNumber(overrideTarifUpah, 'Tarif upah override');
      const premi = parseOptionalNumber(overridePremi, 'Premi override');
      const tarifPremi1 = parseOptionalNumber(overrideTarifPremi1, 'Tarif premi 1 override');
      const tarifPremi2 = parseOptionalNumber(overrideTarifPremi2, 'Tarif premi 2 override');
      const notes = parseOptionalText(overrideNotes);
      const isActive = overrideStatus === 'ACTIVE';

      let created = 0;
      let failed = 0;
      let firstFailureMessage = '';

      for (const ruleId of targetRuleIDs) {
        try {
          await createTariffRuleOverride({
            variables: {
              input: {
                ruleId,
                overrideType,
                effectiveFrom,
                effectiveTo,
                tarifUpah,
                premi,
                tarifPremi1,
                tarifPremi2,
                notes,
                isActive,
              },
            },
          });
          created += 1;
        } catch (error: unknown) {
          failed += 1;
          if (!firstFailureMessage) {
            firstFailureMessage = getErrorMessage(error, 'Gagal membuat override untuk sebagian rule.');
          }
        }
      }

      if (created > 0) {
        toast({
          title: 'Override created',
          description: `Override diterapkan ke ${created} rule aktif${failed > 0 ? `, gagal ${failed}` : ''}.`,
        });
        setIsOverrideCreateOpen(false);
        resetOverrideForm();
        refetchOverrides();
        refetchTarifBloks();
      }

      if (failed > 0) {
        toast({
          title: 'Sebagian override gagal',
          description: firstFailureMessage || `Gagal pada ${failed} rule.`,
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      toast({
        title: 'Validation',
        description: getErrorMessage(error, 'Input override tidak valid.'),
        variant: 'destructive',
      });
    }
  }

  async function handleUpdateOverride() {
    if (!editingOverride) return;

    try {
      await updateTariffRuleOverride({
        variables: {
          input: {
            id: editingOverride.id,
            overrideType,
            effectiveFrom: parseOptionalDate(overrideEffectiveFrom),
            effectiveTo: parseOptionalDate(overrideEffectiveTo),
            tarifUpah: parseOptionalNumber(overrideTarifUpah, 'Tarif upah override'),
            premi: parseOptionalNumber(overridePremi, 'Premi override'),
            tarifPremi1: parseOptionalNumber(overrideTarifPremi1, 'Tarif premi 1 override'),
            tarifPremi2: parseOptionalNumber(overrideTarifPremi2, 'Tarif premi 2 override'),
            notes: parseOptionalText(overrideNotes),
            isActive: overrideStatus === 'ACTIVE',
          },
        },
      });
    } catch (error: unknown) {
      toast({
        title: 'Validation',
        description: getErrorMessage(error, 'Input override tidak valid.'),
        variant: 'destructive',
      });
    }
  }

  const content = (
    <>
      <div className="space-y-5">
        <div className="rounded-lg border bg-gradient-to-r from-amber-50 via-orange-50 to-stone-50 p-4">
          <p className="text-sm font-semibold text-foreground">Workflow Tarif</p>
          <p className="text-xs text-muted-foreground">
            Kelola tarif secara berurutan: pilih <span className="font-medium text-foreground">Header Skema</span>,
            isi <span className="font-medium text-foreground">Rule BJR</span>, lalu set
            <span className="font-medium text-foreground"> Override periode (Holiday/Lebaran)</span>.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5" />
              Master Tarif Blok
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-5">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Rules</p>
                <p className="text-xl font-semibold">{companyTarifBloks.length}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Skema</p>
                <p className="text-xl font-semibold">
                  {schemeGroups.length}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Land Types Dipakai</p>
                <p className="text-xl font-semibold">
                  {new Set(companyTarifBloks.map((item) => item.landTypeId).filter(Boolean)).size}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Override Aktif</p>
                <p className="text-xl font-semibold">
                  {companyOverrideRows.filter((item) => item.isActive).length}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Override Berperiode</p>
                <p className="text-xl font-semibold">
                  {companyOverrideRows.filter((item) => item.effectiveFrom || item.effectiveTo).length}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-dashed bg-muted/25 p-3 text-sm text-muted-foreground">
              Model CRUD disusun sebagai: <span className="font-medium text-foreground">Skema (header)</span> -&gt;{' '}
              <span className="font-medium text-foreground">Rules (detail BJR)</span> -&gt;{' '}
              <span className="font-medium text-foreground">Overrides (normal/libur/lebaran)</span>.
            </div>

            {queryErrorMessage && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {queryErrorMessage}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-[1fr_220px_260px_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari kode/perlakuan/keterangan..."
                  className="pl-9"
                />
              </div>
              <Select
                value={schemeFilter}
                onValueChange={(value) => setSchemeFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter skema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Skema</SelectItem>
                  {schemeOptions.map((schemeCode) => (
                    <SelectItem key={schemeCode} value={schemeCode}>
                      {schemeTypeLabel(schemeCode)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={landTypeFilter}
                onValueChange={(value) => setLandTypeFilter(value)}
                disabled={loadingLandTypes}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter tipe lahan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Tipe Lahan</SelectItem>
                  {landTypes.map((landType) => (
                    <SelectItem key={landType.id} value={landType.id}>
                      {landType.code} - {landType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={tableDensity === 'comfortable' ? 'default' : 'ghost'}
                  onClick={() => setTableDensity('comfortable')}
                  className="h-8 px-2 text-xs"
                >
                  Nyaman
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={tableDensity === 'compact' ? 'default' : 'ghost'}
                  onClick={() => setTableDensity('compact')}
                  className="h-8 px-2 text-xs"
                >
                  Padat
                </Button>
              </div>
            </div>

            <Tabs
              value={activeSubTab}
              onValueChange={(value) => setActiveSubTab(value as TarifSubTab)}
              className="space-y-4"
            >
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 md:grid-cols-3">
                <TabsTrigger
                  value="schemes"
                  className="h-auto items-start justify-start gap-2 rounded-md border bg-background px-3 py-2 text-left data-[state=active]:border-primary"
                >
                  <CircleDollarSign className="mt-0.5 h-4 w-4" />
                  <span className="space-y-0.5">
                    <span className="block text-xs text-muted-foreground">Langkah 1</span>
                    <span className="block font-medium">Header Skema</span>
                    <span className="block text-xs text-muted-foreground">{tabSummary.schemes} grup skema</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="rules"
                  className="h-auto items-start justify-start gap-2 rounded-md border bg-background px-3 py-2 text-left data-[state=active]:border-primary"
                >
                  <FileText className="mt-0.5 h-4 w-4" />
                  <span className="space-y-0.5">
                    <span className="block text-xs text-muted-foreground">Langkah 2</span>
                    <span className="block font-medium">Rules BJR</span>
                    <span className="block text-xs text-muted-foreground">{tabSummary.rules} rule terfilter</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="overrides"
                  className="h-auto items-start justify-start gap-2 rounded-md border bg-background px-3 py-2 text-left data-[state=active]:border-primary"
                >
                  <CalendarDays className="mt-0.5 h-4 w-4" />
                  <span className="space-y-0.5">
                    <span className="block text-xs text-muted-foreground">Langkah 3</span>
                    <span className="block font-medium">Overrides</span>
                    <span className="block text-xs text-muted-foreground">{tabSummary.overrides} override terfilter</span>
                  </span>
                </TabsTrigger>
              </TabsList>

              <div className="sticky bottom-3 z-20 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {activeSubTab === 'schemes' ? 'Langkah 1: Validasi Header Skema' : activeSubTab === 'rules' ? 'Langkah 2: Kelola Rule BJR' : 'Langkah 3: Kelola Override Periode'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeSubTab === 'schemes' ? 'Periksa grouping skema per land type sebelum edit rule.' : activeSubTab === 'rules' ? 'Tambah/edit rule tarif dasar dan pastikan kode BJR benar.' : 'Atur override Holiday/Lebaran per periode efektif.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={goToPrevStep}
                      disabled={!canGoPrevStep}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={goToNextStep}
                      disabled={!canGoNextStep}
                    >
                      Berikutnya
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        refetchCompanies();
                        refetchTarifBloks();
                        refetchOverrides();
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                    {activeSubTab === 'schemes' && (
                      <Button variant="secondary" onClick={() => setActiveSubTab('rules')}>
                        Lanjut ke Rules
                      </Button>
                    )}
                    {activeSubTab === 'rules' && (
                      <>
                        <Button onClick={openCreateDialog} disabled={!currentCompanyId}>
                          <Plus className="mr-2 h-4 w-4" />
                          Tambah Rule Tarif
                        </Button>
                        <Button variant="secondary" onClick={() => setActiveSubTab('overrides')}>
                          Lanjut ke Overrides
                        </Button>
                      </>
                    )}
                    {activeSubTab === 'overrides' && (
                      <Button onClick={openCreateOverrideDialog} disabled={!currentCompanyId}>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Override
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <TabsContent value="schemes" className="space-y-2">
                <div className={`overflow-x-auto rounded-lg border bg-background shadow-sm ${tableDensityClass}`}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Skema</TableHead>
                        <TableHead>Tipe Lahan</TableHead>
                        <TableHead className="text-right">Total Rules</TableHead>
                        <TableHead className="text-right">Rules Aktif</TableHead>
                        <TableHead className="text-right">Override Libur</TableHead>
                        <TableHead className="text-right">Override Lebaran</TableHead>
                        <TableHead>Sample Kode</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queryErrorMessage && !loadingCompanies && !loadingTarifBloks && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-destructive">
                            {queryErrorMessage}
                          </TableCell>
                        </TableRow>
                      )}
                      {(loadingCompanies || loadingTarifBloks) && (
                        <TableRow>
                          <TableCell colSpan={8}>Loading skema tarif...</TableCell>
                        </TableRow>
                      )}
                      {!loadingCompanies && !loadingTarifBloks && !queryErrorMessage && schemeGroups.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8}>Belum ada skema yang cocok dengan filter.</TableCell>
                        </TableRow>
                      )}
                      {schemeGroups.map((group) => (
                        <TableRow key={group.key}>
                          <TableCell>
                            <Badge variant="outline">{schemeTypeLabel(group.schemeType)}</Badge>
                          </TableCell>
                          <TableCell>{group.landTypeLabel}</TableCell>
                          <TableCell className="text-right font-medium">{group.totalRules}</TableCell>
                          <TableCell className="text-right">{group.activeRules}</TableCell>
                          <TableCell className="text-right">{group.holidayOverrides}</TableCell>
                          <TableCell className="text-right">{group.lebaranOverrides}</TableCell>
                          <TableCell>{group.codePreview}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => openRulesTabFromScheme(group)}>
                              Lihat Rules
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-2">
                <div className={`overflow-x-auto rounded-lg border bg-background shadow-sm ${tableDensityClass}`}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipe Lahan</TableHead>
                        <TableHead>Skema</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Rentang BJR</TableHead>
                        <TableHead>Perlakuan</TableHead>
                        <TableHead className="text-right">Basis</TableHead>
                        <TableHead className="text-right">Tarif Upah</TableHead>
                        <TableHead className="text-right">Premi</TableHead>
                        <TableHead className="text-right">Tarif Premi 1</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queryErrorMessage && !loadingCompanies && !loadingTarifBloks && (
                        <TableRow>
                          <TableCell colSpan={12} className="text-destructive">
                            {queryErrorMessage}
                          </TableCell>
                        </TableRow>
                      )}
                      {(loadingCompanies || loadingTarifBloks) && (
                        <TableRow>
                          <TableCell colSpan={12}>Loading rules tarif...</TableCell>
                        </TableRow>
                      )}
                      {!loadingCompanies && !loadingTarifBloks && !queryErrorMessage && tarifBloks.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={12}>No tarif rule found.</TableCell>
                        </TableRow>
                      )}
                      {tarifBloks.map((tarif) => (
                        <TableRow key={tarif.id}>
                          <TableCell>
                            {tarif.landType ? (
                              <Badge variant="secondary">{tarif.landType.code} - {tarif.landType.name}</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{schemeTypeLabel(resolveSchemeType(tarif))}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{tarif.tarifCode || '-'}</TableCell>
                          <TableCell>{formatBJRRange(tarif.bjrMinKg, tarif.bjrMaxKg)}</TableCell>
                          <TableCell className="font-medium">{tarif.perlakuan}</TableCell>
                          <TableCell className="text-right">{formatTarifNumber(tarif.basis)}</TableCell>
                          <TableCell className="text-right">{formatTarifNumber(tarif.tarifUpah)}</TableCell>
                          <TableCell className="text-right">{formatTarifNumber(tarif.premi)}</TableCell>
                          <TableCell className="text-right">{formatTarifNumber(tarif.tarifPremi1)}</TableCell>
                          <TableCell className="max-w-[280px] whitespace-normal">{tarif.keterangan || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={tarif.isActive ? 'default' : 'secondary'}>
                              {tarif.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleExportBlocksByTarif(tarif)}
                                disabled={exportingTarifId === tarif.id}
                              >
                                {exportingTarifId === tarif.id ? (
                                  <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="mr-1 h-3.5 w-3.5" />
                                )}
                                {exportingTarifId === tarif.id ? 'Exporting...' : 'Export Blok'}
                              </Button>
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
              </TabsContent>

              <TabsContent value="overrides" className="space-y-2">
                <div className={`overflow-x-auto rounded-lg border bg-background shadow-sm ${tableDensityClass}`}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipe Lahan</TableHead>
                        <TableHead>Skema</TableHead>
                        <TableHead>Tipe Override</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Perlakuan</TableHead>
                        <TableHead className="text-right">Tarif Upah</TableHead>
                        <TableHead className="text-right">Premi</TableHead>
                        <TableHead className="text-right">Tarif Premi 1</TableHead>
                        <TableHead className="text-right">Tarif Premi 2</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead>Catatan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queryErrorMessage && !loadingCompanies && !loadingTarifBloks && !loadingOverrides && (
                        <TableRow>
                          <TableCell colSpan={13} className="text-destructive">
                            {queryErrorMessage}
                          </TableCell>
                        </TableRow>
                      )}
                      {(loadingCompanies || loadingTarifBloks || loadingOverrides) && (
                        <TableRow>
                          <TableCell colSpan={13}>Loading override tarif...</TableCell>
                        </TableRow>
                      )}
                      {!loadingCompanies && !loadingTarifBloks && !loadingOverrides && !queryErrorMessage && filteredOverrideRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={13}>Belum ada data override untuk rule yang terfilter.</TableCell>
                        </TableRow>
                      )}
                      {filteredOverrideRows.map((override) => {
                        const rule = ruleByID.get(override.ruleId);
                        return (
                        <TableRow key={override.id}>
                          <TableCell>
                            {rule?.landType ? (
                              <Badge variant="secondary">{rule.landType.code} - {rule.landType.name}</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{schemeTypeLabel(resolveSchemeType(rule))}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={override.overrideType === 'NORMAL' ? 'secondary' : 'default'}>
                              {overrideTypeLabel(override.overrideType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{rule?.tarifCode || '-'}</TableCell>
                          <TableCell className="font-medium">{rule?.perlakuan || '-'}</TableCell>
                          <TableCell className="text-right">{formatTarifNumber(override.tarifUpah)}</TableCell>
                          <TableCell className="text-right">{formatTarifNumber(override.premi)}</TableCell>
                          <TableCell className="text-right">{formatTarifNumber(override.tarifPremi1)}</TableCell>
                          <TableCell className="text-right">{formatTarifNumber(override.tarifPremi2)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatOverridePeriod(override.effectiveFrom, override.effectiveTo)}
                          </TableCell>
                          <TableCell className="max-w-[220px] whitespace-normal text-xs">{override.notes || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={override.isActive ? 'default' : 'secondary'}>
                              {override.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openEditOverrideDialog(override)}>
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeletingOverride(override)}
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create Tarif Blok</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Header Rule
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="create-tarif-land-type">Tipe Lahan</Label>
                <Select
                  value={formLandTypeId || '__NONE__'}
                  onValueChange={(value) => applyFormLandType(value === '__NONE__' ? '' : value)}
                  disabled={loadingLandTypes}
                >
                  <SelectTrigger id="create-tarif-land-type">
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
                <Label htmlFor="create-tarif-scheme">Scheme Code</Label>
                <Input id="create-tarif-scheme" value={formSchemeType} placeholder="Scheme Code (otomatis dari tipe lahan)" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tarif-code">Kode Tarif</Label>
                <Input id="create-tarif-code" value={formTarifCode} onChange={(e) => setFormTarifCode(e.target.value)} placeholder="Kode Tarif (contoh: BJR20)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tarif-sort-order">Urutan</Label>
                <Input id="create-tarif-sort-order" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)} placeholder="Urutan (1..n)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tarif-bjr-min">BJR Min (Kg)</Label>
                <Input id="create-tarif-bjr-min" value={formBJRMinKg} onChange={(e) => setFormBJRMinKg(e.target.value)} placeholder="BJR Min Kg (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tarif-bjr-max">BJR Max (Kg)</Label>
                <Input id="create-tarif-bjr-max" value={formBJRMaxKg} onChange={(e) => setFormBJRMaxKg(e.target.value)} placeholder="BJR Max Kg (optional)" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-tarif-perlakuan">Perlakuan</Label>
              <Input
                id="create-tarif-perlakuan"
                value={resolvedPerlakuanValue}
                readOnly
                placeholder="Perlakuan (otomatis)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-tarif-keterangan">Keterangan</Label>
              <Input
                id="create-tarif-keterangan"
                value={formKeterangan}
                onChange={(e) => setFormKeterangan(e.target.value)}
                placeholder="Keterangan (optional)"
              />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tarif Dasar
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-tarif-basis">Basis</Label>
                <Input id="create-tarif-basis" value={formBasis} onChange={(e) => setFormBasis(e.target.value)} placeholder="Basis (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tarif-upah">Tarif Upah</Label>
                <Input id="create-tarif-upah" value={formTarifUpah} onChange={(e) => setFormTarifUpah(e.target.value)} placeholder="Tarif Upah (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tarif-premi">Premi</Label>
                <Input id="create-tarif-premi" value={formPremi} onChange={(e) => setFormPremi(e.target.value)} placeholder="Premi (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tarif-premi1">Tarif Premi 1</Label>
                <Input id="create-tarif-premi1" value={formTarifPremi1} onChange={(e) => setFormTarifPremi1(e.target.value)} placeholder="Tarif Premi 1 (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tarif-premi2">Tarif Premi 2</Label>
                <Input id="create-tarif-premi2" value={formTarifPremi2} onChange={(e) => setFormTarifPremi2(e.target.value)} placeholder="Tarif Premi 2 (optional)" />
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status Rule
            </p>
            <div className="space-y-2">
              <Label htmlFor="create-tarif-status">Status</Label>
              <Select value={formStatus} onValueChange={(value) => setFormStatus(value as 'ACTIVE' | 'INACTIVE')}>
                <SelectTrigger id="create-tarif-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border border-dashed bg-muted/25 p-3 text-xs text-muted-foreground">
              Override Holiday/Lebaran + periode diinput terpisah dari dialog ini, melalui langkah
              <span className="font-medium text-foreground"> Overrides</span>.
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Tarif Blok</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Header Rule
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tarif-land-type">Tipe Lahan</Label>
                <Select
                  value={formLandTypeId || '__NONE__'}
                  onValueChange={(value) => applyFormLandType(value === '__NONE__' ? '' : value)}
                  disabled={loadingLandTypes}
                >
                  <SelectTrigger id="edit-tarif-land-type">
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
                <Label htmlFor="edit-tarif-scheme">Scheme Code</Label>
                <Input id="edit-tarif-scheme" value={formSchemeType} placeholder="Scheme Code (otomatis dari tipe lahan)" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tarif-code">Kode Tarif</Label>
                <Input id="edit-tarif-code" value={formTarifCode} onChange={(e) => setFormTarifCode(e.target.value)} placeholder="Kode Tarif (contoh: BJR20)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tarif-sort-order">Urutan</Label>
                <Input id="edit-tarif-sort-order" value={formSortOrder} onChange={(e) => setFormSortOrder(e.target.value)} placeholder="Urutan (1..n)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tarif-bjr-min">BJR Min (Kg)</Label>
                <Input id="edit-tarif-bjr-min" value={formBJRMinKg} onChange={(e) => setFormBJRMinKg(e.target.value)} placeholder="BJR Min Kg (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tarif-bjr-max">BJR Max (Kg)</Label>
                <Input id="edit-tarif-bjr-max" value={formBJRMaxKg} onChange={(e) => setFormBJRMaxKg(e.target.value)} placeholder="BJR Max Kg (optional)" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tarif-perlakuan">Perlakuan</Label>
              <Input
                id="edit-tarif-perlakuan"
                value={resolvedPerlakuanValue}
                readOnly
                placeholder="Perlakuan (otomatis)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tarif-keterangan">Keterangan</Label>
              <Input
                id="edit-tarif-keterangan"
                value={formKeterangan}
                onChange={(e) => setFormKeterangan(e.target.value)}
                placeholder="Keterangan (optional)"
              />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tarif Dasar
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-tarif-basis">Basis</Label>
                <Input id="edit-tarif-basis" value={formBasis} onChange={(e) => setFormBasis(e.target.value)} placeholder="Basis (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tarif-upah">Tarif Upah</Label>
                <Input id="edit-tarif-upah" value={formTarifUpah} onChange={(e) => setFormTarifUpah(e.target.value)} placeholder="Tarif Upah (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tarif-premi">Premi</Label>
                <Input id="edit-tarif-premi" value={formPremi} onChange={(e) => setFormPremi(e.target.value)} placeholder="Premi (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tarif-premi1">Tarif Premi 1</Label>
                <Input id="edit-tarif-premi1" value={formTarifPremi1} onChange={(e) => setFormTarifPremi1(e.target.value)} placeholder="Tarif Premi 1 (optional)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tarif-premi2">Tarif Premi 2</Label>
                <Input id="edit-tarif-premi2" value={formTarifPremi2} onChange={(e) => setFormTarifPremi2(e.target.value)} placeholder="Tarif Premi 2 (optional)" />
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status Rule
            </p>
            <div className="space-y-2">
              <Label htmlFor="edit-tarif-status">Status</Label>
              <Select value={formStatus} onValueChange={(value) => setFormStatus(value as 'ACTIVE' | 'INACTIVE')}>
                <SelectTrigger id="edit-tarif-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border border-dashed bg-muted/25 p-3 text-xs text-muted-foreground">
              Override Holiday/Lebaran + periode dikelola terpisah melalui langkah
              <span className="font-medium text-foreground"> Overrides</span>.
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

      <Dialog open={isOverrideCreateOpen} onOpenChange={setIsOverrideCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Override Tarif</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-dashed bg-muted/25 p-3 text-xs text-muted-foreground">
              Override ini akan diterapkan ke semua rule aktif (semua blok) pada periode yang ditentukan.
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-override-type">Tipe Override</Label>
                <Select value={overrideType} onValueChange={(value) => setOverrideType(value as TariffOverrideType)}>
                  <SelectTrigger id="create-override-type">
                    <SelectValue placeholder="Tipe Override" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">NORMAL</SelectItem>
                    <SelectItem value="HOLIDAY">HOLIDAY</SelectItem>
                    <SelectItem value="LEBARAN">LEBARAN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
                Total rule aktif: <span className="font-medium text-foreground">{companyTarifBloks.filter((rule) => rule.isActive).length}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-override-effective-from">Effective From</Label>
                <Input
                  id="create-override-effective-from"
                  type="date"
                  value={overrideEffectiveFrom}
                  onChange={(e) => setOverrideEffectiveFrom(e.target.value)}
                  placeholder="Effective From (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-override-effective-to">Effective To</Label>
                <Input
                  id="create-override-effective-to"
                  type="date"
                  value={overrideEffectiveTo}
                  onChange={(e) => setOverrideEffectiveTo(e.target.value)}
                  placeholder="Effective To (optional)"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-override-tarif-upah">Tarif Upah Override</Label>
                <Input
                  id="create-override-tarif-upah"
                  value={overrideTarifUpah}
                  onChange={(e) => setOverrideTarifUpah(e.target.value)}
                  placeholder="Tarif Upah Override"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-override-premi">Premi Override</Label>
                <Input
                  id="create-override-premi"
                  value={overridePremi}
                  onChange={(e) => setOverridePremi(e.target.value)}
                  placeholder="Premi Override"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-override-tarif-premi1">Tarif Premi 1 Override</Label>
                <Input
                  id="create-override-tarif-premi1"
                  value={overrideTarifPremi1}
                  onChange={(e) => setOverrideTarifPremi1(e.target.value)}
                  placeholder="Tarif Premi 1 Override"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-override-tarif-premi2">Tarif Premi 2 Override</Label>
                <Input
                  id="create-override-tarif-premi2"
                  value={overrideTarifPremi2}
                  onChange={(e) => setOverrideTarifPremi2(e.target.value)}
                  placeholder="Tarif Premi 2 Override"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-override-notes">Catatan Override</Label>
              <Input
                id="create-override-notes"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Catatan Override (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-override-status">Status</Label>
              <Select value={overrideStatus} onValueChange={(value) => setOverrideStatus(value as 'ACTIVE' | 'INACTIVE')}>
                <SelectTrigger id="create-override-status">
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
            <Button variant="outline" onClick={() => setIsOverrideCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOverride} disabled={creatingOverride}>
              {creatingOverride ? 'Saving...' : 'Create Override Semua Blok'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingOverride} onOpenChange={(open) => !open && setEditingOverride(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Override Tarif</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-override-rule">Rule Tarif</Label>
                <Select
                  value={overrideRuleId || '__NONE__'}
                  onValueChange={(value) => setOverrideRuleId(value === '__NONE__' ? '' : value)}
                  disabled
                >
                  <SelectTrigger id="edit-override-rule">
                    <SelectValue placeholder="Rule Tarif" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">- Pilih Rule Tarif -</SelectItem>
                    {companyTarifBloks.map((tarif) => (
                      <SelectItem key={tarif.id} value={tarif.id}>
                        {`${tarif.tarifCode || '-'} | ${schemeTypeLabel(resolveSchemeType(tarif))} | ${tarif.perlakuan}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-override-type">Tipe Override</Label>
                <Select value={overrideType} onValueChange={(value) => setOverrideType(value as TariffOverrideType)}>
                  <SelectTrigger id="edit-override-type">
                    <SelectValue placeholder="Tipe Override" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">NORMAL</SelectItem>
                    <SelectItem value="HOLIDAY">HOLIDAY</SelectItem>
                    <SelectItem value="LEBARAN">LEBARAN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-override-effective-from">Effective From</Label>
                <Input
                  id="edit-override-effective-from"
                  type="date"
                  value={overrideEffectiveFrom}
                  onChange={(e) => setOverrideEffectiveFrom(e.target.value)}
                  placeholder="Effective From (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-override-effective-to">Effective To</Label>
                <Input
                  id="edit-override-effective-to"
                  type="date"
                  value={overrideEffectiveTo}
                  onChange={(e) => setOverrideEffectiveTo(e.target.value)}
                  placeholder="Effective To (optional)"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-override-tarif-upah">Tarif Upah Override</Label>
                <Input
                  id="edit-override-tarif-upah"
                  value={overrideTarifUpah}
                  onChange={(e) => setOverrideTarifUpah(e.target.value)}
                  placeholder="Tarif Upah Override"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-override-premi">Premi Override</Label>
                <Input
                  id="edit-override-premi"
                  value={overridePremi}
                  onChange={(e) => setOverridePremi(e.target.value)}
                  placeholder="Premi Override"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-override-tarif-premi1">Tarif Premi 1 Override</Label>
                <Input
                  id="edit-override-tarif-premi1"
                  value={overrideTarifPremi1}
                  onChange={(e) => setOverrideTarifPremi1(e.target.value)}
                  placeholder="Tarif Premi 1 Override"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-override-tarif-premi2">Tarif Premi 2 Override</Label>
                <Input
                  id="edit-override-tarif-premi2"
                  value={overrideTarifPremi2}
                  onChange={(e) => setOverrideTarifPremi2(e.target.value)}
                  placeholder="Tarif Premi 2 Override"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-override-notes">Catatan Override</Label>
              <Input
                id="edit-override-notes"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Catatan Override (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-override-status">Status</Label>
              <Select value={overrideStatus} onValueChange={(value) => setOverrideStatus(value as 'ACTIVE' | 'INACTIVE')}>
                <SelectTrigger id="edit-override-status">
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
            <Button variant="outline" onClick={() => setEditingOverride(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateOverride} disabled={updatingOverride}>
              {updatingOverride ? 'Saving...' : 'Update Override'}
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
              Perlakuan &quot;{deletingTarifBlok?.perlakuan}&quot; akan dihapus permanen.
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

      <AlertDialog
        open={!!deletingOverride}
        onOpenChange={(open) => !open && setDeletingOverride(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete override tarif?</AlertDialogTitle>
            <AlertDialogDescription>
              Override tipe &quot;{deletingOverride?.overrideType}&quot; akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOverrideLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingOverrideLoading}
              onClick={() => {
                if (deletingOverride) {
                  deleteTariffRuleOverride({ variables: { id: deletingOverride.id } });
                }
              }}
            >
              {deletingOverrideLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!postCreateOverrideCandidate}
        onOpenChange={(open) => !open && setPostCreateOverrideCandidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lanjut buat override?</AlertDialogTitle>
            <AlertDialogDescription>
              Rule {postCreateOverrideCandidate?.tarifCode || '-'} ({postCreateOverrideCandidate?.perlakuan || '-'}) sudah dibuat.
              Lanjut input override Holiday/Lebaran sekarang?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nanti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setActiveSubTab('overrides');
                openCreateOverrideDialog();
                setPostCreateOverrideCandidate(null);
              }}
            >
              Buat Override
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
    <CompanyAdminDashboardLayout title="Tarif Blok Management" description="Kelola skema tarif, rule BJR, dan override konteks (normal/libur/lebaran)">
      {content}
    </CompanyAdminDashboardLayout>
  );
}
