import { gql } from 'graphql-tag';

/**
 * Smart Progressive Loading GraphQL Queries
 *
 * These queries support the optimized block loading system for harvest input.
 */

// ============================================================================
// Query: Get Harvest Context
// ============================================================================

/**
 * GET_HARVEST_CONTEXT
 *
 * Fetches optimized harvest context with role-based defaults:
 * - Assignment summary (estate/division/block counts)
 * - Recently used blocks (last 7 days)
 * - Default blocks for Mandor with single division assignment
 *
 * Use case: Initial page load for harvest input
 * Cache: 5 minutes (short-lived for fresh data)
 */
export const GET_HARVEST_CONTEXT = gql`
  query GetHarvestContext {
    harvestContext {
      assignmentSummary {
        totalEstates
        totalDivisions
        totalBlocks
        primaryDivisionId
      }
      recentBlocks {
        id
        blockCode
        name
        division {
          id
          name
          estateId
        }
        lastHarvestDate
        harvestCount
      }
      defaultDivisionBlocks {
        id
        blockCode
        name
        luasHa
        cropType
        plantingYear
        status
        bjrValue
        divisionId
        division {
          id
          name
          estateId
          estate {
            id
            name
          }
        }
      }
    }
  }
`;

// ============================================================================
// Query: Get Blocks by Division (Paginated)
// ============================================================================

/**
 * GET_BLOCKS_BY_DIVISION
 *
 * Fetches paginated blocks for a specific division with search and filters:
 * - Division ID (required)
 * - Include inactive blocks (optional, default: false)
 * - Search term (optional, searches kode_blok and name)
 * - Pagination (limit, offset)
 * - Sort order (recent, alphabetical, size)
 *
 * Use case: User selects division → load blocks progressively
 * Cache: 30 minutes per division
 */
export const GET_BLOCKS_BY_DIVISION = gql`
  query GetBlocksByDivision(
    $divisionId: ID!
    $includeInactive: Boolean
    $search: String
    $limit: Int
    $offset: Int
    $sortBy: String
  ) {
    blocksByDivision(
      divisionId: $divisionId
      includeInactive: $includeInactive
      search: $search
      limit: $limit
      offset: $offset
      sortBy: $sortBy
    ) {
      blocks {
        id
        blockCode
        name
        luasHa
        cropType
        plantingYear
        status
        bjrValue
        divisionId
        division {
          id
          name
          code
          estateId
          estate {
            id
            name
          }
        }
      }
      totalCount
      hasMore
    }
  }
`;

// ============================================================================
// TypeScript Types
// ============================================================================

export interface AssignmentSummary {
  totalEstates: number;
  totalDivisions: number;
  totalBlocks: number;
  primaryDivisionId?: string;
}

export interface BlockWithStats {
  id: string;
  blockCode: string;
  name: string;
  division: {
    id: string;
    name: string;
    estateId: string;
  };
  lastHarvestDate?: string;
  harvestCount: number;
}

export interface Block {
  id: string;
  blockCode: string;
  name: string;
  luasHa?: number;
  cropType?: string;
  plantingYear?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  bjrValue: number;
  divisionId: string;
  division?: {
    id: string;
    name: string;
    code: string;
    estateId: string;
    estate?: {
      id: string;
      name: string;
    };
  };
}

export interface HarvestContext {
  assignmentSummary: AssignmentSummary;
  recentBlocks: BlockWithStats[];
  defaultDivisionBlocks: Block[];
}

export interface BlocksPage {
  blocks: Block[];
  totalCount: number;
  hasMore: boolean;
}

export interface BlockFilters {
  includeInactive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'recent' | 'alphabetical' | 'size';
}

// ============================================================================
// Query Response Types
// ============================================================================

export interface GetHarvestContextResponse {
  harvestContext: HarvestContext;
}

export interface GetBlocksByDivisionResponse {
  blocksByDivision: BlocksPage;
}
