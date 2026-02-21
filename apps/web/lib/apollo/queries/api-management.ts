import { gql } from 'graphql-tag';

// Get all API keys
export const GET_API_KEYS = gql`
  query GetApiKeys {
    apiKeys {
      id
      name
      application
      keyPrefix
      isActive
      lastUsedAt
      expiresAt
      createdAt
      description
    }
  }
`;

// Get API key by ID
export const GET_API_KEY = gql`
  query GetApiKey($id: ID!) {
    apiKey(id: $id) {
      id
      name
      application
      key
      keyPrefix
      isActive
      lastUsedAt
      expiresAt
      createdAt
      description
    }
  }
`;

// Create new API key
export const CREATE_API_KEY = gql`
  mutation CreateApiKey($input: CreateApiKeyInput!) {
    createApiKey(input: $input) {
      id
      name
      application
      key
      keyPrefix
      isActive
      lastUsedAt
      expiresAt
      createdAt
      description
    }
  }
`;

// Toggle API key status (activate/deactivate)
export const TOGGLE_API_KEY_STATUS = gql`
  mutation ToggleApiKeyStatus($id: ID!) {
    toggleApiKeyStatus(id: $id) {
      id
      name
      application
      keyPrefix
      isActive
      lastUsedAt
      expiresAt
      createdAt
      description
    }
  }
`;

// Regenerate API key
export const REGENERATE_API_KEY = gql`
  mutation RegenerateApiKey($id: ID!) {
    regenerateApiKey(id: $id) {
      id
      name
      application
      key
      keyPrefix
      isActive
      lastUsedAt
      expiresAt
      createdAt
      description
    }
  }
`;

// Delete API key
export const DELETE_API_KEY = gql`
  mutation DeleteApiKey($id: ID!) {
    deleteApiKey(id: $id)
  }
`;

// Get API key statistics
export const GET_API_KEY_STATS = gql`
  query GetApiKeyStats {
    apiKeyStats {
      total
      active
      inactive
      byApplication {
        TIMBANGAN
        GRADING
        FINANCE
        HRIS
      }
      recentlyUsed
      expiringSoon
    }
  }
`;

// Test integration connectivity
export const TEST_INTEGRATION_CONNECTIVITY = gql`
  query TestIntegrationConnectivity($application: String!) {
    testIntegrationConnectivity(application: $application) {
      success
      responseTime
      status
    }
  }
`;

// Get integration logs
export const GET_INTEGRATION_LOGS = gql`
  query GetIntegrationLogs($application: String!, $limit: Int) {
    integrationLogs(application: $application, limit: $limit) {
      id
      timestamp
      level
      message
      application
      endpoint
      responseTime
      status
      userId
      ipAddress
    }
  }
`;

// Get integration statistics
export const GET_INTEGRATION_STATS = gql`
  query GetIntegrationStats($companyId: ID!) {
    integrationStats(companyId: $companyId) {
      timbang {
        totalRequests
        successfulRequests
        failedRequests
        avgResponseTime
        lastSync
      }
      grading {
        totalRequests
        successfulRequests
        failedRequests
        avgResponseTime
        lastSync
      }
      finance {
        totalRequests
        successfulRequests
        failedRequests
        avgResponseTime
        lastSync
      }
      hris {
        totalRequests
        successfulRequests
        failedRequests
        avgResponseTime
        lastSync
      }
    }
  }
`;