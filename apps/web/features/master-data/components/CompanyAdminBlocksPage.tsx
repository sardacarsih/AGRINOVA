'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gql } from 'graphql-tag';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
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
import { Download, Pencil, Plus, RefreshCw, Search, Square, Trash2, Upload } from 'lucide-react';
import {
  downloadXlsxTemplate,
  getRowString,
  isSpreadsheetFile,
  normalizeLookupKey,
  parseFirstWorksheetRows,
  parseOptionalIntegerValue,
  parseOptionalNumberValue,
} from '@/features/master-data/utils/xlsx-import';

interface CompanyAdminBlocksPageProps {
  user?: any;
  locale?: string;
  withLayout?: boolean;
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

interface TarifBlokNode {
  id: string;
  companyId: string;
  perlakuan: string;
  isActive: boolean;
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
  perlakuan?: string | null;
  tarifBlokId?: string | null;
  tarifBlok?: TarifBlokNode | null;
  divisionId: string;
  division?: {
    id: string;
    name: string;
    estate?: {
      id: string;
      name: string;
      company?: CompanyNode | null;
    } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationNode {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface BlocksPaginatedPayload {
  data: BlockNode[];
  pagination: PaginationNode;
}

interface ImportFailureDetail {
  row: number;
  record: string;
  reason: string;
}

interface ImportSummary {
  created: number;
  updated: number;
  failed: number;
  failedRows: ImportFailureDetail[];
  importedAt: string;
}

const BLOCK_SEQUENCE_REGEX = /^\d{1,3}$/;

const GET_COMPANY_CONTEXT = gql`
  query GetCompanyContextForBlocks {
    companies(page: 1, limit: 100) {
      data {
        id
        name
      }
    }
  }
`;

const GET_ESTATES = gql`
  query GetEstatesForBlockForm {
    estates {
      id
      name
      companyId
    }
  }
`;

const GET_DIVISIONS = gql`
  query GetDivisionsForBlockForm {
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

const GET_BLOCKS_PAGINATED = gql`
  query GetBlocksPaginatedForCompanyAdmin(
    $companyId: ID
    $search: String
    $page: Int
    $limit: Int
  ) {
    blocksPaginated(
      companyId: $companyId
      search: $search
      page: $page
      limit: $limit
    ) {
      data {
      id
      blockCode
      name
      luasHa
      cropType
      plantingYear
      status
      istm
      perlakuan
      tarifBlokId
      tarifBlok {
        id
        companyId
        perlakuan
        isActive
      }
      divisionId
      division {
        id
        name
        estate {
          id
          name
          company {
            id
            name
          }
        }
      }
      createdAt
      updatedAt
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

const GET_TARIF_BLOKS = gql`
  query GetTarifBloksForBlockForm {
    tarifBloks {
      id
      companyId
      perlakuan
      isActive
    }
  }
`;

const CREATE_BLOCK = gql`
  mutation CreateBlockForCompanyAdmin($input: CreateBlockInput!) {
    createBlock(input: $input) {
      id
      blockCode
      name
      luasHa
      cropType
      plantingYear
      status
      istm
      perlakuan
      tarifBlokId
      tarifBlok {
        id
        perlakuan
      }
      divisionId
      division {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_BLOCK = gql`
  mutation UpdateBlockForCompanyAdmin($input: UpdateBlockInput!) {
    updateBlock(input: $input) {
      id
      blockCode
      name
      luasHa
      cropType
      plantingYear
      status
      istm
      perlakuan
      tarifBlokId
      tarifBlok {
        id
        perlakuan
      }
      divisionId
      division {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

const DELETE_BLOCK = gql`
  mutation DeleteBlockForCompanyAdmin($id: ID!) {
    deleteBlock(id: $id)
  }
`;

function mapDeleteBlockErrorMessage(message?: string): string {
  const rawMessage = message || '';
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    normalizedMessage.includes('data panen') ||
    (normalizedMessage.includes('harvest') && normalizedMessage.includes('block'))
  ) {
    return 'Blok tidak dapat dihapus karena sudah memiliki data panen. Gunakan blok lain untuk transaksi baru.';
  }

  if (
    normalizedMessage.includes('digunakan oleh data lain') ||
    normalizedMessage.includes('used by other data') ||
    normalizedMessage.includes('foreign key') ||
    normalizedMessage.includes('constraint')
  ) {
    return 'Blok tidak dapat dihapus karena masih digunakan oleh data lain.';
  }

  if (normalizedMessage.includes('not found')) {
    return 'Blok tidak ditemukan atau sudah dihapus sebelumnya.';
  }

  if (normalizedMessage.includes('access denied') || normalizedMessage.includes('permission')) {
    return 'Anda tidak memiliki izin untuk menghapus blok ini.';
  }

  return rawMessage || 'Gagal menghapus blok.';
}

export default function CompanyAdminBlocksPage({ user, withLayout = true }: CompanyAdminBlocksPageProps) {
  const { toast } = useToast();
  const apolloClient = useApolloClient();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BlockNode | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<BlockNode | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formBlockCode, setFormBlockCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDivisionId, setFormDivisionId] = useState('');
  const [formLuasHa, setFormLuasHa] = useState('');
  const [formCropType, setFormCropType] = useState('');
  const [formPlantingYear, setFormPlantingYear] = useState('');
  const [formStatus, setFormStatus] = useState<'INTI' | 'KKPA'>('INTI');
  const [formISTM, setFormISTM] = useState<'Y' | 'N'>('N');
  const [formTarifBlokID, setFormTarifBlokID] = useState('');

  const {
    data: companyData,
    loading: loadingCompanies,
    refetch: refetchCompanies,
  } = useQuery<{ companies: { data: CompanyNode[] } }>(GET_COMPANY_CONTEXT);
  const { data: estateData, loading: loadingEstates, refetch: refetchEstates } = useQuery<{
    estates: EstateNode[];
  }>(GET_ESTATES);
  const { data: divisionData, loading: loadingDivisions, refetch: refetchDivisions } = useQuery<{
    divisions: DivisionNode[];
  }>(GET_DIVISIONS);
  const { data: tarifBlokData, loading: loadingTarifBloks } = useQuery<{
    tarifBloks: TarifBlokNode[];
  }>(GET_TARIF_BLOKS);

  const [createBlock, { loading: creating }] = useMutation(CREATE_BLOCK, {
    onCompleted: () => {
      toast({
        title: 'Block created',
        description: 'Blok berhasil dibuat.',
      });
      setIsCreateOpen(false);
      resetForm();
      refetchBlocks();
    },
    onError: (error) => {
      toast({
        title: 'Create failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [updateBlock, { loading: updating }] = useMutation(UPDATE_BLOCK, {
    onCompleted: () => {
      toast({
        title: 'Block updated',
        description: 'Blok berhasil diperbarui.',
      });
      setEditingBlock(null);
      resetForm();
      refetchBlocks();
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [deleteBlock, { loading: deleting }] = useMutation(DELETE_BLOCK, {
    onCompleted: () => {
      toast({
        title: 'Block deleted',
        description: 'Blok berhasil dihapus.',
      });
      setDeletingBlock(null);
      refetchBlocks();
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: mapDeleteBlockErrorMessage(error.message),
        variant: 'destructive',
      });
    },
  });

  const companies = companyData?.companies?.data || [];
  const companyIdFromUser =
    user?.companyId || user?.company?.id || user?.companies?.[0]?.id || null;
  const currentCompanyId = companyIdFromUser || companies[0]?.id || null;
  const trimmedSearch = search.trim();

  const blockQueryVariables = useMemo(
    () => ({
      companyId: currentCompanyId || undefined,
      search: trimmedSearch ? trimmedSearch : undefined,
      page: currentPage,
      limit: pageSize,
    }),
    [currentCompanyId, trimmedSearch, currentPage, pageSize],
  );

  const { data: blockData, loading: loadingBlocks, refetch: refetchBlocks } = useQuery<{
    blocksPaginated: BlocksPaginatedPayload;
  }>(GET_BLOCKS_PAGINATED, {
    variables: blockQueryVariables,
  });

  const estates = useMemo(() => {
    const base = estateData?.estates || [];
    return currentCompanyId ? base.filter((estate) => estate.companyId === currentCompanyId) : base;
  }, [estateData?.estates, currentCompanyId]);

  const divisions = useMemo(() => {
    const base = divisionData?.divisions || [];
    const estateIDs = new Set(estates.map((estate) => estate.id));
    return base.filter((division) => estateIDs.has(division.estateId));
  }, [divisionData?.divisions, estates]);

  const divisionNameByID = useMemo(() => {
    const map = new Map<string, string>();
    divisions.forEach((division) => map.set(division.id, division.name));
    return map;
  }, [divisions]);

  const tarifBloks = useMemo(() => {
    const base = tarifBlokData?.tarifBloks || [];
    const filtered = currentCompanyId
      ? base.filter((tarif) => tarif.companyId === currentCompanyId)
      : base;
    return filtered.sort((a, b) => Number(b.isActive) - Number(a.isActive));
  }, [tarifBlokData?.tarifBloks, currentCompanyId]);

  const blocks = blockData?.blocksPaginated?.data || [];
  const blockPagination = blockData?.blocksPaginated?.pagination;
  const effectivePage = blockPagination?.page || currentPage;
  const effectiveLimit = blockPagination?.limit || pageSize;
  const totalBlocks = blockPagination?.total || 0;
  const totalPages = Math.max(1, blockPagination?.pages || 1);
  const startItem =
    totalBlocks === 0 || blocks.length === 0 ? 0 : (effectivePage - 1) * effectiveLimit + 1;
  const endItem =
    totalBlocks === 0 || blocks.length === 0
      ? 0
      : Math.min(startItem + blocks.length - 1, totalBlocks);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentCompanyId]);

  function resetForm() {
    setFormBlockCode('');
    setFormName('');
    setFormDivisionId('');
    setFormLuasHa('');
    setFormCropType('');
    setFormPlantingYear('');
    setFormStatus('INTI');
    setFormISTM('N');
    setFormTarifBlokID('');
  }

  function openCreateDialog() {
    resetForm();
    setIsCreateOpen(true);
  }

  function openEditDialog(block: BlockNode) {
    setEditingBlock(block);
    setFormBlockCode(block.blockCode);
    setFormName(block.name);
    setFormDivisionId(block.divisionId);
    setFormLuasHa(block.luasHa === null || block.luasHa === undefined ? '' : String(block.luasHa));
    setFormCropType(block.cropType || '');
    setFormPlantingYear(
      block.plantingYear === null || block.plantingYear === undefined
        ? ''
        : String(block.plantingYear),
    );
    setFormStatus(block.status === 'KKPA' ? 'KKPA' : 'INTI');
    setFormISTM(block.istm === 'Y' ? 'Y' : 'N');
    setFormTarifBlokID(block.tarifBlokId || block.tarifBlok?.id || '');
  }

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

  async function handleCreate() {
    if (!formName.trim() || !formDivisionId) {
      toast({
        title: 'Validation',
        description: 'Nama dan divisi wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const luasHa = parseLuasHaInput();
      const plantingYear = parsePlantingYearInput();
      await createBlock({
        variables: {
          input: {
            // Backend akan generate block code otomatis berdasarkan kode divisi + nomor urut.
            blockCode: '',
            name: formName.trim(),
            divisionId: formDivisionId,
            luasHa: luasHa ?? null,
            cropType: formCropType.trim() || null,
            plantingYear: plantingYear ?? null,
            status: formStatus,
            istm: formISTM,
            tarifBlokId: formTarifBlokID,
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
    if (!editingBlock) return;
    if (!formBlockCode.trim() || !formName.trim()) {
      toast({
        title: 'Validation',
        description: 'Kode blok dan nama wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const luasHa = parseLuasHaInput();
      const plantingYear = parsePlantingYearInput();
      await updateBlock({
        variables: {
          input: {
            id: editingBlock.id,
            blockCode: formBlockCode.trim(),
            name: formName.trim(),
            luasHa: luasHa ?? null,
            cropType: formCropType.trim() || null,
            plantingYear: plantingYear ?? null,
            status: formStatus,
            istm: formISTM,
            tarifBlokId: formTarifBlokID,
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

  function parseStatus(value: string): 'INTI' | 'KKPA' | null {
    if (!value) {
      return 'INTI';
    }
    const normalized = value.trim().toUpperCase();
    if (normalized === 'INTI' || normalized === 'KKPA') {
      return normalized;
    }
    return null;
  }

  function parseISTM(value: string): 'Y' | 'N' | null {
    if (!value) {
      return 'N';
    }
    const normalized = value.trim().toUpperCase();
    if (['Y', 'YES', 'TRUE', '1'].includes(normalized)) {
      return 'Y';
    }
    if (['N', 'NO', 'FALSE', '0'].includes(normalized)) {
      return 'N';
    }
    return null;
  }

  function parseBlockSequenceFromCode(blockCode: string, divisionCode?: string | null): number | null {
    const normalizedDivisionCode = (divisionCode || '').trim().toUpperCase();
    const normalizedBlockCode = blockCode.trim().toUpperCase();
    if (!normalizedDivisionCode || !normalizedBlockCode.startsWith(normalizedDivisionCode)) {
      return null;
    }
    const suffix = normalizedBlockCode.slice(normalizedDivisionCode.length);
    if (!BLOCK_SEQUENCE_REGEX.test(suffix)) {
      return null;
    }
    const sequence = Number.parseInt(suffix, 10);
    if (sequence < 1 || sequence > 999) {
      return null;
    }
    return sequence;
  }

  function getImportMutationErrorReason(error: any): string {
    const graphQLErrorMessage = error?.graphQLErrors?.[0]?.message;
    const networkGraphQLErrorMessage = error?.networkError?.result?.errors?.[0]?.message;
    const fallbackMessage = error?.message;
    const baseMessage =
      String(graphQLErrorMessage || networkGraphQLErrorMessage || fallbackMessage || 'gagal diproses.')
        .replace(/^GraphQL error:\s*/i, '')
        .trim();

    if (!baseMessage) {
      return 'gagal diproses.';
    }

    const normalized = baseMessage.toLowerCase();
    if (normalized.includes('nomor urut blok') && normalized.includes('company yang sama')) {
      return `${baseMessage}. Tetap lanjut import, lalu perbaiki baris ini (pilih estate/divisi yang sesuai).`;
    }

    return baseMessage;
  }

  async function fetchAllBlocksForImport(): Promise<BlockNode[]> {
    const collected: BlockNode[] = [];
    const existingIDs = new Set<string>();
    const limit = 200;
    let page = 1;

    while (true) {
      const result = await apolloClient.query<{ blocksPaginated: BlocksPaginatedPayload }>({
        query: GET_BLOCKS_PAGINATED,
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
        if (existingIDs.has(block.id)) {
          return;
        }
        existingIDs.add(block.id);
        collected.push(block);
      });

      if (page >= payload.pagination.pages || payload.data.length === 0) {
        break;
      }
      page += 1;
    }

    return collected;
  }

  async function handleImportFile(file: File) {
    if (!isSpreadsheetFile(file.name)) {
      toast({
        title: 'Format tidak didukung',
        description: 'Gunakan file .xlsx',
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
          description: 'Tidak ada data yang bisa diimpor.',
          variant: 'destructive',
        });
        return;
      }

      const divisionById = new Map<string, DivisionNode>();
      const divisionByCode = new Map<string, DivisionNode[]>();
      const divisionByName = new Map<string, DivisionNode[]>();
      const divisionCodeById = new Map<string, string>();

      divisions.forEach((division) => {
        divisionById.set(division.id, division);

        const trimmedDivisionCode = division.code?.trim() || '';
        if (trimmedDivisionCode) {
          divisionCodeById.set(division.id, trimmedDivisionCode);
          const codeKey = normalizeLookupKey(trimmedDivisionCode);
          const codeList = divisionByCode.get(codeKey) || [];
          codeList.push(division);
          divisionByCode.set(codeKey, codeList);
        }

        const nameKey = normalizeLookupKey(division.name);
        const nameList = divisionByName.get(nameKey) || [];
        nameList.push(division);
        divisionByName.set(nameKey, nameList);
      });

      const tarifById = new Map<string, TarifBlokNode>();
      const tarifByPerlakuan = new Map<string, TarifBlokNode[]>();
      tarifBloks.forEach((tarif) => {
        tarifById.set(tarif.id, tarif);
        const key = normalizeLookupKey(tarif.perlakuan);
        const list = tarifByPerlakuan.get(key) || [];
        list.push(tarif);
        tarifByPerlakuan.set(key, list);
      });

      const allCompanyBlocks = await fetchAllBlocksForImport();
      const existingBlockByKey = new Map<string, BlockNode>();
      const existingBlockByName = new Map<string, BlockNode>();
      const existingBlockBySequence = new Map<string, BlockNode>();
      const indexByBlockID = new Map<
        string,
        {
          codeKey: string;
          nameKey: string;
          sequenceKey: string | null;
        }
      >();
      const upsertBlockIndex = (block: BlockNode) => {
        const previous = indexByBlockID.get(block.id);
        if (previous) {
          existingBlockByKey.delete(previous.codeKey);
          existingBlockByName.delete(previous.nameKey);
          if (previous.sequenceKey) {
            existingBlockBySequence.delete(previous.sequenceKey);
          }
        }

        const codeKey = `${block.divisionId}::${normalizeLookupKey(block.blockCode)}`;
        const nameKey = normalizeLookupKey(block.name);
        const divisionCode = divisionCodeById.get(block.divisionId);
        const blockEstateID = divisionById.get(block.divisionId)?.estateId || block.division?.estate?.id || '';
        const sequence = parseBlockSequenceFromCode(block.blockCode, divisionCode);
        const sequenceKey =
          sequence !== null && blockEstateID ? `${blockEstateID}::${sequence}` : null;

        existingBlockByKey.set(codeKey, block);
        existingBlockByName.set(nameKey, block);
        if (sequenceKey) {
          existingBlockBySequence.set(sequenceKey, block);
        }

        indexByBlockID.set(block.id, {
          codeKey,
          nameKey,
          sequenceKey,
        });
      };
      allCompanyBlocks.forEach(upsertBlockIndex);

      let created = 0;
      let updated = 0;
      let failed = 0;
      const errorMessages: string[] = [];
      const failedRows: ImportFailureDetail[] = [];
      const addFailed = (row: number, record: string, reason: string) => {
        failed += 1;
        errorMessages.push(`Baris ${row}: ${reason}`);
        failedRows.push({
          row,
          record,
          reason,
        });
      };

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const excelRow = i + 2;

        const blockCode = getRowString(row, ['block_code', 'kode_blok', 'code', 'kode']);
        const name = getRowString(row, ['name', 'block_name', 'nama_blok', 'nama']);
        const divisionIdInput = getRowString(row, ['division_id', 'id_divisi']);
        const divisionCodeInput = getRowString(row, ['division_code', 'kode_divisi']);
        const divisionNameInput = getRowString(row, ['division_name', 'nama_divisi', 'division']);
        const recordLabel = `${blockCode || '(auto)'} / ${name || '-'}`;

        if (!name) {
          addFailed(excelRow, recordLabel, 'kolom name wajib diisi.');
          continue;
        }
        if (blockCode && blockCode.length > 50) {
          addFailed(excelRow, recordLabel, 'block_code maksimal 50 karakter.');
          continue;
        }
        if (name.length < 2 || name.length > 255) {
          addFailed(excelRow, recordLabel, 'name harus 2-255 karakter.');
          continue;
        }

        let division: DivisionNode | undefined;
        if (divisionIdInput) {
          division = divisionById.get(divisionIdInput);
        }
        if (!division && divisionCodeInput) {
          const byCode = divisionByCode.get(normalizeLookupKey(divisionCodeInput)) || [];
          if (byCode.length > 1) {
            addFailed(excelRow, recordLabel, 'division_code ambigu.');
            continue;
          }
          division = byCode[0];
        }
        if (!division && divisionNameInput) {
          const byName = divisionByName.get(normalizeLookupKey(divisionNameInput)) || [];
          if (byName.length > 1) {
            addFailed(excelRow, recordLabel, 'division_name ambigu.');
            continue;
          }
          division = byName[0];
        }

        if (!division) {
          addFailed(
            excelRow,
            recordLabel,
            'divisi tidak ditemukan (isi division_id atau division_code/division_name).',
          );
          continue;
        }
        if (!division.code?.trim()) {
          addFailed(excelRow, recordLabel, 'divisi belum memiliki kode, tidak bisa validasi/generate block_code.');
          continue;
        }
        const candidateSequence =
          blockCode && division.code ? parseBlockSequenceFromCode(blockCode, division.code) : null;

        const luasHaRaw = getRowString(row, ['luas_ha', 'luasha', 'luas']);
        const plantingYearRaw = getRowString(row, ['planting_year', 'tahun_tanam']);
        const cropType = getRowString(row, ['crop_type', 'jenis_tanaman']);
        const statusRaw = getRowString(row, ['status']);
        const istmRaw = getRowString(row, ['istm']);
        const tarifBlokIDInput = getRowString(row, ['tarif_blok_id', 'tarifblok_id']);
        const perlakuanInput = getRowString(row, ['perlakuan']);

        const luasHa = parseOptionalNumberValue(luasHaRaw);
        if (Number.isNaN(luasHa)) {
          addFailed(excelRow, recordLabel, 'nilai luas_ha tidak valid.');
          continue;
        }
        if (luasHa !== undefined && luasHa < 0) {
          addFailed(excelRow, recordLabel, 'nilai luas_ha tidak boleh negatif.');
          continue;
        }

        const plantingYear = parseOptionalIntegerValue(plantingYearRaw);
        if (Number.isNaN(plantingYear)) {
          addFailed(excelRow, recordLabel, 'nilai planting_year harus bilangan bulat.');
          continue;
        }
        if (plantingYear !== undefined && (plantingYear < 1900 || plantingYear > 2100)) {
          addFailed(excelRow, recordLabel, 'nilai planting_year harus antara 1900-2100.');
          continue;
        }
        if (cropType && cropType.length > 100) {
          addFailed(excelRow, recordLabel, 'nilai crop_type maksimal 100 karakter.');
          continue;
        }

        const status = parseStatus(statusRaw);
        if (!status) {
          addFailed(excelRow, recordLabel, 'status hanya boleh INTI atau KKPA.');
          continue;
        }

        const istm = parseISTM(istmRaw);
        if (!istm) {
          addFailed(excelRow, recordLabel, 'nilai istm tidak valid (Y/N).');
          continue;
        }

        let tarifBlokId = '';
        if (tarifBlokIDInput) {
          const tarif = tarifById.get(tarifBlokIDInput);
          if (!tarif) {
            addFailed(excelRow, recordLabel, 'tarif_blok_id tidak ditemukan.');
            continue;
          }
          tarifBlokId = tarif.id;
        } else if (perlakuanInput) {
          const tarifCandidates = tarifByPerlakuan.get(normalizeLookupKey(perlakuanInput)) || [];
          if (tarifCandidates.length > 1) {
            const activeTarif = tarifCandidates.filter((tarif) => tarif.isActive);
            if (activeTarif.length === 1) {
              tarifBlokId = activeTarif[0].id;
            } else {
              addFailed(excelRow, recordLabel, 'perlakuan ambigu, gunakan tarif_blok_id.');
              continue;
            }
          } else if (tarifCandidates.length === 1) {
            tarifBlokId = tarifCandidates[0].id;
          } else {
            addFailed(excelRow, recordLabel, 'perlakuan tidak ditemukan.');
            continue;
          }
        }

        const mapKey = blockCode ? `${division.id}::${normalizeLookupKey(blockCode)}` : '';
        const sequenceKey =
          candidateSequence !== null ? `${division.estateId}::${candidateSequence}` : '';
        const existingByCode = mapKey ? existingBlockByKey.get(mapKey) : undefined;
        const existingByName = existingBlockByName.get(normalizeLookupKey(name));
        const existingBySequence = sequenceKey ? existingBlockBySequence.get(sequenceKey) : undefined;

        let existing: BlockNode | undefined = existingByCode;
        if (!existing && existingByName && existingByName.divisionId === division.id) {
          existing = existingByName;
        }

        if (existingByName && (!existing || existingByName.id !== existing.id)) {
          addFailed(
            excelRow,
            recordLabel,
            `nama blok "${name}" sudah digunakan di company yang sama.`,
          );
          continue;
        }

        if (blockCode && existingBySequence && (!existing || existingBySequence.id !== existing.id)) {
          addFailed(
            excelRow,
            recordLabel,
            `nomor urut blok ${candidateSequence} sudah digunakan pada estate yang sama di company ini.`,
          );
          continue;
        }

        try {
          if (existing) {
            const updateInput: {
              id: string;
              name: string;
              luasHa: number | null;
              cropType: string | null;
              plantingYear: number | null;
              status: 'INTI' | 'KKPA';
              istm: 'Y' | 'N';
              tarifBlokId: string;
              blockCode?: string;
            } = {
              id: existing.id,
              name,
              luasHa: luasHa ?? null,
              cropType: cropType || null,
              plantingYear: plantingYear ?? null,
              status,
              istm,
              tarifBlokId,
            };
            if (blockCode && candidateSequence !== null) {
              updateInput.blockCode = blockCode;
            }

            const updateResult = await apolloClient.mutate<{ updateBlock?: BlockNode }>({
              mutation: UPDATE_BLOCK,
              variables: {
                input: updateInput,
              },
            });

            const updatedBlock = updateResult.data?.updateBlock;
            if (updatedBlock) {
              upsertBlockIndex(updatedBlock);
            }
            updated += 1;
          } else {
            const createResult = await apolloClient.mutate<{ createBlock?: BlockNode }>({
              mutation: CREATE_BLOCK,
              variables: {
                input: {
                  blockCode: blockCode && candidateSequence !== null ? blockCode : '',
                  name,
                  divisionId: division.id,
                  luasHa: luasHa ?? null,
                  cropType: cropType || null,
                  plantingYear: plantingYear ?? null,
                  status,
                  istm,
                  tarifBlokId,
                },
              },
            });

            const createdBlock = createResult.data?.createBlock;
            if (createdBlock) {
              upsertBlockIndex(createdBlock);
            }
            created += 1;
          }
        } catch (error: any) {
          addFailed(excelRow, recordLabel, getImportMutationErrorReason(error));
        }
      }

      await refetchBlocks();
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
          description: `Berhasil create ${created} dan update ${updated} blok.`,
        });
      } else {
        const previewErrors = errorMessages.slice(0, 3).join(' | ');
        toast({
          title: 'Import selesai dengan error',
          description: `Create ${created}, update ${updated}, gagal ${failed}. ${previewErrors}`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Import gagal',
        description: error?.message || 'Gagal membaca file XLSX.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  }

  async function handleImportInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await handleImportFile(file);
  }

  async function handleDownloadTemplate() {
    setIsDownloadingTemplate(true);
    try {
      await downloadXlsxTemplate('template_import_blok.xlsx', [
        {
          block_code: '',
          name: 'Blok 01',
          division_id: '',
          division_code: 'DIV-A',
          division_name: '',
          luas_ha: 12.5,
          crop_type: 'Sawit',
          planting_year: 2019,
          status: 'INTI',
          istm: 'N',
          tarif_blok_id: '',
          perlakuan: 'Perawatan Standar',
        },
        {
          block_code: '',
          name: 'Blok 02',
          division_id: '',
          division_code: '',
          division_name: 'Divisi B',
          luas_ha: '',
          crop_type: '',
          planting_year: '',
          status: 'KKPA',
          istm: 'Y',
          tarif_blok_id: '',
          perlakuan: '',
        },
      ]);
      toast({
        title: 'Template diunduh',
        description: 'Template import blok berhasil diunduh.',
      });
    } catch (error: any) {
      toast({
        title: 'Gagal mengunduh template',
        description: error?.message || 'Terjadi kesalahan saat membuat file template.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  }

  const LayoutWrapper: React.ComponentType<any> = withLayout ? CompanyAdminDashboardLayout : React.Fragment;
  const layoutProps = withLayout
    ? {
        title: 'Block Management',
        description: 'CRUD blok dengan status, ISTM, dan perlakuan dari master tarif blok',
      }
    : {};

  return (
    <LayoutWrapper {...layoutProps}>
      <div className="space-y-6">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
          >
            {isDownloadingTemplate ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Template XLSX
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleImportInputChange}
          />
          <Button
            variant="outline"
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting || loadingDivisions || loadingBlocks}
          >
            {isImporting ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isImporting ? 'Importing...' : 'Import XLSX'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              refetchCompanies();
              refetchEstates();
              refetchDivisions();
              refetchBlocks();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Block
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aturan Kode Blok</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc space-y-1 pl-5">
              <li>Format kode blok: kode divisi + nomor urut 3 digit (contoh: DIVA001).</li>
              <li>Jika create tanpa isi kode blok, sistem generate otomatis.</li>
              <li>Pada import, kosongkan block_code untuk create blok baru dengan auto-generate.</li>
              <li>Pada import, jika block_code tidak sesuai format divisi, create akan auto-generate dan update tidak memaksa perubahan kode blok.</li>
              <li>Nomor urut blok harus unik dalam scope estate yang sama di company yang sama.</li>
              <li>Jika nomor terbesar belum 999, sistem pakai nomor terbesar + 1.</li>
              <li>Jika sudah 999, sistem cari nomor kosong 001-999 dari yang paling kecil.</li>
              <li>Jika semua nomor 001-999 terpakai, blok baru tidak bisa dibuat.</li>
            </ul>
          </CardContent>
        </Card>

        {importSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Import Summary</CardTitle>
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

              {importSummary.failedRows.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Baris</TableHead>
                        <TableHead>Record</TableHead>
                        <TableHead>Alasan Gagal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importSummary.failedRows.map((item, index) => (
                        <TableRow key={`${item.row}-${index}`} className="bg-destructive/10">
                          <TableCell className="font-semibold text-destructive">{item.row}</TableCell>
                          <TableCell className="text-destructive">{item.record}</TableCell>
                          <TableCell className="text-destructive">{item.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Semua record berhasil diproses.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Square className="h-5 w-5" />
              Blocks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search blocks..."
                className="pl-9"
              />
            </div>

            <div className="overflow-x-auto rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Division (A-Z)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ISTM</TableHead>
                    <TableHead>Perlakuan</TableHead>
                    <TableHead className="text-right">Luas (Ha)</TableHead>
                    <TableHead className="text-right">Planting Year</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(loadingCompanies ||
                    loadingEstates ||
                    loadingDivisions ||
                    loadingBlocks) && (
                    <TableRow>
                      <TableCell colSpan={9}>Loading blocks...</TableCell>
                    </TableRow>
                  )}
                  {!loadingCompanies &&
                    !loadingEstates &&
                    !loadingDivisions &&
                    !loadingBlocks &&
                    blocks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9}>No blocks found.</TableCell>
                      </TableRow>
                    )}
                  {blocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell>
                        <Badge variant="outline">{block.blockCode}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{block.name}</TableCell>
                      <TableCell>
                        {block.division?.name || divisionNameByID.get(block.divisionId) || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={block.status === 'KKPA' ? 'secondary' : 'default'}>
                          {block.status || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={block.istm === 'Y' ? 'default' : 'outline'}>
                          {block.istm || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{block.perlakuan || block.tarifBlok?.perlakuan || '-'}</TableCell>
                      <TableCell className="text-right">
                        {block.luasHa === null || block.luasHa === undefined
                          ? '-'
                          : block.luasHa.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right">
                        {block.plantingYear === null || block.plantingYear === undefined
                          ? '-'
                          : block.plantingYear}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(block)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingBlock(block)}
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

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Menampilkan {startItem}-{endItem} dari {totalBlocks} blok
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Per halaman</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={effectivePage <= 1}
                >
                  Prev
                </Button>
                <span className="min-w-24 text-center text-sm">
                  Page {effectivePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={effectivePage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Kode blok dibuat otomatis saat simpan (format: kode divisi + nomor urut).
            </div>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Block name"
            />
            <Select value={formDivisionId} onValueChange={setFormDivisionId}>
              <SelectTrigger>
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
            <Input
              value={formLuasHa}
              onChange={(e) => setFormLuasHa(e.target.value)}
              placeholder="Luas Ha (optional)"
            />
            <Input
              value={formPlantingYear}
              onChange={(e) => setFormPlantingYear(e.target.value)}
              placeholder="Planting year (optional)"
            />
            <Input
              value={formCropType}
              onChange={(e) => setFormCropType(e.target.value)}
              placeholder="Crop type (optional)"
            />
            <Select
              value={formStatus}
              onValueChange={(value) => setFormStatus(value as 'INTI' | 'KKPA')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INTI">INTI</SelectItem>
                <SelectItem value="KKPA">KKPA</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={formISTM}
              onValueChange={(value) => setFormISTM(value as 'Y' | 'N')}
            >
              <SelectTrigger>
                <SelectValue placeholder="ISTM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Y">Y</SelectItem>
                <SelectItem value="N">N</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={formTarifBlokID || '__NONE__'}
              onValueChange={(value) => setFormTarifBlokID(value === '__NONE__' ? '' : value)}
              disabled={loadingTarifBloks}
            >
              <SelectTrigger>
                <SelectValue placeholder="Perlakuan (Master Tarif Blok)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">- Pilih Perlakuan -</SelectItem>
                {tarifBloks.map((tarif) => (
                  <SelectItem key={tarif.id} value={tarif.id}>
                    {tarif.perlakuan}{!tarif.isActive ? ' (INACTIVE)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <Dialog open={!!editingBlock} onOpenChange={(open) => !open && setEditingBlock(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={formBlockCode}
              onChange={(e) => setFormBlockCode(e.target.value)}
              placeholder="Block code"
            />
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Block name"
            />
            <Input
              value={formLuasHa}
              onChange={(e) => setFormLuasHa(e.target.value)}
              placeholder="Luas Ha (optional)"
            />
            <Input
              value={formPlantingYear}
              onChange={(e) => setFormPlantingYear(e.target.value)}
              placeholder="Planting year (optional)"
            />
            <Input
              value={formCropType}
              onChange={(e) => setFormCropType(e.target.value)}
              placeholder="Crop type (optional)"
            />
            <Select
              value={formStatus}
              onValueChange={(value) => setFormStatus(value as 'INTI' | 'KKPA')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INTI">INTI</SelectItem>
                <SelectItem value="KKPA">KKPA</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={formISTM}
              onValueChange={(value) => setFormISTM(value as 'Y' | 'N')}
            >
              <SelectTrigger>
                <SelectValue placeholder="ISTM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Y">Y</SelectItem>
                <SelectItem value="N">N</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={formTarifBlokID || '__NONE__'}
              onValueChange={(value) => setFormTarifBlokID(value === '__NONE__' ? '' : value)}
              disabled={loadingTarifBloks}
            >
              <SelectTrigger>
                <SelectValue placeholder="Perlakuan (Master Tarif Blok)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">- Pilih Perlakuan -</SelectItem>
                {tarifBloks.map((tarif) => (
                  <SelectItem key={tarif.id} value={tarif.id}>
                    {tarif.perlakuan}{!tarif.isActive ? ' (INACTIVE)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBlock(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingBlock} onOpenChange={(open) => !open && setDeletingBlock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete block?</AlertDialogTitle>
            <AlertDialogDescription>
              Blok "{deletingBlock?.name}" akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => {
                if (deletingBlock) {
                  deleteBlock({ variables: { id: deletingBlock.id } });
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
