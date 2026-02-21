import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useUserAssignments } from '../useAssignments';
import { gql } from 'graphql-tag';

const GET_USER_ASSIGNMENTS = gql`
  query GetUserAssignments($userId: ID!) {
    userAssignments(userId: $userId) {
      estates {
        id
        userId
        estateId
        role
      }
      divisions {
        id
        userId
        divisionId
        role
      }
      companies {
        id
        userId
        companyId
        role
      }
    }
  }
`;

describe('useUserAssignments', () => {
    it('fetches user assignments successfully', async () => {
        const mockAssignments = {
            estates: [
                { id: '1', userId: 'user1', estateId: 'est1', role: 'MANDOR' },
            ],
            divisions: [
                { id: '2', userId: 'user1', divisionId: 'div1', role: 'ASISTEN' },
            ],
            companies: [
                { id: '3', userId: 'user1', companyId: 'comp1', role: 'MANAGER' },
            ],
        };

        const mocks = [
            {
                request: {
                    query: GET_USER_ASSIGNMENTS,
                    variables: { userId: 'user1' },
                },
                result: {
                    data: {
                        userAssignments: mockAssignments,
                    },
                },
            },
        ];

        const wrapper = ({children}: { children: React.ReactNode }) => (
            <MockedProvider mocks={mocks} addTypename={false}>
                {children}
                </MockedProvider>
        );

    const { result } = renderHook(() => useUserAssignments('user1'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.assignments.estates).toHaveLength(1);
    expect(result.current.assignments.divisions).toHaveLength(1);
    expect(result.current.assignments.companies).toHaveLength(1);
});

it('handles fetch errors', async () => {
    const mocks = [
        {
            request: {
                query: GET_USER_ASSIGNMENTS,
                variables: { userId: 'user1' },
            },
            error: new Error('Network error'),
        },
    ];

    const wrapper = ({children}: { children: React.ReactNode }) => (
        <MockedProvider mocks={mocks} addTypename={false}>
            {children}
            </MockedProvider>
    );

const { result } = renderHook(() => useUserAssignments('user1'), { wrapper });

await waitFor(() => {
    expect(result.current.error).toBeDefined();
});

expect(result.current.assignments.estates).toEqual([]);
  });

it('skips query when userId is empty', () => {
    const wrapper = ({children}: { children: React.ReactNode }) => (
        <MockedProvider mocks={[]} addTypename={false}>
            {children}
            </MockedProvider>
    );

const { result } = renderHook(() => useUserAssignments(''), { wrapper });

expect(result.current.isLoading).toBe(false);
expect(result.current.assignments.estates).toEqual([]);
  });

it('returns default empty arrays when no data', async () => {
    const mocks = [
        {
            request: {
                query: GET_USER_ASSIGNMENTS,
                variables: { userId: 'user1' },
            },
            result: {
                data: {
                    userAssignments: {
                        estates: [],
                        divisions: [],
                        companies: [],
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

const { result } = renderHook(() => useUserAssignments('user1'), { wrapper });

await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
});

expect(result.current.assignments.estates).toEqual([]);
expect(result.current.assignments.divisions).toEqual([]);
expect(result.current.assignments.companies).toEqual([]);
  });

it('provides assignment mutation functions', () => {
    const wrapper = ({children}: { children: React.ReactNode }) => (
        <MockedProvider mocks={[]} addTypename={false}>
            {children}
            </MockedProvider>
    );

const { result } = renderHook(() => useUserAssignments('user1'), { wrapper });

expect(typeof result.current.assignToEstate).toBe('function');
expect(typeof result.current.assignToDivision).toBe('function');
expect(typeof result.current.assignToCompany).toBe('function');
expect(typeof result.current.removeEstateAssignment).toBe('function');
expect(typeof result.current.removeDivisionAssignment).toBe('function');
expect(typeof result.current.removeCompanyAssignment).toBe('function');
  });

it('tracks loading states correctly', () => {
    const wrapper = ({children}: { children: React.ReactNode }) => (
        <MockedProvider mocks={[]} addTypename={false}>
            {children}
            </MockedProvider>
    );

const { result } = renderHook(() => useUserAssignments('user1'), { wrapper });

expect(result.current.isAssigning).toBe(false);
expect(result.current.isRemoving).toBe(false);
  });
});
