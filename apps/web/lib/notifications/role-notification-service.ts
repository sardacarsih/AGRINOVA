import { User, UserRole } from '@/types/auth';

interface RoleChangeEvent {
  type: 'user_created' | 'user_updated' | 'user_deleted' | 'role_changed' | 'scope_changed';
  userId: string;
  userName: string;
  oldRole?: UserRole;
  newRole?: UserRole;
  oldScope?: {
    company?: string;
    estate?: string;
    division?: string;
  };
  newScope?: {
    company?: string;
    estate?: string;
    division?: string;
  };
  changedBy: {
    id: string;
    name: string;
    role: UserRole;
  };
  timestamp: Date;
  companyId?: string;
}

interface NotificationTarget {
  userId: string;
  channels: ('websocket' | 'firebase' | 'email')[];
}

export class RoleNotificationService {
  private static instance: RoleNotificationService;
  private websocketConnections = new Map<string, WebSocket>();
  private eventCallbacks = new Map<string, Array<(event: RoleChangeEvent) => void>>();

  private constructor() {}

  static getInstance(): RoleNotificationService {
    if (!RoleNotificationService.instance) {
      RoleNotificationService.instance = new RoleNotificationService();
    }
    return RoleNotificationService.instance;
  }

  /**
   * Register WebSocket connection for real-time updates
   */
  registerConnection(userId: string, websocket: WebSocket) {
    this.websocketConnections.set(userId, websocket);
    
    websocket.onclose = () => {
      this.websocketConnections.delete(userId);
    };
  }

  /**
   * Register callback for role change events
   */
  onRoleChange(userId: string, callback: (event: RoleChangeEvent) => void) {
    if (!this.eventCallbacks.has(userId)) {
      this.eventCallbacks.set(userId, []);
    }
    this.eventCallbacks.get(userId)?.push(callback);
  }

  /**
   * Unregister callback for role change events
   */
  offRoleChange(userId: string, callback: (event: RoleChangeEvent) => void) {
    const callbacks = this.eventCallbacks.get(userId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify about user creation
   */
  async notifyUserCreated(
    newUser: User,
    createdBy: User
  ) {
    const event: RoleChangeEvent = {
      type: 'user_created',
      userId: newUser.id,
      userName: newUser.name,
      newRole: newUser.role,
      newScope: {
        company: newUser.company,
        estate: newUser.estate,
        division: newUser.divisi
      },
      changedBy: {
        id: createdBy.id,
        name: createdBy.name,
        role: createdBy.role
      },
      timestamp: new Date(),
      companyId: newUser.companyId
    };

    await this.broadcastEvent(event);
  }

  /**
   * Notify about user updates
   */
  async notifyUserUpdated(
    oldUser: User,
    newUser: User,
    updatedBy: User
  ) {
    const hasRoleChange = oldUser.role !== newUser.role;
    const hasScopeChange = 
      oldUser.company !== newUser.company ||
      oldUser.estate !== newUser.estate ||
      oldUser.divisi !== newUser.divisi;

    if (hasRoleChange) {
      const event: RoleChangeEvent = {
        type: 'role_changed',
        userId: newUser.id,
        userName: newUser.name,
        oldRole: oldUser.role,
        newRole: newUser.role,
        newScope: {
          company: newUser.company,
          estate: newUser.estate,
          division: newUser.divisi
        },
        changedBy: {
          id: updatedBy.id,
          name: updatedBy.name,
          role: updatedBy.role
        },
        timestamp: new Date(),
        companyId: newUser.companyId
      };
      await this.broadcastEvent(event);
    }

    if (hasScopeChange) {
      const event: RoleChangeEvent = {
        type: 'scope_changed',
        userId: newUser.id,
        userName: newUser.name,
        newRole: newUser.role,
        oldScope: {
          company: oldUser.company,
          estate: oldUser.estate,
          division: oldUser.divisi
        },
        newScope: {
          company: newUser.company,
          estate: newUser.estate,
          division: newUser.divisi
        },
        changedBy: {
          id: updatedBy.id,
          name: updatedBy.name,
          role: updatedBy.role
        },
        timestamp: new Date(),
        companyId: newUser.companyId
      };
      await this.broadcastEvent(event);
    }

    // Generic update event
    const event: RoleChangeEvent = {
      type: 'user_updated',
      userId: newUser.id,
      userName: newUser.name,
      newRole: newUser.role,
      newScope: {
        company: newUser.company,
        estate: newUser.estate,
        division: newUser.divisi
      },
      changedBy: {
        id: updatedBy.id,
        name: updatedBy.name,
        role: updatedBy.role
      },
      timestamp: new Date(),
      companyId: newUser.companyId
    };
    await this.broadcastEvent(event);
  }

  /**
   * Notify about user deletion
   */
  async notifyUserDeleted(
    deletedUser: User,
    deletedBy: User
  ) {
    const event: RoleChangeEvent = {
      type: 'user_deleted',
      userId: deletedUser.id,
      userName: deletedUser.name,
      oldRole: deletedUser.role,
      oldScope: {
        company: deletedUser.company,
        estate: deletedUser.estate,
        division: deletedUser.divisi
      },
      changedBy: {
        id: deletedBy.id,
        name: deletedBy.name,
        role: deletedBy.role
      },
      timestamp: new Date(),
      companyId: deletedUser.companyId
    };

    await this.broadcastEvent(event);
  }

  /**
   * Broadcast event to relevant users
   */
  private async broadcastEvent(event: RoleChangeEvent) {
    const targets = this.getNotificationTargets(event);
    
    // Send to WebSocket connections
    await this.sendWebSocketNotifications(event, targets);
    
    // Send Firebase push notifications for mobile
    await this.sendFirebaseNotifications(event, targets);
    
    // Trigger callbacks
    this.triggerEventCallbacks(event);
    
    // Log for audit trail
    this.logRoleChangeEvent(event);
  }

  /**
   * Determine who should receive notifications for this event
   */
  private getNotificationTargets(event: RoleChangeEvent): NotificationTarget[] {
    const targets: NotificationTarget[] = [];

    // Always notify the affected user
    targets.push({
      userId: event.userId,
      channels: ['websocket', 'firebase']
    });

    // Notify supervisors based on hierarchy
    switch (event.changedBy.role) {
      case 'SUPER_ADMIN':
        // Super admin changes notify other super admins and company admins
        targets.push(
          ...this.getSuperAdminTargets(),
          ...this.getCompanyAdminTargets(event.companyId)
        );
        break;

      case 'COMPANY_ADMIN':
        // Company admin changes notify area managers and managers in company
        targets.push(
          ...this.getAreaManagerTargets(event.companyId),
          ...this.getManagerTargets(event.companyId, event.newScope?.estate)
        );
        break;

      case 'AREA_MANAGER':
      case 'MANAGER':
        // Manager changes notify other managers and assistants in scope
        targets.push(
          ...this.getManagerTargets(event.companyId, event.newScope?.estate),
          ...this.getAsistenTargets(event.companyId, event.newScope?.estate, event.newScope?.division)
        );
        break;
    }

    return this.deduplicateTargets(targets);
  }

  /**
   * Get super admin notification targets
   */
  private getSuperAdminTargets(): NotificationTarget[] {
    // In real implementation, query for active super admins
    return [];
  }

  /**
   * Get company admin notification targets
   */
  private getCompanyAdminTargets(companyId?: string): NotificationTarget[] {
    if (!companyId) return [];
    // In real implementation, query for company admins in the company
    return [];
  }

  /**
   * Get area manager notification targets
   */
  private getAreaManagerTargets(companyId?: string): NotificationTarget[] {
    if (!companyId) return [];
    // In real implementation, query for area managers in the company
    return [];
  }

  /**
   * Get manager notification targets
   */
  private getManagerTargets(companyId?: string, estate?: string): NotificationTarget[] {
    if (!companyId) return [];
    // In real implementation, query for managers in the company/estate
    return [];
  }

  /**
   * Get asisten notification targets
   */
  private getAsistenTargets(
    companyId?: string, 
    estate?: string, 
    division?: string
  ): NotificationTarget[] {
    if (!companyId || !estate) return [];
    // In real implementation, query for assistants in the scope
    return [];
  }

  /**
   * Remove duplicate notification targets
   */
  private deduplicateTargets(targets: NotificationTarget[]): NotificationTarget[] {
    const uniqueTargets = new Map<string, NotificationTarget>();
    
    targets.forEach(target => {
      const existing = uniqueTargets.get(target.userId);
      if (existing) {
        // Merge channels
        const allChannels = [...new Set([...existing.channels, ...target.channels])];
        uniqueTargets.set(target.userId, {
          userId: target.userId,
          channels: allChannels as ('websocket' | 'firebase' | 'email')[]
        });
      } else {
        uniqueTargets.set(target.userId, target);
      }
    });
    
    return Array.from(uniqueTargets.values());
  }

  /**
   * Send WebSocket notifications
   */
  private async sendWebSocketNotifications(
    event: RoleChangeEvent, 
    targets: NotificationTarget[]
  ) {
    const websocketTargets = targets.filter(t => t.channels.includes('websocket'));
    
    websocketTargets.forEach(target => {
      const connection = this.websocketConnections.get(target.userId);
      if (connection && connection.readyState === WebSocket.OPEN) {
        try {
          connection.send(JSON.stringify({
            type: 'role_change',
            data: event
          }));
        } catch (error) {
          console.error('Failed to send WebSocket notification:', error);
          // Remove failed connection
          this.websocketConnections.delete(target.userId);
        }
      }
    });
  }

  /**
   * Send Firebase push notifications
   */
  private async sendFirebaseNotifications(
    event: RoleChangeEvent, 
    targets: NotificationTarget[]
  ) {
    const firebaseTargets = targets.filter(t => t.channels.includes('firebase'));
    
    // In real implementation, would use Firebase Admin SDK
    firebaseTargets.forEach(async target => {
      try {
        const message = this.formatFirebaseMessage(event);
        // await firebaseAdmin.messaging().sendToDevice(userTokens, message);
        console.log('Firebase notification would be sent to:', target.userId, message);
      } catch (error) {
        console.error('Failed to send Firebase notification:', error);
      }
    });
  }

  /**
   * Format message for Firebase notification
   */
  private formatFirebaseMessage(event: RoleChangeEvent): any {
    let title = '';
    let body = '';
    
    switch (event.type) {
      case 'user_created':
        title = 'User Baru Dibuat';
        body = `${event.userName} telah ditambahkan sebagai ${event.newRole} oleh ${event.changedBy.name}`;
        break;
        
      case 'role_changed':
        title = 'Role Berubah';
        body = `Role ${event.userName} berubah dari ${event.oldRole} ke ${event.newRole}`;
        break;
        
      case 'scope_changed':
        title = 'Assignment Berubah';
        body = `Assignment ${event.userName} telah diperbarui oleh ${event.changedBy.name}`;
        break;
        
      case 'user_deleted':
        title = 'User Dihapus';
        body = `${event.userName} (${event.oldRole}) telah dihapus oleh ${event.changedBy.name}`;
        break;
        
      default:
        title = 'Update User';
        body = `Data ${event.userName} telah diperbarui`;
    }
    
    return {
      notification: {
        title,
        body
      },
      data: {
        type: 'role_change',
        eventType: event.type,
        userId: event.userId,
        timestamp: event.timestamp.toISOString()
      }
    };
  }

  /**
   * Trigger registered event callbacks
   */
  private triggerEventCallbacks(event: RoleChangeEvent) {
    // Trigger callbacks for the affected user
    const userCallbacks = this.eventCallbacks.get(event.userId);
    userCallbacks?.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in role change callback:', error);
      }
    });
    
    // Trigger callbacks for system-wide listeners
    const systemCallbacks = this.eventCallbacks.get('*');
    systemCallbacks?.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in system role change callback:', error);
      }
    });
  }

  /**
   * Log role change event for audit trail
   */
  private logRoleChangeEvent(event: RoleChangeEvent) {
    console.log('Role Change Event:', {
      type: event.type,
      user: `${event.userName} (${event.userId})`,
      change: {
        oldRole: event.oldRole,
        newRole: event.newRole,
        oldScope: event.oldScope,
        newScope: event.newScope
      },
      changedBy: `${event.changedBy.name} (${event.changedBy.role})`,
      timestamp: event.timestamp.toISOString()
    });
    
    // In real implementation, would save to database for audit trail
  }

  /**
   * Get connection status for debugging
   */
  getConnectionStatus(): {
    activeConnections: number;
    registeredCallbacks: number;
  } {
    return {
      activeConnections: this.websocketConnections.size,
      registeredCallbacks: Array.from(this.eventCallbacks.values())
        .reduce((total, callbacks) => total + callbacks.length, 0)
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.websocketConnections.forEach(connection => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.close();
      }
    });
    this.websocketConnections.clear();
    this.eventCallbacks.clear();
  }
}

// Export singleton instance
export const roleNotificationService = RoleNotificationService.getInstance();