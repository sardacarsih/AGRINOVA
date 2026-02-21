import { ApolloClient } from '@apollo/client/core';
import gql from 'graphql-tag';

export interface ApolloHealthStatus {
  healthy: boolean;
  endpoint?: string;
  error?: string;
  latency?: number;
}

/**
 * Check Apollo Client health by executing a simple introspection query
 * @param client - ApolloClient instance to check
 * @returns Health status with endpoint, error, and latency information
 */
export async function checkApolloHealth(
  client: ApolloClient<any>
): Promise<ApolloHealthStatus> {
  try {
    const startTime = Date.now();

    // Try to get the endpoint from the client link
    const endpoint = (client.link as any)?.options?.uri || 'unknown';

    console.log('[Apollo Health Check] Testing connection to:', endpoint);

    // Execute a simple introspection query
    const { data, errors } = await client.query({
      query: gql`{ __typename }`,
      fetchPolicy: 'network-only',
    });

    const latency = Date.now() - startTime;

    if (errors || !data) {
      console.error('[Apollo Health Check] ❌ Invalid response:', { errors, data });
      return {
        healthy: false,
        endpoint,
        error: errors?.[0]?.message || 'Invalid GraphQL response',
      };
    }

    console.log('[Apollo Health Check] ✅ Healthy', {
      endpoint,
      latency: `${latency}ms`,
      response: data
    });

    return {
      healthy: true,
      endpoint,
      latency,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Apollo Health Check] ❌ Failed:', errorMessage);

    return {
      healthy: false,
      error: errorMessage,
    };
  }
}

/**
 * Validate that Apollo Client is ready for use
 * @param client - ApolloClient instance to validate
 * @throws Error if client is not ready
 */
export async function validateApolloClient(client: ApolloClient<any>): Promise<void> {
  if (!client) {
    throw new Error('Apollo Client is not provided');
  }

  const health = await checkApolloHealth(client);

  if (!health.healthy) {
    throw new Error(`Apollo Client is unhealthy: ${health.error}`);
  }
}
