import { User } from '@/types/auth';

/**
 * Hierarchical Notification Service
 * 
 * Manages notification flow within the Manager-Area Manager reporting hierarchy:
 * - Manager reports and updates to Area Manager
 * - Area Manager decisions and feedback to Managers
 * - Escalation notifications for critical issues
 * - Performance notifications and reviews
 */

export interface HierarchicalNotification {
  id: string;
  type: HierarchicalNotificationType;
  priority: NotificationPriority;
  from: User;
  to: User;
  title: string;
  message: string;
  data?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
  actionRequired?: boolean;
  actionDeadline?: Date;
  relatedEntityId?: string; // Could be harvest report, issue, etc.
  relatedEntityType?: string;
}

export type HierarchicalNotificationType = 
  // Manager → Area Manager notifications
  | 'weekly_report_submitted'
  | 'performance_update'
  | 'issue_escalation'
  | 'critical_alert'
  | 'request_approval'
  | 'target_achievement'
  | 'resource_request'
  
  // Area Manager → Manager notifications
  | 'report_reviewed'
  | 'feedback_provided'
  | 'approval_granted'
  | 'approval_denied'
  | 'performance_review'
  | 'target_assigned'
  | 'meeting_scheduled'
  | 'policy_update'
  
  // Bidirectional notifications
  | 'direct_message'
  | 'meeting_reminder'
  | 'deadline_approaching'
  | 'system_update';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationTemplate {
  type: HierarchicalNotificationType;
  title: (data: any) => string;
  message: (data: any) => string;
  priority: NotificationPriority;
  actionRequired: boolean | ((data: any) => boolean);
  channels: NotificationChannel[];
}

export type NotificationChannel = 'web' | 'email' | 'sms' | 'push';

export class HierarchicalNotificationService {
  private static notifications: HierarchicalNotification[] = [];
  private static listeners: Map<string, (notification: HierarchicalNotification) => void> = new Map();

  /**
   * Notification Templates for different types of hierarchical communications
   */
  private static templates: Record<HierarchicalNotificationType, NotificationTemplate> = {
    // Manager → Area Manager
    weekly_report_submitted: {
      type: 'weekly_report_submitted',
      title: (data) => `Weekly Report Submitted - ${data.managerName}`,
      message: (data) => `${data.managerName} has submitted their weekly performance report for review. Estate: ${data.estates.join(', ')}.`,
      priority: 'medium',
      actionRequired: true,
      channels: ['web', 'email']
    },
    
    performance_update: {
      type: 'performance_update',
      title: (data) => `Performance Update - ${data.managerName}`,
      message: (data) => `${data.managerName} has updated their performance metrics. Current efficiency: ${data.efficiency}%.`,
      priority: 'low',
      actionRequired: false,
      channels: ['web']
    },
    
    issue_escalation: {
      type: 'issue_escalation',
      title: (data) => `Issue Escalated - ${data.issueTitle}`,
      message: (data) => `${data.managerName} has escalated an issue: "${data.issueTitle}". Priority: ${data.priority}. Immediate attention required.`,
      priority: 'high',
      actionRequired: true,
      channels: ['web', 'email', 'push']
    },
    
    critical_alert: {
      type: 'critical_alert',
      title: (data) => `🚨 Critical Alert - ${data.alertTitle}`,
      message: (data) => `CRITICAL: ${data.managerName} reports: "${data.alertMessage}". Location: ${data.location}. Immediate response required.`,
      priority: 'critical',
      actionRequired: true,
      channels: ['web', 'email', 'sms', 'push']
    },
    
    request_approval: {
      type: 'request_approval',
      title: (data) => `Approval Request - ${data.requestType}`,
      message: (data) => `${data.managerName} requests approval for: ${data.requestType}. Amount: ${data.amount || 'N/A'}. Reason: ${data.reason}.`,
      priority: 'medium',
      actionRequired: true,
      channels: ['web', 'email']
    },
    
    target_achievement: {
      type: 'target_achievement',
      title: (data) => `🎯 Target Achievement - ${data.managerName}`,
      message: (data) => `${data.managerName} has achieved ${data.achievement}% of their ${data.targetType} target. Congratulations!`,
      priority: 'low',
      actionRequired: false,
      channels: ['web']
    },
    
    resource_request: {
      type: 'resource_request',
      title: (data) => `Resource Request - ${data.resourceType}`,
      message: (data) => `${data.managerName} requests additional ${data.resourceType}: ${data.quantity} units. Justification: ${data.justification}.`,
      priority: 'medium',
      actionRequired: true,
      channels: ['web', 'email']
    },

    // Area Manager → Manager
    report_reviewed: {
      type: 'report_reviewed',
      title: (data) => `Report Reviewed by ${data.areaManagerName}`,
      message: (data) => `Your weekly report has been reviewed by ${data.areaManagerName}. Status: ${data.status}. ${data.comments ? `Comments: ${data.comments}` : ''}`,
      priority: 'medium',
      actionRequired: (data) => data.status === 'needs_revision',
      channels: ['web', 'email']
    },
    
    feedback_provided: {
      type: 'feedback_provided',
      title: (data) => `Feedback from ${data.areaManagerName}`,
      message: (data) => `${data.areaManagerName} has provided feedback on your performance: "${data.feedback}". Rating: ${data.rating}/5.`,
      priority: 'medium',
      actionRequired: (data) => data.actionItems?.length > 0,
      channels: ['web', 'email']
    },
    
    approval_granted: {
      type: 'approval_granted',
      title: (data) => `✅ Approval Granted - ${data.requestType}`,
      message: (data) => `Your request for ${data.requestType} has been approved by ${data.areaManagerName}. You may proceed with implementation.`,
      priority: 'medium',
      actionRequired: false,
      channels: ['web', 'email']
    },
    
    approval_denied: {
      type: 'approval_denied',
      title: (data) => `❌ Approval Denied - ${data.requestType}`,
      message: (data) => `Your request for ${data.requestType} has been denied by ${data.areaManagerName}. Reason: ${data.reason}. Please discuss alternatives.`,
      priority: 'high',
      actionRequired: true,
      channels: ['web', 'email']
    },
    
    performance_review: {
      type: 'performance_review',
      title: (data) => `Performance Review Scheduled`,
      message: (data) => `${data.areaManagerName} has scheduled your performance review for ${data.reviewDate}. Please prepare your self-assessment.`,
      priority: 'medium',
      actionRequired: true,
      channels: ['web', 'email']
    },
    
    target_assigned: {
      type: 'target_assigned',
      title: (data) => `New Target Assigned - ${data.targetType}`,
      message: (data) => `${data.areaManagerName} has assigned a new ${data.targetType} target: ${data.targetValue}. Deadline: ${data.deadline}.`,
      priority: 'high',
      actionRequired: true,
      channels: ['web', 'email']
    },
    
    meeting_scheduled: {
      type: 'meeting_scheduled',
      title: (data) => `Meeting Scheduled with ${data.areaManagerName}`,
      message: (data) => `${data.areaManagerName} has scheduled a meeting: "${data.meetingTitle}" on ${data.meetingDate} at ${data.meetingTime}. Location: ${data.location}.`,
      priority: 'medium',
      actionRequired: true,
      channels: ['web', 'email']
    },
    
    policy_update: {
      type: 'policy_update',
      title: (data) => `Policy Update - ${data.policyTitle}`,
      message: (data) => `${data.areaManagerName} has updated the policy: "${data.policyTitle}". Please review the changes and confirm compliance.`,
      priority: 'medium',
      actionRequired: true,
      channels: ['web', 'email']
    },

    // Bidirectional
    direct_message: {
      type: 'direct_message',
      title: (data) => `Message from ${data.senderName}`,
      message: (data) => data.message,
      priority: 'medium',
      actionRequired: (data) => data.needsResponse,
      channels: ['web', 'push']
    },
    
    meeting_reminder: {
      type: 'meeting_reminder',
      title: (data) => `Meeting Reminder - ${data.meetingTitle}`,
      message: (data) => `Reminder: You have a meeting "${data.meetingTitle}" with ${data.participantName} in ${data.timeUntil}.`,
      priority: 'medium',
      actionRequired: false,
      channels: ['web', 'push']
    },
    
    deadline_approaching: {
      type: 'deadline_approaching',
      title: (data) => `⏰ Deadline Approaching - ${data.taskTitle}`,
      message: (data) => `Your ${data.taskTitle} deadline is approaching. Due: ${data.deadline}. Time remaining: ${data.timeRemaining}.`,
      priority: 'high',
      actionRequired: true,
      channels: ['web', 'email', 'push']
    },
    
    system_update: {
      type: 'system_update',
      title: (data) => `System Update - ${data.updateTitle}`,
      message: (data) => `${data.updateMessage}. Please review the changes and adjust your workflows accordingly.`,
      priority: 'low',
      actionRequired: false,
      channels: ['web']
    }
  };

  /**
   * Send notification within the hierarchical structure
   */
  static async sendNotification(
    type: HierarchicalNotificationType,
    from: User,
    to: User,
    data: Record<string, any> = {}
  ): Promise<HierarchicalNotification> {
    const template = this.templates[type];
    if (!template) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    const notification: HierarchicalNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority: template.priority,
      from,
      to,
      title: template.title(data),
      message: template.message(data),
      data,
      createdAt: new Date(),
      actionRequired: typeof template.actionRequired === 'function' 
        ? template.actionRequired(data) 
        : template.actionRequired,
      actionDeadline: data.deadline ? new Date(data.deadline) : undefined,
      relatedEntityId: data.entityId,
      relatedEntityType: data.entityType
    };

    // Store notification
    this.notifications.unshift(notification);

    // Notify listeners
    const listener = this.listeners.get(to.id);
    if (listener) {
      listener(notification);
    }

    // Here you would integrate with actual notification channels
    await this.deliverNotification(notification, template.channels);

    return notification;
  }

  /**
   * Manager reports to Area Manager
   */
  static async managerReportToAreaManager(
    manager: User,
    areaManager: User,
    reportData: {
      reportType: 'weekly' | 'monthly' | 'incident';
      reportId: string;
      estates: string[];
      metrics?: Record<string, any>;
      issues?: Array<{title: string; priority: string; description: string}>;
    }
  ): Promise<HierarchicalNotification> {
    const notificationType = reportData.reportType === 'weekly' ? 'weekly_report_submitted' : 'performance_update';
    
    // Send main report notification
    const notification = await this.sendNotification(
      notificationType,
      manager,
      areaManager,
      {
        managerName: manager.name,
        reportType: reportData.reportType,
        reportId: reportData.reportId,
        estates: reportData.estates,
        efficiency: reportData.metrics?.efficiency,
        entityId: reportData.reportId,
        entityType: 'report'
      }
    );

    // Send escalation notifications for critical issues
    if (reportData.issues?.length) {
      for (const issue of reportData.issues) {
        if (issue.priority === 'critical' || issue.priority === 'high') {
          await this.sendNotification(
            'issue_escalation',
            manager,
            areaManager,
            {
              managerName: manager.name,
              issueTitle: issue.title,
              issueDescription: issue.description,
              priority: issue.priority,
              location: reportData.estates.join(', '),
              entityId: issue.title, // Would be issue ID in real implementation
              entityType: 'issue'
            }
          );
        }
      }
    }

    return notification;
  }

  /**
   * Area Manager provides feedback to Manager
   */
  static async areaManagerFeedbackToManager(
    areaManager: User,
    manager: User,
    feedbackData: {
      reportId: string;
      status: 'approved' | 'needs_revision' | 'rejected';
      rating?: number;
      feedback: string;
      actionItems?: string[];
    }
  ): Promise<HierarchicalNotification> {
    return await this.sendNotification(
      'report_reviewed',
      areaManager,
      manager,
      {
        areaManagerName: areaManager.name,
        managerName: manager.name,
        status: feedbackData.status,
        comments: feedbackData.feedback,
        rating: feedbackData.rating,
        actionItems: feedbackData.actionItems,
        entityId: feedbackData.reportId,
        entityType: 'report'
      }
    );
  }

  /**
   * Request approval from Area Manager
   */
  static async requestApproval(
    manager: User,
    areaManager: User,
    requestData: {
      requestType: string;
      amount?: string;
      reason: string;
      deadline?: Date;
      details?: Record<string, any>;
    }
  ): Promise<HierarchicalNotification> {
    return await this.sendNotification(
      'request_approval',
      manager,
      areaManager,
      {
        managerName: manager.name,
        requestType: requestData.requestType,
        amount: requestData.amount,
        reason: requestData.reason,
        deadline: requestData.deadline?.toISOString(),
        details: requestData.details,
        entityId: `request_${Date.now()}`,
        entityType: 'approval_request'
      }
    );
  }

  /**
   * Send approval decision
   */
  static async sendApprovalDecision(
    areaManager: User,
    manager: User,
    decisionData: {
      requestId: string;
      requestType: string;
      approved: boolean;
      reason?: string;
      conditions?: string[];
    }
  ): Promise<HierarchicalNotification> {
    const type = decisionData.approved ? 'approval_granted' : 'approval_denied';
    
    return await this.sendNotification(
      type,
      areaManager,
      manager,
      {
        areaManagerName: areaManager.name,
        managerName: manager.name,
        requestType: decisionData.requestType,
        reason: decisionData.reason,
        conditions: decisionData.conditions,
        entityId: decisionData.requestId,
        entityType: 'approval_request'
      }
    );
  }

  /**
   * Get notifications for a user
   */
  static getNotificationsForUser(userId: string, unreadOnly: boolean = false): HierarchicalNotification[] {
    return this.notifications.filter(notif => 
      notif.to.id === userId && (!unreadOnly || !notif.readAt)
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Mark notification as read
   */
  static markAsRead(notificationId: string, userId: string): boolean {
    const notification = this.notifications.find(n => n.id === notificationId && n.to.id === userId);
    if (notification && !notification.readAt) {
      notification.readAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Subscribe to notifications for a user
   */
  static subscribe(userId: string, callback: (notification: HierarchicalNotification) => void): void {
    this.listeners.set(userId, callback);
  }

  /**
   * Unsubscribe from notifications
   */
  static unsubscribe(userId: string): void {
    this.listeners.delete(userId);
  }

  /**
   * Get notification statistics for a user
   */
  static getNotificationStats(userId: string) {
    const userNotifications = this.getNotificationsForUser(userId);
    const unread = userNotifications.filter(n => !n.readAt);
    const actionRequired = unread.filter(n => n.actionRequired);
    const overdue = actionRequired.filter(n => 
      n.actionDeadline && n.actionDeadline < new Date()
    );

    return {
      total: userNotifications.length,
      unread: unread.length,
      actionRequired: actionRequired.length,
      overdue: overdue.length,
      priorityBreakdown: {
        critical: unread.filter(n => n.priority === 'critical').length,
        high: unread.filter(n => n.priority === 'high').length,
        medium: unread.filter(n => n.priority === 'medium').length,
        low: unread.filter(n => n.priority === 'low').length,
      }
    };
  }

  /**
   * Deliver notification through various channels
   * This would integrate with actual delivery services
   */
  private static async deliverNotification(
    notification: HierarchicalNotification, 
    channels: NotificationChannel[]
  ): Promise<void> {
    // In a real implementation, this would integrate with:
    // - Web socket for real-time web notifications
    // - Email service (SendGrid, SES, etc.)
    // - SMS service (Twilio, etc.)
    // - Push notification service (Firebase, etc.)
    
    console.log(`[HIERARCHICAL NOTIFICATION] Delivering notification ${notification.id} via channels: ${channels.join(', ')}`);
    console.log(`  From: ${notification.from.name} (${notification.from.role})`);
    console.log(`  To: ${notification.to.name} (${notification.to.role})`);
    console.log(`  Type: ${notification.type}`);
    console.log(`  Priority: ${notification.priority}`);
    console.log(`  Title: ${notification.title}`);
    console.log(`  Message: ${notification.message}`);
    
    // Simulate delivery delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}