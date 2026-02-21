import { gql } from 'graphql-tag';

export const API_KEYS_QUERY = gql`
  query APIKeys {
    apiKeys {
      id
      name
      prefix
      scopes
      status
      expiresAt
      lastUsedAt
      createdAt
    }
  }
`;

export const CREATE_API_KEY_MUTATION = gql`
  mutation CreateAPIKey($input: CreateAPIKeyInput!) {
    createAPIKey(input: $input) {
      apiKey {
        id
        name
        prefix
        scopes
        status
        expiresAt
        createdAt
      }
      plaintextKey
    }
  }
`;

export const REVOKE_API_KEY_MUTATION = gql`
  mutation RevokeAPIKey($id: ID!) {
    revokeAPIKey(id: $id)
  }
`;

export const ROTATE_API_KEY_MUTATION = gql`
  mutation RotateAPIKey($id: ID!, $expiresInDays: Int) {
    rotateAPIKey(id: $id, expiresInDays: $expiresInDays) {
      apiKey {
        id
        name
        prefix
        scopes
        status
        expiresAt
        createdAt
      }
      plaintextKey
    }
  }
`;
