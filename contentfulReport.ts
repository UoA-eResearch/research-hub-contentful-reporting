import { ApolloError } from "@apollo/client/core";
import { APIGatewayProxyResult } from "aws-lambda";
import { runContentOverview } from "./reports/contentOverview";
import { runPagesPerCategory } from "./reports/pagesPerCategory";
import { runPagesPerOrgUnit } from "./reports/pagesPerOrgUnit";


// Lambda exports

export async function contentful(): Promise<APIGatewayProxyResult> {
    try {
        await runContentOverview(50);
        await runPagesPerCategory();
        await runPagesPerOrgUnit(10);

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
    