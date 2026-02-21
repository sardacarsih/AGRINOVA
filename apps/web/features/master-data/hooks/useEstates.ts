'use client';

import { useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import type { Estate, CreateEstateInput, UpdateEstateInput } from '@/types/master-data';

interface EstateFilters {
    search?: string;
    companyId?: string;
    isActive?: boolean;
}

const ESTATE_WITH_RELATIONS = gql`
  fragment EstateWithRelations on Estate {
    id
    name
    companyId
    luasHa
    location
    createdAt
    updatedAt
    company {
      id
      name
      code
    }
  }
`;

const GET_ESTATES = gql`
  ${ESTATE_WITH_RELATIONS}
  query GetEstates {
    estates {
      ...EstateWithRelations
    }
  }
`;

const GET_ESTATE = gql`
  ${ESTATE_WITH_RELATIONS}
  query GetEstate($id: ID!) {
    estate(id: $id) {
      ...EstateWithRelations
    }
  }
`;

const CREATE_ESTATE = gql`
  mutation CreateEstate($input: CreateEstateInput!) {
    createEstate(input: $input) {
      id
      name
      companyId
      luasHa
      location
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_ESTATE = gql`
  mutation UpdateEstate($input: UpdateEstateInput!) {
    updateEstate(input: $input) {
      id
      name
      companyId
      luasHa
      location
      createdAt
      updatedAt
    }
  }
`;

const DELETE_ESTATE = gql`
  mutation DeleteEstate($id: ID!) {
    deleteEstate(id: $id)
  }
`;

export function useEstates(filters?: EstateFilters) {
    const shouldSkip =
        !!filters && !filters.companyId && !filters.search && filters.isActive !== undefined;

    const { data, loading, error, refetch } = useQuery<{ estates: Estate[] }>(GET_ESTATES, {
        skip: shouldSkip,
    });

    const [createEstateMutation, { loading: creating }] = useMutation<{ createEstate: Estate }>(CREATE_ESTATE, {
        refetchQueries: [{ query: GET_ESTATES }],
    });

    const [updateEstateMutation, { loading: updating }] = useMutation<{ updateEstate: Estate }>(UPDATE_ESTATE, {
        refetchQueries: [{ query: GET_ESTATES }],
    });

    const [deleteEstateMutation, { loading: deleting }] = useMutation<{ deleteEstate: boolean }>(DELETE_ESTATE, {
        refetchQueries: [{ query: GET_ESTATES }],
    });

    const estates = useMemo(() => {
        const base = data?.estates || [];
        return base.filter((estate: any) => {
            if (filters?.companyId && estate.companyId !== filters.companyId) {
                return false;
            }
            if (filters?.search) {
                const query = filters.search.toLowerCase();
                const name = (estate.name || '').toLowerCase();
                const location = (estate.location || '').toLowerCase();
                if (!name.includes(query) && !location.includes(query)) {
                    return false;
                }
            }
            return true;
        });
    }, [data?.estates, filters?.companyId, filters?.search]);

    return {
        estates,
        isLoading: loading,
        error,
        refetch,
        createEstate: async (input: CreateEstateInput) => {
            const createPayload: any = {
                companyId: input.companyId,
                name: input.name,
            };

            if (input.location !== undefined) {
                createPayload.location = input.location;
            }
            if (input.luasHa !== undefined) {
                createPayload.luasHa = input.luasHa;
            }

            const result = await createEstateMutation({
                variables: {
                    input: createPayload,
                },
            });
            return result.data?.createEstate;
        },
        updateEstate: async (input: UpdateEstateInput) => {
            const updatePayload: any = {
                id: input.id,
            };

            if (input.name !== undefined) {
                updatePayload.name = input.name;
            }
            if (input.location !== undefined) {
                updatePayload.location = input.location;
            }
            if (input.luasHa !== undefined) {
                updatePayload.luasHa = input.luasHa;
            }

            const result = await updateEstateMutation({
                variables: {
                    input: updatePayload,
                },
            });
            return result.data?.updateEstate;
        },
        deleteEstate: async (id: string) => {
            await deleteEstateMutation({ variables: { id } });
        },
        isCreating: creating,
        isUpdating: updating,
        isDeleting: deleting,
    };
}

export function useEstate(id: string) {
    const { data, loading, error } = useQuery<{ estate: Estate }>(GET_ESTATE, {
        variables: { id },
        skip: !id,
    });

    return {
        estate: data?.estate,
        isLoading: loading,
        error,
    };
}
