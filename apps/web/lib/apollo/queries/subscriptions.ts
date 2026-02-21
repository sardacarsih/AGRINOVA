import { gql } from 'graphql-tag';

// =============================================================================
// Real-time GraphQL Subscriptions
// =============================================================================

/**
 * Harvest Record Subscriptions
 * These match the actual backend GraphQL schema in agrinova.graphql
 */

// Subscribe to new harvest records being created
export const HARVEST_RECORD_CREATED_SUBSCRIPTION = gql`
  subscription HarvestRecordCreated {
    harvestRecordCreated {
      id
      tanggal
      mandorId
      mandor {
        id
        username
        name
        role
      }
      blockId
      block {
        id
        blockCode
        name
        luasHa
        cropType
        plantingYear
        division {
          id
          name
          estate {
            id
            name
            location
          }
        }
      }
      karyawan
      beratTbs
      jumlahJanjang
      status
      approvedBy
      approvedAt
      rejectedReason
      createdAt
      updatedAt
    }
  }
`;

// Subscribe to harvest records being approved
export const HARVEST_RECORD_APPROVED_SUBSCRIPTION = gql`
  subscription HarvestRecordApproved {
    harvestRecordApproved {
      id
      tanggal
      mandorId
      mandor {
        id
        username
        name
        role
      }
      blockId
      block {
        id
        blockCode
        name
        division {
          id
          name
          estate {
            id
            name
          }
        }
      }
      karyawan
      beratTbs
      jumlahJanjang
      status
      approvedBy
      approvedAt
      createdAt
      updatedAt
    }
  }
`;

// Subscribe to harvest records being rejected
export const HARVEST_RECORD_REJECTED_SUBSCRIPTION = gql`
  subscription HarvestRecordRejected {
    harvestRecordRejected {
      id
      tanggal
      mandorId
      mandor {
        id
        username
        name
        role
      }
      blockId
      block {
        id
        blockCode
        name
        division {
          id
          name
          estate {
            id
            name
          }
        }
      }
      karyawan
      beratTbs
      jumlahJanjang
      status
      approvedBy
      approvedAt
      rejectedReason
      createdAt
      updatedAt
    }
  }
`;

/**
 * Gate Check Subscriptions
 * These match the actual backend GraphQL schema in agrinova.graphql
 */

// Subscribe to new gate check records being created
export const GATE_CHECK_CREATED_SUBSCRIPTION = gql`
  subscription GateCheckCreated {
    gateCheckCreated {
      id
      satpamId
      satpam {
        id
        username
        name
        role
      }
      nomorPolisi
      nameSupir
      blockId
      block {
        id
        blockCode
        name
        division {
          id
          name
          estate {
            id
            name
          }
        }
      }
      intent
      status
      waktuMasuk
      waktuKeluar
      muatan
      nomorDo
      createdAt
      updatedAt
    }
  }
`;

// Subscribe to gate check records being completed
export const GATE_CHECK_COMPLETED_SUBSCRIPTION = gql`
  subscription GateCheckCompleted {
    gateCheckCompleted {
      id
      satpamId
      satpam {
        id
        username
        name
        role
      }
      nomorPolisi
      nameSupir
      blockId
      block {
        id
        blockCode
        name
        division {
          id
          name
          estate {
            id
            name
          }
        }
      }
      intent
      status
      waktuMasuk
      waktuKeluar
      muatan
      nomorDo
      createdAt
      updatedAt
    }
  }
`;

// =============================================================================
// TypeScript Types for Subscriptions
// =============================================================================

export interface HarvestRecord {
  id: string;
  tanggal: string;
  mandorId: string;
  mandor: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
  blockId: string;
  block: {
    id: string;
    blockCode: string;
    name: string;
    luasHa?: number;
    cropType?: string;
    plantingYear?: number;
    division: {
      id: string;
      name: string;
      estate: {
        id: string;
        name: string;
        location?: string;
      };
    };
  };
  karyawan: string;
  beratTbs: number;
  jumlahJanjang: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GateCheckRecord {
  id: string;
  satpamId: string;
  satpam: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
  nomorPolisi: string;
  nameSupir: string;
  blockId?: string;
  block?: {
    id: string;
    blockCode: string;
    name: string;
    division: {
      id: string;
      name: string;
      estate: {
        id: string;
        name: string;
      };
    };
  };
  intent: 'ENTRY' | 'EXIT';
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
  waktuMasuk?: string;
  waktuKeluar?: string;
  muatan?: string;
  nomorDo?: string;
  createdAt: string;
  updatedAt: string;
}

// Subscription callback types
export type HarvestRecordCallback = (record: HarvestRecord) => void;
export type GateCheckRecordCallback = (record: GateCheckRecord) => void;

// Subscription options interface
export interface SubscriptionOptions {
  onHarvestCreated?: HarvestRecordCallback;
  onHarvestApproved?: HarvestRecordCallback;
  onHarvestRejected?: HarvestRecordCallback;
  onGateCheckCreated?: GateCheckRecordCallback;
  onGateCheckCompleted?: GateCheckRecordCallback;
}