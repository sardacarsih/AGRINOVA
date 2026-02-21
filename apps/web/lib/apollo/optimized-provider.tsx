'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { optimizedApolloClient, trackGraphQLPerformance } from './optimized-client';
import { performance } from '../performance/perf-monitor';

// WebSocket connection states
type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

interface WebSocketContextType {
  state: WebSocketState;
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  lastConnected: number | null;
  reconnect: () => void;
  disconnect: () => void;
}

const WebSocketContext = React.createContext<WebSocketContextType>({
  state: 'disconnected',
  isConnected: false,
  connectionError: null,
  reconnectAttempts: 0,
  lastConnected: null,
  reconnect: () => {},
  disconnect: () => {},
});

// WebSocket connection manager with performance optimization
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private subscribers: Set<(state: WebSocketState, error?: string) => void> = new Set();

  private state: WebSocketState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval = 30000; // 30 seconds
  private lastConnected: number | null = null;

  constructor(private url: string) {}

  // Subscribe to state changes
  subscribe(callback: (state: WebSocketState, error?: string) => void) {
    this.subscribers.add(callback);
    callback(this.state);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Notify all subscribers of state changes
  private notify(error?: string) {
    this.subscribers.forEach(callback => callback(this.state, error));
  }

  // Connect to WebSocket
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.state = 'connecting';
    this.notify();

    const connectTimer = performance.startTimer('websocket.connect');

    try {
      this.ws = new WebSocket(this.url);

      // Connection opened
      this.ws.onopen = () => {
        connectTimer();
        this.state = 'connected';
        this.reconnectAttempts = 0;
        this.lastConnected = Date.now();

        performance.recordMetric('websocket.connected', 1, {
          connection_time: connectTimer().toString(),
          reconnect_attempts: this.reconnectAttempts.toString(),
        });

        console.log('✅ WebSocket connected');
        this.notify();

        // Send queued messages
        this.flushMessageQueue();

        // Start heartbeat
        this.startHeartbeat();
      };

      // Connection closed
      this.ws.onclose = (event) => {
        connectTimer();
        this.state = 'disconnected';

        performance.recordMetric('websocket.disconnected', 1, {
          code: event.code.toString(),
          reason: event.reason || 'unknown',
        });

        console.log(`❌ WebSocket disconnected: ${event.code} - ${event.reason}`);
        this.notify();

        this.stopHeartbeat();

        // Attempt reconnection if not intentional
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      // Connection error
      this.ws.onerror = (error) => {
        connectTimer();
        this.state = 'error';

        performance.recordMetric('websocket.error', 1, {
          error_type: error?.toString() || 'unknown',
        });

        console.error('❌ WebSocket error:', error);
        this.notify(error?.toString() || 'Unknown error');
      };

      // Message received
      this.ws.onmessage = (event) => {
        const receiveTimer = performance.startTimer('websocket.message.receive');

        try {
          const data = JSON.parse(event.data);

          // Track message metrics
          performance.recordMetric('websocket.message.received', 1, {
            message_type: data.type || 'unknown',
            message_size: event.data.length.toString(),
          });

          // Handle different message types
          this.handleMessage(data);

          receiveTimer();
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          performance.recordMetric('websocket.message.parse_error', 1);
        }
      };

    } catch (error) {
      connectTimer();
      this.state = 'error';

      performance.recordMetric('websocket.connect.error', 1, {
        error_type: (error as Error).name,
      });

      console.error('Failed to create WebSocket connection:', error);
      this.notify((error as Error).message);
    }
  }

  // Disconnect from WebSocket
  disconnect() {
    this.clearReconnectTimer();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Intentional disconnect');
      this.ws = null;
    }

    this.state = 'disconnected';
    this.messageQueue = [];
    this.notify();
  }

  // Reconnect to WebSocket
  reconnect() {
    this.disconnect();
    this.connect();
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect() {
    this.clearReconnectTimer();

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.state = 'reconnecting';
    this.notify();

    console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    performance.recordMetric('websocket.reconnect.scheduled', 1, {
      delay: delay.toString(),
      attempt: (this.reconnectAttempts + 1).toString(),
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  // Clear reconnection timer
  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Start heartbeat to keep connection alive
  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const sendTimer = performance.startTimer('websocket.heartbeat.send');

        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

        sendTimer();
        performance.recordMetric('websocket.heartbeat.sent', 1);
      } else {
        this.stopHeartbeat();
      }
    }, this.heartbeatInterval);
  }

  // Stop heartbeat
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Send message
  send(message: any) {
    const sendTimer = performance.startTimer('websocket.message.send');

    if (this.ws?.readyState === WebSocket.OPEN) {
      const data = JSON.stringify(message);

      try {
        this.ws.send(data);

        sendTimer();
        performance.recordMetric('websocket.message.sent', 1, {
          message_type: message.type || 'unknown',
          message_size: data.length.toString(),
        });

        console.log('📤 WebSocket message sent:', message.type);
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        performance.recordMetric('websocket.message.send_error', 1);
      }
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
      performance.recordMetric('websocket.message.queued', 1, {
        queue_size: this.messageQueue.length.toString(),
      });
    }
  }

  // Send all queued messages
  private flushMessageQueue() {
    if (this.messageQueue.length > 0) {
      performance.recordMetric('websocket.queue.flush', 1, {
        queue_size: this.messageQueue.length.toString(),
      });

      console.log(`📤 Flushing ${this.messageQueue.length} queued messages`);

      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        this.send(message);
      }
    }
  }

  // Handle incoming messages
  private handleMessage(data: any) {
    switch (data.type) {
      case 'pong':
        performance.recordMetric('websocket.heartbeat.received', 1);
        break;

      case 'error':
        console.error('WebSocket error from server:', data.message);
        break;

      case 'subscription_update':
        // Handle GraphQL subscription updates
        performance.recordMetric('graphql.subscription.update', 1, {
          subscription_type: data.subscriptionType || 'unknown',
        });
        break;

      default:
        console.log('📥 WebSocket message received:', data.type);
        break;
    }
  }

  // Get connection status
  getStatus() {
    return {
      state: this.state,
      isConnected: this.state === 'connected',
      reconnectAttempts: this.reconnectAttempts,
      lastConnected: this.lastConnected,
      queueSize: this.messageQueue.length,
    };
  }

  // Cleanup
  cleanup() {
    this.disconnect();
    this.subscribers.clear();
  }
}

// WebSocket Provider Component
interface WebSocketProviderProps {
  url?: string;
  children: React.ReactNode;
}

const WebSocketProvider = memo(({
  url = process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:8080/ws',
  children
}: WebSocketProviderProps) => {
  const managerRef = useRef<WebSocketManager | null>(null);
  const [state, setState] = useState<WebSocketState>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastConnected, setLastConnected] = useState<number | null>(null);

  // Initialize WebSocket manager
  useEffect(() => {
    const manager = new WebSocketManager(url);
    managerRef.current = manager;

    // Subscribe to state changes
    const unsubscribe = manager.subscribe((newState, error) => {
      setState(newState);
      setConnectionError(error || null);

      const status = manager.getStatus();
      setReconnectAttempts(status.reconnectAttempts);
      setLastConnected(status.lastConnected);
    });

    // Start connection
    manager.connect();

    return () => {
      unsubscribe();
      manager.cleanup();
    };
  }, [url]);

  // Connection handlers
  const reconnect = useCallback(() => {
    managerRef.current?.reconnect();
  }, []);

  const disconnect = useCallback(() => {
    managerRef.current?.disconnect();
  }, []);

  const contextValue: WebSocketContextType = {
    state,
    isConnected: state === 'connected',
    connectionError,
    reconnectAttempts,
    lastConnected,
    reconnect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
});

WebSocketProvider.displayName = 'WebSocketProvider';

// Custom hook for WebSocket status
export const useWebSocket = () => {
  const context = React.useContext(WebSocketContext);

  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }

  return context;
};

// GraphQL subscription hook with performance tracking
export const useGraphQLSubscription = (
  subscriptionQuery: any,
  variables?: any
) => {
  const { isConnected } = useWebSocket();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Track subscription lifecycle
  useEffect(() => {
    if (isConnected) {
      const tracker = trackGraphQLPerformance.trackSubscription(
        subscriptionQuery.definitions?.[0]?.name?.value || 'Unknown'
      );

      setLoading(true);
      setError(null);

      // Subscribe to GraphQL updates
      const subscription = optimizedApolloClient.subscribe({
        query: subscriptionQuery,
        variables,
      }).subscribe({
        next: (result) => {
          tracker.message(result.data);
          setData(result.data);
          setLoading(false);
        },
        error: (err) => {
          tracker.error(err);
          setError(err);
          setLoading(false);
        },
        complete: () => {
          setLoading(false);
        },
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [subscriptionQuery, variables, isConnected]);

  return { data, loading, error };
};

// Optimized GraphQL Provider
interface OptimizedGraphQLProviderProps {
  children: React.ReactNode;
  wsUrl?: string;
}

const OptimizedGraphQLProvider = memo(({
  children,
  wsUrl
}: OptimizedGraphQLProviderProps) => {
  // Track provider performance
  useEffect(() => {
    const timer = performance.startTimer('graphql.provider.mount');

    return () => {
      timer();
      performance.recordMetric('graphql.provider.unmount', 1);
    };
  }, []);

  return (
    <ApolloProvider client={optimizedApolloClient}>
      <WebSocketProvider url={wsUrl}>
        {children}
      </WebSocketProvider>
    </ApolloProvider>
  );
});

OptimizedGraphQLProvider.displayName = 'OptimizedGraphQLProvider';

export default OptimizedGraphQLProvider;
export { WebSocketProvider, WebSocketContext };