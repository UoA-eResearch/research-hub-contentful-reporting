import { getApolloClient } from "../apolloClient";
import { CurrentReportDoc } from "../googleDocsWrapper";
import { GetOrgUnitsPerPageDocument, GetOrgUnitsPerPageQuery } from "./types";

type HeaderTitleRow = { [key in HeaderTitle]: string | number | boolean };
type HeaderTitle = 'Title' | 'Org Units';

const sheetHeaderFields: HeaderTitle[] = [ 'Title', 'Org Units' ];


export async function runOrgUnitsPerPage() {
    const currentReportDoc = CurrentReportDoc.instance;

    const data = await getData();

    const reportSheet = await currentReportDoc.getSheet('OrgUnits/Page');
    await reportSheet.clear();
    await reportSheet.setHeaderRow(sheetHeaderFields);
    await reportSheet.addRows(data);

}

async function getData(): Promise<HeaderTitleRow[]> {
    const client = getApolloClient();

    const data = await client.query({
        query: GetOrgUnitsPerPageDocument
    });

    return mapData(data.data);
}

function mapData(data: GetOrgUnitsPerPageQuery): HeaderTitleRow[] {
    const rows: HeaderTitleRow[] = [];

    const articleRows = data.articleCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            Title: item?.title ?? '',
            "Org Units": item?.relatedOrgsCollection?.total ?? 0
        };

        return row;
    }) ?? [];

    const caseStudyRows = data.caseStudyCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            Title: item?.title ?? '',
            "Org Units": item?.relatedOrgsCollection?.total ?? 0
        };

        return row;
    });

    const softwareRows = data.softwareCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            Title: item?.title ?? '',
            "Org Units": item?.relatedOrgsCollection?.total ?? 0
        };

        return row;
    });

    const equipmentRows = data.equipmentCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            Title: item?.title ?? '',
            "Org Units": item?.relatedOrgsCollection?.total ?? 0
        };

        return row;
    });
    
    const subHubRows = data.subHubCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            Title: item?.title ?? '',
            "Org Units": item?.relatedOrgsCollection?.total ?? 0
        };

        return row;
    });

    const serviceRows = data.serviceCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            Title: item?.title ?? '',
            "Org Units": item?.relatedOrgsCollection?.total ?? 0
        };

        return row;
    });

    const eventRows = data.eventCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            Title: item?.title ?? '',
            "Org Units": item?.relatedOrgsCollection?.total ?? 0
        };

        return row;
    });

    articleRows ? rows.push(...articleRows) : null;
    caseStudyRows ? rows.push(...caseStudyRows) : null;
    softwareRows ? rows.push(...softwareRows) : null;
    equipmentRows ? rows.push(...equipmentRows) : null;
    subHubRows ? rows.push(...subHubRows) : null;
    serviceRows ? rows.push(...serviceRows) : null;
    eventRows ? rows.push(...eventRows) : null;

    return rows;
}