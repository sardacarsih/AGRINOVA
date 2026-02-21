'use client';

import { LogoutReason } from './logout-redirect-service';

/**
 * Message categories for different types of logout feedback
 */
export enum MessageCategory {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info'
}

/**
 * Localized logout message interface
 */
export interface LogoutMessage {
  id: string;
  category: MessageCategory;
  title: string;
  message: string;
  action?: string;
  autoHide?: boolean;
  duration?: number;
}

/**
 * Language-specific logout messages
 */
interface LocalizedMessages {
  [key: string]: {
    id: string;
    category: MessageCategory;
    title: string;
    message: string;
    action?: string;
  };
}

/**
 * Comprehensive logout message translations for Indonesian and English
 */
const MESSAGES: Record<LogoutReason, { id: string; id_ID: LocalizedMessages; en_US: LocalizedMessages }> = {
  [LogoutReason.USER_INITIATED]: {
    id: 'user_initiated',
    id_ID: {
      success_logout: {
        id: 'success_logout',
        category: MessageCategory.SUCCESS,
        title: 'Logout Berhasil',
        message: 'Anda telah berhasil keluar dari sistem.',
        action: 'Login Kembali'
      },
      logout_confirmation: {
        id: 'logout_confirmation',
        category: MessageCategory.INFO,
        title: 'Konfirmasi Logout',
        message: 'Apakah Anda yakin ingin keluar dari sistem?',
        action: 'Ya, Keluar'
      }
    },
    en_US: {
      success_logout: {
        id: 'success_logout',
        category: MessageCategory.SUCCESS,
        title: 'Logout Successful',
        message: 'You have been successfully logged out of the system.',
        action: 'Login Again'
      },
      logout_confirmation: {
        id: 'logout_confirmation',
        category: MessageCategory.INFO,
        title: 'Logout Confirmation',
        message: 'Are you sure you want to log out of the system?',
        action: 'Yes, Logout'
      }
    }
  },

  [LogoutReason.SESSION_TIMEOUT]: {
    id: 'session_timeout',
    id_ID: {
      timeout_warning: {
        id: 'timeout_warning',
        category: MessageCategory.WARNING,
        title: 'Sesi Akan Berakhir',
        message: 'Sesi Anda akan berakhir dalam 5 menit karena tidak ada aktivitas.',
        action: 'Perpanjang Sesi'
      },
      session_expired: {
        id: 'session_expired',
        category: MessageCategory.ERROR,
        title: 'Sesi Berakhir',
        message: 'Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan login kembali.',
        action: 'Login Kembali'
      }
    },
    en_US: {
      timeout_warning: {
        id: 'timeout_warning',
        category: MessageCategory.WARNING,
        title: 'Session Expiring',
        message: 'Your session will expire in 5 minutes due to inactivity.',
        action: 'Extend Session'
      },
      session_expired: {
        id: 'session_expired',
        category: MessageCategory.ERROR,
        title: 'Session Expired',
        message: 'Your session has expired due to inactivity. Please log in again.',
        action: 'Login Again'
      }
    }
  },

  [LogoutReason.TOKEN_EXPIRED]: {
    id: 'token_expired',
    id_ID: {
      token_expired: {
        id: 'token_expired',
        category: MessageCategory.ERROR,
        title: 'Token Kadaluarsa',
        message: 'Token akses Anda telah kadaluarsa. Silakan login kembali untuk melanjutkan.',
        action: 'Login Kembali'
      }
    },
    en_US: {
      token_expired: {
        id: 'token_expired',
        category: MessageCategory.ERROR,
        title: 'Token Expired',
        message: 'Your access token has expired. Please log in again to continue.',
        action: 'Login Again'
      }
    }
  },

  [LogoutReason.AUTHENTICATION_ERROR]: {
    id: 'authentication_error',
    id_ID: {
      auth_error: {
        id: 'auth_error',
        category: MessageCategory.ERROR,
        title: 'Error Autentikasi',
        message: 'Terjadi kesalahan autentikasi. Silakan login kembali.',
        action: 'Login Kembali'
      },
      unauthorized_access: {
        id: 'unauthorized_access',
        category: MessageCategory.ERROR,
        title: 'Akses Tidak Diizinkan',
        message: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
        action: 'Kembali ke Login'
      }
    },
    en_US: {
      auth_error: {
        id: 'auth_error',
        category: MessageCategory.ERROR,
        title: 'Authentication Error',
        message: 'An authentication error occurred. Please log in again.',
        action: 'Login Again'
      },
      unauthorized_access: {
        id: 'unauthorized_access',
        category: MessageCategory.ERROR,
        title: 'Unauthorized Access',
        message: 'You do not have permission to access this page.',
        action: 'Return to Login'
      }
    }
  },

  [LogoutReason.INVALID_ROLE]: {
    id: 'invalid_role',
    id_ID: {
      invalid_role: {
        id: 'invalid_role',
        category: MessageCategory.ERROR,
        title: 'Role Tidak Valid',
        message: 'Role pengguna Anda tidak valid untuk mengakses halaman ini. Silakan hubungi administrator.',
        action: 'Hubungi Admin'
      },
      role_changed: {
        id: 'role_changed',
        category: MessageCategory.WARNING,
        title: 'Role Diubah',
        message: 'Role pengguna Anda telah diubah. Silakan login kembali untuk memperbarui izin akses.',
        action: 'Login Kembali'
      }
    },
    en_US: {
      invalid_role: {
        id: 'invalid_role',
        category: MessageCategory.ERROR,
        title: 'Invalid Role',
        message: 'Your user role is not valid for accessing this page. Please contact the administrator.',
        action: 'Contact Admin'
      },
      role_changed: {
        id: 'role_changed',
        category: MessageCategory.WARNING,
        title: 'Role Changed',
        message: 'Your user role has been changed. Please log in again to update access permissions.',
        action: 'Login Again'
      }
    }
  },

  [LogoutReason.FORCED_LOGOUT]: {
    id: 'forced_logout',
    id_ID: {
      forced_logout: {
        id: 'forced_logout',
        category: MessageCategory.WARNING,
        title: 'Logout Dipaksa',
        message: 'Anda telah dikeluarkan dari sistem oleh administrator.',
        action: 'Login Kembali'
      },
      account_suspended: {
        id: 'account_suspended',
        category: MessageCategory.ERROR,
        title: 'Akun Ditangguhkan',
        message: 'Akun Anda telah ditangguhkan. Silakan hubungi administrator untuk informasi lebih lanjut.',
        action: 'Hubungi Admin'
      }
    },
    en_US: {
      forced_logout: {
        id: 'forced_logout',
        category: MessageCategory.WARNING,
        title: 'Forced Logout',
        message: 'You have been logged out of the system by an administrator.',
        action: 'Login Again'
      },
      account_suspended: {
        id: 'account_suspended',
        category: MessageCategory.ERROR,
        title: 'Account Suspended',
        message: 'Your account has been suspended. Please contact the administrator for more information.',
        action: 'Contact Admin'
      }
    }
  },

  [LogoutReason.SECURITY_VIOLATION]: {
    id: 'security_violation',
    id_ID: {
      security_violation: {
        id: 'security_violation',
        category: MessageCategory.ERROR,
        title: 'Pelanggaran Keamanan',
        message: 'Aktivitas mencurigakan terdeteksi. Untuk keamanan akun Anda, sesi telah diakhiri.',
        action: 'Login Kembali'
      },
      multiple_sessions: {
        id: 'multiple_sessions',
        category: MessageCategory.WARNING,
        title: 'Multiple Sesi',
        message: 'Akun Anda sedang digunakan di perangkat lain. Sesi ini telah diakhiri untuk keamanan.',
        action: 'Login Kembali'
      }
    },
    en_US: {
      security_violation: {
        id: 'security_violation',
        category: MessageCategory.ERROR,
        title: 'Security Violation',
        message: 'Suspicious activity detected. For your account security, the session has been terminated.',
        action: 'Login Again'
      },
      multiple_sessions: {
        id: 'multiple_sessions',
        category: MessageCategory.WARNING,
        title: 'Multiple Sessions',
        message: 'Your account is being used on another device. This session has been terminated for security.',
        action: 'Login Again'
      }
    }
  },

  [LogoutReason.CONCURRENT_LOGIN]: {
    id: 'concurrent_login',
    id_ID: {
      concurrent_login: {
        id: 'concurrent_login',
        category: MessageCategory.INFO,
        title: 'Login dari Perangkat Lain',
        message: 'Akun Anda telah login dari perangkat lain. Sesi ini telah diakhiri.',
        action: 'Login Kembali'
      }
    },
    en_US: {
      concurrent_login: {
        id: 'concurrent_login',
        category: MessageCategory.INFO,
        title: 'Login from Another Device',
        message: 'Your account has been logged in from another device. This session has been terminated.',
        action: 'Login Again'
      }
    }
  },

  [LogoutReason.DEVICE_LIMIT_EXCEEDED]: {
    id: 'device_limit_exceeded',
    id_ID: {
      device_limit: {
        id: 'device_limit',
        category: MessageCategory.ERROR,
        title: 'Batas Perangkat Terlampaui',
        message: 'Anda telah mencapai batas perangkat yang diizinkan. Sesi tertua telah diakhiri.',
        action: 'Login Kembali'
      }
    },
    en_US: {
      device_limit: {
        id: 'device_limit',
        category: MessageCategory.ERROR,
        title: 'Device Limit Exceeded',
        message: 'You have reached the maximum allowed device limit. The oldest session has been terminated.',
        action: 'Login Again'
      }
    }
  }
};

/**
 * Logout Message Service
 *
 * Provides localized messages for different logout scenarios with support for
 * Indonesian (id_ID) and English (en_US) languages.
 */
export class LogoutMessageService {
  private static instance: LogoutMessageService;
  private readonly defaultLocale = 'id_ID';
  private readonly fallbackLocale = 'en_US';

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): LogoutMessageService {
    if (!LogoutMessageService.instance) {
      LogoutMessageService.instance = new LogoutMessageService();
    }
    return LogoutMessageService.instance;
  }

  /**
   * Get message for specific logout reason and locale
   */
  public getMessage(
    reason: LogoutReason,
    messageType: string = 'default',
    locale?: string
  ): LogoutMessage {
    const currentLocale = this.getLocale(locale);
    const messages = MESSAGES[reason];

    if (!messages) {
      return this.getDefaultMessage();
    }

    const localeMessages = messages[currentLocale] || messages[this.fallbackLocale];
    const messageKey = this.getMessageKey(reason, messageType);

    const messageData = localeMessages[messageKey] ||
                      localeMessages[Object.keys(localeMessages)[0]];

    if (!messageData) {
      return this.getDefaultMessage();
    }

    return {
      ...messageData,
      autoHide: messageData.category !== MessageCategory.ERROR,
      duration: messageData.category === MessageCategory.SUCCESS ? 3000 : 5000
    };
  }

  /**
   * Get all available messages for a logout reason
   */
  public getAllMessages(reason: LogoutReason, locale?: string): LogoutMessage[] {
    const currentLocale = this.getLocale(locale);
    const messages = MESSAGES[reason];

    if (!messages) {
      return [this.getDefaultMessage()];
    }

    const localeMessages = messages[currentLocale] || messages[this.fallbackLocale];

    return Object.values(localeMessages).map(msg => {
      const msgObj = msg as any;
      return {
        ...msgObj,
        autoHide: msgObj.category !== MessageCategory.ERROR,
        duration: msgObj.category === MessageCategory.SUCCESS ? 3000 : 5000
      };
    });
  }

  /**
   * Get success message for logout completion
   */
  public getSuccessMessage(locale?: string): LogoutMessage {
    return this.getMessage(LogoutReason.USER_INITIATED, 'success_logout', locale);
  }

  /**
   * Get timeout warning message
   */
  public getTimeoutWarningMessage(locale?: string): LogoutMessage {
    return this.getMessage(LogoutReason.SESSION_TIMEOUT, 'timeout_warning', locale);
  }

  /**
   * Get session expired message
   */
  public getSessionExpiredMessage(locale?: string): LogoutMessage {
    return this.getMessage(LogoutReason.SESSION_TIMEOUT, 'session_expired', locale);
  }

  /**
   * Get custom message from URL parameters
   */
  public getCustomMessage(reason: string, message?: string, locale?: string): LogoutMessage {
    return {
      id: 'custom_message',
      category: MessageCategory.INFO,
      title: this.formatReason(reason, locale),
      message: message || this.getGenericMessage(reason, locale),
      autoHide: true,
      duration: 5000
    };
  }

  /**
   * Get current locale from browser or use provided locale
   */
  private getLocale(locale?: string): string {
    if (locale) return locale;

    // Try to get locale from cookie (NEXT_LOCALE)
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const localeCookie = cookies.find(cookie =>
        cookie.trim().startsWith('NEXT_LOCALE=')
      );

      if (localeCookie) {
        const cookieValue = localeCookie.split('=')[1]?.trim();
        if (cookieValue) return cookieValue === 'en' ? 'en_US' : 'id_ID';
      }

      // Fallback to legacy cookie
      const legacyCookie = cookies.find(cookie =>
        cookie.trim().startsWith('agrinova-language=')
      );

      if (legacyCookie) {
        const cookieValue = legacyCookie.split('=')[1]?.trim();
        if (cookieValue) return cookieValue === 'en' ? 'en_US' : 'id_ID';
      }
    }

    // Fallback to browser language
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language || navigator.languages?.[0];
      if (browserLang?.startsWith('en')) return 'en_US';
      if (browserLang?.startsWith('id')) return 'id_ID';
    }

    return this.defaultLocale;
  }

  /**
   * Get appropriate message key for reason and message type
   */
  private getMessageKey(reason: LogoutReason, messageType: string): string {
    const keyMap: Record<LogoutReason, Record<string, string>> = {
      [LogoutReason.USER_INITIATED]: {
        'default': 'success_logout',
        'success': 'success_logout',
        'confirmation': 'logout_confirmation'
      },
      [LogoutReason.SESSION_TIMEOUT]: {
        'default': 'session_expired',
        'warning': 'timeout_warning',
        'expired': 'session_expired'
      },
      [LogoutReason.TOKEN_EXPIRED]: {
        'default': 'token_expired'
      },
      [LogoutReason.AUTHENTICATION_ERROR]: {
        'default': 'auth_error',
        'unauthorized': 'unauthorized_access'
      },
      [LogoutReason.INVALID_ROLE]: {
        'default': 'invalid_role',
        'changed': 'role_changed'
      },
      [LogoutReason.FORCED_LOGOUT]: {
        'default': 'forced_logout',
        'suspended': 'account_suspended'
      },
      [LogoutReason.SECURITY_VIOLATION]: {
        'default': 'security_violation',
        'multiple': 'multiple_sessions'
      },
      [LogoutReason.CONCURRENT_LOGIN]: {
        'default': 'concurrent_login'
      },
      [LogoutReason.DEVICE_LIMIT_EXCEEDED]: {
        'default': 'device_limit'
      }
    };

    return keyMap[reason]?.[messageType] || 'default';
  }

  /**
   * Format reason code to readable title
   */
  private formatReason(reason: string, locale?: string): string {
    const currentLocale = this.getLocale(locale);

    const reasonMap: Record<string, { id_ID: string; en_US: string }> = {
      'user_initiated': {
        id_ID: 'Logout Berhasil',
        en_US: 'Logout Successful'
      },
      'session_timeout': {
        id_ID: 'Sesi Berakhir',
        en_US: 'Session Expired'
      },
      'token_expired': {
        id_ID: 'Token Kadaluarsa',
        en_US: 'Token Expired'
      },
      'authentication_error': {
        id_ID: 'Error Autentikasi',
        en_US: 'Authentication Error'
      },
      'invalid_role': {
        id_ID: 'Role Tidak Valid',
        en_US: 'Invalid Role'
      },
      'forced_logout': {
        id_ID: 'Logout Dipaksa',
        en_US: 'Forced Logout'
      },
      'security_violation': {
        id_ID: 'Pelanggaran Keamanan',
        en_US: 'Security Violation'
      },
      'concurrent_login': {
        id_ID: 'Login dari Perangkat Lain',
        en_US: 'Login from Another Device'
      },
      'device_limit_exceeded': {
        id_ID: 'Batas Perangkat Terlampaui',
        en_US: 'Device Limit Exceeded'
      }
    };

    return reasonMap[reason]?.[currentLocale] || reason;
  }

  /**
   * Get generic message for unknown reasons
   */
  private getGenericMessage(reason: string, locale?: string): string {
    const currentLocale = this.getLocale(locale);

    const genericMessages: Record<string, { id_ID: string; en_US: string }> = {
      'default': {
        id_ID: 'Terjadi kesalahan saat logout. Silakan login kembali.',
        en_US: 'An error occurred during logout. Please log in again.'
      }
    };

    return genericMessages['default']?.[currentLocale] ||
           genericMessages['default']?.[this.fallbackLocale] ||
           'An error occurred during logout. Please log in again.';
  }

  /**
   * Get default fallback message
   */
  private getDefaultMessage(): LogoutMessage {
    return {
      id: 'default_message',
      category: MessageCategory.INFO,
      title: 'Logout',
      message: 'You have been logged out of the system.',
      action: 'Login Again',
      autoHide: true,
      duration: 3000
    };
  }
}

// Export singleton instance for easy usage
export const logoutMessageService = LogoutMessageService.getInstance();

// Export types for external usage
export type { LocalizedMessages };