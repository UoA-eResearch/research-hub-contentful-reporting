import { ApolloError } from "@apollo/client/core";
import { getApolloClient } from "../apolloClient";
import { uploadCsv } from "../csvUpload";
import { CurrentReportDoc } from "../googleDocsWrapper";
import { GetPagesPerCategoryDocument, GetPagesPerCategoryQuery, GetPagesPerStageDocument, GetPagesPerStageQuery } from "./types";

type HeaderTitleRow = { [key in HeaderTitle]: string | number | boolean };
type HeaderTitle = 'Category/Stage' | 'Display Order' | 'SubHubs' | 'Articles' | 'Software'| 'Events' | 'Services' | 'CaseStudies' | 'Equipment' | 'Funding Pages';

const sheetHeaderFields: HeaderTitle[] = [ 'Category/Stage', 'Display Order', 'SubHubs', 'Articles', 'Software', 'Events', 'Services', 'CaseStudies', 'Equipment', 'Funding Pages' ];



export async function runPagesPerCategory(): Promise<void> {
    try {
        const currentReportDoc = CurrentReportDoc.instance;

        const data = await getData();

        uploadCsv(data, 'Pages Per Category')

        const reportSheet = await currentReportDoc.getSheet('Pages Per Category');
        await reportSheet.clear();
        await reportSheet.setHeaderRow(sheetHeaderFields);
        await reportSheet.addRows(data);
    } catch (e) {
        if (e instanceof ApolloError) {
            console.error('Error in Pages Per Category report: ' + e.graphQLErrors + e.message);
        }
        throw e;
    }
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
            "Display Order": item?.displayOrder ?? '',
            Articles: item?.linkedFrom?.articleCollection?.total ?? 0,
            Events: item?.linkedFrom?.eventCollection?.total ?? 0,
            Services: item?.linkedFrom?.serviceCollection?.total ?? 0,
            Software: item?.linkedFrom?.softwareCollection?.total ?? 0,
            SubHubs: item?.linkedFrom?.subHubCollection?.total ?? 0,
            "CaseStudies": item?.linkedFrom?.caseStudyCollection?.total ?? 0,
            Equipment: item?.linkedFrom?.equipmentCollection?.total ?? 0,
            "Funding Pages": item?.linkedFrom?.fundingCollection?.total ?? 0
        }

        return row;
    }) ?? [];

}

function mapStageData(queryData: GetPagesPerStageQuery): HeaderTitleRow[] {
    return queryData.stageCollection?.items.map((item) => {
        const row: HeaderTitleRow = {
            "Category/Stage": item?.name ?? '',
            "Display Order": item?.displayOrder ?? '',
            Articles: item?.linkedFrom?.articleCollection?.total ?? 0,
            Events: item?.linkedFrom?.eventCollection?.total ?? 0,
            Services: item?.linkedFrom?.serviceCollection?.total ?? 0,
            Software: item?.linkedFrom?.softwareCollection?.total ?? 0,
            SubHubs: item?.linkedFrom?.subHubCollection?.total ?? 0,
            "CaseStudies": item?.linkedFrom?.caseStudyCollection?.total ?? 0,
            Equipment: item?.linkedFrom?.equipmentCollection?.total ?? 0,
            "Funding Pages": item?.linkedFrom?.fundingCollection?.total ?? 0
        }

        return row;
    }) ?? [];
}

