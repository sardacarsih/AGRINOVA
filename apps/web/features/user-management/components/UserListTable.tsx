import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
    MoreHorizontal,
    Edit,
    Trash,
    UserX,
    UserCheck,
    Key
} from 'lucide-react';
import { format } from 'date-fns';
import { User, UserRole } from '@/gql/graphql';

interface UserListTableProps {
    users: User[];
    onEdit: (user: User) => void;
    onDelete: (id: string) => Promise<boolean | void> | boolean | void;
    onToggleStatus: (id: string) => void;
    onResetPassword: (user: User) => void;
    isLoading: boolean;
    isProcessing?: boolean;
}

export function UserListTable({
    users,
    onEdit,
    onDelete,
    onToggleStatus,
    onResetPassword,
    isLoading,
    isProcessing = false,
}: UserListTableProps) {
    const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async (userId?: string) => {
        if (!userId || isDeleting) return;
        setIsDeleting(true);
        try {
            await onDelete(userId);
            setDeleteCandidate(null);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case UserRole.SuperAdmin: return 'border-violet-300 bg-violet-100 text-violet-800 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200';
            case UserRole.CompanyAdmin: return 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200';
            case UserRole.AreaManager: return 'border-indigo-300 bg-indigo-100 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200';
            case UserRole.Manager: return 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200';
            case UserRole.Asisten: return 'border-cyan-300 bg-cyan-100 text-cyan-800 dark:border-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200';
            case UserRole.Mandor: return 'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-700 dark:bg-orange-950/50 dark:text-orange-200';
            case UserRole.Satpam: return 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
            default: return 'border-muted bg-muted text-muted-foreground';
        }
    };

    const getUserInitials = (user: User) => {
        const source = (user.name || user.username || '').trim();
        if (!source) {
            return 'U';
        }

        const parts = source.split(/\s+/).filter(Boolean);
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }

        return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    };

    const renderEntityNames = (items?: Array<{ id: string; name: string } | null>) => {
        const seen = new Set<string>();
        const names = (items || [])
            .map((item) => {
                const id = item?.id?.trim();
                const name = item?.name?.trim();
                if (!name) return null;
                const key = id || name.toLowerCase();
                if (seen.has(key)) return null;
                seen.add(key);
                return name;
            })
            .filter((name): name is string => Boolean(name));

        if (names.length === 0) {
            return <span className="text-sm text-muted-foreground">-</span>;
        }

        return (
            <div className="text-sm font-medium space-y-1">
                {names.map((name, index) => (
                    <div key={`${name}-${index}`}>{name}</div>
                ))}
            </div>
        );
    };

    return (
        <div className="rounded-md border border-border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Pengguna</TableHead>
                        <TableHead>Peran</TableHead>
                        <TableHead>Perusahaan</TableHead>
                        <TableHead>Kebun (Estate)</TableHead>
                        <TableHead>Divisi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dibuat Pada</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                Tidak ada pengguna ditemukan.
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user.avatar ?? undefined} alt={user.name || user.username} />
                                            <AvatarFallback className="text-xs font-semibold">
                                                {getUserInitials(user)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">@{user.username}</span>
                                            {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                                            {user.phoneNumber && <span className="text-xs text-muted-foreground">{user.phoneNumber}</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                                        {user.role.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {(() => {
                                        const seenCompanyIds = new Set<string>();
                                        const companyNames = (user.companies || [])
                                            .map((company) => {
                                                const id = company?.id?.trim();
                                                const name = company?.name?.trim();
                                                if (!name) return null;
                                                const key = id || name.toLowerCase();
                                                if (seenCompanyIds.has(key)) return null;
                                                seenCompanyIds.add(key);
                                                return name;
                                            })
                                            .filter((name): name is string => Boolean(name));
                                        if (companyNames.length > 0) {
                                            return (
                                                <div className="text-sm font-medium space-y-1">
                                                    {companyNames.map((name, index) => (
                                                        <div key={`${user.id}-company-${index}`}>{name}</div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return (
                                            <span className="text-sm font-medium">
                                                {user.company?.name || user.companyId || '-'}
                                            </span>
                                        );
                                    })()}
                                </TableCell>
                                <TableCell>
                                    {renderEntityNames(user.estates as Array<{ id: string; name: string } | null> | undefined)}
                                </TableCell>
                                <TableCell>
                                    {renderEntityNames(user.divisions as Array<{ id: string; name: string } | null> | undefined)}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                        {user.isActive ? 'Aktif' : 'Tidak Aktif'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(user.createdAt), 'dd MMM yyyy')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => onEdit(user)}>
                                                <Edit className="mr-2 h-4 w-4" /> Ubah Detail
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onResetPassword(user)}>
                                                <Key className="mr-2 h-4 w-4" /> Reset Kata Sandi
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onToggleStatus(user.id)}>
                                                {user.isActive ? (
                                                    <>
                                                        <UserX className="mr-2 h-4 w-4 text-orange-500" />
                                                        <span className="text-orange-500">Nonaktifkan</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserCheck className="mr-2 h-4 w-4 text-green-500" />
                                                        <span className="text-green-500">Aktifkan</span>
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => setDeleteCandidate(user)}
                                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                            >
                                                <Trash className="mr-2 h-4 w-4" /> Hapus Pengguna
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <AlertDialog
                open={Boolean(deleteCandidate)}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setDeleteCandidate(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Pengguna Login?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Anda akan menghapus akun{' '}
                            <span className="font-semibold text-foreground">
                                {deleteCandidate?.name || deleteCandidate?.username}
                            </span>{' '}
                            secara permanen. Jika user masih terhubung dengan data assignment, penghapusan bisa ditolak sistem.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting || isProcessing}>
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => void handleConfirmDelete(deleteCandidate?.id)}
                            disabled={isDeleting || isProcessing}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Menghapus...' : 'Hapus'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
