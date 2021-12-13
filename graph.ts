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

const contentTypes: ContentType[] = ['article', 'caseStudy', 'equipment', 'event', 'funding', 'service', 'software', 'subHub']

export interface ContentNode {
    id: string,
    name: string,
    slug: string,
    type: string
}

export interface ContentLink {
    from: string,
    to: string
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
        }
        return {
            statusCode: 500,
            body: JSON.stringify('An error occurred. Please check log files.')
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
    for (const type of contentTypes) {
        const entriesOfType: Entry[] = (await environment.getEntries({ content_type: type, 'fields.searchable': 'true', select: 'sys.id,fields.title,fields.slug,sys.contentType,fields.relatedItems' })).items;
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
                from: entry.sys.id,
                to: linkedItem.sys.id
            }

            relatedItemLinks.push(link);
        }

        links.push(...relatedItemLinks);
    }

    return { nodes, links }
}
