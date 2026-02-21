'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserManagement } from '../hooks/useUserManagement';
import { UserListTable } from './UserListTable';
import { RoleStatisticsCards } from './RoleStatisticsCards';
import { ResetPasswordModal } from './ResetPasswordModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Plus,
    Search,
    FilterX,
    RefreshCw,
    Users as UsersIcon
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { User, UserRole } from '@/gql/graphql';
import { SuperAdminDashboardLayout } from '@/components/layouts/role-layouts/SuperAdminDashboardLayout';

export default function SuperAdminUsersPage() {
    const router = useRouter();
    const PAGE_SIZE = 10;

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
    const [companyFilter, setCompanyFilter] = useState<string | 'ALL'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const displayedRoles = useMemo(
        () => [
            UserRole.SuperAdmin,
            UserRole.CompanyAdmin,
            UserRole.AreaManager,
            UserRole.Manager,
            UserRole.Asisten,
            UserRole.Mandor,
            UserRole.Satpam,
        ],
        []
    );

    const [isResetOpen, setIsResetOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const {
        users,
        totalCount,
        pageInfo,
        companies,
        roles,
        isLoading,
        isProcessing,
        deleteUser,
        toggleStatus,
        resetPassword,
        refetch,
    } = useUserManagement({
        search,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        companyId: companyFilter === 'ALL' ? undefined : companyFilter,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [search, roleFilter, companyFilter]);

    const totalPages = pageInfo?.totalPages ?? Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const handleEdit = (user: User) => {
        router.push(`/users/${user.id}/edit`);
    };

    const handleAddNew = () => {
        router.push('/users/new');
    };

    const handleResetPassword = (user: User) => {
        setSelectedUser(user);
        setIsResetOpen(true);
    };

    return (
        <SuperAdminDashboardLayout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <UsersIcon className="h-8 w-8 text-primary" />
                            Manajemen Pengguna (Login)
                        </h1>
                        <p className="text-muted-foreground">
                            Kelola pengguna sistem, peran, dan akses platform.
                        </p>
                    </div>
                    <Button onClick={handleAddNew} className="w-full md:w-auto">
                        <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna Baru
                    </Button>

                </div>

                <RoleStatisticsCards roles={displayedRoles} />

                <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari pengguna..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Select
                        value={roleFilter}
                        onValueChange={(val) => setRoleFilter(val as UserRole | 'ALL')}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Semua Peran" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Peran</SelectItem>
                            {roles.map((r) => (
                                <SelectItem key={r.role} value={r.role}>
                                    {r.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={companyFilter}
                        onValueChange={setCompanyFilter}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Semua Perusahaan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Perusahaan</SelectItem>
                            {companies.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                setSearch('');
                                setRoleFilter('ALL');
                                setCompanyFilter('ALL');
                            }}
                        >
                            <FilterX className="mr-2 h-4 w-4" /> Reset
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isLoading}
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                    <UserListTable
                        users={users}
                        isLoading={isLoading}
                        isProcessing={isProcessing}
                        onEdit={handleEdit}
                        onDelete={deleteUser}
                        onToggleStatus={toggleStatus}
                        onResetPassword={handleResetPassword}
                    />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    <span>Total Pengguna: {totalCount}</span>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1 || isLoading}
                            >
                                Sebelumnya
                            </Button>
                            <span className="px-2">Halaman {currentPage} dari {totalPages}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || isLoading}
                            >
                                Selanjutnya
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <ResetPasswordModal
                isOpen={isResetOpen}
                onClose={() => setIsResetOpen(false)}
                onSubmit={resetPassword}
                user={selectedUser}
                isProcessing={isProcessing}
            />
        </SuperAdminDashboardLayout >
    );
}
