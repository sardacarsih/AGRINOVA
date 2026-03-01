import { gql } from 'graphql-tag';

export const GET_MANAGER_DIVISION_OPTIONS = gql`
  query GetManagerDivisionOptions {
    managerDivisionOptions {
      id
      name
      estateId
      estateName
    }
  }
`;

export const GET_MANAGER_DIVISION_PRODUCTION_BUDGETS = gql`
  query GetManagerDivisionProductionBudgets($divisionId: ID, $period: String) {
    managerDivisionProductionBudgets(divisionId: $divisionId, period: $period) {
      id
      divisionId
      divisionName
      estateId
      estateName
      period
      targetTon
      plannedCost
      actualCost
      workflowStatus
      overrideApproved
      notes
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_MANAGER_DIVISION_PRODUCTION_BUDGET = gql`
  mutation CreateManagerDivisionProductionBudget($input: CreateManagerDivisionProductionBudgetInput!) {
    createManagerDivisionProductionBudget(input: $input) {
      id
      divisionId
      divisionName
      estateId
      estateName
      period
      targetTon
      plannedCost
      actualCost
      workflowStatus
      overrideApproved
      notes
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_MANAGER_DIVISION_PRODUCTION_BUDGET = gql`
  mutation UpdateManagerDivisionProductionBudget($input: UpdateManagerDivisionProductionBudgetInput!) {
    updateManagerDivisionProductionBudget(input: $input) {
      id
      divisionId
      divisionName
      estateId
      estateName
      period
      targetTon
      plannedCost
      actualCost
      workflowStatus
      overrideApproved
      notes
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_MANAGER_DIVISION_PRODUCTION_BUDGET = gql`
  mutation DeleteManagerDivisionProductionBudget($id: ID!) {
    deleteManagerDivisionProductionBudget(id: $id)
  }
`;

export interface ManagerDivisionProductionBudget {
  id: string;
  divisionId: string;
  divisionName: string;
  estateId: string;
  estateName: string;
  period: string;
  targetTon: number;
  plannedCost: number;
  actualCost: number;
  workflowStatus: ManagerBudgetWorkflowStatus;
  overrideApproved: boolean;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ManagerBudgetWorkflowStatus = 'DRAFT' | 'REVIEW' | 'APPROVED';

export interface ManagerDivisionOption {
  id: string;
  name: string;
  estateId: string;
  estateName: string;
}

export interface GetManagerDivisionOptionsResponse {
  managerDivisionOptions: ManagerDivisionOption[];
}

export interface GetManagerDivisionProductionBudgetsResponse {
  managerDivisionProductionBudgets: ManagerDivisionProductionBudget[];
}

export interface CreateManagerDivisionProductionBudgetInput {
  divisionId: string;
  period: string;
  targetTon: number;
  plannedCost: number;
  actualCost?: number;
  workflowStatus?: ManagerBudgetWorkflowStatus;
  overrideApproved?: boolean;
  notes?: string;
}

export interface UpdateManagerDivisionProductionBudgetInput {
  id: string;
  divisionId?: string;
  period?: string;
  targetTon?: number;
  plannedCost?: number;
  actualCost?: number;
  workflowStatus?: ManagerBudgetWorkflowStatus;
  overrideApproved?: boolean;
  notes?: string;
}

export interface CreateManagerDivisionProductionBudgetResponse {
  createManagerDivisionProductionBudget: ManagerDivisionProductionBudget;
}

export interface UpdateManagerDivisionProductionBudgetResponse {
  updateManagerDivisionProductionBudget: ManagerDivisionProductionBudget;
}

export interface DeleteManagerDivisionProductionBudgetResponse {
  deleteManagerDivisionProductionBudget: boolean;
}
