import { gql } from 'graphql-tag';

export const USER_SESSIONS_QUERY = gql`
  query UserSessions($filter: SessionFilterInput) {
    userSessions(filter: $filter) {
      id
      user {
        id
        username
        email
        role
      }
      sessionId
      platform
      ipAddress
      userAgent
      loginTime
      lastActivity
      expiresAt
      revoked
      revokedBy {
        id
        username
      }
      revokedReason
    }
  }
`;

export const FORCE_LOGOUT_SESSION_MUTATION = gql`
  mutation ForceLogoutSession($sessionId: UUID!, $reason: String) {
    forceLogoutSession(sessionId: $sessionId, reason: $reason) {
      success
      message
    }
  }
`;

export const FORCE_LOGOUT_ALL_SESSIONS_MUTATION = gql`
  mutation ForceLogoutAllSessions($userId: UUID!, $reason: String) {
    forceLogoutAllSessions(userId: $userId, reason: $reason) {
      success
      message
      count
    }
  }
`;
