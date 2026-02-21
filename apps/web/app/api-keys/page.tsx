'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, RefreshCw, Trash2, Key as KeyIcon, Copy, Check, AlertTriangle, Shield, Activity, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';
import { Button } from '@/components/ui/button';
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { API_KEYS_QUERY, CREATE_API_KEY_MUTATION, REVOKE_API_KEY_MUTATION, ROTATE_API_KEY_MUTATION } from '@/lib/graphql/api-keys';
import { CreateAPIKeyForm } from '@/components/api-keys/CreateAPIKeyForm';
import { toast } from 'sonner';

interface APIKey {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
    expiresAt?: string;
    lastUsedAt?: string;
    createdAt: string;
}

export default function APIKeysPage() {
    const { user } = useAuth();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [revealDialogOpen, setRevealDialogOpen] = useState(false);
    const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
    const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
    const [revealedKey, setRevealedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Form state
    const [keyName, setKeyName] = useState('');
    const [scopes, setScopes] = useState('');
    const [expiresInDays, setExpiresInDays] = useState('365');

    const { data, loading, error, refetch } = useQuery(API_KEYS_QUERY, {
        errorPolicy: 'all',
        fetchPolicy: 'cache-and-network',
    });

    const [createAPIKey, { loading: creating }] = useMutation(CREATE_API_KEY_MUTATION, {
        onCompleted: (data) => {
            setRevealedKey(data.createAPIKey.plaintextKey);
            setCreateDialogOpen(false);
            setRevealDialogOpen(true);
            setKeyName('');
            setScopes('');
            setExpiresInDays('365');
            refetch();
            toast.success('Kunci API berhasil dibuat');
        },
        onError: (error) => {
            toast.error(error.message || 'Gagal membuat kunci API');
        },
    });

    const [revokeAPIKey, { loading: revoking }] = useMutation(REVOKE_API_KEY_MUTATION, {
        onCompleted: () => {
            setRevokeDialogOpen(false);
            setSelectedKey(null);
            refetch();
            toast.success('Kunci API berhasil dicabut');
        },
        onError: (error) => {
            toast.error(error.message || 'Gagal mencabut kunci API');
        },
    });

    const [rotateAPIKey, { loading: rotating }] = useMutation(ROTATE_API_KEY_MUTATION, {
        onCompleted: (data) => {
            setRevealedKey(data.rotateAPIKey.plaintextKey);
            setRevealDialogOpen(true);
            refetch();
            toast.success('Kunci API berhasil dirotasi');
        },
        onError: (error) => {
            toast.error(error.message || 'Gagal merotasi kunci API');
        },
    });

    const handleCreateKey = async () => {
        try {
            const scopesArray = scopes.split(',').map(s => s.trim()).filter(Boolean);
            await createAPIKey({
                variables: {
                    input: {
                        name: keyName,
                        scopes: scopesArray,
                        expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
                    },
                },
            });
        } catch (error) {
            // Error handled by onError callback
        }
    };

    const handleRevokeKey = async () => {
        if (!selectedKey) return;

        try {
            await revokeAPIKey({
                variables: { id: selectedKey.id },
            });
        } catch (error) {
            // Error handled by onError callback
        }
    };

    const handleRotateKey = async (key: APIKey) => {
        try {
            await rotateAPIKey({
                variables: {
                    id: key.id,
                    expiresInDays: 365,
                },
            });
        } catch (error) {
            // Error handled by onError callback
        }
    };

    const copyToClipboard = () => {
        if (revealedKey) {
            navigator.clipboard.writeText(revealedKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Disalin ke clipboard');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <Badge className="bg-green-100 text-green-800 border-green-200">Aktif</Badge>;
            case 'REVOKED':
                return <Badge className="bg-red-100 text-red-800 border-red-200">Dicabut</Badge>;
            case 'EXPIRED':
                return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Kedaluwarsa</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Tidak Pernah';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const apiKeys: APIKey[] = data?.apiKeys || [];
    const activeKeys = apiKeys.filter(k => k.status === 'ACTIVE');
    const revokedKeys = apiKeys.filter(k => k.status === 'REVOKED');

    if (error) {
        return (
            <SuperAdminDashboardLayout
                title="API Access Management"
                description="Manage API keys for external applications"
            >
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-red-600">
                            <p>Gagal memuat kunci API: {error.message}</p>
                            <Button onClick={() => refetch()} className="mt-4" variant="outline">
                                Coba Lagi
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </SuperAdminDashboardLayout>
        );
    }

    return (
        <SuperAdminDashboardLayout
            title="Manajemen Akses API"
            description="Kelola kunci API untuk akses aplikasi eksternal"
        >
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Kunci</CardTitle>
                            <KeyIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? <Skeleton className="h-8 w-16" /> : apiKeys.length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Semua kunci API
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Kunci Aktif</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? <Skeleton className="h-8 w-16" /> : activeKeys.length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Sedang aktif
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Kunci Dicabut</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? <Skeleton className="h-8 w-16" /> : revokedKeys.length}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Dicabut atau kedaluwarsa
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Aktivitas Terakhir</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loading ? (
                                    <Skeleton className="h-8 w-16" />
                                ) : (
                                    apiKeys.filter(k => k.lastUsedAt).length
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Kunci dengan penggunaan
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* API Keys Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Kunci API</CardTitle>
                            <CardDescription>
                                Kunci API menyediakan akses terprogram ke sistem. Jaga keamanannya dan rotasi secara berkala.
                            </CardDescription>
                        </div>
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Buat Kunci API
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-6">
                                <div className="space-y-3">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton key={i} className="h-12 w-full" />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Prefix</TableHead>
                                        <TableHead>Cakupan</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Terakhir Digunakan</TableHead>
                                        <TableHead>Kedaluwarsa</TableHead>
                                        <TableHead>Dibuat</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {apiKeys.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                Tidak ada kunci API. Buat kunci pertama Anda untuk memulai.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        apiKeys.map((key: APIKey) => (
                                            <TableRow key={key.id}>
                                                <TableCell className="font-medium">{key.name}</TableCell>
                                                <TableCell>
                                                    <code className="text-xs bg-muted px-2 py-1 rounded">{key.prefix}***</code>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {key.scopes.slice(0, 2).map((scope) => (
                                                            <Badge key={scope} variant="outline" className="text-xs">
                                                                {scope}
                                                            </Badge>
                                                        ))}
                                                        {key.scopes.length > 2 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{key.scopes.length - 2}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(key.status)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(key.lastUsedAt)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(key.expiresAt)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(key.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {key.status === 'ACTIVE' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleRotateKey(key)}
                                                                    disabled={rotating}
                                                                    title="Rotate key"
                                                                >
                                                                    <RefreshCw className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedKey(key);
                                                                        setRevokeDialogOpen(true);
                                                                    }}
                                                                    disabled={revoking}
                                                                    title="Revoke key"
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Create API Key Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyIcon className="h-5 w-5" />
                            Buat Kunci API Baru
                        </DialogTitle>
                        <DialogDescription>
                            Buat kunci API untuk integrasi eksternal (HRIS, Finance, atau Smart Mill Scale)
                        </DialogDescription>
                    </DialogHeader>
                    <CreateAPIKeyForm
                        keyName={keyName}
                        setKeyName={setKeyName}
                        scopes={scopes}
                        setScopes={setScopes}
                        expiresInDays={expiresInDays}
                        setExpiresInDays={setExpiresInDays}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleCreateKey} disabled={creating || !keyName}>
                            {creating && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            )}
                            Buat Kunci
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reveal Key Dialog */}
            <Dialog open={revealDialogOpen} onOpenChange={setRevealDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            Kunci API Berhasil Dibuat
                        </DialogTitle>
                        <DialogDescription>
                            Simpan kunci ini sekarang. Anda tidak akan bisa melihatnya lagi!
                        </DialogDescription>
                    </DialogHeader>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Penting!</AlertTitle>
                        <AlertDescription>
                            Ini adalah satu-satunya waktu Anda akan melihat kunci ini. Salin sekarang dan simpan dengan aman.
                        </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                        <Label>Kunci API Anda</Label>
                        <div className="flex gap-2">
                            <Input
                                value={revealedKey || ''}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyToClipboard}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => {
                            setRevealDialogOpen(false);
                            setRevealedKey(null);
                            setCopied(false);
                        }}>
                            Saya Sudah Menyimpan Kunci
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revoke Key Dialog */}
            <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cabut Kunci API</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin mencabut "{selectedKey?.name}"? Tindakan ini tidak dapat dibatalkan dan akan segera membatalkan kunci.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRevokeKey}
                            disabled={revoking}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {revoking ? 'Mencabut...' : 'Cabut Kunci'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SuperAdminDashboardLayout>
    );
}
