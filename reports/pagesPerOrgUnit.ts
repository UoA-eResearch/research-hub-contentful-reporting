import { getApolloClient } from "../apolloClient";
import { uploadCsv } from "../csvUpload";
import { CurrentReportDoc } from "../googleDocsWrapper";
import { GetPagesPerOrgUnitDocument, GetPagesPerOrgUnitQuery } from "./types";

let MAX_ITEMS = 10;

type HeaderTitleRow = { [key in HeaderTitle]: string | number | boolean };
type HeaderTitle = 'Org Unit' | 'SubHubs' | 'Articles' | 'Software' | 'Events' | 'Services' | 'CaseStudies' | 'Equipment' | 'Funding Pages' | 'Capabilities' | 'Processes';

const sheetHeaderFields: HeaderTitle[] = ['Org Unit', 'SubHubs', 'Articles', 'Software', 'Events', 'Services', 'CaseStudies', 'Equipment', 'Funding Pages', 'Capabilities', 'Processes'];


export async function runPagesPerOrgUnit(chunkSize?: number): Promise<void> {
    if (chunkSize) {
        MAX_ITEMS = chunkSize;
    }

    try {
        const currentReportDoc = CurrentReportDoc.instance;

        const data = await getData();

        if (data) {
            uploadCsv(data, 'Pages Per Org Unit')

            const reportSheet = await currentReportDoc.getSheet('Pages Per Org Unit');
            await reportSheet.clear();
            await reportSheet.setHeaderRow(sheetHeaderFields);
            await reportSheet.addRows(data);
        }
    } catch (e) {
        if (e instanceof Error) {
            console.error(`Error in Pages Per Org Unit report: ${e.name}: ${e.message}`);
        }
        throw e;
    }
}

async function getData(): Promise<HeaderTitleRow[] | undefined> {
    const client = getApolloClient();

    const query = client.watchQuery({
        query: GetPagesPerOrgUnitDocument,
        variables: {
            limit: MAX_ITEMS,
            skip: 0
        }
    });

    const rows: HeaderTitleRow[] = [];

    const result = await query.result();

    rows.push(...mapData(result.data));

    let i = 0;
    while ((result.data.orgUnitCollection?.total ?? 0) > rows.length) {
        const moreItems = await query.fetchMore({
            variables: {
                limit: MAX_ITEMS,
                skip: MAX_ITEMS * i
            }
        });

        rows.push(...mapData(moreItems.data));
        i++;
    }

    return rows;
}

function mapData(data: GetPagesPerOrgUnitQuery): HeaderTitleRow[] {
    return data.orgUnitCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            "CaseStudies": item?.linkedFrom?.caseStudyCollection?.total ?? 0,
            "Org Unit": item?.name ?? '',
            Articles: item?.linkedFrom?.articleCollection?.total ?? 0,
            Equipment: item?.linkedFrom?.equipmentCollection?.total ?? 0,
            Events: item?.linkedFrom?.eventCollection?.total ?? 0,
            Services: item?.linkedFrom?.serviceCollection?.total ?? 0,
            Software: item?.linkedFrom?.softwareCollection?.total ?? 0,
            SubHubs: item?.linkedFrom?.subHubCollection?.total ?? 0,
            "Funding Pages": item?.linkedFrom?.fundingCollection?.total ?? 0,
            Capabilities: item?.linkedFrom?.capabilityCollection?.total ?? 0,
            Processes: item?.linkedFrom?.processCollection?.total ?? 0
        };

        return row;
    }) ?? [];
}