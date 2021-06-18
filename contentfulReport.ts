import { ApolloError } from "@apollo/client/core";
import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import { runContentOverview } from "./reports/contentOverview";


// Lambda exports

export async function contentful(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    try {
        await runContentOverview();

        return {
            statusCode: 200,
            body: 'Update successful'
        }
    }
    catch (e) {
        if (e instanceof ApolloError) {
            return {
                statusCode: 400,
                body: JSON.stringify(e)
            }
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify(e.message)
            }
        }
    }
}
    