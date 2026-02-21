import { gql } from '@apollo/client';

export const GET_BKM_COMPANY_BRIDGES = gql`
  query GetBkmCompanyBridges($filter: BkmCompanyBridgeFilterInput, $page: Int, $pageSize: Int) {
    bkmCompanyBridges(filter: $filter, page: $page, pageSize: $pageSize) {
      data {
        id
        sourceSystem
        iddataPrefix
        estateKey
        divisiKey
        companyId
        companyCode
        companyName
        priority
        isActive
        notes
        createdAt
        updatedAt
      }
      totalCount
      hasMore
    }
  }
`;

export const CREATE_BKM_COMPANY_BRIDGE = gql`
  mutation CreateBkmCompanyBridge($input: CreateBkmCompanyBridgeInput!) {
    createBkmCompanyBridge(input: $input) {
      id
      sourceSystem
      iddataPrefix
      estateKey
      divisiKey
      companyId
      companyCode
      companyName
      priority
      isActive
      notes
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_BKM_COMPANY_BRIDGE = gql`
  mutation UpdateBkmCompanyBridge($input: UpdateBkmCompanyBridgeInput!) {
    updateBkmCompanyBridge(input: $input) {
      id
      sourceSystem
      iddataPrefix
      estateKey
      divisiKey
      companyId
      companyCode
      companyName
      priority
      isActive
      notes
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_BKM_COMPANY_BRIDGE = gql`
  mutation DeleteBkmCompanyBridge($id: ID!) {
    deleteBkmCompanyBridge(id: $id)
  }
`;

export interface BkmCompanyBridgeItem {
  id: string;
  sourceSystem: string;
  iddataPrefix: string;
  estateKey?: string | null;
  divisiKey?: string | null;
  companyId: string;
  companyCode?: string | null;
  companyName?: string | null;
  priority: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BkmCompanyBridgeListResponse {
  data: BkmCompanyBridgeItem[];
  totalCount: number;
  hasMore: boolean;
}

export interface GetBkmCompanyBridgesData {
  bkmCompanyBridges: BkmCompanyBridgeListResponse;
}

export interface GetBkmCompanyBridgesVars {
  filter?: {
    search?: string;
    companyId?: string;
    sourceSystem?: string;
    isActive?: boolean;
  };
  page?: number;
  pageSize?: number;
}
