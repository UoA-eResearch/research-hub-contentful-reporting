import { ApolloError } from "@apollo/client/core";
import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from "aws-lambda";
import { runContentOverview } from "./reports/contentOverview";
import { runOrgUnitsPerPage } from "./reports/orgUnitsPerPage";
import { runPagesPerCategory } from "./reports/pagesPerCategory";
import { runPagesPerOrgUnit } from "./reports/pagesPerOrgUnit";


// Lambda exports

export async function contentful(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
    try {
        await runContentOverview();
        await runPagesPerCategory();
        await runPagesPerOrgUnit();
        await runOrgUnitsPerPage();

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
    