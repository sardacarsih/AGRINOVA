import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useBlocks, useBlock } from '../useBlocks';
import { gql } from 'graphql-tag';

const GET_BLOCKS = gql`
  query GetBlocks($filters: BlockFilters) {
    blocks(filters: $filters) {
      id
      blockCode
      name
      divisionId
      estateId
      companyId
      luasHa
      isActive
    }
  }
`;

const CREATE_BLOCK = gql`
  mutation CreateBlock($input: CreateBlockInput!) {
    createBlock(input: $input) {
      id
      blockCode
      name
    }
  }
`;

describe('useBlocks', () => {
    it('fetches blocks successfully', async () => {
        const mockBlocks = [
            {
                id: '1',
                blockCode: 'BLK001',
                name: 'Block 1',
                divisionId: 'div1',
                estateId: 'est1',
                companyId: 'comp1',
                luasHa: 10.5,
                isActive: true,
            },
            {
                id: '2',
                blockCode: 'BLK002',
                name: 'Block 2',
                divisionId: 'div1',
                estateId: 'est1',
                companyId: 'comp1',
                luasHa: 12.0,
                isActive: true,
            },
        ];

        const mocks = [
            {
                request: {
                    query: GET_BLOCKS,
                    variables: { filters: {} },
                },
                result: {
                    data: {
                        blocks: mockBlocks,
                    },
                },
            },
        ];

        const wrapper = ({children}: { children: React.ReactNode }) => (
            <MockedProvider mocks={mocks} addTypename={false}>
                {children}
                </MockedProvider>
        );

    const { result } = renderHook(() => useBlocks({}), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.blocks).toEqual([]);

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.blocks).toEqual(mockBlocks);
    expect(result.current.blocks).toHaveLength(2);
});

it('handles fetch errors', async () => {
    const mocks = [
        {
            request: {
                query: GET_BLOCKS,
                variables: { filters: {} },
            },
            error: new Error('Network error'),
        },
    ];

    const wrapper = ({children}: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
            {children}
            </MockedProvider>
    );

const { result } = renderHook(() => useBlocks({}), { wrapper });

await waitFor(() => {
    expect(result.current.error).toBeDefined();
});

expect(result.current.blocks).toEqual([]);
  });

it('creates a new block', async () => {
    const newBlock = {
        blockCode: 'BLK003',
        name: 'New Block',
        companyId: 'comp1',
        estateId: 'est1',
        divisionId: 'div1',
        luasHa: 15.0,
    };

    const mocks = [
        {
            request: {
                query: GET_BLOCKS,
                variables: { filters: {} },
            },
            result: {
                data: { blocks: [] },
            },
        },
        {
            request: {
                query: CREATE_BLOCK,
                variables: { input: newBlock },
            },
            result: {
                data: {
                    createBlock: {
                        id: '3',
                        ...newBlock,
                    },
                },
            },
        },
    ];

    const wrapper = ({children}: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
            {children}
            </MockedProvider>
    );

const { result } = renderHook(() => useBlocks({}), { wrapper });

await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
});

const createdBlock = await result.current.createBlock(newBlock);

expect(createdBlock).toBeDefined();
expect(createdBlock?.blockCode).toBe('BLK003');
  });

it('filters blocks by division', async () => {
    const filters = { divisionId: 'div1' };
    const mockBlocks = [
        {
            id: '1',
            blockCode: 'BLK001',
            name: 'Block 1',
            divisionId: 'div1',
            estateId: 'est1',
            companyId: 'comp1',
            luasHa: 10.5,
            isActive: true,
        },
    ];

    const mocks = [
        {
            request: {
                query: GET_BLOCKS,
                variables: { filters },
            },
            result: {
                data: { blocks: mockBlocks },
            },
        },
    ];

    const wrapper = ({children}: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
            {children}
            </MockedProvider>
    );

const { result } = renderHook(() => useBlocks(filters), { wrapper });

await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
});

expect(result.current.blocks).toHaveLength(1);
expect(result.current.blocks[0].divisionId).toBe('div1');
  });
});

describe('useBlock', () => {
    const GET_BLOCK = gql`
    query GetBlock($id: ID!) {
      block(id: $id) {
        id
        blockCode
        name
        luasHa
      }
    }
  `;

    it('fetches single block by ID', async () => {
        const mockBlock = {
            id: '1',
            blockCode: 'BLK001',
            name: 'Block 1',
            luasHa: 10.5,
        };

        const mocks = [
            {
                request: {
                    query: GET_BLOCK,
                    variables: { id: '1' },
                },
                result: {
                    data: { block: mockBlock },
                },
            },
        ];

        const wrapper = ({children}: { children: React.ReactNode }) => (
            <MockedProvider mocks={mocks} addTypename={false}>
                {children}
                </MockedProvider>
        );

    const { result } = renderHook(() => useBlock('1'), { wrapper });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.block).toEqual(mockBlock);
});

it('skips query when id is empty', () => {
    const wrapper = ({children}: { children: React.ReactNode }) => (
        <MockedProvider mocks={[]} addTypename={false}>
            {children}
            </MockedProvider>
    );

const { result } = renderHook(() => useBlock(''), { wrapper });

expect(result.current.isLoading).toBe(false);
expect(result.current.block).toBeUndefined();
  });
});
