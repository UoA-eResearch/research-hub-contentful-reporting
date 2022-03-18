import { APIGatewayProxyResult } from "aws-lambda";
import { generateContentGraph } from "./graph";

export async function getGraph(): Promise<APIGatewayProxyResult> {
    try {
        return {
            statusCode: 200,
            body: JSON.stringify(await generateContentGraph()),
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
                statusCode: 400,
                body: 'An unknown error occurred\n' + JSON.stringify(e)
            }
        }
    }
}