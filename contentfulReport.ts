import { APIGatewayProxyResult } from "aws-lambda";
import { runContentGraphReports } from "./reports/contentGraph";
import { runContentOverview } from "./reports/contentOverview";
import { runPagesPerCategory } from "./reports/pagesPerCategory";
import { runPagesPerOrgUnit } from "./reports/pagesPerOrgUnit";
import { runContentMetadata } from "./reports/contentMetadata";


// Lambda exports

export async function contentful(): Promise<APIGatewayProxyResult> {
    try {
        await runContentOverview(50);
        await runContentMetadata(50);
        await runPagesPerCategory();
        await runPagesPerOrgUnit(10);
        await runContentGraphReports();

        return {
            statusCode: 200,
            body: 'Update successful'
        }
    }
    catch (e) {
        if (e instanceof Error) {
            console.error(e.message);
        }
        return {
            statusCode: 400,
            body: JSON.stringify('An error occurred. Please check log files.')
        }
    }
}
