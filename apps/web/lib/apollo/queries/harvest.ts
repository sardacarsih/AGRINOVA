import { gql } from "graphql-tag";

// Harvest record fragments
export const HARVEST_RECORD_FRAGMENT = gql`
  fragment HarvestRecordFields on HarvestRecord {
    id
    tanggal
    mandorId
    mandor {
      id
      username
      name
    }
    blockId
    block {
      id
      blockCode
      name
      division {
        id
        name
        # Note: estate field removed from schema
      }
    }
    nik
    karyawan
    beratTbs
    jumlahJanjang
    jjgMatang
    jjgMentah
    jjgLewatMatang
    jjgBusukAbnormal
    jjgTangkaiPanjang
    totalBrondolan
    status
    approvedBy
    approvedAt
    rejectedReason
    photoUrl
    createdAt
    updatedAt
  }
`;

// Query to get all harvest records
export const GET_HARVEST_RECORDS = gql`
  ${HARVEST_RECORD_FRAGMENT}
  query GetHarvestRecords($dateFrom: Time, $dateTo: Time) {
    harvestRecords(dateFrom: $dateFrom, dateTo: $dateTo) {
      ...HarvestRecordFields
    }
  }
`;

// Query to get harvest statistics
export const GET_HARVEST_STATISTICS = gql`
  query GetHarvestStatistics {
    harvestStatistics {
      totalRecords
      pendingRecords
      approvedRecords
      rejectedRecords
      totalBeratTbs
      totalJanjang
      averagePerRecord
      lastUpdated
    }
  }
`;

// Query to get harvest records by status
export const GET_HARVEST_RECORDS_BY_STATUS = gql`
  ${HARVEST_RECORD_FRAGMENT}
  query GetHarvestRecordsByStatus($status: HarvestStatus!) {
    harvestRecordsByStatus(status: $status) {
      ...HarvestRecordFields
    }
  }
`;
// Note: Limited queries removed - main fragment no longer includes estate field

// Query to get a specific harvest record
export const GET_HARVEST_RECORD = gql`
  ${HARVEST_RECORD_FRAGMENT}
  query GetHarvestRecord($id: ID!) {
    harvestRecord(id: $id) {
      ...HarvestRecordFields
    }
  }
`;

// Mutation to create a new harvest record
export const CREATE_HARVEST_RECORD = gql`
  ${HARVEST_RECORD_FRAGMENT}
  mutation CreateHarvestRecord($input: CreateHarvestRecordInput!) {
    createHarvestRecord(input: $input) {
      ...HarvestRecordFields
    }
  }
`;

// Mutation to update a harvest record
export const UPDATE_HARVEST_RECORD = gql`
  ${HARVEST_RECORD_FRAGMENT}
  mutation UpdateHarvestRecord($input: UpdateHarvestRecordInput!) {
    updateHarvestRecord(input: $input) {
      ...HarvestRecordFields
    }
  }
`;

// Mutation to approve a harvest record
export const APPROVE_HARVEST_RECORD = gql`
  ${HARVEST_RECORD_FRAGMENT}
  mutation ApproveHarvestRecord($input: ApproveHarvestInput!) {
    approveHarvestRecord(input: $input) {
      ...HarvestRecordFields
    }
  }
`;

// Mutation to reject a harvest record
export const REJECT_HARVEST_RECORD = gql`
  ${HARVEST_RECORD_FRAGMENT}
  mutation RejectHarvestRecord($input: RejectHarvestInput!) {
    rejectHarvestRecord(input: $input) {
      ...HarvestRecordFields
    }
  }
`;

// Mutation to delete a harvest record
export const DELETE_HARVEST_RECORD = gql`
  mutation DeleteHarvestRecord($id: ID!) {
    deleteHarvestRecord(id: $id)
  }
`;

// Subscriptions for real-time updates
export const HARVEST_RECORD_CREATED = gql`
  ${HARVEST_RECORD_FRAGMENT}
  subscription HarvestRecordCreated {
    harvestRecordCreated {
      ...HarvestRecordFields
    }
  }
`;

export const HARVEST_RECORD_APPROVED = gql`
  ${HARVEST_RECORD_FRAGMENT}
  subscription HarvestRecordApproved {
    harvestRecordApproved {
      ...HarvestRecordFields
    }
  }
`;

export const HARVEST_RECORD_REJECTED = gql`
  ${HARVEST_RECORD_FRAGMENT}
  subscription HarvestRecordRejected {
    harvestRecordRejected {
      ...HarvestRecordFields
    }
  }
`;

// Query to get blocks for input forms
export const GET_BLOCKS_FOR_HARVEST = gql`
  query GetBlocksForHarvest {
    blocks {
      id
      blockCode
      name
      luasHa
      cropType
      plantingYear
      division {
        id
        name
        estateId
      }
    }
  }
`;

// Query to get user assignments for block access
export const GET_MY_ASSIGNMENTS = gql`
  query GetMyAssignments {
    myAssignments {
      companies {
        id
        name
      }
      divisions {
        id
        name
        code
        estateId
        blocks {
          id
          blockCode
          name
          luasHa
          cropType
          plantingYear
        }
      }
      estates {
        id
        name
        code
        companyId
      }
    }
  }
`;

// TypeScript types
export interface HarvestRecord {
  id: string;
  tanggal: string;
  mandorId: string;
  mandor: {
    id: string;
    username: string;
    name: string;
  };
  blockId: string;
  block: {
    id: string;
    blockCode: string;
    name: string;
    division: {
      id: string;
      name: string;
      estateId: string;
    };
  };
  nik?: string;
  karyawan: string;
  beratTbs: number;
  jumlahJanjang: number;
  jjgMatang?: number;
  jjgMentah?: number;
  jjgLewatMatang?: number;
  jjgBusukAbnormal?: number;
  jjgTangkaiPanjang?: number;
  totalBrondolan?: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HarvestStatistics {
  totalRecords: number;
  pendingRecords: number;
  approvedRecords: number;
  rejectedRecords: number;
  totalBeratTbs: number;
  totalJanjang: number;
  averagePerRecord: number;
  lastUpdated: string;
}

export interface CreateHarvestRecordInput {
  tanggal: string;
  mandorId: string;
  blockId: string;
  karyawan: string;
  beratTbs: number;
  jumlahJanjang: number;
}

export interface UpdateHarvestRecordInput {
  id: string;
  beratTbs?: number;
  jumlahJanjang?: number;
  karyawan?: string;
}

export interface ApproveHarvestInput {
  id: string;
  approvedBy: string;
}

export interface RejectHarvestInput {
  id: string;
  rejectedReason: string;
}

export interface Block {
  id: string;
  blockCode: string;
  name: string;
  luasHa?: number;
  cropType?: string;
  plantingYear?: number;
  division: {
    id: string;
    name: string;
    estateId: string;
  };
}

export interface UserAssignments {
  companies?: Array<{
    id: string;
    name: string;
  }>;
  divisions: Array<{
    id: string;
    name: string;
    code: string;
    estateId: string;
    blocks: Block[];
  }>;
  estates: Array<{
    id: string;
    name: string;
    code: string;
    companyId: string;
  }>;
}

// Query response interfaces
export interface GetBlocksForHarvestResponse {
  blocks: Block[];
}

export interface GetHarvestRecordsResponse {
  harvestRecords: HarvestRecord[];
}

export interface GetHarvestRecordsByStatusResponse {
  harvestRecordsByStatus: HarvestRecord[];
}

export interface GetHarvestStatisticsResponse {
  harvestStatistics: HarvestStatistics;
}

export interface GetHarvestRecordResponse {
  harvestRecord: HarvestRecord;
}

export interface GetMyAssignmentsResponse {
  myAssignments: UserAssignments;
}

// Mutation response interfaces
export interface CreateHarvestRecordResponse {
  createHarvestRecord: HarvestRecord;
}

export interface UpdateHarvestRecordResponse {
  updateHarvestRecord: HarvestRecord;
}

export interface ApproveHarvestRecordResponse {
  approveHarvestRecord: HarvestRecord;
}

export interface RejectHarvestRecordResponse {
  rejectHarvestRecord: HarvestRecord;
}

export interface DeleteHarvestRecordResponse {
  deleteHarvestRecord: boolean;
}

// Subscription response interfaces
export interface HarvestRecordCreatedResponse {
  harvestRecordCreated: HarvestRecord;
}

export interface HarvestRecordApprovedResponse {
  harvestRecordApproved: HarvestRecord;
}

export interface HarvestRecordRejectedResponse {
  harvestRecordRejected: HarvestRecord;
}
