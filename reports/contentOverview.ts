import { getApolloClient } from "../apolloClient";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { CurrentReportDoc, DataOverTimeDoc } from "../googleDocsWrapper";
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { GetAllArticlesDocument, GetAllArticlesQuery, GetAllCategoriesDocument, GetAllCategoriesQuery, GetAllEquipmentDocument, GetAllEquipmentQuery, GetAllEventsDocument, GetAllEventsQuery, GetAllLinkCardsDocument, GetAllLinkCardsQuery, GetAllOfficialDocumentsDocument, GetAllOfficialDocumentsQuery, GetAllPersonsDocument, GetAllPersonsQuery, GetAllServicesDocument, GetAllServicesQuery, GetAllSoftwaresDocument, GetAllSoftwaresQuery, GetAllSubHubsDocument, GetAllSubHubsQuery, GetAllVideosDocument, GetAllVideosQuery } from "./types";



/**
 * Contentful graphql URI
 * also maybe put this in parameter store ???
 */
const GRAPHQL_CHUNK_SIZE = 50;

/**
 * this is ugly, but there dosn't seem to be a way to turn a union type into an array of all possible values
 * add new titles to both this array and the union type HeaderTitle
 */
const overviewSheetHeaderFields: ContentOverviewSummaryTitle[] = [ 'Title', 'Date', 'SubHubs', 'Articles', 'Software', 'Official Documents', 'Link Cards', 'Events', 'Persons', 'Services', 'Videos', 'Categories', 'Equipment' ];
const sheetHeaderFields: ContentOverviewHeaderTitle[] = ['ID', 'Title', 'Slug', 'Last Updated', 'Next Review', 'First Published', 'Owner', 'Publisher', 'Content Type', 'Related Orgs', 'Related Orgs 1', 'Related Orgs 2', 'Related Orgs 3', 'Linked Entries', 'Is SSO Protected', 'Is Searchable'];


type ContentOverviewRow = { [key in ContentOverviewHeaderTitle]: string | number | boolean };
type ContentOverviewHeaderTitle = 'ID' | 'Title' | 'Slug' | 'Last Updated' | 'Next Review' | 'First Published' | 'Owner' | 'Publisher' | 'Content Type' | 'Related Orgs' | 'Related Orgs 1' | 'Related Orgs 2' | 'Related Orgs 3' | 'Linked Entries' | 'Is SSO Protected' | 'Is Searchable';

type ContentOverviewSummaryRow = { [key in ContentOverviewSummaryTitle]: string | number | boolean };
type ContentOverviewSummaryTitle = 'Title' | 'Date' | 'SubHubs' | 'Articles' | 'Software' | 'Official Documents' | 'Link Cards' | 'Events' | 'Persons' | 'Services' | 'Videos' | 'Categories' | 'Equipment';

declare type ContentType = 'SubHub' | 'Article' | 'Software' | 'OfficialDocuments' | 'LinkCard' | 'Event' | 'Person' | 'Service' | 'Video' | 'Category' | 'Equipment';

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
    title: string;
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
    equipment: number;
}

// export function to run report

export async function runContentOverview(): Promise<void> {
    const currentReportDoc = CurrentReportDoc.instance;
    const dataOverTimeDoc = DataOverTimeDoc.instance;

    const data = await getData();

    const reportSheet = await currentReportDoc.getSheet('Content Overview');
    await reportSheet.clear();
    await reportSheet.setHeaderRow(sheetHeaderFields);
    await reportSheet.addRows(data.report);

    const dataOverTimeSheet = await dataOverTimeDoc.getSheet('Content Types');

    const headerValues = await dataOverTimeSheet.headerValues;
    if (headerValues !== overviewSheetHeaderFields) {
        dataOverTimeSheet.setHeaderRow(overviewSheetHeaderFields);
    }
    await dataOverTimeSheet.addRow(data.summary);
}

// get totals functions

function subHubsTotal(allSubHubs: GetAllSubHubsQuery): number {
    return allSubHubs.subHubCollection?.total ?? 0;
}
function articlesTotal(allArticles: GetAllArticlesQuery): number {
    return allArticles.articleCollection?.total ?? 0;
}
function softwaresTotal(allSoftwares: GetAllSoftwaresQuery): number {
    return allSoftwares.softwareCollection?.total ?? 0;
}
function officialDocumentsTotal(allOfficialDocuments: GetAllOfficialDocumentsQuery): number {
    return allOfficialDocuments.officialDocumentsCollection?.total ?? 0;
}
function linkCardsTotal(allLinkCards: GetAllLinkCardsQuery): number {
    return allLinkCards.linkCardCollection?.total ?? 0;
}
function eventsTotal(allEvents: GetAllEventsQuery): number {
    return allEvents.eventCollection?.total ?? 0;
}
function personsTotal(allPersons: GetAllPersonsQuery): number {
    return allPersons.personCollection?.total ?? 0;
}
function servicesTotal(allServices: GetAllServicesQuery): number {
    return allServices.serviceCollection?.total ?? 0;
}
function videosTotal(allVideos: GetAllVideosQuery): number {
    return allVideos.videoCollection?.total ?? 0;
}
function categoriesTotal(allCategories: GetAllCategoriesQuery): number {
    return allCategories.categoryCollection?.total ?? 0;
}
function equipmentTotal(allEquipment: GetAllEquipmentQuery): number {
    return allEquipment.equipmentCollection?.total ?? 0;
}

// mapping function
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

function mapReportDataEquipment(queryData: GetAllEquipmentQuery): Partial<ContentOverviewData>[] | undefined {
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

// get contentful data

async function getData(): Promise<{ summary: ContentOverviewSummaryRow, report: ContentOverviewRow[] }> {
    const client = getApolloClient();

    const report: Partial<ContentOverviewData>[] = [];

    const subHubRows = await getRows(client, GetAllSubHubsDocument, mapReportDataSubHubs, subHubsTotal);
    const articleRows = await getRows(client, GetAllArticlesDocument, mapReportDataArticles, articlesTotal);
    const softwareRows = await getRows(client, GetAllSoftwaresDocument, mapReportDataSoftwares, softwaresTotal);
    const officialDocumentRows = await getRows(client, GetAllOfficialDocumentsDocument, mapReportDataOfficialDocuments, officialDocumentsTotal);
    const linkCardRows = await getRows(client, GetAllLinkCardsDocument, mapReportDataLinkCards, linkCardsTotal);
    const eventRows = await getRows(client, GetAllEventsDocument, mapReportDataEvents, eventsTotal);
    const personRows = await getRows(client, GetAllPersonsDocument, mapReportDataPersons, personsTotal);
    const serviceRows = await getRows(client, GetAllServicesDocument, mapReportDataServices, servicesTotal);
    const videoRows = await getRows(client, GetAllVideosDocument, mapReportDataVideos, videosTotal);
    const categoryRows = await getRows(client, GetAllCategoriesDocument, mapReportDataCategories, categoriesTotal);
    const equipmentRows = await getRows(client, GetAllEquipmentDocument, mapReportDataEquipment, equipmentTotal);

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
        equipment: equipmentRows?.total ?? 0,
        title: ''
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
 * @param mappingFunction maps the return type of the apollo query to and array of ReportData for further processing
 * @param getTotalFunction a function that takes an apollo query result and returns the variable total from it
 * @returns array of ReportData
 */
async function getRows<T>(
    client: ApolloClient<NormalizedCacheObject>,
    query: TypedDocumentNode<T>,
    mappingFunction: (data: T) => Partial<ContentOverviewData>[] | undefined,
    getTotalFunction: (data: T) => number
): Promise<{ data: Partial<ContentOverviewData>[], total: number } | undefined> {
    const queryObservable = await client.watchQuery({
        query: query,
        variables: {
            limit: GRAPHQL_CHUNK_SIZE,
            skip: 0
        }
    });


    const rows: Partial<ContentOverviewData>[] = [];

    const result = await queryObservable.result();

    const initialData = mappingFunction(result.data);
    initialData ? rows.push(...initialData) : null;

    const total = getTotalFunction(result.data);

    let i = 1;
    while (total > rows.length) {
        const moreItems = await queryObservable.fetchMore({
            variables: {
                limit: GRAPHQL_CHUNK_SIZE,
                skip: GRAPHQL_CHUNK_SIZE * i
            }
        });

        const moreRows = mappingFunction(moreItems.data);
        moreRows ? rows.push(...moreRows) : null;

        i++;
    }

    return { data: rows, total };
}





function makeRow(data: Partial<ContentOverviewData>): ContentOverviewRow {
    return {
        "Content Type": data.contentType ?? '',
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
        Title: data.title,
        Videos: data.videos,
        Equipment: data.equipment
    };
}

