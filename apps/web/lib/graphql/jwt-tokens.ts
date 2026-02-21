import { gql } from 'graphql-tag';

export const JWT_TOKENS_QUERY = gql`
  query JwtTokens {
    jwtTokens {
      id
      user {
        id
        username
        email
        role
      }
      userId
      deviceId
      tokenType
      expiresAt
      refreshExpiresAt
      offlineExpiresAt
      isRevoked
      revokedAt
      lastUsedAt
      createdAt
      updatedAt
    }
  }
`;

export const REVOKE_JWT_TOKEN_MUTATION = gql`
  mutation RevokeJWTToken($tokenId: UUID!) {
    revokeJWTToken(tokenId: $tokenId) {
      success
      message
    }
  }
`;
