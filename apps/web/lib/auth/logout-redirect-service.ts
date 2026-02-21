'use client';

import logoutSecurityService, { LogoutMetadata } from './logout-security-service';

/**
 * Standardized logout reasons for consistent handling
 */
export enum LogoutReason {
  USER_INITIATED = 'user_initiated',
  SESSION_TIMEOUT = 'session_timeout',
  TOKEN_EXPIRED = 'token_expired',
  AUTHENTICATION_ERROR = 'authentication_error',
  INVALID_ROLE = 'invalid_role',
  FORCED_LOGOUT = 'forced_logout',
  SECURITY_VIOLATION = 'security_violation',
  CONCURRENT_LOGIN = 'concurrent_login',
  DEVICE_LIMIT_EXCEEDED = 'device_limit_exceeded'
}

/**
 * Configuration options for logout redirects
 */
export interface LogoutRedirectOptions {
  reason: LogoutReason;
  message?: string;
  delay?: number;
  clearStorage?: boolean;
  broadcast?: boolean;
  metadata?: LogoutMetadata;
  preserveLanguage?: boolean;
}

/**
 * Unified Logout Redirect Service
 *
 * Centralizes all logout redirect logic to ensure consistency across the application.
 * Handles cross-tab synchronization, language preservation, and security logging.
 */
export class LogoutRedirectService {
  private static instance: LogoutRedirectService;
  private readonly defaultDelay = 500; // 500ms default delay for cleanup
  private readonly loginUrl = '/login';

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): LogoutRedirectService {
    if (!LogoutRedirectService.instance) {
      LogoutRedirectService.instance = new LogoutRedirectService();
    }
    return LogoutRedirectService.instance;
  }

  /**
   * Perform logout redirect with comprehensive cleanup and synchronization
   */
  public async performLogoutRedirect(options: LogoutRedirectOptions): Promise<void> {
    const {
      reason,
      message,
      delay = this.defaultDelay,
      clearStorage = true,
      broadcast = true,
      metadata,
      preserveLanguage = true
    } = options;

    console.log('🚪 [LogoutRedirectService] Performing logout redirect:', {
      reason,
      message,
      delay,
      clearStorage,
      broadcast
    });

    try {
      // Step 1: Get user info for broadcasting (before cleanup)
      const userId = this.getCurrentUserId();

      // Step 2: Perform storage cleanup if requested
      if (clearStorage) {
        this.performStorageCleanup();
      }

      // Step 3: Broadcast logout to other tabs if requested
      if (broadcast && userId) {
        this.broadcastLogoutEvent(userId, reason, metadata);
      }

      // Step 4: Wait for cleanup delay if specified
      if (delay > 0) {
        await this.waitForCleanup(delay);
      }

      // Step 5: Perform final redirect
      this.performRedirect(reason, message, preserveLanguage);

    } catch (error) {
      console.error('❌ [LogoutRedirectService] Error during logout redirect:', error);
      // Fallback: direct redirect without cleanup
      this.performRedirect(reason, message, preserveLanguage);
    }
  }

  /**
   * Quick logout redirect for emergency scenarios
   */
  public async emergencyLogout(reason: LogoutReason = LogoutReason.SECURITY_VIOLATION): Promise<void> {
    console.log('🚨 [LogoutRedirectService] Emergency logout triggered:', reason);

    const userId = this.getCurrentUserId();

    // Immediate cleanup
    this.performStorageCleanup();

    // Broadcast to other tabs
    if (userId) {
      this.broadcastLogoutEvent(userId, reason);
    }

    // Immediate redirect
    this.performRedirect(reason, undefined, true);
  }

  /**
   * Get current user ID from localStorage (if available)
   */
  private getCurrentUserId(): string | null {
    try {
      if (typeof window !== 'undefined') {
        // Try multiple sources for user ID
        const userId =
          sessionStorage.getItem('agrinova_user_id') ||
          localStorage.getItem('agrinova_user_id') ||
          this.getUserIdFromApolloCache();

        return userId;
      }
    } catch (error) {
      console.warn('[LogoutRedirectService] Error getting user ID:', error);
    }
    return null;
  }

  /**
   * Extract user ID from Apollo Client cache (if available)
   */
  private getUserIdFromApolloCache(): string | null {
    try {
      // This would need to be implemented based on your Apollo Client setup
      // For now, return null as fallback
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Perform comprehensive storage cleanup
   */
  private performStorageCleanup(): void {
    if (typeof window === 'undefined') return;

    try {
      console.log('🧹 [LogoutRedirectService] Performing storage cleanup');

      // Clear sessionStorage
      const sessionStorageKeys = [
        'agrinova_device_id',
        'agrinova_session_id',
        'agrinova_user_id',
        'agrinova_session_cache',
        'logout_broadcast'
      ];

      sessionStorageKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });

      // Clear localStorage
      const localStorageKeys = [
        'agrinova_access_token',
        'agrinova_refresh_token',
        'agrinova_user_id',
        'auth_preference'
      ];

      localStorageKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear memory caches that might exist
      if (window.performance && window.performance.clearResourceTimings) {
        // Clear resource timing buffer for security
        window.performance.clearResourceTimings();
      }

    } catch (error) {
      console.warn('[LogoutRedirectService] Storage cleanup error:', error);
    }
  }

  /**
   * Broadcast logout event to other tabs
   */
  private broadcastLogoutEvent(userId: string, reason: LogoutReason, _metadata?: LogoutMetadata): void {
    try {
      console.log('📡 [LogoutRedirectService] Broadcasting logout to other tabs');
      logoutSecurityService.broadcastLogoutToTabs(userId, reason as any);
    } catch (error) {
      console.warn('[LogoutRedirectService] Error broadcasting logout:', error);
    }
  }

  /**
   * Wait for cleanup operations to complete
   */
  private async waitForCleanup(delay: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }

  /**
   * Perform the actual redirect to login page
   */
  private performRedirect(reason: LogoutReason, message?: string, preserveLanguage: boolean = true): void {
    if (typeof window === 'undefined') return;

    try {
      console.log('🔄 [LogoutRedirectService] Performing redirect to login');

      // Build redirect URL with parameters
      const redirectUrl = this.buildRedirectUrl(reason, message);

      // Preserve language preference if requested
      if (preserveLanguage) {
        this.preserveLanguagePreference();
      }

      // Use hard redirect to ensure complete state clearing
      window.location.href = redirectUrl;

    } catch (error) {
      console.error('❌ [LogoutRedirectService] Error during redirect:', error);
      // Fallback to simple redirect
      window.location.href = this.loginUrl;
    }
  }

  /**
   * Build redirect URL with appropriate parameters
   */
  private buildRedirectUrl(reason: LogoutReason, message?: string): string {
    const params = new URLSearchParams();

    // Add reason parameter
    params.set('reason', reason);

    // Add message if provided
    if (message) {
      params.set('message', encodeURIComponent(message));
    }

    // Add timestamp to prevent caching
    params.set('t', Date.now().toString());

    const queryString = params.toString();
    return queryString ? `${this.loginUrl}?${queryString}` : this.loginUrl;
  }

  /**
   * Preserve language preference during logout
   */
  private preserveLanguagePreference(): void {
    try {
      // The system uses cookie-based language detection, so no explicit action needed
      // NEXT_LOCALE cookie should already be set and will persist through redirect
      console.log('🌐 [LogoutRedirectService] Language preference preserved via cookies');
    } catch (error) {
      console.warn('[LogoutRedirectService] Error preserving language preference:', error);
    }
  }

  /**
   * Check if current URL has logout parameters
   */
  public static hasLogoutParams(): boolean {
    if (typeof window === 'undefined') return false;

    const params = new URLSearchParams(window.location.search);
    return params.has('reason') || params.has('message');
  }

  /**
   * Get logout parameters from current URL
   */
  public static getLogoutParams(): { reason?: string; message?: string } {
    if (typeof window === 'undefined') return {};

    const params = new URLSearchParams(window.location.search);
    return {
      reason: params.get('reason') || undefined,
      message: params.get('message') ? decodeURIComponent(params.get('message')!) : undefined
    };
  }

  /**
   * Clean logout parameters from URL
   */
  public static cleanLogoutParams(): void {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    params.delete('reason');
    params.delete('message');
    params.delete('t');

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }
}

// Export singleton instance for easy usage
export const logoutRedirectService = LogoutRedirectService.getInstance();