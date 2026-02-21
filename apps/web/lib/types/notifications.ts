// Notification Types based on GraphQL Schema

export enum NotificationType {
  // Harvest workflow notifications
  HARVEST_CREATED = 'HARVEST_CREATED',
  HARVEST_APPROVAL_NEEDED = 'HARVEST_APPROVAL_NEEDED',
  HARVEST_APPROVED = 'HARVEST_APPROVED',
  HARVEST_REJECTED = 'HARVEST_REJECTED',
  HIGH_VOLUME_HARVEST = 'HIGH_VOLUME_HARVEST',
  
  // Gate check notifications
  GATE_CHECK_CREATED = 'GATE_CHECK_CREATED',
  GATE_CHECK_COMPLETED = 'GATE_CHECK_COMPLETED',
  GATE_CHECK_ALERT = 'GATE_CHECK_ALERT',
  
  // System notifications
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  USER_STATUS_CHANGE = 'USER_STATUS_CHANGE',
  COMPANY_UPDATE = 'COMPANY_UPDATE',
  
  // PKS Integration notifications
  PKS_DATA_RECEIVED = 'PKS_DATA_RECEIVED',
  PKS_DATA_SYNC = 'PKS_DATA_SYNC',
  
  // Security and compliance notifications
  SECURITY_ALERT = 'SECURITY_ALERT',
  COMPLIANCE_ALERT = 'COMPLIANCE_ALERT',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  DISMISSED = 'DISMISSED',
  ARCHIVED = 'ARCHIVED',
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  
  // Recipients and targeting
  recipientId?: string;
  recipientRole?: string;
  recipientCompanyId?: string;
  
  // Related entity information
  relatedEntityType?: string;
  relatedEntityId?: string;
  
  // Action information
  actionUrl?: string;
  actionLabel?: string;
  
  // Metadata for rich notifications
  metadata?: string;
  
  // Sender information
  senderId?: string;
  senderRole?: string;
  
  // Scheduling
  scheduledFor?: Date;
  expiresAt?: Date;
  
  // Interaction tracking
  readAt?: Date;
  dismissedAt?: Date;
  archivedAt?: Date;
  clickedAt?: Date;
  
  // Standard timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSummary {
  unreadCount: number;
  highPriorityCount: number;
  criticalCount: number;
  countByType: NotificationTypeCount[];
  recentNotifications: Notification[];
}

export interface NotificationTypeCount {
  type: NotificationType;
  count: number;
  unreadCount: number;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  
  // Channel preferences
  enableWebNotifications: boolean;
  enableMobileNotifications: boolean;
  enableEmailNotifications: boolean;
  
  // Type-specific preferences
  typePreferences?: string; // JSON string
  
  // Priority filtering
  minimumPriority: NotificationPriority;
  
  // Quiet hours
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;   // HH:MM format
  quietHoursTimezone?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationFilter {
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  statuses?: NotificationStatus[];
  recipientRole?: string;
  relatedEntityType?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  unreadOnly?: boolean;
}

// Input types for mutations
export interface CreateNotificationInput {
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  recipientId?: string;
  recipientRole?: string;
  recipientCompanyId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: string;
  scheduledFor?: Date;
  expiresAt?: Date;
}

export interface UpdateNotificationInput {
  id: string;
  status?: NotificationStatus;
  markAsRead?: boolean;
  markAsDismissed?: boolean;
  markAsArchived?: boolean;
  recordClick?: boolean;
}

export interface UpdateNotificationPreferencesInput {
  enableWebNotifications?: boolean;
  enableMobileNotifications?: boolean;
  enableEmailNotifications?: boolean;
  typePreferences?: string;
  minimumPriority?: NotificationPriority;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
}

// WebSocket event types for real-time notifications
export interface NotificationEvent {
  type: 'notificationReceived' | 'notificationUpdated' | 'notificationSummaryUpdated';
  data: Notification | NotificationSummary;
  userId?: string;
  timestamp: Date;
}

// UI Helper types
export interface NotificationDisplayConfig {
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, NotificationDisplayConfig> = {
  [NotificationType.HARVEST_CREATED]: {
    icon: () => null, // Will be replaced with actual icons
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  [NotificationType.HARVEST_APPROVAL_NEEDED]: {
    icon: () => null,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  [NotificationType.HARVEST_APPROVED]: {
    icon: () => null,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  [NotificationType.HARVEST_REJECTED]: {
    icon: () => null,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  [NotificationType.HIGH_VOLUME_HARVEST]: {
    icon: () => null,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  [NotificationType.GATE_CHECK_CREATED]: {
    icon: () => null,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  [NotificationType.GATE_CHECK_COMPLETED]: {
    icon: () => null,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  [NotificationType.GATE_CHECK_ALERT]: {
    icon: () => null,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  [NotificationType.SYSTEM_ALERT]: {
    icon: () => null,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  [NotificationType.USER_STATUS_CHANGE]: {
    icon: () => null,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  [NotificationType.COMPANY_UPDATE]: {
    icon: () => null,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  [NotificationType.PKS_DATA_RECEIVED]: {
    icon: () => null,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
  },
  [NotificationType.PKS_DATA_SYNC]: {
    icon: () => null,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
  },
  [NotificationType.SECURITY_ALERT]: {
    icon: () => null,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  [NotificationType.COMPLIANCE_ALERT]: {
    icon: () => null,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  [NotificationType.DATA_INTEGRITY]: {
    icon: () => null,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

export const PRIORITY_CONFIG: Record<NotificationPriority, NotificationDisplayConfig> = {
  [NotificationPriority.LOW]: {
    icon: () => null,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  [NotificationPriority.MEDIUM]: {
    icon: () => null,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  [NotificationPriority.HIGH]: {
    icon: () => null,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  [NotificationPriority.CRITICAL]: {
    icon: () => null,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};