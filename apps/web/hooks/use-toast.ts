'use client'

import { toast as sonnerToast } from 'sonner'

// Enhanced toast hook with Sonner integration
export const useToast = () => {
  const toast = ({ title, description, variant }: { 
    title: string; 
    description?: string; 
    variant?: 'default' | 'destructive' 
  }) => {
    const message = description ? `${title}: ${description}` : title;
    
    if (variant === 'destructive') {
      return sonnerToast.error(message)
    }
    return sonnerToast(message)
  }

  const success = (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => {
    return sonnerToast.success(message, options)
  }

  const error = (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => {
    return sonnerToast.error(message, options)
  }

  const warning = (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) => {
    return sonnerToast.warning(message, options)
  }

  const info = (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
    return sonnerToast.info(message, options)
  }

  const loading = (message: string, options?: Parameters<typeof sonnerToast.loading>[1]) => {
    return sonnerToast.loading(message, options)
  }

  const promise = <T,>(
    promise: Promise<T>,
    options: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) => {
    return sonnerToast.promise(promise, options)
  }

  const dismiss = (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId)
  }

  return {
    toast,
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
  }
}

// Re-export toast functions for direct usage
export const toast = {
  success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => 
    sonnerToast.success(message, options),
  
  error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => 
    sonnerToast.error(message, options),
  
  warning: (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) => 
    sonnerToast.warning(message, options),
  
  info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => 
    sonnerToast.info(message, options),
  
  loading: (message: string, options?: Parameters<typeof sonnerToast.loading>[1]) => 
    sonnerToast.loading(message, options),
  
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) => sonnerToast.promise(promise, options),
  
  dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
  
  message: (message: string) => sonnerToast(message),
}