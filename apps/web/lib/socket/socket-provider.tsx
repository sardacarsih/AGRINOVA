'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

// Mock WebSocket implementation that simulates real-time updates
class MockSocket {
  private listeners: Map<string, Set<Function>> = new Map();
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private simulationInterval: NodeJS.Timeout | null = null;

  connect() {
    if (this.connected) return;

    setTimeout(() => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connect');
      this.startHeartbeat();
      this.startSimulation();
    }, 500);
  }

  disconnect() {
    this.connected = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.emit('disconnect');
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.listeners.has(event)) return;
    
    if (callback) {
      this.listeners.get(event)!.delete(callback);
    } else {
      this.listeners.get(event)!.clear();
    }
  }

  emit(event: string, data?: any) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event)!.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Socket event callback error:', error);
      }
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        // Simulate occasional connection issues
        if (Math.random() < 0.02) { // 2% chance of temporary disconnect
          this.handleDisconnect();
        }
      }
    }, 30000);
  }

  private startSimulation() {
    // Simulate periodic dashboard updates
    this.simulationInterval = setInterval(() => {
      if (this.connected && Math.random() < 0.3) { // 30% chance every 10 seconds
        this.emitSimulatedUpdate();
      }
    }, 10000);
  }

  private emitSimulatedUpdate() {
    const updateTypes = [
      'dashboard:refresh',
      'system:health_check',
      'user:status_change',
      'approval:updated'
    ];
    
    const randomEvent = updateTypes[Math.floor(Math.random() * updateTypes.length)];
    this.emit(randomEvent, {
      timestamp: new Date().toISOString(),
      source: 'simulation'
    });
  }

  private handleDisconnect() {
    this.connected = false;
    this.emit('disconnect');
    this.attemptReconnect();
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  get isConnected() {
    return this.connected;
  }
}

interface SocketContextType {
  isConnected: boolean;
  socket: MockSocket | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivity: Date | null;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  socket: null,
  connectionState: 'disconnected',
  lastActivity: null,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const socketRef = useRef<MockSocket | null>(null);

  const handleConnect = useCallback(() => {
    setIsConnected(true);
    setConnectionState('connected');
    setLastActivity(new Date());
    console.log('WebSocket connected');
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setConnectionState('disconnected');
    console.log('WebSocket disconnected');
  }, []);

  const handleError = useCallback(() => {
    setIsConnected(false);
    setConnectionState('error');
    console.error('WebSocket error');
  }, []);

  useEffect(() => {
    // Initialize socket connection
    const socket = new MockSocket();
    socketRef.current = socket;
    
    // Set up event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);

    // Update activity timestamp on any event
    socket.on('dashboard:refresh', () => setLastActivity(new Date()));
    socket.on('system:health_check', () => setLastActivity(new Date()));
    socket.on('user:status_change', () => setLastActivity(new Date()));
    socket.on('approval:updated', () => setLastActivity(new Date()));

    // Listen for auth logout events
    const handleAuthLogout = (event: CustomEvent) => {
      console.log('WebSocket: Received logout event, disconnecting...', event.detail);
      socket.disconnect();
      setIsConnected(false);
      setConnectionState('disconnected');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:logout', handleAuthLogout as EventListener);
    }

    // Start connection
    setConnectionState('connecting');
    socket.connect();

    // Cleanup on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
      socket.disconnect();
      socketRef.current = null;
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:logout', handleAuthLogout as EventListener);
      }
    };
  }, [handleConnect, handleDisconnect, handleError]);

  const contextValue: SocketContextType = {
    isConnected,
    socket: socketRef.current,
    connectionState,
    lastActivity,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}