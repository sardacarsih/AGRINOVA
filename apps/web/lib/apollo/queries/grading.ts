import { gql } from 'graphql-tag';

// Queries
export const GET_GRADING_RECORDS = gql`
  query GetGradingRecords {
    gradingRecords {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      brondolanPercentage
      looseFruitPercentage
      dirtPercentage
      gradingNotes
      gradingDate
      isApproved
      approvedBy
      approvedAt
      rejectionReason
      createdAt
      updatedAt
    }
  }
`;

export const GET_GRADING_RECORD = gql`
  query GetGradingRecord($id: ID!) {
    gradingRecord(id: $id) {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      brondolanPercentage
      looseFruitPercentage
      dirtPercentage
      gradingNotes
      gradingDate
      isApproved
      approvedBy
      approvedAt
      rejectionReason
      createdAt
      updatedAt
    }
  }
`;

export const GET_GRADING_RECORDS_BY_HARVEST = gql`
  query GetGradingRecordsByHarvest($harvestRecordId: ID!) {
    gradingRecordsByHarvest(harvestRecordId: $harvestRecordId) {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      brondolanPercentage
      looseFruitPercentage
      dirtPercentage
      gradingNotes
      gradingDate
      isApproved
      approvedBy
      approvedAt
      rejectionReason
      createdAt
      updatedAt
    }
  }
`;

export const GET_PENDING_GRADING_APPROVALS = gql`
  query GetPendingGradingApprovals {
    pendingGradingApprovals {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      brondolanPercentage
      looseFruitPercentage
      dirtPercentage
      gradingNotes
      gradingDate
      submittedAt
    }
  }
`;

// Mutations
export const CREATE_GRADING_RECORD = gql`
  mutation CreateGradingRecord($input: CreateGradingRecordInput!) {
    createGradingRecord(input: $input) {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      brondolanPercentage
      looseFruitPercentage
      dirtPercentage
      gradingNotes
      gradingDate
      isApproved
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_GRADING_RECORD = gql`
  mutation UpdateGradingRecord($id: ID!, $input: UpdateGradingRecordInput!) {
    updateGradingRecord(id: $id, input: $input) {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      brondolanPercentage
      looseFruitPercentage
      dirtPercentage
      gradingNotes
      updatedAt
    }
  }
`;

export const APPROVE_GRADING = gql`
  mutation ApproveGrading($id: ID!, $input: GradingApprovalInput!) {
    approveGrading(id: $id, input: $input) {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      brondolanPercentage
      looseFruitPercentage
      dirtPercentage
      gradingNotes
      gradingDate
      isApproved
      approvedBy
      approvedAt
      createdAt
      updatedAt
    }
  }
`;

export const REJECT_GRADING = gql`
  mutation RejectGrading($id: ID!, $input: GradingApprovalInput!) {
    rejectGrading(id: $id, input: $input) {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      brondolanPercentage
      looseFruitPercentage
      dirtPercentage
      gradingNotes
      gradingDate
      isApproved
      approvedBy
      approvedAt
      rejectionReason
      createdAt
      updatedAt
    }
  }
`;

// Subscriptions
export const GRADING_UPDATED_SUBSCRIPTION = gql`
  subscription GradingUpdated {
    gradingUpdated {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      brondolanPercentage
      looseFruitPercentage
      dirtPercentage
      gradingNotes
      gradingDate
      isApproved
      approvedBy
      approvedAt
      rejectionReason
      updatedAt
    }
  }
`;

export const GRADING_APPROVED_SUBSCRIPTION = gql`
  subscription GradingApproved {
    gradingApproved {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      isApproved
      approvedBy
      approvedAt
      updatedAt
    }
  }
`;

export const GRADING_REJECTED_SUBSCRIPTION = gql`
  subscription GradingRejected {
    gradingRejected {
      id
      harvestRecordId
      graderId
      qualityScore
      maturityLevel
      isApproved
      rejectionReason
      updatedAt
    }
  }
`;

// Queue Management Queries
export const GET_GRADING_QUEUE = gql`
  query GetGradingQueue {
    gradingQueue {
      id
      harvestRecordId
      blockName
      harvestDate
      fieldSupervisor
      deliveryTime
      estimatedTime
      status
      priority
      tonnage
      maturityLevel
    }
  }
`;

// Analytics and Reports
export const GET_GRADING_ANALYTICS = gql`
  query GetGradingAnalytics($period: String!, $filters: GradingFiltersInput) {
    gradingAnalytics(period: $period, filters: $filters) {
      totalRecords
      averageQualityScore
      gradeDistribution {
        grade
        count
        percentage
      }
      maturityDistribution {
        level
        count
        percentage
      }
      averageDefects {
        brondolan
        looseFruit
        dirt
      }
      trends {
        qualityScore
        approvalRate
        rejectionRate
      }
      topPerformers {
        graderId
        graderName
        averageScore
        recordCount
      }
    }
  }
`;

export const GET_QUALITY_SUMMARY = gql`
  query GetQualitySummary($filters: QualityFiltersInput) {
    qualitySummary(filters: $filters) {
      totalRecords
      averageQualityScore
      approvalRate
      rejectionRate
      gradeDistribution {
        A
        B
        C
        D
        E
      }
      maturityDistribution {
        MENTAH
        MASAK
        TERLALU_MASAK
        BUSUK
      }
      averageDefects {
        brondolan
        looseFruit
        dirt
      }
    }
  }
`;