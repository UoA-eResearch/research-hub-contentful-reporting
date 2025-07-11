import { getApolloClient } from "../apolloClient";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { CurrentReportDoc, DataOverTimeDoc } from "../googleDocsWrapper";
import { GetAllArticlesDocument, GetAllArticlesQuery, GetAllCapabilitiesDocument, GetAllCapabilitiesQuery, GetAllCaseStudiesDocument, GetAllCaseStudiesQuery, GetAllCategoriesDocument, GetAllCategoriesQuery, GetAllEquipmentDocument, GetAllEquipmentQuery, GetAllEventsDocument, GetAllEventsQuery, GetAllFundingPagesDocument, GetAllFundingPagesQuery, GetAllLinkCardsDocument, GetAllLinkCardsQuery, GetAllOfficialDocumentsDocument, GetAllOfficialDocumentsQuery, GetAllPersonsDocument, GetAllPersonsQuery, GetAllServicesDocument, GetAllServicesQuery, GetAllSoftwaresDocument, GetAllSoftwaresQuery, GetAllSubHubsDocument, GetAllSubHubsQuery, GetAllVideosDocument, GetAllVideosQuery } from "./types";
import { uploadCsv } from "../csvUpload";
import { ResultOf } from "@graphql-typed-document-node/core";

/**
 * Contentful graphql URI
 * also maybe put this in parameter store ???
 */
let GRAPHQL_CHUNK_SIZE = 50;

/**
 * this is ugly, but there dosn't seem to be a way to turn a union type into an array of all possible values
 * add new titles to both this array and the union type HeaderTitle
 */
const overviewSheetHeaderFields: ContentOverviewSummaryTitle[] = ['Date', 'SubHubs', 'Articles', 'Software', 'Official Documents', 'Link Cards', 'Events', 'Persons', 'Services', 'Videos', 'Categories', 'Infrastructure', 'CaseStudies', 'Funding Pages', 'Capabilities'];
const sheetHeaderFields: ContentOverviewHeaderTitle[] = ['ID', 'Title', 'Slug', 'Last Updated', 'Next Review', 'First Published', 'Owner', 'Publisher', 'Content Type', 'Related Orgs', 'Related Orgs 1', 'Related Orgs 2', 'Related Orgs 3', 'Linked Entries', 'Is SSO Protected', 'Is Searchable'];


type ContentOverviewRow = { [key in ContentOverviewHeaderTitle]: string | number | boolean };
type ContentOverviewHeaderTitle = 'ID' | 'Title' | 'Slug' | 'Last Updated' | 'Next Review' | 'First Published' | 'Owner' | 'Publisher' | 'Content Type' | 'Related Orgs' | 'Related Orgs 1' | 'Related Orgs 2' | 'Related Orgs 3' | 'Linked Entries' | 'Is SSO Protected' | 'Is Searchable';

type ContentOverviewSummaryRow = { [key in ContentOverviewSummaryTitle]: string | number | boolean };
type ContentOverviewSummaryTitle = 'Date' | 'SubHubs' | 'Articles' | 'Software' | 'Official Documents' | 'Link Cards' | 'Events' | 'Persons' | 'Services' | 'Videos' | 'Categories' | 'Infrastructure' | 'CaseStudies' | 'Funding Pages' | 'Capabilities';

type ContentfulDocumentType = typeof GetAllArticlesDocument | typeof GetAllCapabilitiesDocument | typeof GetAllCaseStudiesDocument | typeof GetAllCategoriesDocument | typeof GetAllEquipmentDocument | typeof GetAllEventsDocument | typeof GetAllFundingPagesDocument | typeof GetAllLinkCardsDocument | typeof GetAllOfficialDocumentsDocument | typeof GetAllPersonsDocument | typeof GetAllServicesDocument | typeof GetAllSoftwaresDocument | typeof GetAllSubHubsDocument | typeof GetAllVideosDocument;
type ContentfulQueryType = ResultOf<ContentfulDocumentType>;

type ContentType = 'SubHub' | 'Article' | 'Software' | 'OfficialDocuments' | 'LinkCard' | 'Event' | 'Person' | 'Service' | 'Video' | 'Category' | 'Equipment' | 'CaseStudy' | 'Funding' | 'Capability';

interface ContentOverviewData {
    id: string;
    title: string;
    slug: string;
    lastUpdated: Date | null;
    nextReview: Date | null;
    owner: string;
    publisher: string;
    contentType: ContentType;
    linkedEntries: number;
    isSsoProtected: boolean | null | undefined;
    isSearchable: boolean | null | undefined;
    relatedOrgs: number;
    relatedOrgs1: string | null | undefined;
    relatedOrgs2: string | null | undefined;
    relatedOrgs3: string | null | undefined;
    firstPublishedAt: Date | null;
}

interface ContentOverviewSummaryData {
    date: Date;
    subHubs: number;
    articles: number;
    softwares: number;
    officialDocuments: number;
    linkCards: number;
    events: number;
    persons: number;
    services: number;
    videos: number;
    categories: number;
    infrastructure: number;
    caseStudies: number;
    fundingPages: number;
    capabilities: number
}

// export function to run report

export async function runContentOverview(chunkSize?: number): Promise<void> {
    if (chunkSize) {
        GRAPHQL_CHUNK_SIZE = chunkSize;
    }

    try {
        const currentReportDoc = CurrentReportDoc.instance;
        const dataOverTimeDoc = DataOverTimeDoc.instance;


        const data = await getData();


        // upload to S3 bucket in the background
        uploadCsv(data.report, 'Content Overview');

        const reportSheet = await currentReportDoc.getSheet('Content Overview');
        await reportSheet.clear();
        await reportSheet.setHeaderRow(sheetHeaderFields);
        await reportSheet.addRows(data.report);

        const dataOverTimeSheet = await dataOverTimeDoc.getSheet('Content Types');

        const headerValues = dataOverTimeSheet.headerValues;
        if (headerValues !== overviewSheetHeaderFields) {
            dataOverTimeSheet.setHeaderRow(overviewSheetHeaderFields);
        }
        await dataOverTimeSheet.addRow(data.summary);

        // get data over time values from sheet and convert to ContentOverviewSummaryRow[] for csv upload
        const dotsRows = (await dataOverTimeSheet.getRows()).map((row) => {
            const summaryRow: ContentOverviewSummaryRow = {
                Date: row.get('Date'),
                SubHubs: row.get('SubHubs') ?? 0,
                Articles: row.get('Articles') ?? 0,
                Software: row.get('Software') ?? 0,
                "Official Documents": row.get('Official Documents') ?? 0,
                "Link Cards": row.get('Link Cards') ?? 0,
                Events: row.get('Events') ?? 0,
                Persons: row.get('Persons') ?? 0,
                Services: row.get('Services') ?? 0,
                Videos: row.get('Videos') ?? 0,
                Categories: row.get('Categories') ?? 0,
                Infrastructure: row.get('Infrastructure') ?? 0,
                CaseStudies: row.get('CaseStudies') ?? 0,
                "Funding Pages": row.get('Funding Pages') ?? 0,
                Capabilities: row.get('Capabilities') ?? 0
            }

            return summaryRow;
        })

        //upload to S3 bucket in the background
        uploadCsv(dotsRows, 'Content Types')
    } catch (e) {
        if (e instanceof Error) {
            console.error(`Error in Content Overview report: ${e.name}: ${e.message}`);
        }
        throw e;
    }
}

// get totals function

function getTotal(query: ContentfulQueryType): number {
    if ('articleCollection' in query) return query.articleCollection?.total ?? 0;
    if ('subHubCollection' in query) return query.subHubCollection?.total ?? 0;
    if ('softwareCollection' in query) return query.softwareCollection?.total ?? 0;
    if ('officialDocumentsCollection' in query) return query.officialDocumentsCollection?.total ?? 0;
    if ('linkCardCollection' in query) return query.linkCardCollection?.total ?? 0;
    if ('eventCollection' in query) return query.eventCollection?.total ?? 0;
    if ('personCollection' in query) return query.personCollection?.total ?? 0;
    if ('serviceCollection' in query) return query.serviceCollection?.total ?? 0;
    if ('videoCollection' in query) return query.videoCollection?.total ?? 0;
    if ('categoryCollection' in query) return query.categoryCollection?.total ?? 0;
    if ('equipmentCollection' in query) return query.equipmentCollection?.total ?? 0;
    if ('caseStudyCollection' in query) return query.caseStudyCollection?.total ?? 0;
    if ('fundingCollection' in query) return query.fundingCollection?.total ?? 0;
    if ('capabilityCollection' in query) return query.capabilityCollection?.total ?? 0;

    throw new Error(`Unknown query type: ${query}`);
}

// mapping function

function mapReportData(query: ContentfulQueryType): Partial<ContentOverviewData>[] | undefined {
    if ('articleCollection' in query) return mapReportDataArticles(query);
    if ('subHubCollection' in query) return mapReportDataSubHubs(query);
    if ('softwareCollection' in query) return mapReportDataSoftwares(query);
    if ('officialDocumentsCollection' in query) return mapReportDataOfficialDocuments(query)
    if ('linkCardCollection' in query) return mapReportDataLinkCards(query);
    if ('eventCollection' in query) return mapReportDataEvents(query);
    if ('personCollection' in query) return mapReportDataPersons(query);
    if ('serviceCollection' in query) return mapReportDataServices(query);
    if ('videoCollection' in query) return mapReportDataVideos(query);
    if ('categoryCollection' in query) return mapReportDataCategories(query);
    if ('equipmentCollection' in query) return mapReportDataInfrastructure(query);
    if ('caseStudyCollection' in query) return mapReportDataCaseStudies(query);
    if ('fundingCollection' in query) return mapReportDataFundingPages(query);
    if ('capabilityCollection' in query) return mapReportDataCapabilityPages(query);

    throw new Error(`Unknown query type: ${query}`);
}

// This section contains implementations for parsing query data into tabular data
// As the return types all slightly differ it was easier to implement one mapping function
// for each type individually. However, this could be generalised and shortened.

function mapReportDataSubHubs(queryData: GetAllSubHubsQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.subHubCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            isSearchable: item?.searchable,
            isSsoProtected: item?.ssoProtected,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            nextReview: item?.nextReview ? new Date(item.nextReview) : null,
            owner: item?.owner?.name ? item.owner.name : '',
            publisher: item?.publisher?.name ? item.publisher.name : '',
            slug: item?.slug ? item.slug : '',
            title: item?.title ? item.title : '',
            relatedOrgs: item?.relatedOrgsCollection?.total,
            relatedOrgs1: item?.relatedOrgsCollection?.items[0]?.name,
            relatedOrgs2: item?.relatedOrgsCollection?.items[1]?.name,
            relatedOrgs3: item?.relatedOrgsCollection?.items[2]?.name,
            linkedEntries:
                (item?.relatedItemsCollection?.total ?? 0) +
                (item?.internalPagesCollection?.total ?? 0),
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    });
}
function mapReportDataArticles(queryData: GetAllArticlesQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.articleCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            isSearchable: item?.searchable,
            isSsoProtected: item?.ssoProtected,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            nextReview: item?.nextReview ? new Date(item.nextReview) : null,
            owner: item?.owner?.name ? item.owner.name : '',
            publisher: item?.publisher?.name ? item.publisher.name : '',
            slug: item?.slug ? item.slug : '',
            title: item?.title ? item.title : '',
            relatedOrgs: item?.relatedOrgsCollection?.total,
            relatedOrgs1: item?.relatedOrgsCollection?.items[0]?.name,
            relatedOrgs2: item?.relatedOrgsCollection?.items[1]?.name,
            relatedOrgs3: item?.relatedOrgsCollection?.items[2]?.name,
            linkedEntries: item?.relatedItemsCollection?.total,
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    });
}
function mapReportDataSoftwares(queryData: GetAllSoftwaresQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.softwareCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            isSearchable: item?.searchable,
            isSsoProtected: item?.ssoProtected,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            nextReview: item?.nextReview ? new Date(item.nextReview) : null,
            owner: item?.owner?.name ? item.owner.name : '',
            publisher: item?.publisher?.name ? item.publisher.name : '',
            slug: item?.slug ? item.slug : '',
            title: item?.title ? item.title : '',
            relatedOrgs: item?.relatedOrgsCollection?.total,
            relatedOrgs1: item?.relatedOrgsCollection?.items[0]?.name,
            relatedOrgs2: item?.relatedOrgsCollection?.items[1]?.name,
            relatedOrgs3: item?.relatedOrgsCollection?.items[2]?.name,
            linkedEntries: item?.relatedItemsCollection?.total,
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    });
}
function mapReportDataOfficialDocuments(queryData: GetAllOfficialDocumentsQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.officialDocumentsCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            title: item?.title ? item.title : '',
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    });
}
function mapReportDataLinkCards(queryData: GetAllLinkCardsQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.linkCardCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            title: item?.title ? item.title : '',
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    });
}
function mapReportDataEvents(queryData: GetAllEventsQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.eventCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            isSearchable: item?.searchable,
            isSsoProtected: item?.ssoProtected,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            nextReview: item?.nextReview ? new Date(item.nextReview) : null,
            owner: item?.owner?.name ? item.owner.name : '',
            publisher: item?.publisher?.name ? item.publisher.name : '',
            slug: item?.slug ? item.slug : '',
            title: item?.title ? item.title : '',
            relatedOrgs: item?.relatedOrgsCollection?.total,
            relatedOrgs1: item?.relatedOrgsCollection?.items[0]?.name,
            relatedOrgs2: item?.relatedOrgsCollection?.items[1]?.name,
            relatedOrgs3: item?.relatedOrgsCollection?.items[2]?.name,
            linkedEntries: item?.relatedItemsCollection?.total,
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    });
}
function mapReportDataPersons(queryData: GetAllPersonsQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.personCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            title: item?.name ? item.name : '',
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    });
}
function mapReportDataServices(queryData: GetAllServicesQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.serviceCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            isSearchable: item?.searchable,
            isSsoProtected: item?.ssoProtected,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            nextReview: item?.nextReview ? new Date(item.nextReview) : null,
            owner: item?.owner?.name ? item.owner.name : '',
            publisher: item?.publisher?.name ? item.publisher.name : '',
            slug: item?.slug ? item.slug : '',
            title: item?.title ? item.title : '',
            relatedOrgs: item?.relatedOrgsCollection?.total,
            relatedOrgs1: item?.relatedOrgsCollection?.items[0]?.name,
            relatedOrgs2: item?.relatedOrgsCollection?.items[1]?.name,
            relatedOrgs3: item?.relatedOrgsCollection?.items[2]?.name,
            linkedEntries: item?.relatedItemsCollection?.total,
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    });
}
function mapReportDataVideos(queryData: GetAllVideosQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.videoCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            title: item?.title ? item.title : '',
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    });
}
function mapReportDataCategories(queryData: GetAllCategoriesQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.categoryCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            title: item?.name ? item.name : '',
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    });
}

function mapReportDataInfrastructure(queryData: GetAllEquipmentQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.equipmentCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null,
            id: item?.sys.id,
            isSearchable: item?.searchable,
            isSsoProtected: item?.ssoProtected,
            lastUpdated: item?.sys.publishedAt ? new Date(item.sys.publishedAt) : null,
            linkedEntries:
                (item?.relatedItemsCollection?.total ?? 0) +
                (item?.relatedDocsCollection?.total ?? 0),
            nextReview: item?.nextReview ? new Date(item.nextReview) : null,
            owner: item?.owner?.name ?? '',
            publisher: item?.publisher?.name ?? '',
            relatedOrgs1: item?.relatedOrgsCollection?.items[0]?.name,
            relatedOrgs2: item?.relatedOrgsCollection?.items[1]?.name,
            relatedOrgs3: item?.relatedOrgsCollection?.items[2]?.name,
            relatedOrgs: item?.relatedOrgsCollection?.total,
            slug: item?.slug ?? '',
            title: item?.title ?? ''
        }

        return rowData;
    });
}

function mapReportDataCaseStudies(queryData: GetAllCaseStudiesQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.caseStudyCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null,
            id: item?.sys.id,
            isSearchable: item?.searchable,
            isSsoProtected: item?.ssoProtected,
            lastUpdated: item?.sys.publishedAt ? new Date(item.sys.publishedAt) : null,
            linkedEntries:
                (item?.relatedItemsCollection?.total ?? 0) +
                (item?.relatedDocsCollection?.total ?? 0),
            nextReview: item?.nextReview ? new Date(item.nextReview) : null,
            owner: item?.owner?.name ?? '',
            publisher: item?.publisher?.name ?? '',
            relatedOrgs1: item?.relatedOrgsCollection?.items[0]?.name,
            relatedOrgs2: item?.relatedOrgsCollection?.items[1]?.name,
            relatedOrgs3: item?.relatedOrgsCollection?.items[2]?.name,
            relatedOrgs: item?.relatedOrgsCollection?.total,
            slug: item?.slug ?? '',
            title: item?.title ?? ''
        }

        return rowData;
    });
}

function mapReportDataFundingPages(queryData: GetAllFundingPagesQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.fundingCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null,
            id: item?.sys.id,
            isSearchable: item?.searchable,
            isSsoProtected: item?.ssoProtected,
            lastUpdated: item?.sys.publishedAt ? new Date(item.sys.publishedAt) : null,
            linkedEntries:
                (item?.relatedItemsCollection?.total ?? 0) +
                (item?.relatedDocsCollection?.total ?? 0),
            nextReview: item?.nextReview ? new Date(item.nextReview) : null,
            owner: item?.owner?.name ?? '',
            publisher: item?.publisher?.name ?? '',
            relatedOrgs1: item?.relatedOrgsCollection?.items[0]?.name,
            relatedOrgs2: item?.relatedOrgsCollection?.items[1]?.name,
            relatedOrgs3: item?.relatedOrgsCollection?.items[2]?.name,
            relatedOrgs: item?.relatedOrgsCollection?.total,
            slug: item?.slug ?? '',
            title: item?.title ?? ''
        }

        return rowData;
    });
}

function mapReportDataCapabilityPages(queryData: GetAllCapabilitiesQuery): Partial<ContentOverviewData>[] | undefined {
    return queryData.capabilityCollection?.items.map((item) => {
        const rowData: Partial<ContentOverviewData> = {
            contentType: item?.__typename,
            id: item?.sys?.id,
            isSearchable: item?.searchable,
            isSsoProtected: item?.ssoProtected,
            lastUpdated: item?.sys?.publishedAt ? new Date(item.sys.publishedAt) : null,
            nextReview: item?.nextReview ? new Date(item.nextReview) : null,
            owner: item?.owner?.name ? item.owner.name : '',
            publisher: item?.publisher?.name ? item.publisher.name : '',
            slug: item?.slug ? item.slug : '',
            title: item?.title ? item.title : '',
            relatedOrgs: item?.relatedOrgsCollection?.total,
            relatedOrgs1: item?.relatedOrgsCollection?.items[0]?.name,
            relatedOrgs2: item?.relatedOrgsCollection?.items[1]?.name,
            relatedOrgs3: item?.relatedOrgsCollection?.items[2]?.name,
            linkedEntries: item?.relatedItemsCollection?.total,
            firstPublishedAt: item?.sys.firstPublishedAt ? new Date(item.sys.firstPublishedAt) : null
        }

        return rowData;
    })
}

// get contentful data

async function getData(): Promise<{ summary: ContentOverviewSummaryRow, report: ContentOverviewRow[] }> {
    const client = getApolloClient();

    const report: Partial<ContentOverviewData>[] = [];

    const subHubRows = await getRows(client, GetAllSubHubsDocument);
    const articleRows = await getRows(client, GetAllArticlesDocument);
    const softwareRows = await getRows(client, GetAllSoftwaresDocument);
    const officialDocumentRows = await getRows(client, GetAllOfficialDocumentsDocument);
    const linkCardRows = await getRows(client, GetAllLinkCardsDocument);
    const eventRows = await getRows(client, GetAllEventsDocument);
    const personRows = await getRows(client, GetAllPersonsDocument);
    const serviceRows = await getRows(client, GetAllServicesDocument);
    const videoRows = await getRows(client, GetAllVideosDocument);
    const categoryRows = await getRows(client, GetAllCategoriesDocument);
    const equipmentRows = await getRows(client, GetAllEquipmentDocument);
    const caseStudyRows = await getRows(client, GetAllCaseStudiesDocument);
    const fundingRows = await getRows(client, GetAllFundingPagesDocument);
    const capabilityRows = await getRows(client, GetAllCapabilitiesDocument);

    subHubRows ? report.push(...subHubRows.data) : null;
    articleRows ? report.push(...articleRows.data) : null;
    softwareRows ? report.push(...softwareRows.data) : null;
    officialDocumentRows ? report.push(...officialDocumentRows.data) : null;
    linkCardRows ? report.push(...linkCardRows.data) : null;
    eventRows ? report.push(...eventRows.data) : null;
    personRows ? report.push(...personRows.data) : null;
    serviceRows ? report.push(...serviceRows.data) : null;
    videoRows ? report.push(...videoRows.data) : null;
    categoryRows ? report.push(...categoryRows.data) : null;
    equipmentRows ? report.push(...equipmentRows.data) : null;
    caseStudyRows ? report.push(...caseStudyRows.data) : null;
    fundingRows ? report.push(...fundingRows.data) : null;
    capabilityRows ? report.push(...capabilityRows.data) : null;

    const summary: ContentOverviewSummaryData = {
        linkCards: linkCardRows?.total ?? 0,
        officialDocuments: officialDocumentRows?.total ?? 0,
        articles: articleRows?.total ?? 0,
        categories: categoryRows?.total ?? 0,
        events: eventRows?.total ?? 0,
        persons: personRows?.total ?? 0,
        date: new Date(),
        services: serviceRows?.total ?? 0,
        softwares: softwareRows?.total ?? 0,
        subHubs: subHubRows?.total ?? 0,
        videos: videoRows?.total ?? 0,
        infrastructure: equipmentRows?.total ?? 0,
        caseStudies: caseStudyRows?.total ?? 0,
        fundingPages: fundingRows?.total ?? 0,
        capabilities: capabilityRows?.total ?? 0
    };

    return {
        summary: makeOverviewSummaryRow(summary),
        report: report.map((item) => makeRow(item))
    };
}

/**
 * 
 * @param client instance of ApolloClient
 * @param query graphQL query from gql
 * @returns array of ReportData
 */
async function getRows(
    client: ApolloClient<NormalizedCacheObject>,
    query: ContentfulDocumentType,
): Promise<{ data: Partial<ContentOverviewData>[], total: number } | undefined> {
    const rows: Partial<ContentOverviewData>[] = [];

    const queryObservable = client.watchQuery({
        query: query,
        variables: {
            limit: GRAPHQL_CHUNK_SIZE,
            skip: 0
        },
    });

    const result = await queryObservable.result();

    const initialData = mapReportData(result.data);
    initialData ? rows.push(...initialData) : null;

    const total = getTotal(result.data);

    let i = 1;
    while (total > rows.length) {
        const moreItems = await queryObservable.fetchMore({
            variables: {
                limit: GRAPHQL_CHUNK_SIZE,
                skip: GRAPHQL_CHUNK_SIZE * i
            },
        });

        const moreRows = mapReportData(moreItems.data);


        moreRows ? rows.push(...moreRows) : null;

        i++;
    }

    return { data: rows, total };
}


function makeRow(data: Partial<ContentOverviewData>): ContentOverviewRow {
    return {
        "Content Type": data.contentType == "Equipment" ? "Infrastructure" : data.contentType ?? '',
        "Is SSO Protected": data.isSsoProtected ?? '',
        "Is Searchable": data.isSearchable ?? '',
        "Last Updated": data.lastUpdated?.toISOString() ?? '',
        "Linked Entries": data.linkedEntries ?? 0,
        "Next Review": data.nextReview?.toISOString() ?? '',
        "Related Orgs": data.relatedOrgs ?? 0,
        "Related Orgs 1": data.relatedOrgs1 ?? '',
        "Related Orgs 2": data.relatedOrgs2 ?? '',
        "Related Orgs 3": data.relatedOrgs3 ?? '',
        "ID": data.id ?? '',
        "Owner": data.owner ?? '',
        "Publisher": data.publisher ?? '',
        "Slug": data.slug ?? '',
        "Title": data.title ?? '',
        "First Published": data.firstPublishedAt?.toISOString() ?? ''
    };
}

function makeOverviewSummaryRow(data: ContentOverviewSummaryData): ContentOverviewSummaryRow {
    return {
        "Link Cards": data.linkCards,
        "Official Documents": data.officialDocuments,
        Articles: data.articles,
        Categories: data.categories,
        Date: data.date.toISOString(),
        Events: data.events,
        Persons: data.persons,
        Services: data.services,
        Software: data.softwares,
        SubHubs: data.subHubs,
        Videos: data.videos,
        Infrastructure: data.infrastructure,
        CaseStudies: data.caseStudies,
        "Funding Pages": data.fundingPages,
        Capabilities: data.capabilities
    };
}

