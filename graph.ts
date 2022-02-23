import { APIGatewayProxyResult } from "aws-lambda";
import { ClientAPI, createClient, Entry, Environment, Space } from "contentful-management";

export type ContentType
    = 'article'
    | 'caseStudy'
    | 'equipment'
    | 'event'
    | 'funding'
    | 'service'
    | 'software'
    | 'subHub'

const defaultSelectQuery = 'sys.id,fields.title,fields.slug,sys.contentType,fields.relatedItems';
const queryMap: Map<ContentType, string> = new Map([
    ['article', defaultSelectQuery],
    ['caseStudy', defaultSelectQuery],
    ['equipment', defaultSelectQuery],
    ['event', defaultSelectQuery],
    ['funding', defaultSelectQuery],
    ['service', defaultSelectQuery],
    ['software', defaultSelectQuery],
    ['subHub', defaultSelectQuery + ',fields.internalPages,fields.externalPages']
]);

export interface ContentNode {
    id: string,
    name: string,
    slug: string,
    type: string
}

export interface ContentLink {
    source: string,
    target: string
}

export interface ContentGraph {
    nodes: ContentNode[],
    links: ContentLink[]
}

export async function main(): Promise<APIGatewayProxyResult> {
    try {
        return {
            statusCode: 200,
            body: JSON.stringify(await getGraph()),
        }
    }
    catch (e) {
        if (e instanceof Error) {
            console.error(e.message);
            return {
                statusCode: 500,
                body: JSON.stringify(e.message)
            }
        } else {
            console.error(e);
            return {
                statusCode: 500,
                body: 'An unknown error has occurred\n' + JSON.stringify(e)
            }
        }
    }
}

async function getGraph(): Promise<ContentGraph> {
    if (!process.env.CONTENTFUL_MGMT_ACCESS_TOKEN) throw Error('No delivery token found');
    if (!process.env.CONTENTFUL_SPACE_ID) throw Error('No space ID found');
    if (!process.env.CONTENTFUL_SPACE_ENV) throw Error('No environment found');

    const client: ClientAPI = createClient({ accessToken: process.env.CONTENTFUL_MGMT_ACCESS_TOKEN });
    const space: Space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
    const environment: Environment = await space.getEnvironment(process.env.CONTENTFUL_SPACE_ENV);

    const entries: Entry[] = [];
    for (const type of queryMap.keys()) {
        const entriesOfType: Entry[] = (await environment.getEntries({
            limit: 1000,
            content_type: type,
            'fields.searchable': 'true',
            'sys.publishedAt[exists]': true,
            select: queryMap.get(type)
        })).items;
        entries.push(...entriesOfType);
    }

    const nodes: ContentNode[] = [];
    const links: ContentLink[] = [];
    for (const entry of entries) {
        const node: ContentNode = {
            id: entry.sys.id,
            name: entry.fields.title ? entry.fields.title['en-US'] : '',
            slug: entry.fields.slug ? entry.fields.slug['en-US'] : '',
            type: entry.sys.contentType.sys.id
        }

        nodes.push(node);

        const relatedItemLinks: ContentLink[] = [];
        for (const linkedItem of (entry.fields.relatedItems ? entry.fields.relatedItems['en-US'] : [])) {
            const link: ContentLink = {
                source: entry.sys.id,
                target: linkedItem.sys.id
            }

            relatedItemLinks.push(link);
        }

        if (entry.sys.contentType.sys.id === 'subHub') {
            const collection = [
                ...(entry.fields.internalPages ? entry.fields.internalPages['en-US'] : []),
                ...(entry.fields.externalPages ? entry.fields.externalPages['en-US'] : [])
            ]
            for (const page of collection) {
                const pageLink: ContentLink = {
                    source: entry.sys.id,
                    target: page.sys.id
                }

                relatedItemLinks.push(pageLink);
            }
        }

        links.push(...relatedItemLinks);
    }

    return { nodes, links: links.filter(link => nodes.map(node => node.id).includes(link.target)) }
}
