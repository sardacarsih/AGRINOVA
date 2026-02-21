'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import type { Block, BlockFilters, CreateBlockInput, UpdateBlockInput } from '@/types/master-data';

const BLOCK_FIELDS = gql`
  fragment BlockFields on Block {
    id
    blockCode
    nama
    divisionId
    estateId
    companyId
    luasHa
    jumlahPohon
    plantingYear
    cropType
    targetPanen
    deskripsi
    isActive
    createdAt
    updatedAt
  }
`;

const BLOCK_WITH_RELATIONS = gql`
  ${BLOCK_FIELDS}
  fragment BlockWithRelations on Block {
    ...BlockFields
    division {
      id
      nama
      code
    }
    estate {
      id
      nama
      code
    }
    company {
      id
      nama
      kode
    }
  }
`;

const GET_BLOCKS = gql`
  ${BLOCK_WITH_RELATIONS}
  query GetBlocks($filters: BlockFilters) {
    blocks(filters: $filters) {
      ...BlockWithRelations
    }
  }
`;

const GET_BLOCK = gql`
  ${BLOCK_WITH_RELATIONS}
  query GetBlock($id: ID!) {
    block(id: $id) {
      ...BlockWithRelations
    }
  }
`;

const CREATE_BLOCK = gql`
  mutation CreateBlock($input: CreateBlockInput!) {
    createBlock(input: $input) {
      id
      blockCode
      nama
    }
  }
`;

const UPDATE_BLOCK = gql`
  mutation UpdateBlock($input: UpdateBlockInput!) {
    updateBlock(input: $input) {
      id
      blockCode
      nama
    }
  }
`;

const DELETE_BLOCK = gql`
  mutation DeleteBlock($id: ID!) {
    deleteBlock(id: $id)
  }
`;

export function useBlocks(filters?: BlockFilters) {
  const { data, loading, error, refetch } = useQuery<{ blocks: Block[] }>(GET_BLOCKS, {
    variables: { filters },
  });

  const [createBlockMutation, { loading: creating }] = useMutation<{ createBlock: Block }>(CREATE_BLOCK, {
    refetchQueries: [{ query: GET_BLOCKS, variables: { filters } }],
  });

  const [updateBlockMutation, { loading: updating }] = useMutation<{ updateBlock: Block }>(UPDATE_BLOCK, {
    refetchQueries: [{ query: GET_BLOCKS, variables: { filters } }],
  });

  const [deleteBlockMutation, { loading: deleting }] = useMutation<{ deleteBlock: boolean }>(DELETE_BLOCK, {
    refetchQueries: [{ query: GET_BLOCKS, variables: { filters } }],
  });

  return {
    blocks: data?.blocks || [],
    isLoading: loading,
    error,
    refetch,
    createBlock: async (input: CreateBlockInput) => {
      const result = await createBlockMutation({ variables: { input } });
      return result.data?.createBlock;
    },
    updateBlock: async (input: UpdateBlockInput) => {
      const result = await updateBlockMutation({ variables: { input } });
      return result.data?.updateBlock;
    },
    deleteBlock: async (id: string) => {
      await deleteBlockMutation({ variables: { id } });
    },
    isCreating: creating,
    isUpdating: updating,
    isDeleting: deleting,
  };
}

export function useBlock(id: string) {
  const { data, loading, error } = useQuery<{ block: Block }>(GET_BLOCK, {
    variables: { id },
    skip: !id,
  });

  return {
    block: data?.block,
    isLoading: loading,
    error,
  };
}
