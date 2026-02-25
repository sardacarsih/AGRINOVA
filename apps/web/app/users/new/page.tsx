'use client';

import { useRouter } from 'next/navigation';
import { useUserFormData } from '@/features/user-management/hooks/useUserFormData';
import { useUserActions } from '@/features/user-management/hooks/useUserActions';
import { UserForm } from '@/features/user-management/components/UserForm';
import { PageLoading } from '@/components/ui/page-loading';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/gql/graphql';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
    normalizeAssignmentIds,
    validateUniqueActiveAssignmentConflict,
} from '@/features/user-management/utils/assignment-conflict-validation';

export default function NewUserPage() {
    const router = useRouter();
    const { user: currentUser } = useAuth();

    // Pass current company ID to pre-filter options if needed
    // Assuming currentUser has companyId or assignments
    const currentCompanyId =
        currentUser?.companyId ||
        (currentUser as any)?.company?.id ||
        (currentUser as any)?.companies?.[0]?.id ||
        (currentUser as any)?.assignedCompanies?.[0] ||
        (currentUser as any)?.companyAdminFor?.[0];
    const isSuperAdmin = currentUser?.role === UserRole.SuperAdmin;
    const fallbackCompanyName =
        typeof currentUser?.company === 'string'
            ? currentUser.company
            : (currentUser as any)?.company?.name || (currentUser as any)?.companies?.[0]?.name || 'Perusahaan Saya';

    const {
        companies,
        roles,
        users,
        isLoading: isLoadingData
    } = useUserFormData({
        companyId: currentCompanyId,
        loadAllCompanies: isSuperAdmin,
        loadAllUsers: isSuperAdmin,
        onlyActiveUsers: true,
        fallbackCompanies: currentCompanyId ? [{ id: currentCompanyId, name: fallbackCompanyName }] : [],
    });

    const { createUser, isProcessing } = useUserActions();

    const companyAdminAllowedRoles = [
        UserRole.Manager,
        UserRole.Asisten,
        UserRole.Mandor,
        UserRole.Satpam,
        UserRole.Timbangan,
        UserRole.Grading,
    ];

    const isCompanyAdmin = currentUser?.role === UserRole.CompanyAdmin;
    const filteredRoles = isCompanyAdmin
        ? roles.filter((r: any) => companyAdminAllowedRoles.includes(r.role))
        : roles;
    const filteredCompanies = isCompanyAdmin
        ? companies.filter((c: any) => c.id === currentCompanyId)
        : companies;

    const handleCancel = () => {
        router.back();
    };

    const handleSubmit = async (values: any) => {
        if (isCompanyAdmin && !companyAdminAllowedRoles.includes(values.role)) {
            toast.error('Company Admin hanya boleh membuat user role MANAGER ke bawah');
            return false;
        }

        const preparedValues = {
            ...values,
            companyIds: normalizeAssignmentIds(values.companyIds),
            estateIds: normalizeAssignmentIds(values.estateIds),
            divisionIds: normalizeAssignmentIds(values.divisionIds),
        };

        // If current user is NOT Super Admin, force company ID assignment
        if (currentUser?.role !== UserRole.SuperAdmin && currentCompanyId) {
            preparedValues.companyIds = [currentCompanyId];
        }

        const assignmentConflictMessage = validateUniqueActiveAssignmentConflict({
            role: preparedValues.role,
            isActive: preparedValues.isActive,
            companyIds: preparedValues.companyIds,
            estateIds: preparedValues.estateIds,
            existingUsers: users,
        });
        if (assignmentConflictMessage) {
            toast.error(assignmentConflictMessage);
            return false;
        }

        const success = await createUser(preparedValues);
        if (success) {
            router.push('/users');
        }
        return success;
    };

    if (isLoadingData) {
        return <PageLoading />;
    }

    const breadcrumbItems = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Pengguna', href: '/users' },
        { label: 'Buat Baru', href: '/users/new' },
    ];

    // Pre-fill company for new users if available
    const initialData = currentCompanyId
        ? {
            companyId: currentCompanyId,
            companyIds: [currentCompanyId],
            companies: [{ id: currentCompanyId, name: fallbackCompanyName }],
        }
        : undefined;

    return (
        <DashboardLayout
            title="Buat Pengguna Baru"
            description="Konfigurasi identitas, hak akses, dan penugasan wilayah kerja untuk anggota tim baru."
            breadcrumbItems={breadcrumbItems}
        >
            <div className="mx-auto max-w-5xl pb-20">
                <div className="mb-6">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Kembali
                    </Button>
                </div>

                <UserForm
                    key={`new-user-${currentCompanyId || 'default'}`}
                    initialData={initialData as any}
                    companies={filteredCompanies}
                    roles={filteredRoles}
                    users={users}
                    companySelectionReadOnly={isCompanyAdmin}
                    isProcessing={isProcessing}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    title="Detail Pengguna"
                    description="Lengkapi informasi yang diperlukan di bawah ini."
                />
            </div>
        </DashboardLayout>
    );
}
