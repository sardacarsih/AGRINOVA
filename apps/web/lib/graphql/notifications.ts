import { gql } from 'graphql-tag';

// Fragments
export const NOTIFICATION_FRAGMENT = gql`
  fragment NotificationFragment on Notification {
    id
    type
    priority
    status
    title
    message
    recipientId
    recipientRole
    recipientCompanyId
    relatedEntityType
    relatedEntityId
    actionUrl
    actionLabel
    metadata
    senderId
    senderRole
    scheduledFor
    expiresAt
    readAt
    dismissedAt
    archivedAt
    clickedAt
    createdAt
    updatedAt
  }
`;

export const NOTIFICATION_SUMMARY_FRAGMENT = gql`
  fragment NotificationSummaryFragment on NotificationSummary {
    unreadCount
    highPriorityCount
    criticalCount
    countByType {
      type
      count
      unreadCount
    }
    recentNotifications {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const NOTIFICATION_PREFERENCES_FRAGMENT = gql`
  fragment NotificationPreferencesFragment on NotificationPreferences {
    id
    userId
    enableWebNotifications
    enableMobileNotifications
    enableEmailNotifications
    typePreferences
    minimumPriority
    quietHoursStart
    quietHoursEnd
    quietHoursTimezone
    createdAt
    updatedAt
  }
`;

// Queries
export const GET_NOTIFICATIONS = gql`
  query GetNotifications(
    $filter: NotificationFilterInput
    $limit: Int
    $offset: Int
    $orderBy: String
  ) {
    notifications(
      filter: $filter
      limit: $limit
      offset: $offset
      orderBy: $orderBy
    ) {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const GET_NOTIFICATION = gql`
  query GetNotification($id: ID!) {
    notification(id: $id) {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const GET_NOTIFICATION_SUMMARY = gql`
  query GetNotificationSummary {
    notificationSummary {
      ...NotificationSummaryFragment
    }
  }
  ${NOTIFICATION_SUMMARY_FRAGMENT}
`;

export const GET_UNREAD_NOTIFICATION_COUNT = gql`
  query GetUnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const GET_NOTIFICATION_PREFERENCES = gql`
  query GetNotificationPreferences {
    notificationPreferences {
      ...NotificationPreferencesFragment
    }
  }
  ${NOTIFICATION_PREFERENCES_FRAGMENT}
`;

// Mutations
export const CREATE_NOTIFICATION = gql`
  mutation CreateNotification($input: CreateNotificationInput!) {
    createNotification(input: $input) {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const UPDATE_NOTIFICATION = gql`
  mutation UpdateNotification($input: UpdateNotificationInput!) {
    updateNotification(input: $input) {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkNotificationAsRead($id: ID!) {
    markNotificationAsRead(id: $id) {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const DISMISS_NOTIFICATION = gql`
  mutation DismissNotification($id: ID!) {
    dismissNotification(id: $id) {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const ARCHIVE_NOTIFICATION = gql`
  mutation ArchiveNotification($id: ID!) {
    archiveNotification(id: $id) {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead
  }
`;

export const CLEAR_READ_NOTIFICATIONS = gql`
  mutation ClearReadNotifications {
    clearReadNotifications
  }
`;

export const UPDATE_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($input: UpdateNotificationPreferencesInput!) {
    updateNotificationPreferences(input: $input) {
      ...NotificationPreferencesFragment
    }
  }
  ${NOTIFICATION_PREFERENCES_FRAGMENT}
`;

// Subscriptions
export const NOTIFICATION_RECEIVED = gql`
  subscription NotificationReceived {
    notificationReceived {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const NOTIFICATION_UPDATED = gql`
  subscription NotificationUpdated {
    notificationUpdated {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const NOTIFICATION_SUMMARY_UPDATED = gql`
  subscription NotificationSummaryUpdated {
    notificationSummaryUpdated {
      ...NotificationSummaryFragment
    }
  }
  ${NOTIFICATION_SUMMARY_FRAGMENT}
`;

export const HIGH_PRIORITY_NOTIFICATIONS = gql`
  subscription HighPriorityNotifications {
    highPriorityNotifications {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const CRITICAL_NOTIFICATIONS = gql`
  subscription CriticalNotifications {
    criticalNotifications {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const ROLE_NOTIFICATIONS = gql`
  subscription RoleNotifications($role: String!) {
    roleNotifications(role: $role) {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const TYPE_NOTIFICATIONS = gql`
  subscription TypeNotifications($types: [NotificationType!]!) {
    typeNotifications(types: $types) {
      ...NotificationFragment
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;
