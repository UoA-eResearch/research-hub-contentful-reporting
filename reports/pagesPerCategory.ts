import { getApolloClient } from "../apolloClient";
import { CurrentReportDoc } from "../googleDocsWrapper";
import { GetPagesPerCategoryDocument, GetPagesPerCategoryQuery, GetPagesPerStageDocument, GetPagesPerStageQuery } from "./types";

type HeaderTitleRow = { [key in HeaderTitle]: string | number | boolean };
type HeaderTitle = 'Category/Stage' | 'SubHubs' | 'Articles' | 'Softwares'| 'Events' | 'Services' | 'Case Studies' | 'Equipments';

const sheetHeaderFields: HeaderTitle[] = [ 'Category/Stage', 'SubHubs', 'Articles', 'Softwares', 'Events', 'Services', 'Case Studies', 'Equipments' ];



export async function runPagesPerCategory(): Promise<void> {
    const currentReportDoc = CurrentReportDoc.instance;

    const data = await getData();

    const reportSheet = await currentReportDoc.getSheet('Pages/Category');
    await reportSheet.clear();
    await reportSheet.setHeaderRow(sheetHeaderFields);
    await reportSheet.addRows(data);
}

async function getData(): Promise<HeaderTitleRow[]> {
    const client = getApolloClient();

    const categoryData = await client.query({
        query: GetPagesPerCategoryDocument
    });
    const stageData = await client.query({
        query: GetPagesPerStageDocument
    });

    const rows: HeaderTitleRow[] = []

    rows.push(...mapCategoryData(categoryData.data));
    rows.push(...mapStageData(stageData.data));

    return rows;
}

function mapCategoryData(queryData: GetPagesPerCategoryQuery): HeaderTitleRow[] {
    return queryData.categoryCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            "Category/Stage": item?.name ?? '',
            Articles: item?.linkedFrom?.articleCollection?.total ?? 0,
            Events: item?.linkedFrom?.eventCollection?.total ?? 0,
            Services: item?.linkedFrom?.serviceCollection?.total ?? 0,
            Softwares: item?.linkedFrom?.softwareCollection?.total ?? 0,
            SubHubs: item?.linkedFrom?.subHubCollection?.total ?? 0,
            "Case Studies": item?.linkedFrom?.caseStudyCollection?.total ?? 0,
            Equipments: item?.linkedFrom?.equipmentCollection?.total ?? 0
        }

        return row;
    }) ?? [];

}

function mapStageData(queryData: GetPagesPerStageQuery): HeaderTitleRow[] {
    return queryData.stageCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            "Category/Stage": item?.name ?? '',
            Articles: item?.linkedFrom?.articleCollection?.total ?? 0,
            Events: item?.linkedFrom?.eventCollection?.total ?? 0,
            Services: item?.linkedFrom?.serviceCollection?.total ?? 0,
            Softwares: item?.linkedFrom?.softwareCollection?.total ?? 0,
            SubHubs: item?.linkedFrom?.subHubCollection?.total ?? 0,
            "Case Studies": item?.linkedFrom?.caseStudyCollection?.total ?? 0,
            Equipments: item?.linkedFrom?.equipmentCollection?.total ?? 0
        }

        return row;
    }) ?? [];
}

