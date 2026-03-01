'use client';

import { useQuery } from '@apollo/client/react';
import {
    GetAllCompaniesDocument,
    GetAllRolesDocument,
    GetUserDocument,
    GetUsersDocument,
    User
} from '@/gql/graphql';

interface UseUserFormDataProps {
    userId?: string;
    companyId?: string; // Optional filter for users fetch
    loadAllCompanies?: boolean;
    loadAllUsers?: boolean;
    onlyActiveUsers?: boolean;
    fallbackCompanies?: Array<{ id: string; name: string; code?: string | null }>;
}

export function useUserFormData({
    userId,
    companyId,
    loadAllCompanies = true,
    loadAllUsers = false,
    onlyActiveUsers = false,
    fallbackCompanies = [],
}: UseUserFormDataProps = {}) {
    // Fetch all companies
    const { data: companiesData, loading: companiesLoading } = useQuery(GetAllCompaniesDocument, {
        skip: !loadAllCompanies,
    });

    // Fetch all roles
    const { data: rolesData, loading: rolesLoading } = useQuery(GetAllRolesDocument);

    // Fetch potential managers (users list)
    // Optimization: We could filter this by company if strict tenant isolation is needed
    // or use a more specific query for managers. For now keeping it simple as per original modal.
    const { data: usersData, loading: usersLoading } = useQuery(GetUsersDocument, {
        variables: {
            companyId: loadAllUsers ? undefined : companyId,
            isActive: onlyActiveUsers ? true : undefined,
            limit: 1000, // Fetch enough users to be useful for selection
        },
        // Prevent stale cross-session user lists (e.g. after switching company admin accounts).
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'cache-first',
    });

    // Fetch specific user if ID is provided (for edit mode)
    const { data: userData, loading: userLoading } = useQuery(GetUserDocument, {
        variables: { id: userId || '' },
        skip: !userId,
        fetchPolicy: 'network-only',
    });

    const companies = loadAllCompanies
        ? (companiesData?.allCompanies?.companies || [])
        : fallbackCompanies;

    const isLoading = (loadAllCompanies && companiesLoading) || rolesLoading || usersLoading || (!!userId && userLoading);

    return {
        companies,
        roles: rolesData?.allRoles || [],
        users: usersData?.users?.users || [], // Potential managers
        user: userData?.user as User | null,
        isLoading,
    };
}
