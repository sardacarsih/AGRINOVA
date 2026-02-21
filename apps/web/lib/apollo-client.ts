import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client/core';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// HTTP Link
const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:8080/graphql',
    credentials: 'include',
});

// WebSocket Link (only on client)
const wsLink = typeof window !== 'undefined' ? new GraphQLWsLink(createClient({
    url: process.env.NEXT_PUBLIC_WS_ENDPOINT || 'ws://localhost:8080/graphql',
})) : null;

// Split link for subscriptions
const splitLink = typeof window !== 'undefined' && wsLink
    ? split(
        ({ query }) => {
            const definition = getMainDefinition(query);
            return (
                definition.kind === 'OperationDefinition' &&
                definition.operation === 'subscription'
            );
        },
        wsLink,
        httpLink,
    )
    : httpLink;

export const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
});
