import { User } from '@/types/auth';

/**
 * Logout metadata for security logging
 */
export interface LogoutMetadata {
  timestamp: Date;
  deviceId?: string;
  reason: LogoutReason;
  ipAddress?: string;
  userAgent?: string;
  sessionDuration?: number;
  location?: {
    country?: string;
    city?: string;
  };
}

/**
 * Logout reasons for tracking
 */
export type LogoutReason = 
  | 'user_initiated'
  | 'session_timeout'
  | 'forced_logout'
  | 'security_logout'
  | 'concurrent_session'
  | 'device_mismatch'
  | 'suspicious_activity';

/**
 * Security event severity levels
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security event interface
 */
export interface SecurityEvent {
  type: 'logout';
  userId: string;
  username?: string;
  severity: SecuritySeverity;
  metadata: LogoutMetadata;
  createdAt: Date;
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

/**
 * Logout Security Service
 * Handles security logging, cross-tab broadcasting, and suspicious activity detection
 */
class LogoutSecurityService {
  private broadcastChannel: BroadcastChannel | null = null;
  private rateLimitMap: Map<string, { count: number; firstAttempt: number; blocked: boolean }> = new Map();
  
  // Rate limit configuration (5 logouts per 5 minutes)
  private rateLimitConfig: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minutes block
  };

  constructor() {
    this.initializeBroadcastChannel();
  }

  /**
   * Initialize BroadcastChannel for cross-tab communication
   */
  private initializeBroadcastChannel(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('agrinova_logout_channel');
        console.log('✅ [LogoutSecurity] BroadcastChannel initialized');
      } catch (error) {
        console.warn('⚠️ [LogoutSecurity] BroadcastChannel not available:', error);
      }
    }
  }

  /**
   * Log comprehensive logout event
   */
  async logLogoutEvent(user: User | null, metadata: LogoutMetadata): Promise<void> {
    try {
      const event: SecurityEvent = {
        type: 'logout',
        userId: user?.id || 'unknown',
        username: user?.username || user?.email || 'unknown',
        severity: this.determineSeverity(metadata.reason),
        metadata,
        createdAt: new Date(),
      };

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔒 [LogoutSecurity] Logout Event:', {
          user: event.username,
          reason: metadata.reason,
          deviceId: metadata.deviceId,
          timestamp: event.createdAt.toISOString(),
        });
      }

      // Store in localStorage for audit trail (last 100 events)
      this.storeSecurityEvent(event);

      // Send to backend API for persistent logging
      await this.sendToBackend(event);

      console.log('✅ [LogoutSecurity] Event logged successfully');
    } catch (error) {
      console.error('❌ [LogoutSecurity] Failed to log event:', error);
      // Don't throw - logging failure shouldn't block logout
    }
  }

  /**
   * Broadcast logout event to all tabs
   */
  broadcastLogoutToTabs(userId: string, reason: LogoutReason): void {
    if (!this.broadcastChannel) {
      console.warn('⚠️ [LogoutSecurity] BroadcastChannel not available');
      return;
    }

    try {
      const message = {
        type: 'LOGOUT',
        userId,
        reason,
        timestamp: new Date().toISOString(),
      };

      this.broadcastChannel.postMessage(message);
      console.log('📡 [LogoutSecurity] Logout broadcasted to all tabs');

      // Also dispatch custom event for same-tab listeners
      window.dispatchEvent(new CustomEvent('auth:logout', { 
        detail: { userId, reason, timestamp: new Date() } 
      }));
    } catch (error) {
      console.error('❌ [LogoutSecurity] Broadcast failed:', error);
    }
  }

  /**
   * Listen for logout broadcasts from other tabs
   */
  onLogoutBroadcast(callback: (userId: string, reason: LogoutReason) => void): void {
    if (!this.broadcastChannel) return;

    this.broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'LOGOUT') {
        console.log('📡 [LogoutSecurity] Received logout broadcast from another tab');
        callback(event.data.userId, event.data.reason);
      }
    };
  }

  /**
   * Check rate limit for logout attempts
   */
  async checkRateLimit(userId: string): Promise<{ allowed: boolean; remainingTime?: number }> {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    // No previous attempts
    if (!userLimit) {
      this.rateLimitMap.set(userId, {
        count: 1,
        firstAttempt: now,
        blocked: false,
      });
      return { allowed: true };
    }

    // Check if user is currently blocked
    if (userLimit.blocked) {
      const blockExpiry = userLimit.firstAttempt + this.rateLimitConfig.blockDurationMs;
      if (now < blockExpiry) {
        const remainingMs = blockExpiry - now;
        console.warn(`⚠️ [LogoutSecurity] User ${userId} is rate limited`);
        return { 
          allowed: false, 
          remainingTime: Math.ceil(remainingMs / 60000) // minutes
        };
      } else {
        // Block expired, reset
        this.rateLimitMap.delete(userId);
        return this.checkRateLimit(userId);
      }
    }

    // Check if window has expired
    const windowExpiry = userLimit.firstAttempt + this.rateLimitConfig.windowMs;
    if (now > windowExpiry) {
      // Window expired, reset counter
      this.rateLimitMap.set(userId, {
        count: 1,
        firstAttempt: now,
        blocked: false,
      });
      return { allowed: true };
    }

    // Increment counter
    userLimit.count++;

    // Check if limit exceeded
    if (userLimit.count > this.rateLimitConfig.maxAttempts) {
      userLimit.blocked = true;
      console.warn(`🚫 [LogoutSecurity] Rate limit exceeded for user ${userId}`);
      
      // Log suspicious activity
      await this.logSuspiciousActivity(userId, 'excessive_logout_attempts', {
        attempts: userLimit.count,
        timeWindow: this.rateLimitConfig.windowMs,
      });

      return { 
        allowed: false, 
        remainingTime: Math.ceil(this.rateLimitConfig.blockDurationMs / 60000)
      };
    }

    return { allowed: true };
  }

  /**
   * Detect suspicious logout patterns
   */
  async detectSuspiciousActivity(userId: string, metadata: LogoutMetadata): Promise<boolean> {
    const suspiciousPatterns: Array<{ detected: boolean; reason: string }> = [];

    // Pattern 1: Multiple rapid logouts
    const recentEvents = this.getRecentEvents(userId, 5 * 60 * 1000); // Last 5 minutes
    if (recentEvents.length >= 3) {
      suspiciousPatterns.push({
        detected: true,
        reason: 'multiple_rapid_logouts',
      });
    }

    // Pattern 2: Logout from unusual location (if available)
    if (metadata.location) {
      const isUnusualLocation = await this.checkUnusualLocation(userId, metadata.location);
      if (isUnusualLocation) {
        suspiciousPatterns.push({
          detected: true,
          reason: 'unusual_location',
        });
      }
    }

    // Pattern 3: Device mismatch
    if (metadata.reason === 'device_mismatch') {
      suspiciousPatterns.push({
        detected: true,
        reason: 'device_fingerprint_mismatch',
      });
    }

    // Log if suspicious patterns detected
    if (suspiciousPatterns.length > 0) {
      await this.logSuspiciousActivity(userId, 'suspicious_logout_pattern', {
        patterns: suspiciousPatterns,
        metadata,
      });
      return true;
    }

    return false;
  }

  /**
   * Log suspicious activity
   */
  private async logSuspiciousActivity(
    userId: string, 
    activityType: string, 
    details: any
  ): Promise<void> {
    try {
      console.warn('🚨 [LogoutSecurity] Suspicious activity detected:', {
        userId,
        activityType,
        details,
        timestamp: new Date().toISOString(),
      });

      // Send to backend for security team review
      await fetch('/api/security/suspicious-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          activityType,
          details,
          timestamp: new Date().toISOString(),
        }),
      }).catch(err => {
        console.error('Failed to report suspicious activity:', err);
      });
    } catch (error) {
      console.error('❌ [LogoutSecurity] Failed to log suspicious activity:', error);
    }
  }

  /**
   * Determine severity based on logout reason
   */
  private determineSeverity(reason: LogoutReason): SecuritySeverity {
    switch (reason) {
      case 'security_logout':
      case 'device_mismatch':
      case 'suspicious_activity':
        return 'high';
      case 'forced_logout':
      case 'concurrent_session':
        return 'medium';
      case 'session_timeout':
        return 'low';
      case 'user_initiated':
      default:
        return 'low';
    }
  }

  /**
   * Store security event in localStorage
   */
  private storeSecurityEvent(event: SecurityEvent): void {
    try {
      const key = 'agrinova_security_events';
      const stored = localStorage.getItem(key);
      const events: SecurityEvent[] = stored ? JSON.parse(stored) : [];
      
      // Add new event
      events.unshift(event);
      
      // Keep only last 100 events
      const trimmed = events.slice(0, 100);
      
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('⚠️ [LogoutSecurity] Failed to store event locally:', error);
    }
  }

  /**
   * Get recent security events for a user
   */
  private getRecentEvents(userId: string, timeWindowMs: number): SecurityEvent[] {
    try {
      const key = 'agrinova_security_events';
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      
      const events: SecurityEvent[] = JSON.parse(stored);
      const cutoff = Date.now() - timeWindowMs;
      
      return events.filter(event => 
        event.userId === userId && 
        new Date(event.createdAt).getTime() > cutoff
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if location is unusual for user
   */
  private async checkUnusualLocation(
    userId: string, 
    location: { country?: string; city?: string }
  ): Promise<boolean> {
    // TODO: Implement location history tracking
    // For now, return false (no unusual location detected)
    return false;
  }

  /**
   * Send security event to backend
   */
  private async sendToBackend(event: SecurityEvent): Promise<void> {
    try {
      await fetch('/api/security/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(event),
      });
    } catch (error) {
      // Silent fail - don't block logout
      console.warn('⚠️ [LogoutSecurity] Failed to send event to backend:', error);
    }
  }

  /**
   * Get client IP address (best effort)
   */
  async getClientIP(): Promise<string | undefined> {
    try {
      // This would typically come from backend or a service
      // For now, return undefined
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.rateLimitMap.clear();
  }
}

// Create and export singleton instance
const logoutSecurityService = new LogoutSecurityService();
export default logoutSecurityService;
