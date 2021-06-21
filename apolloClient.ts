import { ApolloClient, InMemoryCache, NormalizedCacheObject, HttpLink } from '@apollo/client/core';
import { fetch } from 'cross-fetch';

const CONTENTFUL_GRAPHQL_URI = `https://graphql.contentful.com/content/v1/spaces/${process.env.CONTENTFUL_SPACE_ID}`

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
    const client = new ApolloClient({
        link: httpLink, // authLink.concat(httpLink),
        cache: new InMemoryCache(),
    });
    return client;
}
