import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient, Client } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { ApolloLink, split } from '@apollo/client/core';

// Module-level WebSocket client instance for logout handling
let wsClientInstance: Client | null = null;
let logoutListenerRegistered = false;

// Disconnect WebSocket connection (called during logout)
export const disconnectWebSocket = () => {
  if (wsClientInstance) {
    console.log('ðŸ”Œ [WebSocket] Disconnecting WebSocket due to logout...');
    wsClientInstance.terminate();
    wsClientInstance = null;
  }
};

// Create WebSocket link for GraphQL subscriptions
export const createWebSocketLink = () => {
  if (typeof window === 'undefined') {
    // Return null for SSR - subscriptions won't work on server
    return null;
  }

    // Determine WebSocket URL based on proxy configuration
  const configuredWsUrl = (process.env.NEXT_PUBLIC_WS_URL || '').trim();
  let wsUrl = configuredWsUrl || 'ws://localhost:8080/graphql';

  // If using proxy, we need to handle WebSocket connections specially
  const useProxy = process.env.NEXT_PUBLIC_USE_API_PROXY === 'true';
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  // Proxy fallback to direct :8080 should only happen in local development.
  // In production HTTPS, keep configured WSS endpoint.
  if (useProxy && isLocalhost) {
    // For WebSocket connections through Next.js proxy, we need special handling
    // Note: This requires additional server configuration or direct connection
    console.log('WebSocket proxy mode enabled for localhost:', wsUrl);

    // For local development, connect directly to backend WebSocket endpoint
    // because Next.js API routes don't support WebSocket upgrades easily
    const backendHost = 'localhost:8080';

    wsUrl = `ws://${backendHost}/graphql`;
    console.log('WebSocket fallback to direct localhost backend:', wsUrl);
  } else if (!configuredWsUrl) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    wsUrl = `${wsProtocol}://${window.location.host}/api/graphql`;
    console.log('WebSocket using default same-origin endpoint:', wsUrl);
  }

  // Create WebSocket client and store reference for logout handling
  wsClientInstance = createClient({
    url: wsUrl,
    connectionParams: () => ({}),
    shouldRetry: () => true,
    retryWait: async (retries) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    },
    on: {
      error: (error) => {
        console.error('ðŸ”Œ [WebSocket] GraphQL WebSocket error:', error);
      },
      connected: () => {
        console.log('ðŸ”Œ [WebSocket] GraphQL WebSocket connected to:', wsUrl);
      },
      closed: () => {
        console.log('ðŸ”Œ [WebSocket] GraphQL WebSocket disconnected');
      },
    },
  });

  // Register logout event listener (only once)
  if (!logoutListenerRegistered) {
    window.addEventListener('auth:logout', () => {
      console.log('ðŸ”Œ [WebSocket] Received auth:logout event, terminating connection...');
      disconnectWebSocket();
    });
    logoutListenerRegistered = true;
  }

  return new GraphQLWsLink(wsClientInstance);
};

// Create split link to route subscriptions through WebSocket and queries/mutations through HTTP
export const createSplitLink = (httpLink: ApolloLink, wsLink: ApolloLink | null) => {
  if (!wsLink) {
    // No WebSocket link available (SSR), use only HTTP
    return httpLink;
  }

  return split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    httpLink
  );
};

