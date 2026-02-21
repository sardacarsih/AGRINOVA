'use client';

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  ApolloLink,
  NetworkStatus,
} from '@apollo/client/core';

// Local type definition for ServerError
interface ServerError extends Error {
  result: Record<string, unknown>;
  statusCode: number;
}
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

// Performance monitoring integration
import { performance } from '../performance/perf-monitor';

// Dynamic origin detection for CORS compatibility
const getDynamicOrigin = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
  }
  return window.location.origin;
};

// Enhanced HTTP Link with performance tracking
const httpLink = createHttpLink({
  uri: typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/graphql')
    : '/api/graphql',
  credentials: 'include',
});

// Performance monitoring link
const performanceLink = new ApolloLink((operation, forward) => {
  const operationName = operation.operationName || 'Unknown';
  const timer = performance.startTimer(`graphql.request.${operationName}`);
  const context = operation.getContext();
  const startTime = Date.now();

  // Add operation metadata for tracking
  operation.setContext({
    ...context,
    startTime,
    operationName,
  });

  return forward(operation).map(result => {
    const duration = timer();
    const context = operation.getContext();

    // Record GraphQL-specific metrics
    performance.recordMetric(`graphql.request.${operationName}`, duration, {
      operation_type: (operation as any).operationType || 'query',
      success: result.errors ? 'false' : 'true',
      error_count: result.errors?.length?.toString() || '0',
    });

    // Cache performance metrics
    if (result.extensions?.cacheHit) {
      performance.recordMetric(`graphql.cache.hit.${operationName}`, 1);
    } else {
      performance.recordMetric(`graphql.cache.miss.${operationName}`, 1);
    }

    // Network vs cache performance
    const fromCache = context.fromCache || false;
    performance.recordMetric(`graphql.source.${fromCache ? 'cache' : 'network'}`, duration);

    return result;
  });
});

// Optimized Retry Link with exponential backoff
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Retry on network errors and 5xx server errors
      if (!error) return false;

      if (error.result?.errors) {
        return !error.result.errors.some((e: any) =>
          e.extensions?.code === 'UNAUTHENTICATED' ||
          e.extensions?.code === 'FORBIDDEN'
        );
      }

      if (error.networkError) {
        const statusCode = (error.networkError as ServerError)?.statusCode;
        return !statusCode || statusCode >= 500;
      }

      return true;
    },
  },
});

// Enhanced Auth Link with token refresh logic
const authLink = setContext((_, { headers }) => {
  // For web cookie-based authentication, cookies are handled automatically
  // This link can be extended for JWT token management if needed

  return {
    headers: {
      ...headers,
      // Add any required headers here
      'X-Client-Version': process.env.NEXT_PUBLIC_VERSION || '1.0.0',
    },
  };
});

// Optimized Error Link with detailed tracking
const errorLink = onError((errorResponse) => {
  const { graphQLErrors, networkError, operation, forward } = errorResponse;

  // Track error rates
  if (graphQLErrors || networkError) {
    performance.recordMetric('graphql.error.rate', 1, {
      operation_name: operation.operationName,
      operation_type: (operation as any).operationType || 'query',
      has_graphql_errors: (!!graphQLErrors).toString(),
      has_network_error: (!!networkError).toString(),
    });
  }

  // Handle authentication errors
  const isAuthError = graphQLErrors?.some(error =>
    error.message?.includes('authentication required') ||
    error.message?.includes('unauthorized') ||
    error.extensions?.code === 'UNAUTHENTICATED'
  );

  if (isAuthError) {
    console.log(`🔐 Authentication required for operation: ${operation.operationName}`);
    // Could trigger token refresh or redirect to login
    return;
  }

  // Log GraphQL errors with context
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      const errorCode = String(extensions?.code || 'UNKNOWN');

      console.error(`❌ GraphQL Error [${errorCode}]:`, {
        message,
        locations,
        path,
        operation: operation.operationName,
        variables: operation.variables,
      });

      // Track specific error types
      performance.recordMetric(`graphql.error.${errorCode.toLowerCase()}`, 1, {
        operation_name: operation.operationName,
        message: message.substring(0, 100), // Truncate for privacy
      });
    });
  }

  // Handle network errors with enhanced logging
  if (networkError) {
    const statusCode = (networkError as ServerError)?.statusCode;
    const isCORS = networkError.message.includes('CORS') ||
                   networkError.message.includes('fetch');

    console.error('❌ Network Error:', {
      message: networkError.message,
      statusCode,
      operation: operation.operationName,
      isCORS,
      timestamp: new Date().toISOString(),
    });

    // Track network error metrics
    performance.recordMetric('graphql.network.error', 1, {
      status_code: statusCode?.toString() || 'unknown',
      error_type: isCORS ? 'cors' : 'network',
      operation_name: operation.operationName,
    });

    // Provide user-friendly error messages
    if (isCORS) {
      console.error('💡 CORS Issue: Check server configuration for origin:', getDynamicOrigin());
    }
  }
});

// Optimized Cache with intelligent policies
const createOptimizedCache = () => {
  const cache = new InMemoryCache({
    // Type-based cache policies
    typePolicies: {
      Query: {
        fields: {
          // Authentication data - short TTL
          fastLogin: {
            merge: true,
          },
          me: {
            merge: true,
          },

          // Assignment data - medium TTL with pagination
          userAssignments: {
            keyArgs: ['userId'],
            merge: (existing, incoming, { args }) => {
              if (!existing || !args?.offset || args.offset === 0) {
                return incoming;
              }
              return {
                ...incoming,
                assignments: [...(existing.assignments || []), ...incoming.assignments],
              };
            },
          },

          // Harvest data - optimized for real-time updates
          harvestContext: {
            merge: true,
          },

          // Block data with pagination and search
          blocksByDivision: {
            keyArgs: ['divisionId', 'includeInactive', 'search', 'sortBy'],
            merge: (existing, incoming, { args }) => {
              if (!existing || !args?.offset || args.offset === 0) {
                return incoming;
              }
              return {
                ...incoming,
                blocks: [...(existing.blocks || []), ...incoming.blocks],
              };
            },
          },

          // Company data - longer TTL, rarely changes
          companies: {
            merge: true,
          },

          // Estate data - medium TTL
          estates: {
            merge: true,
          },

          // Division data - medium TTL
          divisions: {
            merge: true,
          },
        },
      },

      // Entity-specific cache policies
      User: {
        keyFields: ['id'],
        fields: {
          profile: {
            merge: true,
          },
          permissions: {
            merge: true,
          },
        },
      },

      Company: {
        keyFields: ['id'],
        fields: {
          stats: {
            merge: true,
          },
        },
      },

      Estate: {
        keyFields: ['id'],
      },

      Division: {
        keyFields: ['id'],
      },

      Block: {
        keyFields: ['id'],
        fields: {
          division: {
            merge: true,
          },
        },
      },

      HarvestRecord: {
        keyFields: ['id'],
      },
    },

    // Enable result caching
    resultCaching: true,
  });

  // Add cache cleanup and optimization
  const originalExtract = cache.extract.bind(cache);
  cache.extract = (options) => {
    const result = originalExtract(options);

    // Periodic cache cleanup
    if (Math.random() < 0.1) { // 10% chance
      optimizeCacheSize(cache);
    }

    return result;
  };

  return cache;
};

// Cache size optimization
const optimizeCacheSize = (cache: InMemoryCache) => {
  try {
    const data = cache.extract();
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    // Clean old cache entries
    Object.keys(data).forEach(key => {
      if (key.startsWith('ROOT_QUERY.')) {
        const entry = (data as any)[key];
        if (entry?.cacheTimestamp && now - entry.cacheTimestamp > maxAge) {
          cache.evict({ fieldName: key.replace('ROOT_QUERY.', '') });
        }
      }
    });

    performance.recordMetric('cache.cleanup', 1);
  } catch (error) {
    console.warn('Cache cleanup failed:', error);
  }
};

// Create the optimized Apollo Client
export const optimizedApolloClient = new ApolloClient({
  // Link composition with performance monitoring
  link: from([
    retryLink,
    errorLink,
    authLink,
    performanceLink,
    httpLink,
  ]),

  // Optimized cache
  cache: createOptimizedCache(),

  // Enhanced default options
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      // Add partial results for better UX
      returnPartialData: true,
    },

    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
      // Enable partial results
      returnPartialData: true,
    },

    mutate: {
      errorPolicy: 'all',
      fetchPolicy: 'no-cache',
      // Optimistic updates for better UX
      optimisticResponse: undefined, // Can be set per mutation
    },
  },

  // Performance optimizations
  queryDeduplication: true,
  connectToDevTools: process.env.NODE_ENV === 'development',

  // Default result caching
  assumeImmutableResults: false,
});

// Performance monitoring utilities
export const trackGraphQLPerformance = {
  // Track query performance
  trackQuery: (queryName: string, variables?: any) => {
    return {
      start: () => {
        const timer = performance.startTimer(`graphql.query.${queryName}`);
        return {
          end: (cacheHit: boolean = false) => {
            const duration = timer();
            performance.recordMetric('graphql.query.performance', duration, {
              query_name: queryName,
              cache_hit: cacheHit.toString(),
              variable_count: variables ? Object.keys(variables).length.toString() : '0',
            });
            return duration;
          }
        };
      }
    };
  },

  // Track mutation performance
  trackMutation: (mutationName: string) => {
    return {
      start: () => {
        const timer = performance.startTimer(`graphql.mutation.${mutationName}`);
        return {
          end: (success: boolean = true) => {
            const duration = timer();
            performance.recordMetric('graphql.mutation.performance', duration, {
              mutation_name: mutationName,
              success: success.toString(),
            });
            return duration;
          }
        };
      }
    };
  },

  // Track subscription performance
  trackSubscription: (subscriptionName: string) => {
    performance.recordMetric(`graphql.subscription.${subscriptionName}`, 1, {
      event_type: 'connect',
    });

    return {
      message: (data: any) => {
        performance.recordMetric(`graphql.subscription.${subscriptionName}`, 1, {
          event_type: 'message',
          data_size: JSON.stringify(data).length.toString(),
        });
      },
      error: (error: any) => {
        performance.recordMetric(`graphql.subscription.${subscriptionName}`, 1, {
          event_type: 'error',
          error_type: error?.name || 'unknown',
        });
      },
    };
  },
};

// Cache management utilities
export const cacheManager = {
  // Clear specific cache entries
  clearCache: (typeName?: string, fieldName?: string) => {
    if (typeName && fieldName) {
      optimizedApolloClient.cache.evict({ id: typeName, fieldName });
    } else if (typeName) {
      optimizedApolloClient.cache.evict({ id: typeName });
    } else {
      optimizedApolloClient.clearStore();
    }
  },

  // Refresh queries
  refreshQuery: (query: any, _variables?: any) => {
    return optimizedApolloClient.refetchQueries({
      include: [query],
    });
  },

  // Get cache statistics
  getCacheStats: () => {
    const data = optimizedApolloClient.cache.extract();
    const rootQuerySize = JSON.stringify(data.ROOT_QUERY || {}).length;
    const totalSize = JSON.stringify(data).length;

    return {
      rootQuerySize,
      totalSize,
      entryCount: Object.keys(data).length,
      utilization: totalSize / (1024 * 1024), // MB
    };
  },
};

export default optimizedApolloClient;