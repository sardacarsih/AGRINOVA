'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from 'graphql-tag';
import type {
  UserAssignments,
  UserEstateAssignment,
  UserDivisionAssignment,
  UserCompanyAssignment,
  AssignUserToEstateInput,
  AssignUserToDivisionInput,
  AssignUserToCompanyInput,
} from '@/types/assignments';

const GET_USER_ASSIGNMENTS = gql`
  query GetUserAssignments($userId: ID!) {
    userAssignments(userId: $userId) {
      estates {
        id
        userId
        estateId
        role
        assignedBy
        assignedAt
        estate {
          id
          nama
          code
        }
        user {
          id
          nama
        }
      }
      divisions {
        id
        userId
        divisionId
        role
        assignedBy
        assignedAt
        division {
          id
          nama
          code
        }
        user {
          id
          nama
        }
      }
      companies {
        id
        userId
        companyId
        role
        assignedBy
        assignedAt
        company {
          id
          nama
          kode
        }
        user {
          id
          nama
        }
      }
    }
  }
`;

const ASSIGN_USER_TO_ESTATE = gql`
  mutation AssignUserToEstate($input: AssignUserToEstateInput!) {
    assignUserToEstate(input: $input) {
      id
      userId
      estateId
      role
    }
  }
`;

const ASSIGN_USER_TO_DIVISION = gql`
  mutation AssignUserToDivision($input: AssignUserToDivisionInput!) {
    assignUserToDivision(input: $input) {
      id
      userId
      divisionId
      role
    }
  }
`;

const ASSIGN_USER_TO_COMPANY = gql`
  mutation AssignUserToCompany($input: AssignUserToCompanyInput!) {
    assignUserToCompany(input: $input) {
      id
      userId
      companyId
      role
    }
  }
`;

const REMOVE_ESTATE_ASSIGNMENT = gql`
  mutation RemoveEstateAssignment($id: ID!) {
    removeEstateAssignment(id: $id)
  }
`;

const REMOVE_DIVISION_ASSIGNMENT = gql`
  mutation RemoveDivisionAssignment($id: ID!) {
    removeDivisionAssignment(id: $id)
  }
`;

const REMOVE_COMPANY_ASSIGNMENT = gql`
  mutation RemoveCompanyAssignment($id: ID!) {
    removeCompanyAssignment(id: $id)
  }
`;

export function useUserAssignments(userId: string) {
  const { data, loading, error } = useQuery<{ userAssignments: UserAssignments }>(
    GET_USER_ASSIGNMENTS,
    {
      variables: { userId },
      skip: !userId,
    }
  );

  const [assignToEstateMutation, { loading: assigningEstate }] = useMutation<{ assignUserToEstate: UserEstateAssignment }>(
    ASSIGN_USER_TO_ESTATE,
    {
      refetchQueries: [{ query: GET_USER_ASSIGNMENTS, variables: { userId } }],
    }
  );

  const [assignToDivisionMutation, { loading: assigningDivision }] = useMutation<{ assignUserToDivision: UserDivisionAssignment }>(
    ASSIGN_USER_TO_DIVISION,
    {
      refetchQueries: [{ query: GET_USER_ASSIGNMENTS, variables: { userId } }],
    }
  );

  const [assignToCompanyMutation, { loading: assigningCompany }] = useMutation<{ assignUserToCompany: UserCompanyAssignment }>(
    ASSIGN_USER_TO_COMPANY,
    {
      refetchQueries: [{ query: GET_USER_ASSIGNMENTS, variables: { userId } }],
    }
  );

  const [removeEstateAssignmentMutation, { loading: removingEstate }] = useMutation<{ removeEstateAssignment: boolean }>(
    REMOVE_ESTATE_ASSIGNMENT,
    {
      refetchQueries: [{ query: GET_USER_ASSIGNMENTS, variables: { userId } }],
    }
  );

  const [removeDivisionAssignmentMutation, { loading: removingDivision }] = useMutation<{ removeDivisionAssignment: boolean }>(
    REMOVE_DIVISION_ASSIGNMENT,
    {
      refetchQueries: [{ query: GET_USER_ASSIGNMENTS, variables: { userId } }],
    }
  );

  const [removeCompanyAssignmentMutation, { loading: removingCompany }] = useMutation<{ removeCompanyAssignment: boolean }>(
    REMOVE_COMPANY_ASSIGNMENT,
    {
      refetchQueries: [{ query: GET_USER_ASSIGNMENTS, variables: { userId } }],
    }
  );

  return {
    assignments: data?.userAssignments || { estates: [], divisions: [], companies: [] },
    isLoading: loading,
    error,
    assignToEstate: async (input: AssignUserToEstateInput) => {
      const result = await assignToEstateMutation({ variables: { input } });
      return result.data?.assignUserToEstate;
    },
    assignToDivision: async (input: AssignUserToDivisionInput) => {
      const result = await assignToDivisionMutation({ variables: { input } });
      return result.data?.assignUserToDivision;
    },
    assignToCompany: async (input: AssignUserToCompanyInput) => {
      const result = await assignToCompanyMutation({ variables: { input } });
      return result.data?.assignUserToCompany;
    },
    removeEstateAssignment: async (id: string) => {
      await removeEstateAssignmentMutation({ variables: { id } });
    },
    removeDivisionAssignment: async (id: string) => {
      await removeDivisionAssignmentMutation({ variables: { id } });
    },
    removeCompanyAssignment: async (id: string) => {
      await removeCompanyAssignmentMutation({ variables: { id } });
    },
    isAssigning: assigningEstate || assigningDivision || assigningCompany,
    isRemoving: removingEstate || removingDivision || removingCompany,
  };
}
