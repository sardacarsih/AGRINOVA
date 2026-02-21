import { apolloClient } from '@/lib/apollo/client';

/**
 * Execute a GraphQL query or mutation using Apollo Client
 * This wrapper provides a simple interface similar to graphql-request
 */
export async function executeGraphQL<T = any>(
    query: string,
    variables?: Record<string, any>
): Promise<T> {
    const result = await apolloClient.query({
        query: typeof query === 'string' ? require('graphql-tag').default(query) : query,
        variables,
        fetchPolicy: 'network-only',
    });

    if (result.errors && result.errors.length > 0) {
        throw result.errors[0];
    }

    return result.data as T;
}

/**
 * Execute a GraphQL mutation using Apollo Client
 */
export async function executeMutation<T = any>(
    mutation: string,
    variables?: Record<string, any>
): Promise<T> {
    const result = await apolloClient.mutate({
        mutation: typeof mutation === 'string' ? require('graphql-tag').default(mutation) : mutation,
        variables,
    });

    if (result.errors && result.errors.length > 0) {
        throw result.errors[0];
    }

    return result.data as T;
}

// Export Apollo client for direct use
export { apolloClient as graphqlClient };
