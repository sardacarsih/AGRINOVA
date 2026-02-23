'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useApolloClient } from '@apollo/client';
import { format } from 'date-fns';
import {
    Loader2,
    Download,
    ArrowLeft,
    ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

// Layout import
import { ManagerDashboardLayout } from '@/components/layouts/role-layouts/ManagerDashboardLayout';
import { GET_BKM_POTONG_BUAH_FLAT, BkmPotongBuahFlatData, BkmPotongBuahFlatVars } from '@/lib/apollo/queries/bkm-report';
import { GET_MY_ASSIGNMENTS, GetMyAssignmentsResponse } from '@/lib/apollo/queries/harvest';
import { useAuth } from '@/hooks/use-auth';
import { ALL_COMPANIES_SCOPE, useCompanyScope } from '@/contexts/company-scope-context';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// Helper to format number
const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num);
};

const ALL_SCOPE = ALL_COMPANIES_SCOPE;

type CompanyScopeOption = {
    id: string;
    name: string;
};

type EstateScopeOption = {
    id: string;
    name: string;
    code: string;
    companyId: string;
};

export default function ManagerBkmReportPage() {
    const { user } = useAuth();
    const {
        isAreaManager: isAreaManagerScope,
        availableCompanies: globalCompanyOptions,
        selectedCompanyId: globalSelectedCompanyId,
        setSelectedCompanyId: setGlobalSelectedCompanyId,
    } = useCompanyScope();
    const client = useApolloClient();
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'MM'));
    const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'));
    const [localSelectedCompanyId, setLocalSelectedCompanyId] = useState<string>(ALL_SCOPE);
    const [selectedEstateCode, setSelectedEstateCode] = useState<string>(ALL_SCOPE);

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const limit = 10;

    // Export state
    const [isExporting, setIsExporting] = useState(false);

    const periode = `${selectedYear}${selectedMonth}`;
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 10 }, (_, idx) => String(currentYear - 5 + idx));
    const monthOptions = [
        { value: '01', label: 'Januari' },
        { value: '02', label: 'Februari' },
        { value: '03', label: 'Maret' },
        { value: '04', label: 'April' },
        { value: '05', label: 'Mei' },
        { value: '06', label: 'Juni' },
        { value: '07', label: 'Juli' },
        { value: '08', label: 'Agustus' },
        { value: '09', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' },
    ];

    const { data: assignmentsData } = useQuery<GetMyAssignmentsResponse>(GET_MY_ASSIGNMENTS, {
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-first',
    });

    const isAreaManager = isAreaManagerScope || user?.role === 'AREA_MANAGER';
    const selectedCompanyId = isAreaManager ? globalSelectedCompanyId : localSelectedCompanyId;
    const setSelectedCompanyId = React.useCallback(
        (value: string) => {
            if (isAreaManager) {
                setGlobalSelectedCompanyId(value);
                return;
            }
            setLocalSelectedCompanyId(value);
        },
        [isAreaManager, setGlobalSelectedCompanyId]
    );

    const assignmentCompanyOptions = useMemo<CompanyScopeOption[]>(() => {
        const assignmentCompanies = assignmentsData?.myAssignments?.companies || [];
        if (assignmentCompanies.length > 0) {
            return assignmentCompanies.map((company) => ({
                id: String(company.id),
                name: company.name || String(company.id),
            }));
        }

        const fallbackIds = Array.isArray(user?.assignedCompanies) ? user.assignedCompanies : [];
        const fallbackNames = Array.isArray(user?.assignedCompanyNames) ? user.assignedCompanyNames : [];
        return fallbackIds
            .filter(Boolean)
            .map((id, index) => ({
                id,
                name: fallbackNames[index] || id,
            }));
    }, [assignmentsData?.myAssignments?.companies, user?.assignedCompanies, user?.assignedCompanyNames]);

    const companyOptions = useMemo<CompanyScopeOption[]>(() => {
        if (isAreaManager && globalCompanyOptions.length > 0) {
            return globalCompanyOptions;
        }
        return assignmentCompanyOptions;
    }, [assignmentCompanyOptions, globalCompanyOptions, isAreaManager]);

    const estateOptions = useMemo<EstateScopeOption[]>(() => {
        const estates = assignmentsData?.myAssignments?.estates || [];
        const dedup = new Map<string, EstateScopeOption>();

        estates.forEach((estate) => {
            if (!estate?.code) return;
            const code = String(estate.code).trim();
            if (!code) return;

            dedup.set(code, {
                id: String(estate.id),
                name: estate.name || code,
                code,
                companyId: String(estate.companyId || ''),
            });
        });

        return Array.from(dedup.values()).sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }, [assignmentsData?.myAssignments?.estates]);

    const filteredEstateOptions = useMemo(() => {
        if (selectedCompanyId === ALL_SCOPE) return estateOptions;
        return estateOptions.filter((estate) => estate.companyId === selectedCompanyId);
    }, [estateOptions, selectedCompanyId]);

    useEffect(() => {
        if (selectedEstateCode === ALL_SCOPE) return;
        const exists = filteredEstateOptions.some((estate) => estate.code === selectedEstateCode);
        if (!exists) {
            setSelectedEstateCode(ALL_SCOPE);
        }
    }, [filteredEstateOptions, selectedEstateCode]);

    useEffect(() => {
        setPage(1);
    }, [selectedMonth, selectedYear, selectedCompanyId, selectedEstateCode, limit]);

    const reportFilter = useMemo<BkmPotongBuahFlatVars['filter']>(() => {
        const filter: BkmPotongBuahFlatVars['filter'] = {
            periode: parseInt(periode, 10) || 0,
        };

        if (selectedCompanyId !== ALL_SCOPE) {
            filter.companyId = selectedCompanyId;
        }

        if (selectedEstateCode !== ALL_SCOPE) {
            filter.estate = selectedEstateCode;
        }

        return filter;
    }, [periode, selectedCompanyId, selectedEstateCode]);

    const { data, loading, error } = useQuery<BkmPotongBuahFlatData, BkmPotongBuahFlatVars>(
        GET_BKM_POTONG_BUAH_FLAT,
        {
            variables: {
                filter: reportFilter,
                page,
                limit
            },
            fetchPolicy: 'cache-and-network',
            nextFetchPolicy: 'cache-first',
        }
    );

    const report = data?.bkmPotongBuahFlat;
    const totalPages = report ? Math.ceil(report.total / limit) : 0;

    const handleExportExcel = async () => {
        if (!report) return;

        try {
            setIsExporting(true);
            const XLSX = await import('xlsx');

            // Fetch ALL data for export
            const result = await client.query<BkmPotongBuahFlatData, BkmPotongBuahFlatVars>({
                query: GET_BKM_POTONG_BUAH_FLAT,
                variables: {
                    filter: reportFilter,
                    page: 1,
                    limit: 100000
                },
                fetchPolicy: 'network-only',
            });

            const allData = result.data.bkmPotongBuahFlat.data;

            if (allData.length === 0) {
                alert("Tidak ada data untuk diexport.");
                return;
            }

            // Prepare data for Excel
            const exportData = allData.map(item => ({
                Tanggal: item.tanggal,
                Estate: item.estate,
                Divisi: item.divisi,
                Blok: item.blok,
                NIK: item.nik,
                Nama: item.nama,
                "Qty 1": item.qtyp1,
                "Sat 1": item.satp1 || '-',
                "Qty P2": item.qtyp2,
                "Sat 2": item.satp2 || '-',
                "Total Qty": item.qty,
                "Satuan": item.satuan,
                "Jumlah (Rp)": item.jumlah
            }));

            // Generate Worksheet
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Generate Workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Laporan BKM");

            // Save File
            XLSX.writeFile(wb, `BKM_Report_${periode}_Full.xlsx`);

        } catch (err) {
            console.error("Export failed:", err);
            alert("Gagal mengexport data ke Excel.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <ManagerDashboardLayout
            title="Laporan Potong Buah (BKM)"
            description="Laporan detail pekerjaan potong buah (41001) per periode."
            contentMaxWidthClass="max-w-[1700px]"
            contentPaddingClass="p-3 sm:p-4 lg:p-5"
        >
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-bold tracking-tight">Laporan Potong Buah (BKM)</h1>
                        <p className="text-muted-foreground">
                            Laporan detail pekerjaan potong buah (41001) per periode.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">Filter Laporan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Bulan</label>
                                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih bulan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthOptions.map((month) => (
                                            <SelectItem key={month.value} value={month.value}>
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 md:max-w-[180px]">
                                <label className="text-sm font-medium">Tahun</label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih tahun" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {yearOptions.map((year) => (
                                            <SelectItem key={year} value={year}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {isAreaManager && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Perusahaan</label>
                                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua perusahaan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ALL_SCOPE}>Semua perusahaan</SelectItem>
                                            {companyOptions.map((company) => (
                                                <SelectItem key={company.id} value={company.id}>
                                                    {company.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {filteredEstateOptions.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Estate</label>
                                    <Select value={selectedEstateCode} onValueChange={setSelectedEstateCode}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Semua estate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ALL_SCOPE}>Semua estate</SelectItem>
                                            {filteredEstateOptions.map((estate) => (
                                                <SelectItem key={estate.code} value={estate.code}>
                                                    {estate.name} ({estate.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                        Error loading report: {error.message}
                    </div>
                )}

                {/* KPI Cards */}
                {report && (
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Output</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(report.summary.totalQty / 1000)} Ton</div>
                                <p className="text-xs text-muted-foreground">Total QtyP2 (Ton)</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Biaya</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(report.summary.totalJumlah)}</div>
                                <p className="text-xs text-muted-foreground">Total upah periode ini</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Output / HK</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(report.summary.outputPerHk)} Kg/HK</div>
                                <p className="text-xs text-muted-foreground">Rata-rata output per HK</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Cost / Kg</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {report.summary.totalQty > 0
                                        ? formatCurrency(report.summary.totalJumlah / report.summary.totalQty).replace('Rp', '')
                                        : 0} /Kg
                                </div>
                                <p className="text-xs text-muted-foreground">Biaya per Kg (from QtyP2)</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Data Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Data Detail</CardTitle>
                            <CardDescription>
                                Menampilkan {report ? report.data.length : 0} dari {report ? report.total : 0} baris data.
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            disabled={!report || isExporting}
                        >
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            {isExporting ? 'Exporting...' : 'Export Excel (XLSX)'}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-x-auto">
                            <Table className="min-w-[1400px]">
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[100px]">Tanggal</TableHead>
                                        <TableHead>Estate</TableHead>
                                        <TableHead>Divisi</TableHead>
                                        <TableHead>Blok</TableHead>
                                        <TableHead className="w-[100px]">NIK</TableHead>
                                        <TableHead className="w-[200px]">Nama</TableHead>
                                        <TableHead className="text-right">Qty 1</TableHead>
                                        <TableHead>Sat 1</TableHead>
                                        <TableHead className="text-right">Qty P2</TableHead>
                                        <TableHead>Sat 2</TableHead>
                                        <TableHead className="text-right font-bold bg-primary/5">Total Qty</TableHead>
                                        <TableHead className="text-right font-bold bg-primary/5">Jumlah</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : report?.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                                                Tidak ada data ditemukan untuk filter ini.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        report?.data.map((item, idx) => (
                                            <TableRow key={`${item.nik}-${item.tanggal}-${idx}`} className="hover:bg-muted/20">
                                                <TableCell className="font-medium whitespace-nowrap">{item.tanggal}</TableCell>
                                                <TableCell>{item.estate}</TableCell>
                                                <TableCell>{item.divisi}</TableCell>
                                                <TableCell>{item.blok}</TableCell>
                                                <TableCell className="font-mono text-xs">{item.nik}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{item.nama}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{formatNumber(item.qtyp1)}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.satp1 || '-'}</TableCell>
                                                <TableCell className="text-right">{formatNumber(item.qtyp2)}</TableCell>
                                                <TableCell className="whitespace-nowrap">{item.satp2 || '-'}</TableCell>
                                                <TableCell className="text-right font-bold bg-primary/5">
                                                    {formatNumber(item.qty)} <span className="text-xs font-normal text-muted-foreground">{item.satuan}</span>
                                                </TableCell>
                                                <TableCell className="text-right font-bold bg-primary/5 text-emerald-600">
                                                    {formatCurrency(item.jumlah)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between py-4 mt-2">
                            <div className="text-sm text-muted-foreground">
                                Halaman {page} dari {totalPages || 1}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1 || loading}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-1" /> Prev
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= totalPages || loading}
                                >
                                    Next <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ManagerDashboardLayout>
    );
}
