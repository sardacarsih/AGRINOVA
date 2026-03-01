import { gql } from 'graphql-tag';

export const GET_MANAGER_BLOCK_OPTIONS = gql`
  query GetManagerBlockOptions($divisionId: ID) {
    managerBlockOptions(divisionId: $divisionId) {
      id
      blockCode
      name
      divisionId
      divisionName
      estateId
      estateName
    }
  }
`;

export const GET_MANAGER_BLOCK_PRODUCTION_BUDGETS = gql`
  query GetManagerBlockProductionBudgets($blockId: ID, $divisionId: ID, $period: String) {
    managerBlockProductionBudgets(blockId: $blockId, divisionId: $divisionId, period: $period) {
      id
      blockId
      blockCode
      blockName
      divisionId
      divisionName
      estateId
      estateName
      period
      targetTon
      plannedCost
      actualCost
      workflowStatus
      notes
      createdById
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_MANAGER_BLOCK_PRODUCTION_BUDGET = gql`
  mutation CreateManagerBlockProductionBudget($input: CreateManagerBlockProductionBudgetInput!) {
    createManagerBlockProductionBudget(input: $input) {
      id
      blockId
      blockCode
      blockName
      divisionId
      divisionName
      estateId
      estateName
      period
      targetTon
      plannedCost
      actualCost
      workflowStatus
      notes
      createdById
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_MANAGER_BLOCK_PRODUCTION_BUDGET = gql`
  mutation UpdateManagerBlockProductionBudget($input: UpdateManagerBlockProductionBudgetInput!) {
    updateManagerBlockProductionBudget(input: $input) {
      id
      blockId
      blockCode
      blockName
      divisionId
      divisionName
      estateId
      estateName
      period
      targetTon
      plannedCost
      actualCost
      workflowStatus
      notes
      createdById
      createdBy
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_MANAGER_BLOCK_PRODUCTION_BUDGET = gql`
  mutation DeleteManagerBlockProductionBudget($id: ID!) {
    deleteManagerBlockProductionBudget(id: $id)
  }
`;

export interface ManagerBlockProductionBudget {
  id: string;
  blockId: string;
  blockCode: string;
  blockName: string;
  divisionId: string;
  divisionName: string;
  estateId: string;
  estateName: string;
  period: string;
  targetTon: number;
  plannedCost: number;
  actualCost: number;
  workflowStatus: ManagerBudgetWorkflowStatus;
  notes?: string | null;
  createdById: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ManagerBudgetWorkflowStatus = 'DRAFT' | 'REVIEW' | 'APPROVED';

export interface ManagerBlockOption {
  id: string;
  blockCode: string;
  name: string;
  divisionId: string;
  divisionName: string;
  estateId: string;
  estateName: string;
}

export interface GetManagerBlockOptionsResponse {
  managerBlockOptions: ManagerBlockOption[];
}

export interface GetManagerBlockProductionBudgetsResponse {
  managerBlockProductionBudgets: ManagerBlockProductionBudget[];
}

export interface CreateManagerBlockProductionBudgetInput {
  blockId: string;
  period: string;
  targetTon: number;
  plannedCost: number;
  actualCost?: number;
  workflowStatus?: ManagerBudgetWorkflowStatus;
  notes?: string;
}

export interface UpdateManagerBlockProductionBudgetInput {
  id: string;
  blockId?: string;
  period?: string;
  targetTon?: number;
  plannedCost?: number;
  actualCost?: number;
  workflowStatus?: ManagerBudgetWorkflowStatus;
  notes?: string;
}

export interface CreateManagerBlockProductionBudgetResponse {
  createManagerBlockProductionBudget: ManagerBlockProductionBudget;
}

export interface UpdateManagerBlockProductionBudgetResponse {
  updateManagerBlockProductionBudget: ManagerBlockProductionBudget;
}

export interface DeleteManagerBlockProductionBudgetResponse {
  deleteManagerBlockProductionBudget: boolean;
}
