import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { createWebSocketLink, createSplitLink } from './websocket';

const LOGOUT_IN_PROGRESS_KEY = 'agrinova_logout_in_progress';
const LOGOUT_MARKER_KEY = 'agrinova_logged_out';
const LOGOUT_RECENT_TS_KEY = 'agrinova_logged_out_at';
const LOGOUT_MARKER_TTL_MS = 15_000;
const unsupportedSubscriptionLogCache = new Set<string>();

const isAuthGraphQLError = (error: { message?: string; extensions?: Record<string, unknown> }) => {
  const message = (error.message || '').toLowerCase();
  const code = String(error.extensions?.code || '').toUpperCase();
  return (
    code === 'UNAUTHENTICATED' ||
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('no token') ||
    message.includes('session not found')
  );
};

const isExpectedLoginFailureError = (
  operationName: string | undefined,
  error: { message?: string; extensions?: Record<string, unknown> }
) => {
  if ((operationName || '').toLowerCase() !== 'weblogin') {
    return false;
  }

  const message = (error.message || '').toLowerCase();
  const code = String(error.extensions?.code || '').toUpperCase();

  return (
    code === 'INVALID_CREDENTIALS' ||
    code === 'UNAUTHENTICATED' ||
    message.includes('invalid username or password') ||
    message.includes('invalid credentials') ||
    message.includes('username or password') ||
    message.includes('kredensial') ||
    message.includes('password')
  );
};

const getPathHead = (path?: ReadonlyArray<string | number> | string): string => {
  if (!path) return '';
  if (Array.isArray(path)) {
    const first = path[0];
    return typeof first === 'string' ? first : '';
  }
  return typeof path === 'string' ? path : '';
};

const isExpectedDeleteDependencyError = (error: {
  message?: string;
  path?: ReadonlyArray<string | number> | string;
  extensions?: Record<string, unknown>;
}) => {
  const message = (error.message || '').toLowerCase();
  const code = String(error.extensions?.code || '').toUpperCase();
  const pathHead = getPathHead(error.path).toLowerCase();

  const isDeletePath = pathHead.startsWith('delete');
  const hasDependencyCode = code === 'DEPENDENCY_EXISTS';
  const hasDependencyMessage =
    message.includes('dependency') ||
    message.includes('dependencies') ||
    message.includes('tidak dapat dihapus') ||
    message.includes('masih memiliki') ||
    message.includes('still used') ||
    message.includes('foreign key') ||
    message.includes('constraint');

  return isDeletePath && (hasDependencyCode || hasDependencyMessage);
};

const isSubscriptionOperation = (operation: { query?: { definitions?: ReadonlyArray<{ kind?: string; operation?: string }> } }) => {
  const definitions = operation.query?.definitions;
  if (!Array.isArray(definitions)) {
    return false;
  }

  return definitions.some(
    (definition) =>
      definition?.kind === 'OperationDefinition' &&
      definition?.operation === 'subscription'
  );
};

const isSubscriptionNotImplementedGraphQLError = (
  error: { message?: string; extensions?: Record<string, unknown> },
  operation: { query?: { definitions?: ReadonlyArray<{ kind?: string; operation?: string }> } }
) => {
  const message = (error.message || '').toLowerCase();
  const code = String(error.extensions?.code || '').toUpperCase();

  const isUnsupportedSubscriptionMessage =
    message.includes('subscriptions not implemented') ||
    message.includes('subscription not implemented') ||
    code === 'SUBSCRIPTIONS_NOT_IMPLEMENTED';

  return isUnsupportedSubscriptionMessage && isSubscriptionOperation(operation);
};

const isLogoutTransitionActive = (): boolean => {
  if (typeof window === 'undefined') return false;

  const logoutInProgress = sessionStorage.getItem(LOGOUT_IN_PROGRESS_KEY) === 'true';
  const logoutMarker = sessionStorage.getItem(LOGOUT_MARKER_KEY) === 'true';
  const logoutTsRaw = sessionStorage.getItem(LOGOUT_RECENT_TS_KEY);
  const logoutTs = logoutTsRaw ? Number(logoutTsRaw) : NaN;
  const isRecentLogout = Number.isFinite(logoutTs) && Date.now() - logoutTs <= LOGOUT_MARKER_TTL_MS;

  return logoutInProgress || logoutMarker || isRecentLogout;
};

const isIntentionalLogoutOperation = (operationName?: string): boolean => {
  if (!operationName) return false;
  return operationName === 'Logout' || operationName === 'LogoutAllDevices';
};

// Determine GraphQL endpoint
// CRITICAL FIX: Always use the Next.js API proxy in browser to ensure cookies work correctly
const getGraphQLUri = () => {
  // Browser requests must go through Next.js proxy so Set-Cookie is same-origin.
  if (typeof window !== 'undefined') {
    return '/api/graphql';
  }

  // Server-side fallback (primarily for tests/non-browser usage).
  return process.env.BACKEND_GRAPHQL_URL || 'http://127.0.0.1:8080/graphql';
};

console.log('[Apollo Client] Using GraphQL endpoint:', getGraphQLUri());

// HTTP Link for GraphQL requests
const httpLink = createHttpLink({
  uri: getGraphQLUri(),
  credentials: 'include', // Include cookies for authentication
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// WebSocket Link for GraphQL subscriptions
const wsLink = createWebSocketLink();

// CRITICAL FIX: Remove localStorage token mixing for web authentication
// Web should use only cookies, not localStorage tokens
const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      'content-type': 'application/json',
    },
  };
});

// Error link for global error handling
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  void forward;

  const operationName = operation.operationName;
  const suppressAuthNoise =
    isIntentionalLogoutOperation(operationName) || isLogoutTransitionActive();

  console.log('[Apollo Error Link] Error details:', {
    graphQLErrors,
    networkError,
    operation: operationName,
    variables: operation.variables,
  });

  if (graphQLErrors) {
    const hasAuthError = graphQLErrors.some(
      (err) => isAuthGraphQLError(err) || isExpectedLoginFailureError(operationName, err)
    );
    if (!(suppressAuthNoise && hasAuthError)) {
      graphQLErrors.forEach(({ message, locations, path, extensions }) => {
        const errorDetails = {
          message,
          locations,
          path,
          extensions,
        };

        if (isExpectedDeleteDependencyError({ message, path, extensions })) {
          console.warn('[Apollo GraphQL Warning] Expected delete validation error:', errorDetails);
        } else if (isExpectedLoginFailureError(operationName, { message, extensions })) {
          console.info('[Apollo Auth Info] Expected login failure:', errorDetails);
        } else if (isSubscriptionNotImplementedGraphQLError({ message, extensions }, operation)) {
          const normalizedPath = Array.isArray(path) ? path.join('.') : String(path || '');
          const dedupeKey = `${operationName || 'unknown'}|${normalizedPath}|${message}`;

          if (!unsupportedSubscriptionLogCache.has(dedupeKey)) {
            unsupportedSubscriptionLogCache.add(dedupeKey);
            console.info('[Apollo Subscription Info] Subscription not available, fallback flow should handle updates.', {
              operation: operationName,
              path,
              message,
            });
          }
        } else {
          console.error(
            `[Apollo GraphQL Error] Message: ${message}, Location: ${locations}, Path: ${path}, Extensions:`,
            extensions
          );
        }
      });
    }
  }

  if (networkError) {
    // Handle authentication errors
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      if (suppressAuthNoise) {
        console.info('[Apollo Auth Error] Suppressed 401 during logout transition');
        return;
      }

      console.warn('[Apollo Auth Error] Authentication failed - redirecting to login');
      // For web authentication with cookies, just redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return;
    }

    console.error('[Apollo Network Error]', networkError);

    // Log network error details
    if ('result' in networkError) {
      console.error('[Apollo Network Error Result]', networkError.result);
    }
    if ('statusCode' in networkError) {
      console.error('[Apollo Network Error Status]', networkError.statusCode);
    }
  }
});

// Create split link for HTTP and WebSocket
const httpWithAuth = authLink.concat(httpLink);
const splitLink = createSplitLink(httpWithAuth, wsLink);

// Combine all links
const link = from([errorLink, splitLink]);

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      // Add type policies for better caching if needed
      User: {
        keyFields: ['id'],
      },
      Company: {
        keyFields: ['id'],
      },
      Estate: {
        keyFields: ['id'],
      },
      Division: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

// Update authentication token (for compatibility - web uses cookies)
export const updateAuthToken = (_token: string) => {
  // For web applications, tokens are managed via HTTP-only cookies
  // This function is kept for compatibility with existing code
  console.log('[Apollo Client] Token update requested - using cookie-based auth');
};

// Clear authentication cookies for logout
export const clearAuthToken = () => {
  if (typeof window !== 'undefined') {
    // Clear all auth-related cookies by setting them to expire
    const cookies = ['access_token', 'refresh_token', 'session_id', 'auth_token'];
    cookies.forEach((cookie) => {
      document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });

    // Clear Apollo cache
    apolloClient.clearStore();
  }
};

// CRITICAL FIX: Web authentication uses cookies only - localStorage helpers for compatibility
// Authentication is handled via HTTP-only cookies set by the backend
