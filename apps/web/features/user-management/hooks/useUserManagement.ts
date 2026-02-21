'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import {
    GetUsersDocument,
    GetUserDocument,
    CreateUserDocument,
    UpdateUserDocument,
    DeleteUserDocument,
    ToggleUserStatusDocument,
    ResetUserPasswordDocument,
    GetAllCompaniesDocument,
    GetAllRolesDocument,
    UserRole,
    CreateUserInput,
    UpdateUserInput,
    ResetPasswordInput
} from '@/gql/graphql';
import { toast } from 'sonner';

const USER_DELETE_RELATION_ERROR_HINTS = [
    'fk_user_estate_assignments_user',
    'user_estate_assignments',
    'foreign key',
    'sqlstate 23503',
];

function extractErrorMessage(error: unknown): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null) {
        const errorObject = error as {
            message?: unknown;
            graphQLErrors?: Array<{ message?: unknown }>;
            networkError?: { message?: unknown };
        };
        if (typeof errorObject.message === 'string') return errorObject.message;
        const graphQlMessage = errorObject.graphQLErrors?.find((entry) => typeof entry?.message === 'string')?.message;
        if (typeof graphQlMessage === 'string') return graphQlMessage;
        const networkMessage = errorObject.networkError?.message;
        if (typeof networkMessage === 'string') return networkMessage;
    }
    return '';
}

function humanizeDeleteUserError(message: string): string {
    const normalizedMessage = message.toLowerCase();
    if (USER_DELETE_RELATION_ERROR_HINTS.some((hint) => normalizedMessage.includes(hint))) {
        return 'Pengguna tidak bisa dihapus karena masih terhubung ke data penugasan estate. Lepas/bersihkan penugasan user ini terlebih dahulu, atau nonaktifkan akunnya.';
    }
    if (!message.trim()) {
        return 'Terjadi kendala saat menghapus pengguna. Silakan coba lagi.';
    }
    return message;
}

interface UserManagementOptions {
    loadAllCompanies?: boolean;
    fallbackCompanies?: Array<{ id: string; name: string; code?: string | null }>;
}

export function useUserManagement(filters?: {
    companyId?: string;
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}, options?: UserManagementOptions) {
    const shouldLoadAllCompanies = options?.loadAllCompanies ?? true;

    const { data, loading, error, refetch } = useQuery(GetUsersDocument, {
        variables: {
            companyId: filters?.companyId,
            role: filters?.role,
            isActive: filters?.isActive,
            search: filters?.search,
            limit: filters?.limit || 10,
            offset: filters?.offset || 0,
        },
        fetchPolicy: 'network-only',
    });

    const { data: companiesData, loading: companiesLoading } = useQuery(GetAllCompaniesDocument, {
        skip: !shouldLoadAllCompanies,
    });
    const { data: rolesData, loading: rolesLoading } = useQuery(GetAllRolesDocument);

    const [createUserMutation, { loading: creating }] = useMutation(CreateUserDocument);
    const [updateUserMutation, { loading: updating }] = useMutation(UpdateUserDocument);
    const [deleteUserMutation, { loading: deleting }] = useMutation(DeleteUserDocument);
    const [toggleStatusMutation, { loading: toggling }] = useMutation(ToggleUserStatusDocument);
    const [resetPasswordMutation, { loading: resetting }] = useMutation(ResetUserPasswordDocument);

    const companies = shouldLoadAllCompanies
        ? (companiesData?.allCompanies?.companies || [])
        : (options?.fallbackCompanies || []);

    const createUser = async (input: CreateUserInput) => {
        try {
            const { data } = await createUserMutation({ variables: { input } });
            if (data?.createUser.success) {
                toast.success(data.createUser.message);
                refetch();
                return true;
            } else {
                toast.error(data?.createUser.message || 'Failed to create user');
                return false;
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to create user');
            return false;
        }
    };

    const updateUser = async (input: UpdateUserInput) => {
        try {
            const { data } = await updateUserMutation({ variables: { input } });
            if (data?.updateUser.success) {
                toast.success(data.updateUser.message);
                refetch();
                return true;
            } else {
                toast.error(data?.updateUser.message || 'Failed to update user');
                return false;
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to update user');
            return false;
        }
    };

    const deleteUser = async (id: string) => {
        try {
            const { data } = await deleteUserMutation({ variables: { id } });
            if (data?.deleteUser.success) {
                toast.success(data.deleteUser.message);
                refetch();
                return true;
            } else {
                const readableMessage = humanizeDeleteUserError(data?.deleteUser.message || '');
                toast.error('Gagal menghapus pengguna', {
                    description: readableMessage,
                });
                return false;
            }
        } catch (err: any) {
            const technicalMessage = extractErrorMessage(err);
            const readableMessage = humanizeDeleteUserError(technicalMessage);
            toast.error('Gagal menghapus pengguna', {
                description: readableMessage,
            });
            console.error('[useUserManagement.deleteUser] Failed to delete user:', err);
            return false;
        }
    };

    const toggleStatus = async (id: string) => {
        try {
            const { data } = await toggleStatusMutation({ variables: { id } });
            if (data?.toggleUserStatus.success) {
                toast.success(data.toggleUserStatus.message);
                refetch();
                return true;
            } else {
                toast.error(data?.toggleUserStatus.message || 'Failed to toggle status');
                return false;
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to toggle status');
            return false;
        }
    };

    const resetPassword = async (input: ResetPasswordInput) => {
        try {
            const { data } = await resetPasswordMutation({ variables: { input } });
            if (data?.resetUserPassword.success) {
                toast.success(data.resetUserPassword.message);
                return true;
            } else {
                toast.error(data?.resetUserPassword.message || 'Failed to reset password');
                return false;
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to reset password');
            return false;
        }
    };

    return {
        users: data?.users?.users || [],
        totalCount: data?.users?.totalCount || 0,
        pageInfo: data?.users?.pageInfo,
        companies,
        roles: rolesData?.allRoles || [],
        isLoading: loading || rolesLoading || (shouldLoadAllCompanies && companiesLoading),
        isProcessing: creating || updating || deleting || toggling || resetting,
        createUser,
        updateUser,
        deleteUser,
        toggleStatus,
        resetPassword,
        refetch,
    };
}
