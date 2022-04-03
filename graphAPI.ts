import { APIGatewayProxyResult } from "aws-lambda";
import { generateContentGraph } from "./graph";

export async function getGraph(): Promise<APIGatewayProxyResult> {
    if (!process.env.CORS_ACCESS_CONTROL_ALLOW_ORIGINS) throw Error('No CORS setting found');
    const headers: { [header: string]: string | number | boolean; } = {
        'Access-Control-Allow-Origin': process.env.CORS_ACCESS_CONTROL_ALLOW_ORIGINS,
        'Content-Type': 'application/json'
    }

    try {
        return {
            statusCode: 200,
            body: JSON.stringify(await generateContentGraph()),
            headers
        }
    }
    catch (e) {
        if (e instanceof Error) {
            console.error(e.message);
            return {
                statusCode: 500,
                body: JSON.stringify(e.message),
                headers
            }
        } else {
            console.error(e);
            return {
                statusCode: 400,
                body: 'An unknown error occurred\n' + JSON.stringify(e),
                headers
            }
        }
    }
}