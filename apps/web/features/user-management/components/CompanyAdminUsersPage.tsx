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
import { CompanyAdminDashboardLayout } from '@/components/layouts/role-layouts/CompanyAdminDashboardLayout';

interface CompanyAdminUsersPageProps {
    user: User;
}

type UserWithCompanyContext = User & {
    companyId?: string | null;
    company?: { id?: string | null; name?: string | null } | string | null;
    companies?: Array<{ id?: string | null; name?: string | null } | null> | null;
    assignedCompanies?: Array<string | null> | null;
    companyAdminFor?: Array<string | null> | null;
    assignedCompanyNames?: Array<string | null> | null;
};

export default function CompanyAdminUsersPage({ user }: CompanyAdminUsersPageProps) {
    const router = useRouter();
    const PAGE_SIZE = 10;

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    const [isResetOpen, setIsResetOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Resolve company context from any available shape on auth user payload.
    const userContext = user as UserWithCompanyContext;
    const companyObject = typeof userContext.company === 'object' && userContext.company ? userContext.company : null;
    const firstCompany = userContext.companies?.[0] ?? null;
    const companyId =
        userContext.companyId ||
        companyObject?.id ||
        firstCompany?.id ||
        userContext.assignedCompanies?.[0] ||
        userContext.companyAdminFor?.[0] ||
        null;
    const companyName =
        companyObject?.name ||
        firstCompany?.name ||
        userContext.assignedCompanyNames?.[0] ||
        (typeof userContext.company === 'string' ? userContext.company : null) ||
        'My Company';

    const {
        users,
        totalCount,
        pageInfo,
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
        companyId: companyId, // Restrict to current company
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
    }, {
        loadAllCompanies: false,
        fallbackCompanies: companyId ? [{ id: companyId, name: companyName }] : [],
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [search, roleFilter, companyId]);

    const allowedRoles = useMemo(() => ([
        UserRole.Manager,
        UserRole.Asisten,
        UserRole.Mandor,
        UserRole.Satpam,
        UserRole.Timbangan,
        UserRole.Grading,
    ]), []);

    // Filter roles manageable by Company Admin
    const manageableRoles = useMemo(() => {
        return roles.filter(r => allowedRoles.includes(r.role as UserRole));
    }, [roles, allowedRoles]);

    // Hide higher roles from company admin user list view.
    const manageableUsers = useMemo(() => {
        return users.filter((u) => allowedRoles.includes(u.role));
    }, [users, allowedRoles]);

    const totalPages = pageInfo?.totalPages ?? Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    // Handle user creation -> Navigate to new page
    const handleAddNew = () => {
        router.push('/users/new');
    };

    const handleEdit = (user: User) => {
        router.push(`/users/${user.id}/edit`);
    };

    const handleResetPassword = (user: User) => {
        setSelectedUser(user);
        setIsResetOpen(true);
    };

    if (!companyId) {
        return (
            <CompanyAdminDashboardLayout>
                <div className="p-6 text-center text-red-500">
                    Error: Could not determine your company context.
                </div>
            </CompanyAdminDashboardLayout>
        );
    }

    return (
        <CompanyAdminDashboardLayout contentMaxWidthClass="max-w-[1800px]">
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <UsersIcon className="h-8 w-8 text-primary" />
                            Manajemen Pengguna (Login)
                        </h1>
                        <p className="text-muted-foreground">
                            Kelola pengguna dan akses login perusahaan Anda.
                        </p>
                    </div>
                    <Button onClick={handleAddNew} className="w-full md:w-auto">
                        <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna Baru
                    </Button>

                </div>

                <RoleStatisticsCards companyId={companyId} roles={allowedRoles} />

                <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-3">
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
                            {manageableRoles.map((r) => (
                                <SelectItem key={r.role} value={r.role}>
                                    {r.name}
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
                        users={manageableUsers}
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
        </CompanyAdminDashboardLayout >
    );
}
