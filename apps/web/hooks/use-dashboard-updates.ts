'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useSocket } from '@/lib/socket/socket-provider'
import { useNotifications } from '@/lib/notifications/notification-provider'
import { RealTimeUpdate } from '@/types/dashboard'

interface UseDashboardUpdatesProps {
  onUpdate?: (update: RealTimeUpdate) => void
  channels?: string[]
  enableNotifications?: boolean
}

interface SocketEventHandlers {
  [key: string]: (data: any) => void
}

export function useDashboardUpdates({
  onUpdate,
  channels = ['WEB_DASHBOARD', 'MOBILE_NOTIF'],
  enableNotifications = true
}: UseDashboardUpdatesProps = {}) {
  const { socket, isConnected } = useSocket()
  const { showSuccess, showWarning, showInfo } = useNotifications()
  const handlersRef = useRef<SocketEventHandlers>({})

  // Handle different types of real-time updates
  const handlePanenUpdate = useCallback((data: any) => {
    const update: RealTimeUpdate = {
      type: 'harvest',
      action: data.action || 'updated',
      data: data,
      timestamp: data.timestamp || new Date().toISOString(),
      userId: data.userId
    }

    onUpdate?.(update)

    if (enableNotifications) {
      switch (data.action) {
        case 'created':
          showSuccess('Data Panen Baru', `Panen ${data.panenNumber || 'baru'} telah ditambahkan`)
          break
        case 'approved':
          showSuccess('Panen Disetujui', `Panen ${data.panenNumber} telah disetujui`)
          break
        case 'rejected':
          showWarning('Panen Ditolak', `Panen ${data.panenNumber} ditolak: ${data.rejectionReason || 'Tidak memenuhi standar'}`)
          break
        default:
          showInfo('Update Panen', `Data panen ${data.panenNumber || ''} telah diperbarui`)
      }
    }
  }, [onUpdate, enableNotifications, showInfo, showSuccess, showWarning])

  const handleApprovalUpdate = useCallback((data: any) => {
    const update: RealTimeUpdate = {
      type: 'approval',
      action: data.action || 'updated',
      data: data,
      timestamp: data.timestamp || new Date().toISOString(),
      userId: data.userId
    }

    onUpdate?.(update)

    if (enableNotifications) {
      switch (data.status) {
        case 'APPROVED':
          showSuccess('Approval Update', `${data.mandorName} - Panen disetujui`)
          break
        case 'REJECTED':
          showWarning('Approval Update', `${data.mandorName} - Panen ditolak`)
          break
        default:
          showInfo('Approval Update', 'Status approval telah diperbarui')
      }
    }
  }, [onUpdate, enableNotifications, showInfo, showSuccess, showWarning])

  const handleGateCheckUpdate = useCallback((data: any) => {
    const update: RealTimeUpdate = {
      type: 'gate_check',
      action: data.action || 'updated',
      data: data,
      timestamp: data.timestamp || new Date().toISOString(),
      userId: data.userId
    }

    onUpdate?.(update)

    if (enableNotifications) {
      switch (data.action) {
        case 'truck_entered':
          showInfo('Gate Check', `Truck ${data.plateNumber} masuk kebun`)
          break
        case 'truck_exited':
          showInfo('Gate Check', `Truck ${data.plateNumber} keluar kebun`)
          break
        case 'validation_failed':
          showWarning('Validasi Gagal', `Truck ${data.plateNumber}: Data tidak sesuai dengan approval`)
          break
        default:
          showInfo('Gate Check Update', 'Data gate check telah diperbarui')
      }
    }
  }, [onUpdate, enableNotifications, showInfo, showWarning])

  // Handle connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    if (enableNotifications) {
      if (connected) {
        showSuccess('Koneksi Terhubung', 'Real-time updates aktif')
      } else {
        showWarning('Koneksi Terputus', 'Real-time updates tidak aktif')
      }
    }
  }, [enableNotifications, showSuccess, showWarning])

  // Set up event handlers
  useEffect(() => {
    if (!socket || !isConnected) return

    // Define handlers
    const handlers: SocketEventHandlers = {
      'panen:created': handlePanenUpdate,
      'panen:updated': handlePanenUpdate,
      'panen:approved': handlePanenUpdate,
      'panen:rejected': handlePanenUpdate,
      'approval:updated': handleApprovalUpdate,
      'gate_check:created': handleGateCheckUpdate,
      'gate_check:updated': handleGateCheckUpdate,
      'gate_check:validation_failed': handleGateCheckUpdate,
      'dashboard:refresh': (data: any) => {
        onUpdate?.({
          type: 'harvest',
          action: 'updated',
          data: { refresh: true },
          timestamp: new Date().toISOString()
        })
        
        if (enableNotifications) {
          showInfo('Dashboard Update', 'Data dashboard telah diperbarui')
        }
      }
    }

    // Register event handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler)
      handlersRef.current[event] = handler
    })

    // Join channels for real-time updates
    channels.forEach(channel => {
      socket.emit('join:channel', { channel })
    })

    // Handle connection events
    socket.on('connect', () => handleConnectionChange(true))
    socket.on('disconnect', () => handleConnectionChange(false))

    // Cleanup function
    return () => {
      Object.keys(handlers).forEach(event => {
        socket.off(event, handlersRef.current[event])
      })
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [socket, isConnected, channels, handlePanenUpdate, handleApprovalUpdate, handleGateCheckUpdate, handleConnectionChange, onUpdate, enableNotifications, showInfo])

  // Manual refresh function that can be called from components
  const requestRefresh = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('dashboard:request_refresh', {
        timestamp: new Date().toISOString()
      })
    }
  }, [socket, isConnected])

  // Subscribe to specific entity updates
  const subscribeToEntity = useCallback((entityType: string, entityId: string) => {
    if (socket && isConnected) {
      socket.emit('subscribe:entity', {
        entityType,
        entityId,
        timestamp: new Date().toISOString()
      })
    }
  }, [socket, isConnected])

  // Unsubscribe from specific entity updates
  const unsubscribeFromEntity = useCallback((entityType: string, entityId: string) => {
    if (socket && isConnected) {
      socket.emit('unsubscribe:entity', {
        entityType,
        entityId,
        timestamp: new Date().toISOString()
      })
    }
  }, [socket, isConnected])

  return {
    isConnected,
    requestRefresh,
    subscribeToEntity,
    unsubscribeFromEntity
  }
}