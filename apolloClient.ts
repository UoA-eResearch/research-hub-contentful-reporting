import { ApolloClient, InMemoryCache, NormalizedCacheObject, HttpLink } from '@apollo/client/core';
import { fetch } from 'cross-fetch';
import { onError } from '@apollo/client/link/error';

const CONTENTFUL_GRAPHQL_URI = `https://graphql.contentful.com/content/v1/spaces/${process.env.CONTENTFUL_SPACE_ID}/environments/${process.env.CONTENTFUL_SPACE_ENV}`

export function getApolloClient(): ApolloClient<NormalizedCacheObject> {
    const authToken = process.env.CONTENTFUL_CONTENT_DELIVERY_TOKEN;
    const httpLink: HttpLink = new HttpLink({
        uri: CONTENTFUL_GRAPHQL_URI + `?access_token=${authToken}`,
        fetch
    });
    // const authLink: ApolloLink = setContext((_, {headers}) => {
    //     return {
    //         ...headers,
    //         authorization: authToken ? `Bearer ${authToken}` : "",
    //     }
    // });
    const error = onError(({ graphQLErrors, operation }) => {
        if (graphQLErrors) {
            for (const error of graphQLErrors) {
                console.error(`[GraphQL error]: in ${operation.operationName}: ${error.name}: ${error.message}`);
            }
        }
    })
    const client = new ApolloClient({
        link: error.concat(httpLink), // authLink.concat(httpLink),
        cache: new InMemoryCache(),
        defaultOptions: {
            watchQuery: {
                errorPolicy: 'all'
            },
            query: {
                errorPolicy: 'all'
            }
        }
    });
    return client;
}
