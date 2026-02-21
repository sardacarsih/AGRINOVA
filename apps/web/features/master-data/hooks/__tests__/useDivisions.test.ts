import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useDivisions, useDivision } from '../useDivisions';
import { gql } from 'graphql-tag';

const GET_DIVISIONS = gql`
  query GetDivisions($filters: MasterFilters) {
    divisions(filters: $filters) {
      id
      code
      name
      estateId
      companyId
      luasHa
      isActive
    }
  }
`;

describe('useDivisions', () => {
    it('fetches divisions successfully', async () => {
        const mockDivisions = [
            {
                id: '1',
                code: 'DIV001',
                name: 'Division 1',
                estateId: 'est1',
                companyId: 'comp1',
                luasHa: 100.5,
                isActive: true,
            },
            {
                id: '2',
                code: 'DIV002',
                name: 'Division 2',
                estateId: 'est1',
                companyId: 'comp1',
                luasHa: 120.0,
                isActive: true,
            },
        ];

        const mocks = [
            {
                request: {
                    query: GET_DIVISIONS,
                    variables: { filters: {} },
                },
                result: {
                    data: {
                        divisions: mockDivisions,
                    },
                },
            },
        ];

        const wrapper = ({children}: { children: React.ReactNode }) => (
            <MockedProvider mocks={mocks} addTypename={false}>
                {children}
                </MockedProvider>
        );

    const { result } = renderHook(() => useDivisions({}), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.divisions).toEqual([]);

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.divisions).toEqual(mockDivisions);
    expect(result.current.divisions).toHaveLength(2);
});

it('handles fetch errors', async () => {
    const mocks = [
        {
            request: {
                query: GET_DIVISIONS,
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

const { result } = renderHook(() => useDivisions({}), { wrapper });

await waitFor(() => {
    expect(result.current.error).toBeDefined();
});

expect(result.current.divisions).toEqual([]);
  });

it('filters divisions by estate', async () => {
    const filters = { estateId: 'est1' };
    const mockDivisions = [
        {
            id: '1',
            code: 'DIV001',
            name: 'Division 1',
            estateId: 'est1',
            companyId: 'comp1',
            luasHa: 100.5,
            isActive: true,
        },
    ];

    const mocks = [
        {
            request: {
                query: GET_DIVISIONS,
                variables: { filters },
            },
            result: {
                data: { divisions: mockDivisions },
            },
        },
    ];

    const wrapper = ({children}: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
            {children}
            </MockedProvider>
    );

const { result } = renderHook(() => useDivisions(filters), { wrapper });

await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
});

expect(result.current.divisions).toHaveLength(1);
expect(result.current.divisions[0].estateId).toBe('est1');
  });
});

describe('useDivision', () => {
    const GET_DIVISION = gql`
    query GetDivision($id: ID!) {
      division(id: $id) {
        id
        code
        name
        luasHa
      }
    }
  `;

    it('fetches single division by ID', async () => {
        const mockDivision = {
            id: '1',
            code: 'DIV001',
            name: 'Division 1',
            luasHa: 100.5,
        };

        const mocks = [
            {
                request: {
                    query: GET_DIVISION,
                    variables: { id: '1' },
                },
                result: {
                    data: { division: mockDivision },
                },
            },
        ];

        const wrapper = ({children}: { children: React.ReactNode }) => (
            <MockedProvider mocks={mocks} addTypename={false}>
                {children}
                </MockedProvider>
        );

    const { result } = renderHook(() => useDivision('1'), { wrapper });

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.division).toEqual(mockDivision);
});

it('skips query when id is empty', () => {
    const wrapper = ({children}: { children: React.ReactNode }) => (
        <MockedProvider mocks={[]} addTypename={false}>
            {children}
            </MockedProvider>
    );

const { result } = renderHook(() => useDivision(''), { wrapper });

expect(result.current.isLoading).toBe(false);
expect(result.current.division).toBeUndefined();
  });
});
