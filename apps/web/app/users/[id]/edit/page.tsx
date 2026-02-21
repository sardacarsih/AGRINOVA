'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserFormData } from '@/features/user-management/hooks/useUserFormData';
import { useUserActions } from '@/features/user-management/hooks/useUserActions';
import { UserForm } from '@/features/user-management/components/UserForm';
import { PageLoading } from '@/components/ui/page-loading';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { UserRole } from '@/gql/graphql';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: userId } = use(params);
    const { user: currentUser } = useAuth();
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
            : (currentUser as any)?.company?.name || (currentUser as any)?.companies?.[0]?.name || 'My Company';

    const companyAdminAllowedRoles = [
        UserRole.Manager,
        UserRole.Asisten,
        UserRole.Mandor,
        UserRole.Satpam,
        UserRole.Timbangan,
        UserRole.Grading,
    ];

    const isCompanyAdmin = currentUser?.role === UserRole.CompanyAdmin;

    const {
        companies,
        roles,
        users,
        user: initialData,
        isLoading: isLoadingData
    } = useUserFormData({
        userId,
        companyId: currentCompanyId,
        loadAllCompanies: isSuperAdmin,
        loadAllUsers: true,
        fallbackCompanies: currentCompanyId ? [{ id: currentCompanyId, name: fallbackCompanyName }] : [],
    });

    const { updateUser, isProcessing } = useUserActions();

    const filteredRoles = isCompanyAdmin
        ? roles.filter((r: any) => companyAdminAllowedRoles.includes(r.role))
        : roles;
    const filteredCompanies = isCompanyAdmin
        ? companies.filter((c: any) => c.id === currentCompanyId)
        : companies;

    useEffect(() => {
        if (!isCompanyAdmin || !initialData) return;

        if (!companyAdminAllowedRoles.includes(initialData.role)) {
            toast.error('Company Admin hanya boleh mengelola user role MANAGER ke bawah');
            router.push('/users');
        }
    }, [isCompanyAdmin, initialData, router]);

    const handleCancel = () => {
        router.back();
    };

    const handleSubmit = async (values: any) => {
        // Remove password from update payload (it's handled separately or optional)
        // The form currently includes password field only for new users or if we added a change password section
        // But UserForm logic for update usually doesn't send password unless explicitly changed.
        // For now, let's assume the mutation handles it or we clean it up here.

        // Ensure we don't send empty password if it wasn't changed
        if (values.password === '') {
            delete values.password;
        }

        if (isCompanyAdmin && !companyAdminAllowedRoles.includes(values.role)) {
            toast.error('Company Admin hanya boleh mengubah user role MANAGER ke bawah');
            return false;
        }

        if (isCompanyAdmin && currentCompanyId) {
            // Force to requester's company only.
            values.companyIds = [currentCompanyId];
        }

        const success = await updateUser({
            id: userId,
            ...values
        });

        if (success) {
            router.push('/users');
        }
        return success;
    };

    if (isLoadingData) {
        return <PageLoading />;
    }

    if (!initialData) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <p className="text-muted-foreground">User not found.</p>
                    <Button variant="outline" onClick={handleCancel}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Users
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Users
                </Button>
            </div>

            <UserForm
                initialData={initialData}
                companies={filteredCompanies}
                roles={filteredRoles}
                users={users}
                companySelectionReadOnly={isCompanyAdmin}
                isProcessing={isProcessing}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                title={`Edit User: ${initialData.username}`}
                description="Update user details and assignments."
            />
        </div>
    );
}
