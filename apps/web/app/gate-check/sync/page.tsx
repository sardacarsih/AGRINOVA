'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SatpamDashboardLayout } from '@/components/layouts/role-layouts/SatpamDashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    RefreshCw,
    CheckCircle2,
    Clock,
    XCircle,
    AlertTriangle,
    Truck,
    ArrowLeft,
    ArrowDownLeft,
    ArrowUpRight,
    Database,
    Cloud,
    CloudOff,
    Smartphone,
    Eye,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useSyncData, SyncStats } from '@/features/satpam-dashboard/hooks/useSyncData';
import { SyncStatus, SatpamGuestLog, GateIntent } from '@/lib/apollo/queries/gate-check';
import Link from 'next/link';
import { resolveMediaUrl } from '@/lib/utils/media-url';

// =============================================================================
// SYNC STATS CARDS
// =============================================================================

interface SyncStatsCardsProps {
    stats: SyncStats;
    loading: boolean;
    onFilterChange: (status: SyncStatus | undefined) => void;
    activeFilter: SyncStatus | undefined;
}

function SyncStatsCards({ stats, loading, onFilterChange, activeFilter }: SyncStatsCardsProps) {
    const cards = [
        {
            title: 'Tersinkronisasi',
            value: stats.totalSynced,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50 hover:bg-emerald-100',
            borderColor: 'border-emerald-200',
            status: 'SYNCED' as SyncStatus,
        },
        {
            title: 'Menunggu',
            value: stats.totalPending,
            icon: Clock,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50 hover:bg-amber-100',
            borderColor: 'border-amber-200',
            status: 'PENDING' as SyncStatus,
        },
        {
            title: 'Gagal',
            value: stats.totalFailed,
            icon: XCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50 hover:bg-red-100',
            borderColor: 'border-red-200',
            status: 'FAILED' as SyncStatus,
        },
        {
            title: 'Konflik',
            value: stats.totalConflict,
            icon: AlertTriangle,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50 hover:bg-orange-100',
            borderColor: 'border-orange-200',
            status: 'CONFLICT' as SyncStatus,
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;
                const isActive = activeFilter === card.status;
                return (
                    <motion.div
                        key={card.status}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Card
                            className={`cursor-pointer transition-all ${card.bgColor} ${card.borderColor} border-2 ${isActive ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                                }`}
                            onClick={() => onFilterChange(isActive ? undefined : card.status)}
                        >
                            <CardContent className="p-4">
                                {loading ? (
                                    <div className="animate-pulse">
                                        <div className="h-8 bg-gray-200 rounded mb-2 w-16"></div>
                                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`text-3xl font-bold ${card.color}`}>
                                                {card.value}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {card.title}
                                            </p>
                                        </div>
                                        <div className={`p-3 rounded-full ${card.bgColor}`}>
                                            <Icon className={`h-6 w-6 ${card.color}`} />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}

// =============================================================================
// SYNC DATA TABLE
// =============================================================================

interface SyncDataTableProps {
    items: SatpamGuestLog[];
    loading: boolean;
}

function getSyncStatusBadge(status: SyncStatus) {
    switch (status) {
        case 'SYNCED':
            return (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Tersinkronisasi
                </Badge>
            );
        case 'PENDING':
            return (
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                    <Clock className="h-3 w-3 mr-1" />
                    Menunggu
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
            return <Badge>{status}</Badge>;
    }
}



const getVehiclePhotoUrl = (url: string | undefined) => {
    return resolveMediaUrl(url);
};

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


function SyncDataTable({ items, loading }: SyncDataTableProps) {
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
                <p className="text-sm text-gray-400 mt-1">
                    Belum ada data sinkronisasi yang ditemukan
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Device ID</TableHead>
                        <TableHead className="font-semibold">Driver</TableHead>
                        <TableHead className="font-semibold">Kendaraan</TableHead>
                        <TableHead className="font-semibold">POS / Gate</TableHead>
                        <TableHead className="font-semibold">Intent</TableHead>
                        <TableHead className="font-semibold">Waktu</TableHead>
                        <TableHead className="font-semibold">Foto</TableHead>
                        <TableHead className="font-semibold">Status Sync</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                            <TableCell>
                                <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {item.deviceId || '-'}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div>
                                    <p className="font-medium text-sm">{item.driverName}</p>
                                    {item.destination && (
                                        <p className="text-xs text-muted-foreground">
                                            {item.destination}
                                        </p>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-gray-400" />
                                    <div>
                                        <p className="font-mono text-sm">{item.vehiclePlate}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.vehicleType}
                                        </p>
                                    </div>
                                </div>
                            </TableCell>
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
                                    <Badge variant="outline" className="font-mono text-xs">-</Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="space-y-1">
                                    {item.generationIntent === 'ENTRY' && (
                                        <p className="text-xs text-muted-foreground">Masuk: {formatDate(item.entryTime)}</p>
                                    )}
                                    {item.generationIntent === 'EXIT' && (
                                        <p className="text-xs text-muted-foreground">Keluar: {formatDate(item.exitTime)}</p>
                                    )}
                                    {!item.generationIntent && (
                                        <p className="text-xs text-muted-foreground">-</p>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                {item.photos && item.photos.length > 0 ? (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <button className="group relative h-12 w-12 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer">
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
                                                            <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
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
                                                <div className="bg-slate-50 p-4 rounded-lg grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                                    <div><span className="text-slate-500 mr-2">Driver:</span><span className="font-semibold text-slate-900">{item.driverName}</span></div>
                                                    <div><span className="text-slate-500 mr-2">Plat:</span><span className="font-mono font-semibold text-slate-900">{item.vehiclePlate}</span></div>
                                                    {item.generationIntent === 'ENTRY' && (
                                                        <div><span className="text-slate-500 mr-2">Masuk:</span><span className="font-semibold text-slate-900">{formatDate(item.entryTime)}</span></div>
                                                    )}
                                                    {item.generationIntent === 'EXIT' && (
                                                        <div><span className="text-slate-500 mr-2">Keluar:</span><span className="font-semibold text-slate-900">{formatDate(item.exitTime)}</span></div>
                                                    )}
                                                    <div><span className="text-slate-500 mr-2">Device ID:</span><span className="font-mono text-xs">{item.deviceId}</span></div>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </TableCell>
                            <TableCell>{getSyncStatusBadge(item.syncStatus)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

// =============================================================================
// MAIN SYNC VIEWER PAGE
// =============================================================================

export default function SyncViewerPage() {
    const [syncStatusFilter, setSyncStatusFilter] = useState<SyncStatus | undefined>();

    const {
        items,
        totalCount,
        stats,
        loading,
        error,
        updateFilter,
        refreshData,
        uniqueDeviceCount,
    } = useSyncData();

    // Apply client-side filter
    const filteredItems = syncStatusFilter
        ? items.filter((item) => item.syncStatus === syncStatusFilter)
        : items;

    const handleFilterChange = (status: SyncStatus | undefined) => {
        setSyncStatusFilter(status);
    };

    return (
        <SatpamDashboardLayout>
            <div className="space-y-6">
                <motion.div
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Kembali
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <Cloud className="h-6 w-6 text-blue-600" />
                                Data Sinkronisasi
                            </h1>
                            <p className="text-muted-foreground">
                                Monitor data sinkronisasi dari user Satpam
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Device Count Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 mb-1">Total Device Aktif</p>
                                <div className="flex items-baseline gap-2">
                                    <h2 className="text-3xl font-bold text-blue-900">
                                        {uniqueDeviceCount || 0}
                                    </h2>
                                    <span className="text-sm text-blue-600">device</span>
                                </div>
                                <p className="text-xs text-blue-500 mt-1">
                                    Jumlah device unik yang melakukan sinkronisasi di perusahaan ini.
                                </p>
                            </div>
                            <div className="p-4 bg-white/50 rounded-full shadow-sm">
                                <Smartphone className="h-8 w-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Error State */}
                {error && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <CloudOff className="h-5 w-5 text-red-600" />
                            <div>
                                <p className="font-medium text-red-700">Gagal memuat data</p>
                                <p className="text-sm text-red-600">{error.message}</p>
                            </div>
                            <Button
                                onClick={refreshData}
                                variant="outline"
                                size="sm"
                                className="ml-auto border-red-300 text-red-700"
                            >
                                Coba Lagi
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Stats Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <SyncStatsCards
                        stats={stats}
                        loading={loading}
                        onFilterChange={handleFilterChange}
                        activeFilter={syncStatusFilter}
                    />
                </motion.div>

                {/* Data Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Riwayat Sinkronisasi</CardTitle>
                                    <CardDescription>
                                        {syncStatusFilter
                                            ? `Menampilkan ${filteredItems.length} data dengan status ${syncStatusFilter}`
                                            : `Menampilkan ${filteredItems.length} data terbaru`}
                                    </CardDescription>
                                </div>
                                {syncStatusFilter && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSyncStatusFilter(undefined)}
                                    >
                                        Hapus Filter
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <SyncDataTable items={filteredItems} loading={loading} />
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </SatpamDashboardLayout>
    );
}
