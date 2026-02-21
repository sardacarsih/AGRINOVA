'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  CircleAlert,
  Zap
} from 'lucide-react';
import {
  NotificationType,
  NotificationPriority,
  Notification
} from '@/lib/types/notifications';

// Toast notification helpers
export class ToastNotifications {
  static show(notification: Notification) {
    const { title, message, priority, type } = notification;

    switch (priority) {
      case NotificationPriority.CRITICAL:
        return toast.error(title ? `${title}: ${message}` : message, {
          duration: 10000,
          icon: <CircleAlert className="h-4 w-4" />,
          action: {
            label: 'Dismiss',
            onClick: () => { },
          },
          style: {
            backgroundColor: '#fef2f2',
            borderColor: '#fecaca',
            color: '#dc2626',
          },
        });

      case NotificationPriority.HIGH:
        return toast.warning(title ? `${title}: ${message}` : message, {
          duration: 7000,
          icon: <Zap className="h-4 w-4" />,
          style: {
            backgroundColor: '#fffbeb',
            borderColor: '#fed7aa',
            color: '#d97706',
          },
        });

      case NotificationPriority.MEDIUM:
        return this.getTypeBasedToast(type, title, message);

      case NotificationPriority.LOW:
      default:
        return toast(title ? `${title}: ${message}` : message, {
          duration: 4000,
          icon: <Info className="h-4 w-4" />,
        });
    }
  }

  private static getTypeBasedToast(type: NotificationType, title: string, message: string) {
    const displayMessage = title ? `${title}: ${message}` : message;

    switch (type) {
      case NotificationType.HARVEST_APPROVED:
      case NotificationType.GATE_CHECK_COMPLETED:
        return toast.success(displayMessage, {
          duration: 5000,
          icon: <CheckCircle className="h-4 w-4" />,
        });

      case NotificationType.HARVEST_REJECTED:
      case NotificationType.SYSTEM_ALERT:
      case NotificationType.SECURITY_ALERT:
        return toast.error(displayMessage, {
          duration: 6000,
          icon: <AlertTriangle className="h-4 w-4" />,
        });

      case NotificationType.HARVEST_APPROVAL_NEEDED:
      case NotificationType.GATE_CHECK_CREATED:
        return toast.info(displayMessage, {
          duration: 5000,
          icon: <Info className="h-4 w-4" />,
        });

      default:
        return toast(displayMessage, {
          duration: 4000,
          icon: <Info className="h-4 w-4" />,
        });
    }
  }

  // Convenience methods
  static success(title: string, message: string) {
    return toast.success(title ? `${title}: ${message}` : message, {
      icon: <CheckCircle className="h-4 w-4" />,
    });
  }

  static error(title: string, message: string) {
    return toast.error(title ? `${title}: ${message}` : message, {
      icon: <AlertTriangle className="h-4 w-4" />,
    });
  }

  static warning(title: string, message: string) {
    return toast.warning(title ? `${title}: ${message}` : message, {
      icon: <AlertTriangle className="h-4 w-4" />,
    });
  }

  static info(title: string, message: string) {
    return toast.info(title ? `${title}: ${message}` : message, {
      icon: <Info className="h-4 w-4" />,
    });
  }

  static loading(title: string, message: string) {
    return toast.loading(title ? `${title}: ${message}` : message);
  }

  static dismiss(toastId?: string | number) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }
}

// Sound utilities
export class NotificationSounds {
  private static audioContext: AudioContext | null = null;

  static async play(priority: NotificationPriority) {
    if (typeof window === 'undefined' || !('Audio' in window)) {
      return;
    }

    try {
      const audio = new Audio();

      // Different sounds for different priorities
      switch (priority) {
        case NotificationPriority.CRITICAL:
          audio.src = '/sounds/critical-notification.mp3';
          break;
        case NotificationPriority.HIGH:
          audio.src = '/sounds/high-notification.mp3';
          break;
        default:
          audio.src = '/sounds/notification.mp3';
          break;
      }

      audio.volume = 0.3;
      await audio.play().catch(() => {
        // Ignore errors (user hasn't interacted with page yet)
      });
    } catch (error) {
      // Ignore sound errors
      console.debug('Notification sound error:', error);
    }
  }

  // Web Audio API alternative for more control
  static async playTone(frequency: number = 800, duration: number = 200) {
    if (typeof window === 'undefined' || !('AudioContext' in window)) {
      return;
    }

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.debug('Web Audio API error:', error);
    }
  }
}

// React hook for easy integration
export function useToastNotifications() {
  const showNotificationToast = React.useCallback((notification: Notification) => {
    ToastNotifications.show(notification);
  }, []);

  const showSuccessToast = React.useCallback((title: string, message: string) => {
    ToastNotifications.success(title, message);
  }, []);

  const showErrorToast = React.useCallback((title: string, message: string) => {
    ToastNotifications.error(title, message);
  }, []);

  const showWarningToast = React.useCallback((title: string, message: string) => {
    ToastNotifications.warning(title, message);
  }, []);

  const showInfoToast = React.useCallback((title: string, message: string) => {
    ToastNotifications.info(title, message);
  }, []);

  const playNotificationSound = React.useCallback((priority: NotificationPriority) => {
    NotificationSounds.play(priority);
  }, []);

  return {
    showNotificationToast,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    playNotificationSound,
  };
}