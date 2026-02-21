'use client';

import { useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import type { Division, MasterFilters, CreateDivisionInput, UpdateDivisionInput } from '@/types/master-data';

const DIVISION_WITH_RELATIONS = gql`
  fragment DivisionWithRelationsHook on Division {
    id
    name
    code
    estateId
    createdAt
    updatedAt
    estate {
      id
      name
      company {
        id
        name
      }
    }
  }
`;

const GET_DIVISIONS = gql`
  ${DIVISION_WITH_RELATIONS}
  query GetDivisions {
    divisions {
      ...DivisionWithRelationsHook
    }
  }
`;

const GET_DIVISION = gql`
  ${DIVISION_WITH_RELATIONS}
  query GetDivision($id: ID!) {
    division(id: $id) {
      ...DivisionWithRelationsHook
    }
  }
`;

const CREATE_DIVISION = gql`
  mutation CreateDivision($input: CreateDivisionInput!) {
    createDivision(input: $input) {
      id
      name
      code
      estateId
    }
  }
`;

const UPDATE_DIVISION = gql`
  mutation UpdateDivision($input: UpdateDivisionInput!) {
    updateDivision(input: $input) {
      id
      name
      code
      estateId
    }
  }
`;

const DELETE_DIVISION = gql`
  mutation DeleteDivision($id: ID!) {
    deleteDivision(id: $id)
  }
`;

export function useDivisions(filters?: MasterFilters & { estateId?: string }) {
  const shouldSkip =
    !!filters && !filters.estateId && !filters.companyId && !filters.search;

  const { data, loading, error, refetch } = useQuery<{ divisions: Division[] }>(GET_DIVISIONS, {
    skip: shouldSkip,
  });

  const [createDivisionMutation, { loading: creating }] = useMutation<{ createDivision: Division }>(CREATE_DIVISION, {
    refetchQueries: [{ query: GET_DIVISIONS }],
  });

  const [updateDivisionMutation, { loading: updating }] = useMutation<{ updateDivision: Division }>(UPDATE_DIVISION, {
    refetchQueries: [{ query: GET_DIVISIONS }],
  });

  const [deleteDivisionMutation, { loading: deleting }] = useMutation<{ deleteDivision: boolean }>(DELETE_DIVISION, {
    refetchQueries: [{ query: GET_DIVISIONS }],
  });

  const divisions = useMemo(() => {
    const base = data?.divisions || [];
    return base.filter((division: Division) => {
      if (filters?.estateId && division.estateId !== filters.estateId) {
        return false;
      }
      if (filters?.companyId) {
        const companyId = division.companyId || division.estate?.company?.id;
        if (companyId !== filters.companyId) {
          return false;
        }
      }
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        const name = (division.name || '').toLowerCase();
        const code = (division.code || '').toLowerCase();
        if (!name.includes(query) && !code.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [data?.divisions, filters?.estateId, filters?.companyId, filters?.search]);

  return {
    divisions,
    isLoading: loading,
    error,
    refetch,
    createDivision: async (input: CreateDivisionInput) => {
      const result = await createDivisionMutation({
        variables: {
          input: {
            name: input.name,
            code: input.code,
            estateId: input.estateId,
          },
        },
      });
      return result.data?.createDivision;
    },
    updateDivision: async (input: UpdateDivisionInput) => {
      const result = await updateDivisionMutation({
        variables: {
          input: {
            id: input.id,
            name: input.name,
            code: input.code,
          },
        },
      });
      return result.data?.updateDivision;
    },
    deleteDivision: async (id: string) => {
      await deleteDivisionMutation({ variables: { id } });
    },
    isCreating: creating,
    isUpdating: updating,
    isDeleting: deleting,
  };
}

export function useDivision(id: string) {
  const { data, loading, error } = useQuery<{ division: Division }>(GET_DIVISION, {
    variables: { id },
    skip: !id,
  });

  return {
    division: data?.division,
    isLoading: loading,
    error,
  };
}
