'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SatpamDashboardLayout } from '@/components/layouts/role-layouts/SatpamDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    LogIn,
    LogOut,
    Truck,
    Clock,
    AlertTriangle,
    Users,
    CheckCircle2,
    XCircle,
    ArrowDownLeft,
    ArrowUpRight,
    RefreshCw,
    Search,
    Calendar,
    Eye,
    MapPin,
    User,
    ChevronLeft,
    ChevronRight,
    CloudOff,
    Database,
} from 'lucide-react';
import { useGateCheckData } from '@/features/satpam-dashboard/hooks/useGateCheckData';
import { SatpamGuestLog, SatpamHistorySummary, SyncStatus } from '@/lib/apollo/queries/gate-check';
import Link from 'next/link';
import { resolveMediaUrl } from '@/lib/utils/media-url';

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(dateString?: string) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getSyncStatusBadge(status: SyncStatus) {
    switch (status) {
        case 'SYNCED':
            return (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Synced
                </Badge>
            );
        case 'PENDING':
            return (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                </Badge>
            );
        case 'FAILED':
            return (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                    <XCircle className="h-3 w-3 mr-1" />
                    Gagal
                </Badge>
            );
        case 'CONFLICT':
            return (
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Konflik
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

// =============================================================================
// SUMMARY CARDS
// =============================================================================

function SummaryCards({ summary, loading }: { summary: SatpamHistorySummary | null; loading: boolean }) {
    const cards = [
        {
            title: 'Total Masuk',
            value: summary?.totalEntries ?? 0,
            icon: LogIn,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
        },
        {
            title: 'Total Keluar',
            value: summary?.totalExits ?? 0,
            icon: LogOut,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
        },
        {
            title: 'Di Dalam',
            value: summary?.currentlyInside ?? 0,
            icon: Truck,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
        },
        {
            title: 'Rata-rata Durasi',
            value: summary?.avgDuration ? `${summary.avgDuration} mnt` : '0 mnt',
            icon: Clock,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
        },
        {
            title: 'Overstay',
            value: summary?.overstayCount ?? 0,
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
        },
    ];

    return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <Card key={card.title} className={`${card.bgColor} ${card.borderColor} border`}>
                        <CardContent className="p-4">
                            {loading ? (
                                <div className="animate-pulse">
                                    <div className="h-7 bg-gray-200 rounded mb-2 w-12"></div>
                                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
                                    </div>
                                    <div className={`p-2 rounded-full ${card.bgColor}`}>
                                        <Icon className={`h-5 w-5 ${card.color}`} />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

const getVehiclePhotoUrl = (url: string | undefined) => {
    return resolveMediaUrl(url);
};

// =============================================================================
// DATA TABLE
// =============================================================================

function GateCheckTable({ items, loading }: { items: SatpamGuestLog[]; loading: boolean }) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12">
                <Database className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-500">Tidak ada data</p>
                <p className="text-sm text-gray-400 mt-1">Belum ada data gate check yang ditemukan</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Driver</TableHead>
                        <TableHead className="font-semibold">Kendaraan</TableHead>
                        <TableHead className="font-semibold">Intent</TableHead>
                        <TableHead className="font-semibold">POS / Gate</TableHead>
                        <TableHead className="font-semibold">Waktu</TableHead>
                        <TableHead className="font-semibold">Muatan</TableHead>
                        <TableHead className="font-semibold">Foto</TableHead>
                        <TableHead className="font-semibold">Sync</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                            {/* Driver */}
                            <TableCell>
                                <div>
                                    <p className="font-medium text-sm">{item.driverName}</p>
                                    {item.destination && (
                                        <p className="text-xs text-muted-foreground">{item.destination}</p>
                                    )}
                                </div>
                            </TableCell>

                            {/* Kendaraan */}
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-gray-400" />
                                    <div>
                                        <p className="font-mono text-sm">{item.vehiclePlate}</p>
                                        <p className="text-xs text-muted-foreground">{item.vehicleType}</p>
                                    </div>
                                </div>
                            </TableCell>

                            {/* Intent */}
                            <TableCell>
                                {item.generationIntent === 'ENTRY' ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                        <ArrowDownLeft className="h-3 w-3 mr-1" />
                                        ENTRY
                                    </Badge>
                                ) : item.generationIntent === 'EXIT' ? (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                        EXIT
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">-</Badge>
                                )}
                            </TableCell>

                            {/* POS / Gate */}
                            <TableCell>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">{item.gatePosition || '-'}</p>
                                    {item.generationIntent === 'ENTRY' && item.entryGate && (
                                        <p className="text-xs text-muted-foreground">{item.entryGate}</p>
                                    )}
                                    {item.generationIntent === 'EXIT' && item.exitGate && (
                                        <p className="text-xs text-muted-foreground">{item.exitGate}</p>
                                    )}
                                </div>
                            </TableCell>

                            {/* Waktu */}
                            <TableCell>
                                {item.generationIntent === 'ENTRY' && (
                                    <p className="text-xs text-muted-foreground">Masuk: {formatDate(item.entryTime)}</p>
                                )}
                                {item.generationIntent === 'EXIT' && (
                                    <p className="text-xs text-muted-foreground">Keluar: {formatDate(item.exitTime)}</p>
                                )}
                                {!item.generationIntent && (
                                    <p className="text-xs text-muted-foreground">-</p>
                                )}
                            </TableCell>

                            {/* Muatan */}
                            <TableCell>
                                <div className="space-y-1">
                                    {item.loadType && (
                                        <p className="text-xs font-medium">{item.loadType}</p>
                                    )}
                                    {item.estimatedWeight && (
                                        <p className="text-xs text-muted-foreground">{item.estimatedWeight} kg</p>
                                    )}
                                    {item.deliveryOrderNumber && (
                                        <p className="text-xs text-muted-foreground font-mono">DO: {item.deliveryOrderNumber}</p>
                                    )}
                                    {!item.loadType && !item.estimatedWeight && !item.deliveryOrderNumber && (
                                        <span className="text-xs text-gray-400">-</span>
                                    )}
                                </div>
                            </TableCell>

                            {/* Foto */}
                            <TableCell>
                                {item.photos && item.photos.length > 0 ? (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <button className="relative h-12 w-12 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group">
                                                <img
                                                    src={getVehiclePhotoUrl(item.photos[0].photoUrl)}
                                                    alt={`Foto ${item.driverName}`}
                                                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                                    onError={(e) => {
                                                        const el = e.target as HTMLImageElement;
                                                        el.onerror = null;
                                                        el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='3' x2='21' y1='21' y2='3'%3E%3C/line%3E%3C/svg%3E";
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Eye className="h-4 w-4 text-white" />
                                                </div>
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Foto Kendaraan: {item.vehiclePlate}</DialogTitle>
                                            </DialogHeader>
                                            <div className="flex flex-col gap-6 py-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {item.photos.map((photo, i) => (
                                                        <div key={photo.id || i} className="flex flex-col gap-2">
                                                            <div className="flex items-center justify-between">
                                                                <Badge variant="outline" className="text-[10px] bg-slate-50 uppercase tracking-wider">
                                                                    {photo.photoType === 'FRONT' ? 'Tampak Depan' :
                                                                        photo.photoType === 'BACK' ? 'Tampak Belakang' :
                                                                            photo.photoType}
                                                                </Badge>
                                                                <span className="text-[10px] text-slate-400 font-mono">
                                                                    {photo.photoId}
                                                                </span>
                                                            </div>
                                                            <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                                                <img
                                                                    src={getVehiclePhotoUrl(photo.photoUrl)}
                                                                    alt={`Foto ${item.driverName} - ${photo.photoType}`}
                                                                    className="h-full w-full object-contain"
                                                                    onError={(e) => {
                                                                        const el = e.target as HTMLImageElement;
                                                                        el.onerror = null;
                                                                        el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='3' x2='21' y1='21' y2='3'%3E%3C/line%3E%3C/svg%3E";
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-lg flex flex-wrap gap-x-8 gap-y-2 text-sm">
                                                    <div><span className="text-slate-500 mr-2">Driver:</span><span className="font-semibold text-slate-900">{item.driverName}</span></div>
                                                    <div><span className="text-slate-500 mr-2">Plat:</span><span className="font-mono font-semibold text-slate-900">{item.vehiclePlate}</span></div>
                                                    {item.generationIntent === 'ENTRY' && (
                                                        <div><span className="text-slate-500 mr-2">Masuk:</span><span className="font-semibold text-slate-900">{formatDate(item.entryTime)}</span></div>
                                                    )}
                                                    {item.generationIntent === 'EXIT' && (
                                                        <div><span className="text-slate-500 mr-2">Keluar:</span><span className="font-semibold text-slate-900">{formatDate(item.exitTime)}</span></div>
                                                    )}
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </TableCell>

                            {/* Sync Status */}
                            <TableCell>{getSyncStatusBadge(item.syncStatus)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function SatpamGateCheckPage({ user, locale }: { user?: any; locale?: string } = {}) {
    const [searchInput, setSearchInput] = useState('');

    const {
        items,
        totalCount,
        hasMore,
        summary,
        page,
        totalPages,
        loading,
        error,
        updateFilter,
        refreshData,
    } = useGateCheckData();

    const handleSearch = () => {
        updateFilter({ search: searchInput || undefined, page: 1 });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const pageSize = 20;
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalCount);

    return (
        <SatpamDashboardLayout
            title="Gate Check"
            description="Data gate check dari tabel gate_guest_logs"
            breadcrumbItems={[{ label: 'Gate Check' }]}
        >
            <div className="space-y-6">
                {/* Header */}
                <motion.div
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Data Gate Check</h1>
                        <p className="text-muted-foreground">
                            Data kendaraan masuk dan keluar dari gerbang
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/gate-check/sync">
                            <Button variant="outline" size="sm">
                                <Users className="h-4 w-4 mr-2" />
                                Lihat Sync
                            </Button>
                        </Link>
                        <Button onClick={refreshData} variant="outline" size="sm" disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Segarkan
                        </Button>
                    </div>
                </motion.div>

                {/* Error */}
                {error && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <CloudOff className="h-5 w-5 text-red-600" />
                            <div>
                                <p className="font-medium text-red-700">Gagal memuat data</p>
                                <p className="text-sm text-red-600">{error.message}</p>
                            </div>
                            <Button onClick={refreshData} variant="outline" size="sm" className="ml-auto border-red-300 text-red-700">
                                Coba Lagi
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Summary Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <SummaryCards summary={summary} loading={loading} />
                </motion.div>

                {/* Search + Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div>
                                    <CardTitle>Riwayat Gate Check</CardTitle>
                                    <CardDescription>
                                        Menampilkan {totalCount} data
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Cari nama / plat..."
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            className="pl-9 w-[220px]"
                                        />
                                    </div>
                                    <Button onClick={handleSearch} size="sm">
                                        Cari
                                    </Button>
                                    {searchInput && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSearchInput('');
                                                updateFilter({ search: undefined, page: 1 });
                                            }}
                                        >
                                            Reset
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <GateCheckTable items={items} loading={loading} />

                            {/* Pagination */}
                            {totalCount > 0 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                    <p className="text-sm text-muted-foreground">
                                        Menampilkan {startItem}-{endItem} dari {totalCount} data
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page <= 1}
                                            onClick={() => updateFilter({ page: page - 1 })}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            {page} / {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!hasMore}
                                            onClick={() => updateFilter({ page: page + 1 })}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </SatpamDashboardLayout>
    );
}
