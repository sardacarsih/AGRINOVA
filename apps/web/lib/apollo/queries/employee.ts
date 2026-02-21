import { gql } from 'graphql-tag';

export const EMPLOYEE_FIELDS = gql`
  fragment EmployeeFields on Employee {
    id
    nik
    name
    role
    companyId
    divisionId
    photoUrl
    isActive
    createdAt
    updatedAt
  }
`;

export const GET_EMPLOYEES = gql`
  query GetEmployees {
    employees {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FIELDS}
`;

export const GET_EMPLOYEES_PAGINATED = gql`
  query GetEmployeesPaginated(
    $companyId: ID
    $search: String
    $employeeType: String
    $isActive: Boolean
    $divisionId: ID
    $sortBy: String
    $sortOrder: String
    $page: Int
    $limit: Int
  ) {
    employeesPaginated(
      companyId: $companyId
      search: $search
      employeeType: $employeeType
      isActive: $isActive
      divisionId: $divisionId
      sortBy: $sortBy
      sortOrder: $sortOrder
      page: $page
      limit: $limit
    ) {
      data {
        ...EmployeeFields
      }
      pagination {
        page
        limit
        total
        pages
      }
    }
  }
  ${EMPLOYEE_FIELDS}
`;

export const GET_EMPLOYEE = gql`
  query GetEmployee($id: ID!) {
    employee(id: $id) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FIELDS}
`;

export const GET_EMPLOYEE_BY_NIK = gql`
  query GetEmployeeByNIK($nik: String!, $companyId: ID!) {
    employeeByNIK(nik: $nik, companyId: $companyId) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FIELDS}
`;

export const CREATE_EMPLOYEE = gql`
  mutation CreateEmployee($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FIELDS}
`;

export const UPDATE_EMPLOYEE = gql`
  mutation UpdateEmployee($input: UpdateEmployeeInput!) {
    updateEmployee(input: $input) {
      ...EmployeeFields
    }
  }
  ${EMPLOYEE_FIELDS}
`;
