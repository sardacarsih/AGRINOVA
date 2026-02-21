'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { AsistenDashboardLayout } from '@/components/layouts/role-layouts/AsistenDashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { EmployeeForm } from '@/components/dashboard/employee-form';
import { useDivisions } from '@/features/master-data/hooks/useDivisions';
import {
  downloadXlsxTemplate,
  getRowString,
  isSpreadsheetFile,
  normalizeLookupKey,
  parseFirstWorksheetRows,
} from '@/features/master-data/utils/xlsx-import';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RefreshCw,
  Search,
  MoreHorizontal,
  UserCheck,
  Edit,
  Eye,
  Trash2,
  Users,
  Briefcase,
  Filter,
  UserCog,
  Building,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  Upload,
} from 'lucide-react';
import {
  Employee,
  EmployeeType,
  EmployeeFilters,
  EmployeeAPI,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EMPLOYEE_TYPE_LABELS,
} from '@/lib/api/employee-api';

type DashboardLayoutProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
};

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

type ImportDivisionNode = {
  id: string;
  name: string;
  code?: string | null;
  companyId?: string;
  estate?: {
    company?: {
      id?: string;
    } | null;
  } | null;
};

function parseImportEmployeeType(rawValue: string): EmployeeType | undefined | null {
  const compact = normalizeLookupKey(rawValue).replace(/[\s\-_]+/g, '');
  if (!compact) {
    return undefined;
  }

  if (['bulanan', 'monthly', 'permanent'].includes(compact)) {
    return EmployeeType.BULANAN;
  }
  if (['kht', 'harian tetap', 'hariantetap'].includes(compact)) {
    return EmployeeType.KHT;
  }
  if (['borongan', 'piecerate'].includes(compact)) {
    return EmployeeType.BORONGAN;
  }
  if (['khl', 'harianlepas', 'casual'].includes(compact)) {
    return EmployeeType.KHL;
  }

  return null;
}

function parseImportIsActive(rawValue: string): boolean | undefined | null {
  const compact = normalizeLookupKey(rawValue).replace(/\s+/g, '');
  if (!compact) {
    return undefined;
  }

  if (['1', 'true', 'yes', 'ya', 'aktif', 'active'].includes(compact)) {
    return true;
  }
  if (['0', 'false', 'no', 'tidak', 'nonaktif', 'inactive'].includes(compact)) {
    return false;
  }

  return null;
}

function mapImportEmployeeErrorReason(error: any): string {
  const message = error?.message || 'gagal diproses.';
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes('duplicate key') ||
    normalizedMessage.includes('idx_employee_nik_company') ||
    normalizedMessage.includes('already exists')
  ) {
    return 'employee_id sudah terdaftar pada perusahaan ini.';
  }

  if (
    normalizedMessage.includes('access denied') ||
    normalizedMessage.includes('permission') ||
    normalizedMessage.includes('forbidden')
  ) {
    return 'Anda tidak memiliki izin untuk import karyawan.';
  }

  if (normalizedMessage.includes('company scope')) {
    return 'Record berada di luar scope perusahaan Anda.';
  }

  return message;
}

function getRoleLayout(role?: string): React.ComponentType<DashboardLayoutProps> {
  switch (role) {
    case 'MANAGER':
      return ManagerDashboardLayout;
    case 'ASISTEN':
      return AsistenDashboardLayout;
    case 'COMPANY_ADMIN':
    default:
      return CompanyAdminDashboardLayout;
  }
}

export function WorkersDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const companyId =
    user?.companyId ||
    (user as any)?.company?.id ||
    (user as any)?.companies?.[0]?.id ||
    (user as any)?.assignedCompanies?.[0];

  const canManageWorkers = ['COMPANY_ADMIN', 'MANAGER', 'ASISTEN'].includes(user?.role || '');
  const canAddWorkers = ['COMPANY_ADMIN', 'MANAGER'].includes(user?.role || '');
  const LayoutComponent = getRoleLayout(user?.role);
  const { divisions } = useDivisions(companyId ? { companyId } : { companyId: '' });

  const divisionNameByCompanyAndID = useMemo(() => {
    const map = new Map<string, string>();

    for (const division of divisions || []) {
      const divisionCompanyId = division.companyId || division.estate?.company?.id;
      if (!divisionCompanyId) {
        continue;
      }

      map.set(`${divisionCompanyId}:${division.id}`, division.name);
    }

    return map;
  }, [divisions]);

  const getDivisionNameByEmployee = useCallback((employee: Employee) => {
    if (!employee.divisionId) {
      return '-';
    }

    return divisionNameByCompanyAndID.get(`${employee.companyId}:${employee.divisionId}`) || '-';
  }, [divisionNameByCompanyAndID]);

  const divisionOptions = useMemo(() => {
    return Array.from(divisionNameByCompanyAndID.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [divisionNameByCompanyAndID]);

  const divisionLookups = useMemo(() => {
    const byId = new Map<string, ImportDivisionNode>();
    const byCode = new Map<string, ImportDivisionNode>();
    const byName = new Map<string, ImportDivisionNode>();

    for (const division of (divisions || []) as ImportDivisionNode[]) {
      const divisionCompanyId = division.companyId || division.estate?.company?.id;
      if (companyId && divisionCompanyId && divisionCompanyId !== companyId) {
        continue;
      }

      byId.set(division.id, division);

      if (division.code) {
        byCode.set(normalizeLookupKey(division.code), division);
      }

      if (division.name) {
        byName.set(normalizeLookupKey(division.name), division);
      }
    }

    return { byId, byCode, byName };
  }, [companyId, divisions]);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: EmployeeFilters = {
        companyId: companyId || undefined,
        page: currentPage,
        limit: pageSize,
        search: searchTerm.trim() || undefined,
        employeeType: employeeTypeFilter !== 'all' ? (employeeTypeFilter as EmployeeType) : undefined,
        isActive:
          statusFilter === 'all'
            ? undefined
            : statusFilter === 'active',
        divisionId:
          divisionFilter !== 'all'
            ? divisionFilter.split(':')[1]
            : undefined,
        sortBy: 'fullName',
        sortOrder: 'asc',
      };

      const employeesData = await EmployeeAPI.getEmployees(filters);

      setEmployees(Array.isArray(employeesData?.data) ? employeesData.data : []);
      setPagination({
        page: employeesData?.pagination?.page || currentPage,
        limit: employeesData?.pagination?.limit || pageSize,
        total: employeesData?.pagination?.total || 0,
        totalPages: employeesData?.pagination?.totalPages || 1,
      });
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data karyawan');
      toast.error('Gagal memuat data karyawan');
    } finally {
      setLoading(false);
    }
  }, [
    companyId,
    currentPage,
    divisionFilter,
    employeeTypeFilter,
    pageSize,
    searchTerm,
    statusFilter,
  ]);

  const fetchStatistics = useCallback(async () => {
    try {
      const statsData = await EmployeeAPI.getEmployeeStatistics();
      setStatistics(statsData || {});
    } catch {
      // keep existing statistics if request fails
    }
  }, []);

  React.useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  React.useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const departments = useMemo(() => {
    if (!Array.isArray(employees)) {
      return [];
    }

    const uniqueDepts = [...new Set(employees.map((e) => e?.department).filter(Boolean))];
    return uniqueDepts.sort();
  }, [employees]);

  const totalFilteredEmployees = pagination.total;
  const totalPages = Math.max(1, pagination.totalPages);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, employeeTypeFilter, statusFilter, departmentFilter, divisionFilter]);

  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const loadAllCompanyEmployees = useCallback(async (): Promise<Employee[]> => {
    const allEmployees: Employee[] = [];
    let page = 1;
    const limit = 200;

    while (true) {
      const response = await EmployeeAPI.getEmployees({
        companyId: companyId || undefined,
        page,
        limit,
        sortBy: 'fullName',
        sortOrder: 'asc',
      });

      allEmployees.push(...response.data);

      if (page >= response.pagination.totalPages) {
        break;
      }
      page += 1;
    }

    return allEmployees;
  }, [companyId]);

  const openCreateForm = () => {
    setSelectedEmployee(null);
    setIsFormOpen(true);
  };

  const openEditForm = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedEmployee(null);
  };

  const handleSubmitEmployee = async (data: CreateEmployeeRequest | UpdateEmployeeRequest) => {
    try {
      setSubmitting(true);

      if (selectedEmployee) {
        await EmployeeAPI.updateEmployee(selectedEmployee.id, data);
        toast.success('Data karyawan berhasil diperbarui');
      } else {
        if (!companyId) {
          throw new Error('Konteks perusahaan tidak ditemukan untuk akun ini');
        }

        const createData = data as CreateEmployeeRequest;
        if (!createData.employeeId || !createData.fullName) {
          throw new Error('ID karyawan dan nama lengkap wajib diisi');
        }

        await EmployeeAPI.createEmployee({
          ...createData,
          companyId,
        });
        toast.success('Karyawan berhasil ditambahkan');
      }

      closeForm();
      await Promise.all([fetchEmployees(), fetchStatistics()]);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan data karyawan');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await EmployeeAPI.deleteEmployee(employeeId);
      toast.success('Karyawan berhasil dihapus');
      await Promise.all([fetchEmployees(), fetchStatistics()]);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus karyawan');
    }
  };

  const handleImportFile = useCallback(async (file: File) => {
    if (!isSpreadsheetFile(file.name)) {
      toast.error('Format file tidak didukung. Gunakan .xlsx atau .xls');
      return;
    }

    if (!companyId) {
      toast.error('Konteks perusahaan tidak ditemukan untuk akun ini');
      return;
    }

    setIsImporting(true);
    setImportSummary(null);

    try {
      const rows = await parseFirstWorksheetRows(file);
      if (rows.length === 0) {
        toast.error('File kosong, tidak ada data yang bisa diimpor');
        return;
      }

      const allExistingEmployees = await loadAllCompanyEmployees();
      const existingEmployeeById = new Map<string, Employee>();
      for (const employee of allExistingEmployees) {
        if (employee.companyId === companyId && employee.employeeId) {
          existingEmployeeById.set(normalizeLookupKey(employee.employeeId), employee);
        }
      }

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

        const employeeIdRaw = getRowString(row, ['employee_id', 'nik', 'id_karyawan', 'employeeid', 'id']);
        const fullName = getRowString(row, ['full_name', 'name', 'nama', 'nama_karyawan']);
        const position = getRowString(row, ['position', 'role', 'jabatan']);
        const employeeTypeInput = getRowString(row, ['employee_type', 'jenis_karyawan', 'tipe_karyawan', 'type']);
        const divisionIdInput = getRowString(row, ['division_id', 'divisi_id', 'id_divisi']);
        const divisionCodeInput = getRowString(row, ['division_code', 'kode_divisi']);
        const divisionNameInput = getRowString(row, ['division_name', 'nama_divisi', 'divisi']);
        const statusInput = getRowString(row, ['is_active', 'status', 'active']);

        const employeeId = employeeIdRaw.trim().toUpperCase();
        const recordLabel = `${employeeId || '-'} / ${fullName || '-'}`;

        if (!employeeId || !fullName) {
          addFailed(excelRow, recordLabel, 'kolom employee_id/nik dan full_name wajib diisi.');
          continue;
        }

        if (employeeId.length < 3 || employeeId.length > 20 || !/^[A-Z0-9_-]+$/.test(employeeId)) {
          addFailed(excelRow, recordLabel, 'employee_id harus 3-20 karakter (huruf, angka, _ atau -).');
          continue;
        }

        if (fullName.length < 2 || fullName.length > 100) {
          addFailed(excelRow, recordLabel, 'full_name harus 2-100 karakter.');
          continue;
        }

        const parsedType = parseImportEmployeeType(employeeTypeInput);
        if (employeeTypeInput && parsedType === null) {
          addFailed(excelRow, recordLabel, 'employee_type tidak valid. Gunakan BULANAN, KHT, BORONGAN, atau KHL.');
          continue;
        }

        const parsedIsActive = parseImportIsActive(statusInput);
        if (statusInput && parsedIsActive === null) {
          addFailed(excelRow, recordLabel, 'status/is_active tidak valid. Gunakan aktif/nonaktif atau true/false.');
          continue;
        }

        let divisionId: string | undefined;
        if (divisionIdInput || divisionCodeInput || divisionNameInput) {
          const matchedDivision =
            divisionLookups.byId.get(divisionIdInput) ||
            divisionLookups.byCode.get(normalizeLookupKey(divisionCodeInput)) ||
            divisionLookups.byName.get(normalizeLookupKey(divisionNameInput));

          if (!matchedDivision) {
            addFailed(excelRow, recordLabel, 'divisi tidak ditemukan (isi division_id, division_code, atau division_name yang valid).');
            continue;
          }

          divisionId = matchedDivision.id;
        }

        const mapKey = normalizeLookupKey(employeeId);
        const existingEmployee = existingEmployeeById.get(mapKey);

        try {
          if (existingEmployee) {
            const updatePayload: UpdateEmployeeRequest = {
              fullName,
              position: position || undefined,
              employeeType: parsedType || undefined,
              divisionId,
            };

            if (parsedIsActive !== undefined && parsedIsActive !== null) {
              updatePayload.isActive = parsedIsActive;
            }

            const updatedEmployee = await EmployeeAPI.updateEmployee(existingEmployee.id, updatePayload);
            existingEmployeeById.set(mapKey, updatedEmployee);
            updated += 1;
          } else {
            const createPayload: CreateEmployeeRequest = {
              companyId,
              employeeId,
              fullName,
              position: position || undefined,
              employeeType: parsedType || undefined,
              divisionId,
            };

            if (parsedIsActive !== undefined && parsedIsActive !== null) {
              createPayload.isActive = parsedIsActive;
            }

            const createdEmployee = await EmployeeAPI.createEmployee(createPayload);
            existingEmployeeById.set(mapKey, createdEmployee);
            created += 1;
          }
        } catch (error: any) {
          const reason = mapImportEmployeeErrorReason(error);
          addFailed(excelRow, recordLabel, reason);
        }
      }

      await Promise.all([fetchEmployees(), fetchStatistics()]);
      setImportSummary({
        created,
        updated,
        failed,
        failedRows,
        importedAt: new Date().toISOString(),
      });

      if (failed === 0) {
        toast.success(`Import selesai. Create ${created}, update ${updated}.`);
      } else {
        const preview = errorMessages.slice(0, 3).join(' | ');
        toast.error(`Import selesai dengan error. Create ${created}, update ${updated}, gagal ${failed}. ${preview}`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Gagal membaca file XLSX');
    } finally {
      setIsImporting(false);
    }
  }, [companyId, divisionLookups, fetchEmployees, fetchStatistics, loadAllCompanyEmployees]);

  const handleImportInputChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    await handleImportFile(file);
  }, [handleImportFile]);

  const handleDownloadTemplate = useCallback(async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadXlsxTemplate('template_import_karyawan.xlsx', [
        {
          employee_id: 'EMP001',
          full_name: 'Ahmad Saputra',
          employee_type: 'BULANAN',
          position: 'Mandor Panen',
          division_code: 'DIV-A',
          is_active: 'aktif',
        },
        {
          employee_id: 'EMP002',
          full_name: 'Rudi Hartono',
          employee_type: 'KHL',
          position: 'Pemanen',
          division_name: 'Divisi B',
          is_active: 'true',
        },
      ]);
      toast.success('Template import karyawan berhasil diunduh');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal mengunduh template import');
    } finally {
      setIsDownloadingTemplate(false);
    }
  }, []);

  const getEmployeeTypeBadgeVariant = (type: EmployeeType) => {
    const variants: Record<EmployeeType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      BULANAN: 'default',
      KHT: 'secondary',
      BORONGAN: 'outline',
      KHL: 'destructive',
    };
    return variants[type] || 'outline';
  };

  if (error) {
    return (
      <LayoutComponent
        title="Manajemen Karyawan"
        description="Kelola data karyawan perusahaan"
      >
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Terjadi kesalahan saat memuat data karyawan: {error}</p>
              <Button onClick={() => fetchEmployees()} className="mt-4" variant="outline">
                Coba Lagi
              </Button>
            </div>
          </CardContent>
        </Card>
      </LayoutComponent>
    );
  }

  return (
    <LayoutComponent
      title="Manajemen Karyawan"
      description="Kelola data karyawan perusahaan"
      breadcrumbItems={[{ label: 'Karyawan', href: '/employees' }]}
    >
      <div className="space-y-6">
        {canAddWorkers && (
          <div className="flex flex-wrap justify-end gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportInputChange}
            />
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
            >
              {isDownloadingTemplate ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Template XLSX
            </Button>
            <Button
              variant="outline"
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isImporting ? 'Importing...' : 'Import XLSX'}
            </Button>
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Karyawan
            </Button>
          </div>
        )}

        {importSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Import Karyawan</CardTitle>
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
                        <TableRow key={`${item.row}-${index}`}>
                          <TableCell>{item.row}</TableCell>
                          <TableCell>{item.record}</TableCell>
                          <TableCell>{item.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Semua record berhasil diproses.</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16" /> : statistics?.total || employees.length}
              </div>
              <p className="text-xs text-muted-foreground">Semua karyawan terdaftar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Karyawan Aktif</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  statistics?.active || employees.filter((e) => e?.isActive).length
                )}
              </div>
              <p className="text-xs text-muted-foreground">Karyawan aktif saat ini</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rekrutmen Baru</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16" /> : statistics?.recentHires || 0}
              </div>
              <p className="text-xs text-muted-foreground">30 hari terakhir</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departemen</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? <Skeleton className="h-8 w-16" /> : departments.length}
              </div>
              <p className="text-xs text-muted-foreground">Jumlah departemen aktif</p>
            </CardContent>
          </Card>
        </div>

        {statistics?.byType && (
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Karyawan per Jenis</CardTitle>
              <CardDescription>Ringkasan jumlah karyawan berdasarkan jenis kepegawaian</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(statistics.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{EMPLOYEE_TYPE_LABELS[type as EmployeeType] || type}</p>
                      <p className="text-2xl font-bold">{Number(count)}</p>
                    </div>
                    <Badge variant={getEmployeeTypeBadgeVariant(type as EmployeeType)}>
                      {type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Direktori Karyawan</CardTitle>
            <CardDescription>Lihat dan kelola seluruh karyawan di perusahaan Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari karyawan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select
                    value={employeeTypeFilter}
                    onChange={(e) => setEmployeeTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="all">Semua Jenis</option>
                    {Object.entries(EMPLOYEE_TYPE_LABELS).map(([type, label]) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="all">Semua Departemen</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <select
                    value={divisionFilter}
                    onChange={(e) => setDivisionFilter(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="all">Semua Divisi</option>
                    {divisionOptions.map((division) => (
                      <option key={division.key} value={division.key}>
                        {division.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif Saja</option>
                    <option value="inactive">Nonaktif Saja</option>
                  </select>
                </div>
              </div>
              <Button onClick={() => Promise.all([fetchEmployees(), fetchStatistics()])} variant="outline">
                <UserCog className="h-4 w-4 mr-2" />
                Muat Ulang
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Karyawan</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Divisi</TableHead>
                      <TableHead>Posisi</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal Masuk</TableHead>
                      {canManageWorkers && <TableHead className="text-right">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canManageWorkers ? 10 : 9} className="text-center py-8 text-muted-foreground">
                          {searchTerm || employeeTypeFilter !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all' || divisionFilter !== 'all'
                            ? 'Tidak ada karyawan yang sesuai filter'
                            : 'Belum ada data karyawan'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((employee) => (
                        <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.employeeId}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.fullName}</div>
                            {employee.address && (
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {employee.address.length > 30 ? `${employee.address.substring(0, 30)}...` : employee.address}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEmployeeTypeBadgeVariant(employee.employeeType)}>
                            {EMPLOYEE_TYPE_LABELS[employee.employeeType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                            {employee.department || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                            {getDivisionNameByEmployee(employee)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                            {employee.position || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {employee.phone ? (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                              {employee.phone}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                            {employee.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            {employee.hireDate
                              ? new Date(employee.hireDate).toLocaleDateString('id-ID')
                              : new Date(employee.createdAt).toLocaleDateString('id-ID')}
                          </div>
                        </TableCell>
                        {canManageWorkers && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Buka menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setViewingEmployee(employee)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Lihat Detail
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditForm(employee)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Ubah Karyawan
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user?.role === 'COMPANY_ADMIN' && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus Karyawan
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Hapus Karyawan</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Hapus "{employee.fullName}"? Data akan dinonaktifkan (soft delete).
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteEmployee(employee.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Ya, Hapus
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {totalFilteredEmployees > 0 && (
                <div className="flex flex-col gap-3 border-t px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Menampilkan {(currentPage - 1) * pageSize + 1}-
                      {Math.min(currentPage * pageSize, totalFilteredEmployees)} dari {totalFilteredEmployees} karyawan
                    </span>
                    <span>|</span>
                    <span>Halaman {currentPage} dari {totalPages}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={String(pageSize)}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="10">10 / halaman</option>
                      <option value="25">25 / halaman</option>
                      <option value="50">50 / halaman</option>
                      <option value="100">100 / halaman</option>
                    </select>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Sebelumnya
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      Berikutnya
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setSelectedEmployee(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'Ubah Karyawan' : 'Tambah Karyawan'}</DialogTitle>
            <DialogDescription>
              {selectedEmployee
                ? 'Perbarui informasi karyawan'
                : 'Lengkapi data karyawan untuk membuat entri baru'}
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            employee={selectedEmployee || undefined}
            companyId={selectedEmployee?.companyId || companyId}
            onSubmit={handleSubmitEmployee}
            onCancel={closeForm}
            isLoading={submitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEmployee} onOpenChange={(open) => !open && setViewingEmployee(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detail Karyawan</DialogTitle>
            <DialogDescription>Informasi karyawan (hanya baca)</DialogDescription>
          </DialogHeader>
          {viewingEmployee && (
            <div className="space-y-3 text-sm">
              <div><strong>ID:</strong> {viewingEmployee.employeeId}</div>
              <div><strong>Nama:</strong> {viewingEmployee.fullName}</div>
              <div><strong>Jenis:</strong> {EMPLOYEE_TYPE_LABELS[viewingEmployee.employeeType]}</div>
              <div><strong>Posisi:</strong> {viewingEmployee.position || '-'}</div>
              <div><strong>Departemen:</strong> {viewingEmployee.department || '-'}</div>
              <div><strong>Divisi:</strong> {getDivisionNameByEmployee(viewingEmployee)}</div>
              <div><strong>Telepon:</strong> {viewingEmployee.phone || '-'}</div>
              <div><strong>Alamat:</strong> {viewingEmployee.address || '-'}</div>
              <div><strong>Status:</strong> {viewingEmployee.isActive ? 'Aktif' : 'Nonaktif'}</div>
              <div><strong>Dibuat:</strong> {new Date(viewingEmployee.createdAt).toLocaleString('id-ID')}</div>
              <div><strong>Diperbarui:</strong> {new Date(viewingEmployee.updatedAt).toLocaleString('id-ID')}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </LayoutComponent>
  );
}
