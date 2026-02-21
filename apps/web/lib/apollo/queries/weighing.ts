import { gql } from 'graphql-tag';

// Queries
export const GET_WEIGHING_RECORDS = gql`
  query GetWeighingRecords {
    weighingRecords {
      id
      ticketNumber
      vehicleNumber
      driverName
      vendorName
      grossWeight
      tareWeight
      netWeight
      weighingTime
      createdAt
      updatedAt
    }
  }
`;

export const GET_WEIGHING_RECORD = gql`
  query GetWeighingRecord($id: ID!) {
    weighingRecord(id: $id) {
      id
      ticketNumber
      vehicleNumber
      driverName
      vendorName
      grossWeight
      tareWeight
      netWeight
      weighingTime
      cargoType
      createdAt
      updatedAt
    }
  }
`;

// Mutations
export const CREATE_WEIGHING_RECORD = gql`
  mutation CreateWeighingRecord($input: CreateWeighingRecordInput!) {
    createWeighingRecord(input: $input) {
      id
      ticketNumber
      vehicleNumber
      driverName
      vendorName
      grossWeight
      tareWeight
      netWeight
      weighingTime
      cargoType
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_WEIGHING_RECORD = gql`
  mutation UpdateWeighingRecord($id: ID!, $input: UpdateWeighingRecordInput!) {
    updateWeighingRecord(id: $id, input: $input) {
      id
      ticketNumber
      vehicleNumber
      driverName
      vendorName
      grossWeight
      tareWeight
      netWeight
      weighingTime
      cargoType
      updatedAt
    }
  }
`;

// Subscriptions
export const WEIGHING_UPDATED_SUBSCRIPTION = gql`
  subscription WeighingUpdated {
    weighingUpdated {
      id
      ticketNumber
      vehicleNumber
      driverName
      vendorName
      grossWeight
      tareWeight
      netWeight
      weighingTime
      status
      updatedAt
    }
  }
`;

// Queue Management Queries
export const GET_WEIGHING_QUEUE = gql`
  query GetWeighingQueue {
    weighingQueue {
      id
      ticketNumber
      vehicleNumber
      driverName
      vendorName
      estimatedWeight
      arrivalTime
      status
      priority
      position
    }
  }
`;

// Reports and Analytics
export const GET_WEIGHING_SUMMARY = gql`
  query GetWeighingSummary($filters: WeighingFiltersInput) {
    weighingSummary(filters: $filters) {
      totalRecords
      totalTonnage
      averageTonnage
      completedRecords
      averageServiceTime
      efficiency
      dateRange {
        start
        end
      }
    }
  }
`;

export const GET_WEIGHING_ANALYTICS = gql`
  query GetWeighingAnalytics($period: String!, $filters: WeighingFiltersInput) {
    weighingAnalytics(period: $period, filters: $filters) {
      totalRecords
      totalTonnage
      averageTonnage
      peakHours {
        hour
        recordCount
      }
      vendorPerformance {
        vendorName
        recordCount
        averageTonnage
        averageServiceTime
      }
      trends {
        daily {
          date
          recordCount
          tonnage
        }
      }
    }
  }
`;