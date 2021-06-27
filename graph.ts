import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda'
import { createClient } from 'contentful-management'
import { ClientAPI } from 'contentful-management/dist/typings/create-contentful-api'
import { Environment } from 'contentful-management/dist/typings/entities/environment'
import { Space } from 'contentful-management/dist/typings/entities/space'
import { ContentType, Entry } from 'contentful-management/dist/typings/export-types'

const CONTENTFUL_ACCESS_TOKEN = ''
const CONTENTFUL_SPACE_ID = 'vbuxn5csp0ik'
const CONTENTFUL_ENVIRONMENT = 'dev'

interface Node {
    id: string
}

interface Link {
    source: string,
    target: string
}

export async function main (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    let result: APIGatewayProxyResult;

    try {
        const client: ClientAPI = await createClient({accessToken: CONTENTFUL_ACCESS_TOKEN});
        const space: Space = await client.getSpace(CONTENTFUL_SPACE_ID);
        const environment: Environment = await space.getEnvironment(CONTENTFUL_ENVIRONMENT);
        const contentTypes: ContentType[] = (await environment.getContentTypes()).items;
        const subHubs: Entry[] = (await environment.getEntries({ content_type: 'article' })).items;

        return {
            statusCode: 200,
            body: JSON.stringify(subHubs[0])
        };  

    }
    catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify(e)
        }
    }
}

function makeGraph(entries: Entry[]): { nodes: Node[], links: Link[] } {
    const nodes: Node[] = [];
    const links: Link[] = [];

    entries.forEach((entry: Entry) => {
        nodes.push({id: entry.sys.id});

        if (entry.fields.hasOwnProperty('relatedContent')) {

        }
    })

    return {
        nodes,
        links
    }
}


