import { getApolloClient } from "../apolloClient";
import { CurrentReportDoc } from "../googleDocsWrapper";
import { GetPagesPerOrgUnitDocument, GetPagesPerOrgUnitQuery } from "./types";

const MAX_ITEMS = 50;

type HeaderTitleRow = { [key in HeaderTitle]: string | number | boolean };
type HeaderTitle = 'Org Unit' | 'SubHubs' | 'Articles' | 'Softwares'| 'Events' | 'Services' | 'Case Studies' | 'Equipments';

const sheetHeaderFields: HeaderTitle[] = [ 'Org Unit', 'SubHubs', 'Articles', 'Softwares', 'Events', 'Services', 'Case Studies', 'Equipments' ];


export async function runPagesPerOrgUnit() {
    const currentReportDoc = CurrentReportDoc.instance;

    const data = await getData();

    const reportSheet = await currentReportDoc.getSheet('Pages/Org Unit');
    await reportSheet.clear();
    await reportSheet.setHeaderRow(sheetHeaderFields);
    await reportSheet.addRows(data);

}

async function getData(): Promise<HeaderTitleRow[]> {
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
            "Case Studies": item?.linkedFrom?.caseStudyCollection?.total ?? 0,
            "Org Unit": item?.name ?? '',
            Articles: item?.linkedFrom?.articleCollection?.total ?? 0,
            Equipments: item?.linkedFrom?.equipmentCollection?.total ?? 0,
            Events: item?.linkedFrom?.eventCollection?.total ?? 0,
            Services: item?.linkedFrom?.serviceCollection?.total ?? 0,
            Softwares: item?.linkedFrom?.softwareCollection?.total ?? 0,
            SubHubs: item?.linkedFrom?.subHubCollection?.total ?? 0
        };

        return row;
    }) ?? [];
}