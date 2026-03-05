'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useQuery } from '@apollo/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Loader2,
    Search,
    Calendar,
    User,
    MapPin,
    Weight,
    Package,
    Clock,
    CheckCircle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    AlertTriangle,
    RefreshCw,
    BarChart3,
} from 'lucide-react';
import {
    GET_HARVEST_RECORDS_PAGINATED,
    type GetHarvestRecordsPaginatedResponse,
} from '@/lib/apollo/queries/harvest';

// ============================================================================
// HELPERS
// ============================================================================

const toSafeString = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return String(value);
};

const toSafeNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toSafeDate = (value: unknown): Date | null => {
    const raw = toSafeString(value).trim();
    if (!raw) return null;
    const d = parseISO(raw);
    if (!Number.isNaN(d.getTime())) return d;
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
    PENDING: { color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700', icon: Clock, label: 'Pending' },
    APPROVED: { color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700', icon: CheckCircle, label: 'Approved' },
    REJECTED: { color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700', icon: XCircle, label: 'Rejected' },
};

// Sort-by mapping: UI value → backend column name
const sortByMap: Record<string, string> = {
    createdAt: 'created_at',
    tanggal: 'tanggal',
    beratTbs: 'berat_tbs',
};

// ============================================================================
// PAGINATION COMPONENT
// ============================================================================

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    // Build visible page numbers
    const getPageNumbers = (): (number | 'ellipsis')[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

        const pages: (number | 'ellipsis')[] = [1];
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        if (start > 2) pages.push('ellipsis');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push('ellipsis');
        if (totalPages > 1) pages.push(totalPages);

        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
            {/* Info */}
            <p className="text-sm text-muted-foreground order-2 sm:order-1">
                Menampilkan <span className="font-medium text-foreground">{startItem}</span>
                {' - '}
                <span className="font-medium text-foreground">{endItem}</span>
                {' dari '}
                <span className="font-medium text-foreground">{totalItems}</span> data
            </p>

            {/* Page Controls */}
            <div className="flex items-center gap-1 order-1 sm:order-2">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(1)}
                    title="Halaman pertama"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    title="Halaman sebelumnya"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {getPageNumbers().map((pageNum, idx) =>
                    pageNum === 'ellipsis' ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-sm">…</span>
                    ) : (
                        <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? 'default' : 'outline'}
                            size="icon"
                            className="h-8 w-8 text-xs"
                            onClick={() => onPageChange(pageNum)}
                        >
                            {pageNum}
                        </Button>
                    )
                )}

                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    title="Halaman berikutnya"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(totalPages)}
                    title="Halaman terakhir"
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// ============================================================================
// TABLE SKELETON
// ============================================================================

function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-36" />
            </div>
            <div className="rounded-md border">
                <div className="p-3 space-y-2">
                    {Array.from({ length: rows }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ManagerHarvestTableProps {
    pageSize?: number;
}

export function ManagerHarvestTable({ pageSize = 10 }: ManagerHarvestTableProps) {
    // State — these drive server-side query variables
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [currentPage, setCurrentPage] = useState(1);

    // Debounce search to avoid excessive server requests
    const searchTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const handleSearchChange = useCallback((val: string) => {
        setSearchTerm(val);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setDebouncedSearch(val);
            setCurrentPage(1);
        }, 400);
    }, []);

    // Build query variables for server-side pagination
    const queryVariables = useMemo(() => {
        const vars: Record<string, unknown> = {
            page: currentPage,
            limit: pageSize,
            sortBy: sortByMap[sortBy] || 'created_at',
            sortDir: 'DESC',
        };
        if (statusFilter !== 'ALL') {
            vars.status = statusFilter;
        }
        if (debouncedSearch.trim()) {
            vars.search = debouncedSearch.trim();
        }
        return vars;
    }, [currentPage, pageSize, statusFilter, debouncedSearch, sortBy]);

    // Server-side paginated query
    const { data, loading, error, refetch } = useQuery<GetHarvestRecordsPaginatedResponse>(
        GET_HARVEST_RECORDS_PAGINATED,
        {
            variables: queryVariables,
            fetchPolicy: 'cache-and-network',
        }
    );

    const records = data?.harvestRecordsPaginated?.data || [];
    const totalCount = data?.harvestRecordsPaginated?.totalCount || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    // Reset page on filter change
    const handleStatusChange = useCallback((val: string) => {
        setStatusFilter(val);
        setCurrentPage(1);
    }, []);

    const handleSortChange = useCallback((val: string) => {
        setSortBy(val);
        setCurrentPage(1);
    }, []);

    // Loading
    if (loading && !data) {
        return (
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                            <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <CardTitle className="text-base">Monitoring Data Panen</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <TableSkeleton rows={pageSize} />
                </CardContent>
            </Card>
        );
    }

    // Error
    if (error && !data) {
        return (
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                            <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <CardTitle className="text-base">Monitoring Data Panen</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                        <AlertTriangle className="h-8 w-8 text-destructive/60" />
                        <p className="text-sm text-muted-foreground">Gagal memuat data panen</p>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
                            <RefreshCw className="h-3.5 w-3.5" /> Coba Lagi
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                            <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Monitoring Data Panen</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Data panen dari seluruh estate — {totalCount} record
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 self-start"
                        onClick={() => refetch()}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Refresh
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari NIK, karyawan, catatan..."
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10 h-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-full sm:w-36 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Status</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger className="w-full sm:w-36 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="createdAt">Terbaru</SelectItem>
                            <SelectItem value="tanggal">Tanggal Panen</SelectItem>
                            <SelectItem value="beratTbs">Berat TBS</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                {records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm font-medium">Tidak ada data panen</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {searchTerm || statusFilter !== 'ALL' ? 'Coba ubah filter pencarian' : 'Belum ada data panen yang tersedia'}
                        </p>
                        {(searchTerm || statusFilter !== 'ALL') && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => { setSearchTerm(''); setDebouncedSearch(''); setStatusFilter('ALL'); setCurrentPage(1); }}
                            >
                                Reset Filter
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="rounded-md border border-border/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="text-xs font-semibold">Tanggal</TableHead>
                                            <TableHead className="text-xs font-semibold">Blok</TableHead>
                                            <TableHead className="text-xs font-semibold">Divisi</TableHead>
                                            <TableHead className="text-xs font-semibold">Karyawan</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Berat TBS</TableHead>
                                            <TableHead className="text-xs font-semibold text-right">Janjang</TableHead>
                                            <TableHead className="text-xs font-semibold">Kualitas</TableHead>
                                            <TableHead className="text-xs font-semibold">Mandor</TableHead>
                                            <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {records.map((record: any) => {
                                            const harvestDate = toSafeDate(record.tanggal);
                                            const beratTbs = toSafeNumber(record.beratTbs ?? record.berat_tbs);
                                            const jumlahJanjang = toSafeNumber(record.jumlahJanjang ?? record.jumlah_janjang);
                                            const jjgMatang = toSafeNumber(record.jjgMatang ?? record.jjg_matang);
                                            const jjgMentah = toSafeNumber(record.jjgMentah ?? record.jjg_mentah);
                                            const jjgLewatMatang = toSafeNumber(record.jjgLewatMatang ?? record.jjg_lewat_matang);
                                            const status = toSafeString(record.status).toUpperCase();
                                            const statusInfo = statusConfig[status] || statusConfig.PENDING;
                                            const StatusIcon = statusInfo.icon;

                                            return (
                                                <TableRow key={record.id} className="group transition-colors hover:bg-muted/20">
                                                    <TableCell className="py-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            <span className="text-sm">
                                                                {harvestDate ? format(harvestDate, 'dd MMM yy', { locale: idLocale }) : '-'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            <span className="text-sm font-medium truncate max-w-[120px]">
                                                                {toSafeString(record.block?.name) || '-'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2.5">
                                                        <span className="text-sm text-muted-foreground truncate max-w-[100px] block">
                                                            {toSafeString(record.block?.division?.name) || '-'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="text-sm truncate max-w-[100px]">
                                                                    {toSafeString(record.karyawan) || '-'}
                                                                </p>
                                                                {record.nik && (
                                                                    <p className="text-[10px] text-muted-foreground font-mono">{record.nik}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2.5 text-right">
                                                        <span className="text-sm font-semibold tabular-nums">
                                                            {beratTbs > 0 ? `${beratTbs.toFixed(1)} kg` : '-'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-2.5 text-right">
                                                        <span className="text-sm tabular-nums">{jumlahJanjang || '-'}</span>
                                                    </TableCell>
                                                    <TableCell className="py-2.5">
                                                        <div className="text-[10px] leading-relaxed text-muted-foreground">
                                                            <span>M:{jjgMatang}</span>{' '}
                                                            <span>R:{jjgMentah}</span>{' '}
                                                            <span>L:{jjgLewatMatang}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2.5">
                                                        <span className="text-sm truncate max-w-[80px] block">
                                                            {toSafeString(record.mandor?.name) || '-'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-2.5 text-center">
                                                        <Badge variant="outline" className={`text-[10px] gap-1 ${statusInfo.color}`}>
                                                            <StatusIcon className="h-3 w-3" />
                                                            {statusInfo.label}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Pagination */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalCount}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}
