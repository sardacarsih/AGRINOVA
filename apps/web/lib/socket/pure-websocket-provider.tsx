'use client';

import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useRef, 
  useCallback,
  useMemo
} from 'react';

// Data Cache Interface for consistency management
interface DataCache {
  [key: string]: {
    data: any;
    timestamp: Date;
    version: number;
  };
}

// Enhanced WebSocket implementation for Pure WebSocket architecture
class EnhancedWebSocket {
  private listeners: Map<string, Set<Function>> = new Map();
  private connected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private simulationInterval: NodeJS.Timeout | null = null;
  private connectionStateListeners: Set<Function> = new Set();
  private dataCache: DataCache = {};
  private missedEvents: Array<{ event: string; data: any; timestamp: Date }> = [];
  private subscriptions: Set<string> = new Set();

  // Enhanced connection management
  connect() {
    if (this.connected) return;
    
    this.notifyConnectionState('connecting');
    console.log('🔌 Enhanced WebSocket: Attempting connection...');

    setTimeout(() => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.notifyConnectionState('connected');
      this.emit('connect');
      this.startHeartbeat();
      this.startEnhancedSimulation();
      this.processMissedEvents();
      console.log('✅ Enhanced WebSocket: Connected successfully');
    }, 800 + Math.random() * 400); // Simulate realistic connection time
  }

  disconnect(reason?: string) {
    console.log(`📡 Enhanced WebSocket: Disconnecting - ${reason || 'Manual disconnect'}`);
    this.connected = false;
    this.notifyConnectionState('disconnected');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.emit('disconnect', { reason });
  }

  // Enhanced subscription management
  subscribe(channels: string[]) {
    channels.forEach(channel => {
      this.subscriptions.add(channel);
      console.log(`📺 Enhanced WebSocket: Subscribed to channel: ${channel}`);
    });
    
    // Send initial data for subscribed channels if connected
    if (this.connected) {
      this.sendInitialData(channels);
    }
  }

  unsubscribe(channels: string[]) {
    channels.forEach(channel => {
      this.subscriptions.delete(channel);
      console.log(`📺 Enhanced WebSocket: Unsubscribed from channel: ${channel}`);
    });
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
    
    const eventData = {
      ...data,
      timestamp: new Date().toISOString(),
      eventId: `${event}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.listeners.get(event)!.forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        console.error(`❌ Enhanced WebSocket: Event callback error for ${event}:`, error);
      }
    });

    // Cache important data events
    if (event.includes(':data') || event.includes('dashboard:')) {
      this.cacheEvent(event, eventData);
    }
  }

  // Enhanced data push with role-based filtering
  pushData(type: string, data: any, targetChannels?: string[]) {
    const event = {
      type,
      data,
      timestamp: new Date().toISOString(),
      channels: targetChannels || Array.from(this.subscriptions)
    };

    // Only emit to subscribed channels
    const shouldEmit = !targetChannels || 
      targetChannels.some(channel => this.subscriptions.has(channel));

    if (shouldEmit) {
      this.emit(`data:${type}`, event);
      console.log(`📤 Enhanced WebSocket: Data pushed - ${type}`, event);
    }
  }

  private notifyConnectionState(state: string) {
    this.connectionStateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Connection state listener error:', error);
      }
    });
  }

  onConnectionStateChange(callback: Function) {
    this.connectionStateListeners.add(callback);
    return () => this.connectionStateListeners.delete(callback);
  }

  private cacheEvent(event: string, data: any) {
    this.dataCache[event] = {
      data,
      timestamp: new Date(),
      version: (this.dataCache[event]?.version || 0) + 1
    };
    
    // Keep cache size manageable (max 100 entries)
    const cacheKeys = Object.keys(this.dataCache);
    if (cacheKeys.length > 100) {
      // Remove oldest entries
      const sortedKeys = cacheKeys.sort((a, b) => 
        this.dataCache[a].timestamp.getTime() - this.dataCache[b].timestamp.getTime()
      );
      sortedKeys.slice(0, 20).forEach(key => delete this.dataCache[key]);
    }
  }

  private sendInitialData(channels: string[]) {
    // Send cached data for newly subscribed channels
    setTimeout(() => {
      channels.forEach(channel => {
        const initialData = this.generateInitialData(channel);
        if (initialData) {
          this.pushData(`${channel.toLowerCase()}_initial`, initialData, [channel]);
        }
      });
    }, 500);
  }

  private generateInitialData(channel: string) {
    // Generate realistic initial data based on channel type
    const dataGenerators: Record<string, () => any> = {
      'COMPANY_ADMIN': () => ({
        companies: Array.from({ length: 3 }, (_, i) => ({
          id: `company-${i + 1}`,
          name: `PT Agrinova ${i + 1}`,
          isActive: true,
          lastSync: new Date().toISOString()
        })),
        employees: Array.from({ length: 12 }, (_, i) => ({
          id: `emp-${i + 1}`,
          name: `Employee ${i + 1}`,
          role: ['mandor', 'asisten', 'manager'][i % 3],
          isActive: true
        }))
      }),
      
      'SATPAM': () => ({
        gateChecks: Array.from({ length: 5 }, (_, i) => ({
          id: `gate-${i + 1}`,
          vehicleNumber: `B ${1000 + i} ABC`,
          status: ['in', 'out'][i % 2],
          timestamp: new Date(Date.now() - i * 300000).toISOString()
        })),
        alerts: []
      }),
      
      'ASISTEN': () => ({
        pendingApprovals: Array.from({ length: 3 }, (_, i) => ({
          id: `approval-${i + 1}`,
          harvestId: `harvest-${i + 1}`,
          mandor: `Mandor ${i + 1}`,
          status: 'pending',
          submittedAt: new Date(Date.now() - i * 600000).toISOString()
        }))
      })
    };

    return dataGenerators[channel]?.() || null;
  }

  private processMissedEvents() {
    if (this.missedEvents.length === 0) return;
    
    console.log(`🔄 Enhanced WebSocket: Processing ${this.missedEvents.length} missed events`);
    
    this.missedEvents.forEach(event => {
      this.emit(event.event, event.data);
    });
    
    this.missedEvents = [];
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        // Enhanced heartbeat with connection quality simulation
        const connectionQuality = Math.random();
        
        if (connectionQuality < 0.05) { // 5% chance of connection issue
          console.log('⚠️ Enhanced WebSocket: Connection quality degraded, reconnecting...');
          this.handleDisconnect('poor_connection');
        } else if (connectionQuality < 0.1) { // 10% chance of latency spike
          console.log('📡 Enhanced WebSocket: High latency detected');
          this.emit('connection:latency', { latency: 'high' });
        } else {
          // Normal heartbeat
          this.emit('heartbeat', { 
            timestamp: new Date().toISOString(),
            quality: connectionQuality > 0.8 ? 'excellent' : 'good'
          });
        }
      }
    }, 25000); // Every 25 seconds
  }

  private startEnhancedSimulation() {
    // Enhanced simulation with realistic business events
    this.simulationInterval = setInterval(() => {
      if (this.connected && this.subscriptions.size > 0) {
        this.generateRealisticEvents();
      }
    }, 8000); // Every 8 seconds
  }

  private generateRealisticEvents() {
    const eventScenarios = [
      // High-frequency events for different roles
      () => {
        if (this.subscriptions.has('SATPAM')) {
          this.pushData('gate_vehicle_entry', {
            vehicleId: `B ${Math.floor(Math.random() * 9000) + 1000} XYZ`,
            driverName: `Driver ${Math.floor(Math.random() * 50) + 1}`,
            timestamp: new Date().toISOString(),
            checkpointId: 'GATE_01'
          }, ['WEB_DASHBOARD', 'SATPAM', 'GATE_CHECK']);
        }
      },
      
      () => {
        if (this.subscriptions.has('ASISTEN')) {
          this.pushData('harvest_approval_request', {
            harvestId: `HST-${Date.now()}`,
            mandorId: `mandor-${Math.floor(Math.random() * 10) + 1}`,
            blockId: `BLK-${Math.floor(Math.random() * 20) + 1}`,
            quantity: Math.floor(Math.random() * 500) + 100,
            submittedAt: new Date().toISOString()
          }, ['WEB_DASHBOARD', 'ASISTEN', 'APPROVAL_WORKFLOW']);
        }
      },
      
      () => {
        if (this.subscriptions.has('MANAGER')) {
          this.pushData('estate_production_update', {
            estateId: `EST-${Math.floor(Math.random() * 5) + 1}`,
            dailyProduction: Math.floor(Math.random() * 1000) + 500,
            targetAchievement: Math.floor(Math.random() * 30) + 70,
            activeBlocks: Math.floor(Math.random() * 10) + 15,
            timestamp: new Date().toISOString()
          }, ['WEB_DASHBOARD', 'MANAGER', 'ESTATE_MANAGEMENT']);
        }
      },
      
      () => {
        // System-wide events
        this.pushData('system_health_update', {
          cpu: Math.floor(Math.random() * 30) + 20,
          memory: Math.floor(Math.random() * 40) + 30,
          activeUsers: Math.floor(Math.random() * 20) + 50,
          apiResponseTime: Math.floor(Math.random() * 200) + 100,
          timestamp: new Date().toISOString()
        }, ['WEB_DASHBOARD']);
      }
    ];

    // Execute 1-2 random scenarios
    const scenariosToRun = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < scenariosToRun; i++) {
      const scenario = eventScenarios[Math.floor(Math.random() * eventScenarios.length)];
      scenario();
    }
  }

  private handleDisconnect(reason?: string) {
    const wasConnected = this.connected;
    this.connected = false;
    this.notifyConnectionState('reconnecting');
    
    if (wasConnected) {
      console.log(`📡 Enhanced WebSocket: Connection lost - ${reason || 'unknown'}`);
      this.emit('disconnect', { reason });
    }
    
    this.attemptReconnect();
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Enhanced WebSocket: Max reconnection attempts reached');
      this.notifyConnectionState('failed');
      this.emit('connection:failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );
    
    console.log(`🔄 Enhanced WebSocket: Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.connected) {
        this.connect();
      }
    }, delay);
  }

  // Public getters
  get isConnected() {
    return this.connected;
  }

  get connectionAttempts() {
    return this.reconnectAttempts;
  }

  get activeSubscriptions() {
    return Array.from(this.subscriptions);
  }

  get cachedData() {
    return { ...this.dataCache };
  }

  // Data consistency helpers
  getCachedData(key: string) {
    return this.dataCache[key] || null;
  }

  clearCache() {
    this.dataCache = {};
    console.log('🧹 Enhanced WebSocket: Cache cleared');
  }

  // Connection health check
  healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.connected) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => resolve(false), 5000);
      
      const handlePong = () => {
        clearTimeout(timeout);
        this.off('pong', handlePong);
        resolve(true);
      };

      this.on('pong', handlePong);
      this.emit('ping');
      
      // Simulate pong response
      setTimeout(() => this.emit('pong'), 100 + Math.random() * 200);
    });
  }
}

// Context Interface
interface PureWebSocketContextType {
  // Connection state
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed';
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
  lastActivity: Date | null;
  reconnectionAttempts: number;
  
  // Socket instance
  socket: EnhancedWebSocket | null;
  
  // Subscription management
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  activeSubscriptions: string[];
  
  // Data management
  pushUpdate: (type: string, data: any, channels?: string[]) => void;
  getCachedData: (key: string) => any;
  clearCache: () => void;
  
  // Connection control
  forceReconnect: () => void;
  healthCheck: () => Promise<boolean>;
  
  // Statistics
  getConnectionStats: () => {
    uptime: number;
    reconnections: number;
    messagesReceived: number;
    activeChannels: number;
  };
}

const PureWebSocketContext = createContext<PureWebSocketContextType>({
  isConnected: false,
  connectionState: 'disconnected',
  connectionQuality: 'unknown',
  lastActivity: null,
  reconnectionAttempts: 0,
  socket: null,
  subscribe: () => {},
  unsubscribe: () => {},
  activeSubscriptions: [],
  pushUpdate: () => {},
  getCachedData: () => null,
  clearCache: () => {},
  forceReconnect: () => {},
  healthCheck: () => Promise.resolve(false),
  getConnectionStats: () => ({ uptime: 0, reconnections: 0, messagesReceived: 0, activeChannels: 0 })
});

export const usePureWebSocket = () => {
  const context = useContext(PureWebSocketContext);
  if (!context) {
    throw new Error('usePureWebSocket must be used within a PureWebSocketProvider');
  }
  return context;
};

export function PureWebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'>('disconnected');
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const [messagesReceived, setMessagesReceived] = useState(0);
  
  const socketRef = useRef<EnhancedWebSocket | null>(null);
  const startTimeRef = useRef<Date>(new Date());

  // Connection event handlers
  const handleConnect = useCallback(() => {
    setIsConnected(true);
    setConnectionState('connected');
    setLastActivity(new Date());
    setReconnectionAttempts(0);
    console.log('🚀 Pure WebSocket: Connected successfully');
  }, []);

  const handleDisconnect = useCallback((event: any) => {
    setIsConnected(false);
    setConnectionState(event?.reason === 'poor_connection' ? 'reconnecting' : 'disconnected');
    console.log('📡 Pure WebSocket: Disconnected -', event?.reason || 'Unknown reason');
  }, []);

  const handleConnectionState = useCallback((state: string) => {
    setConnectionState(state as any);
    if (state === 'reconnecting') {
      setReconnectionAttempts(prev => prev + 1);
    }
  }, []);

  const handleHeartbeat = useCallback((data: any) => {
    setLastActivity(new Date());
    setConnectionQuality(data?.quality || 'good');
  }, []);

  const handleDataUpdate = useCallback((data: any) => {
    setLastActivity(new Date());
    setMessagesReceived(prev => prev + 1);
  }, []);

  // Connection management functions
  const subscribe = useCallback((channels: string[]) => {
    if (socketRef.current) {
      socketRef.current.subscribe(channels);
    }
  }, []);

  const unsubscribe = useCallback((channels: string[]) => {
    if (socketRef.current) {
      socketRef.current.unsubscribe(channels);
    }
  }, []);

  const pushUpdate = useCallback((type: string, data: any, channels?: string[]) => {
    if (socketRef.current) {
      socketRef.current.pushData(type, data, channels);
    }
  }, []);

  const getCachedData = useCallback((key: string) => {
    return socketRef.current?.getCachedData(key) || null;
  }, []);

  const clearCache = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.clearCache();
    }
  }, []);

  const forceReconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect('manual_reconnect');
      setTimeout(() => socketRef.current?.connect(), 1000);
    }
  }, []);

  const healthCheck = useCallback(() => {
    return socketRef.current?.healthCheck() || Promise.resolve(false);
  }, []);

  const getConnectionStats = useCallback(() => {
    const uptime = Date.now() - startTimeRef.current.getTime();
    return {
      uptime: Math.floor(uptime / 1000), // seconds
      reconnections: reconnectionAttempts,
      messagesReceived,
      activeChannels: socketRef.current?.activeSubscriptions.length || 0
    };
  }, [reconnectionAttempts, messagesReceived]);

  // Initialize socket connection
  useEffect(() => {
    console.log('🔌 Pure WebSocket: Initializing enhanced WebSocket provider...');
    
    const socket = new EnhancedWebSocket();
    socketRef.current = socket;
    startTimeRef.current = new Date();
    
    // Set up enhanced event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('heartbeat', handleHeartbeat);
    socket.onConnectionStateChange(handleConnectionState);
    
    // Listen for all data events
    const dataEventTypes = [
      'data:gate_vehicle_entry',
      'data:harvest_approval_request', 
      'data:estate_production_update',
      'data:system_health_update',
      'data:company_admin_initial',
      'data:satpam_initial',
      'data:asisten_initial'
    ];
    
    dataEventTypes.forEach(eventType => {
      socket.on(eventType, handleDataUpdate);
    });

    // Start connection
    setConnectionState('connecting');
    socket.connect();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Pure WebSocket: Cleaning up provider...');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('heartbeat', handleHeartbeat);
      dataEventTypes.forEach(eventType => {
        socket.off(eventType, handleDataUpdate);
      });
      socket.disconnect('component_unmount');
      socketRef.current = null;
    };
  }, [handleConnect, handleDisconnect, handleHeartbeat, handleConnectionState, handleDataUpdate]);

  // Memoized context value for performance
  const contextValue = useMemo<PureWebSocketContextType>(() => ({
    isConnected,
    connectionState,
    connectionQuality,
    lastActivity,
    reconnectionAttempts,
    socket: socketRef.current,
    subscribe,
    unsubscribe,
    activeSubscriptions: socketRef.current?.activeSubscriptions || [],
    pushUpdate,
    getCachedData,
    clearCache,
    forceReconnect,
    healthCheck,
    getConnectionStats
  }), [
    isConnected,
    connectionState, 
    connectionQuality,
    lastActivity,
    reconnectionAttempts,
    subscribe,
    unsubscribe,
    pushUpdate,
    getCachedData,
    clearCache,
    forceReconnect,
    healthCheck,
    getConnectionStats
  ]);

  return (
    <PureWebSocketContext.Provider value={contextValue}>
      {children}
    </PureWebSocketContext.Provider>
  );
}