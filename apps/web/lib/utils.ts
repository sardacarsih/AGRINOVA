import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatWeight(weight: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(weight) + ' kg'
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(d)
}

export function formatDateSafe(date: string | Date): string {
  if (typeof window === 'undefined') {
    // Server-side: return a simple ISO date format to avoid hydration mismatch
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().split('T')[0]
  }
  
  // Client-side: use locale-specific formatting
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 60) {
    return `${minutes} menit yang lalu`
  } else if (hours < 24) {
    return `${hours} jam yang lalu`
  } else {
    return `${days} hari yang lalu`
  }
}

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800'
    case 'APPROVED':
      return 'bg-green-100 text-green-800'
    case 'REJECTED':
      return 'bg-red-100 text-red-800'
    case 'PKS_RECEIVED':
      return 'bg-blue-100 text-blue-800'
    case 'PKS_WEIGHED':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getQualityColor(quality: string): string {
  switch (quality.toUpperCase()) {
    case 'EXCELLENT':
      return 'bg-green-100 text-green-800'
    case 'GOOD':
      return 'bg-blue-100 text-blue-800'
    case 'FAIR':
      return 'bg-yellow-100 text-yellow-800'
    case 'POOR':
      return 'bg-orange-100 text-orange-800'
    case 'REJECT':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}