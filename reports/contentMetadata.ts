import { getApolloClient } from "../apolloClient";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { CurrentReportDoc, DataOverTimeDoc } from "../googleDocsWrapper";
import { GetAllArticlesDocument, GetAllArticlesQuery, GetAllCapabilitiesDocument, GetAllCapabilitiesQuery, GetAllCaseStudiesDocument, GetAllCaseStudiesQuery, GetAllCategoriesDocument, GetAllCategoriesQuery, GetAllEquipmentDocument, GetAllEquipmentQuery, GetAllEventsDocument, GetAllEventsQuery, GetAllFundingPagesDocument, GetAllFundingPagesQuery, GetAllLinkCardsDocument, GetAllLinkCardsQuery, GetAllOfficialDocumentsDocument, GetAllOfficialDocumentsQuery, GetAllPersonsDocument, GetAllPersonsQuery, GetAllProcessesDocument, GetAllProcessesQuery, GetAllServicesDocument, GetAllServicesQuery, GetAllSoftwaresDocument, GetAllSoftwaresQuery, GetAllSubHubsDocument, GetAllSubHubsQuery, GetAllVideosDocument, GetAllVideosQuery } from "./types";
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
const metadataSheetHeaderFields: ContentMetadataSummaryTitle[] = ['Date', 'SubHubs', 'Articles', 'Software', 'Official Documents', 'Link Cards', 'Events', 'Persons', 'Services', 'Videos', 'Categories', 'Infrastructure', 'CaseStudies', 'Funding Pages', 'Capabilities', 'Processes'];
const sheetHeaderFields: ContentMetadataHeaderTitle[] = ['Title', 'Content Type', 'Page path', 'Link', 'Preview Link', 'Contentful Edit Link', 'Publisher', 'Publisher Email', 'Owner', 'Owner Email', 'Is SSO Protected', 'Research Stages', 'Research Stages 1', 'Research Stages 2', 'Research Stages 3', 'Research Stages 4', 'Categories', 'Categories 1', 'Categories 2', 'Categories 3', 'Categories 4', 'Related Orgs', 'Related Orgs 1', 'Related Orgs 2', 'Related Orgs 3', 'Related Orgs 4', 'Next Review', 'Created By', 'Related Contacts', 'Related Contacts 1', 'Related Contacts 2', 'Related Contacts 3', 'Related Contacts 4', 'Is Searchable', 'First Published', 'Last Updated', 'Last Updated By', 'Tags', 'Tags 1', 'Tags 2', 'Tags 3', 'Tags 4', 'Status'];


type ContentMetadataRow = { [key in ContentMetadataHeaderTitle]: string | number | boolean };
type ContentMetadataHeaderTitle = 'Title' | 'Content Type' | 'Page path' | 'Link' | 'Preview Link' | 'Contentful Edit Link' | 'Publisher' | 'Publisher Email' | 'Owner' | 'Owner Email' | 'Is SSO Protected' | 'Research Stages' | 'Research Stages 1' | 'Research Stages 2' | 'Research Stages 3' | 'Research Stages 4' | 'Categories' | 'Categories 1' | 'Categories 2' | 'Categories 3' | 'Categories 4' | 'Related Orgs' | 'Related Orgs 1' | 'Related Orgs 2' | 'Related Orgs 3' | 'Related Orgs 4' | 'Next Review' | 'Created By' | 'Related Contacts' | 'Related Contacts 1' | 'Related Contacts 2' | 'Related Contacts 3' | 'Related Contacts 4' | 'Is Searchable' | 'First Published' | 'Last Updated' | 'Last Updated By' | 'Tags' | 'Tags 1' | 'Tags 2' | 'Tags 3' | 'Tags 4' | 'Status';

type ContentMetadataSummaryRow = { [key in ContentMetadataSummaryTitle]: string | number | boolean };
type ContentMetadataSummaryTitle = 'Date' | 'SubHubs' | 'Articles' | 'Software' | 'Official Documents' | 'Link Cards' | 'Events' | 'Persons' | 'Services' | 'Videos' | 'Categories' | 'Infrastructure' | 'CaseStudies' | 'Funding Pages' | 'Capabilities' | 'Processes';

type ContentfulDocumentType = typeof GetAllArticlesDocument | typeof GetAllCapabilitiesDocument | typeof GetAllCaseStudiesDocument | typeof GetAllCategoriesDocument | typeof GetAllEquipmentDocument | typeof GetAllEventsDocument | typeof GetAllFundingPagesDocument | typeof GetAllLinkCardsDocument | typeof GetAllOfficialDocumentsDocument | typeof GetAllPersonsDocument | typeof GetAllProcessesDocument | typeof GetAllServicesDocument | typeof GetAllSoftwaresDocument | typeof GetAllSubHubsDocument | typeof GetAllVideosDocument;
type ContentfulQueryType = ResultOf<ContentfulDocumentType>;

type ContentType = 'SubHub' | 'Article' | 'Software' | 'OfficialDocuments' | 'LinkCard' | 'Event' | 'Person' | 'Service' | 'Video' | 'Category' | 'Equipment' | 'CaseStudy' | 'Funding' | 'Capability' | 'Process';

interface ContentMetadataData {
    title: string;
    contentType: ContentType;
    pagePath: string;
    link: string;
    previewLink: string;
    contentfulEditLink: string;
    publisher: string;
    publisherEmail: string;
    owner: string;
    ownerEmail: string;
    isSsoProtected: boolean | null | undefined;
    researchStages: number;
    researchStages1: string;
    researchStages2: string;
    researchStages3: string;
    researchStages4: string;
    categories: number;
    categories1: string;
    categories2: string;
    categories3: string;
    categories4: string;
    relatedOrgs: number;
    relatedOrgs1: string;
    relatedOrgs2: string;
    relatedOrgs3: string;
    relatedOrgs4: string;
    nextReview: string;
    createdBy: string;
    relatedContacts: number;
    relatedContacts1: string;
    relatedContacts2: string;
    relatedContacts3: string;
    relatedContacts4: string;
    isSearchable: boolean | null | undefined;
    firstPublishedAt: string;
    lastUpdated: string;
    lastUpdatedBy: string;
    tags: number;
    tags1: string;
    tags2: string;
    tags3: string;
    tags4: string;
    status: string
}

interface ContentMetadataSummaryData {
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
    capabilities: number;
    processes: number;
}

// export function to run report

export async function runContentMetadata(chunkSize?: number): Promise<void> {
    if (chunkSize) {
        GRAPHQL_CHUNK_SIZE = chunkSize;
    }

    try {
        const currentReportDoc = CurrentReportDoc.instance;
        const dataOverTimeDoc = DataOverTimeDoc.instance;


        const data = await getData();


        // upload to S3 bucket in the background
        uploadCsv(data.report, 'Meta Data');

        const reportSheet = await currentReportDoc.getSheet('Meta Data');
        await reportSheet.clear();
        await reportSheet.setHeaderRow(sheetHeaderFields);
        await reportSheet.addRows(data.report);

        const dataOverTimeSheet = await dataOverTimeDoc.getSheet('Content Types');

        const headerValues = dataOverTimeSheet.headerValues;
        if (headerValues !== metadataSheetHeaderFields) {
            dataOverTimeSheet.setHeaderRow(metadataSheetHeaderFields);
        }
        await dataOverTimeSheet.addRow(data.summary);

        // get data over time values from sheet and convert to ContentMetadataSummaryRow[] for csv upload
        const dotsRows = (await dataOverTimeSheet.getRows()).map((row) => {
            const summaryRow: ContentMetadataSummaryRow = {
                Date: row.Date,
                SubHubs: row.SubHubs ?? 0,
                Articles: row.Articles ?? 0,
                Software: row.Software ?? 0,
                "Official Documents": row["Official Documents"] ?? 0,
                "Link Cards": row["Link Cards"] ?? 0,
                Events: row.Events ?? 0,
                Persons: row.Persons ?? 0,
                Services: row.Services ?? 0,
                Videos: row.Videos ?? 0,
                Categories: row.Categories ?? 0,
                Infrastructure: row.Infrastructure ?? 0,
                CaseStudies: row.CaseStudies ?? 0,
                "Funding Pages": row["Funding Pages"] ?? 0,
                Capabilities: row.Capabilities ?? 0,
                Processes: row.Processes ?? 0
            }

            return summaryRow;
        })

        //upload to S3 bucket in the background
        uploadCsv(dotsRows, 'Content Types')
    } catch (e) {
        if (e instanceof Error) {
            console.error(`Error in Meta Data report: ${e.name}: ${e.message}`);
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
    if ('processCollection' in query) return query.processCollection?.total ?? 0;

    throw new Error(`Unknown query type: ${query}`);
}

// mapping function

function mapReportData(query: ContentfulQueryType): Partial<ContentMetadataData>[] | undefined {
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
    if ('processCollection' in query) return mapReportDataProcesses(query);

    throw new Error(`Unknown query type: ${query}`);
}

function getTitle(item: any): string {
    return item?.title ? item.title : ''
}

function getNameField(item: any): string {
    return item?.name ? item.name : ''
}

function getTypeName(item: any): ContentType {
    return item?.__typename == "Equipment" ? "Infrastructure" : item?.__typename
}

function getPagePath(item: any): string {
    if (item?.__typename && item?.slug) {
        switch (process.env.CONTENTFUL_SPACE_ENV) {
            case 'dev':
                return `/${getTypeName(item).toLowerCase()}/${item.slug.toLowerCase()}`
            case 'prod':
                return `/${getTypeName(item).toLowerCase()}/${item.slug.toLowerCase()}`
        }
    }
    return ''
}

function getLink(item: any): string {
    if (item?.__typename && item?.slug) {
        switch (process.env.CONTENTFUL_SPACE_ENV) {
            case 'dev':
                return `https://research-hub-dev.connect.test.amazon.auckland.ac.nz/${getTypeName(item).toLowerCase()}/${item.slug.toLowerCase()}`
            case 'prod':
                return `https://research-hub.auckland.ac.nz/${getTypeName(item).toLowerCase()}/${item.slug.toLowerCase()}`
        }
    }
    return ''
}

function getLinkField(item: any): string {
    return item?.link ? item.link : ''
}

function getUrlField(item: any): string {
    return item?.url ? item.url : ''
}

function getPreviewLink(item: any): string {
    if (item?.__typename && item?.slug) {
        switch (process.env.CONTENTFUL_SPACE_ENV) {
            case 'dev':
                return `https://research-hub-dev-preview.connect.test.amazon.auckland.ac.nz/${getTypeName(item).toLowerCase()}/${item.slug.toLowerCase()}`
            case 'prod':
                return  `https://research-hub-preview.auckland.ac.nz/${getTypeName(item).toLowerCase()}/${item.slug.toLowerCase()}`
        }
    }
    return ''
}

function getContentfulLink(item: any): string {
    return item?.sys?.id ? `https://app.contentful.com/spaces/${process.env.CONTENTFUL_SPACE_ID}/environments/${process.env.CONTENTFUL_SPACE_ENV}/entries/${item.sys.id}` : ""
}

function getPublisherName(item: any): string {
    return item?.publisher?.name ? item.publisher.name : ''
}

function getPublisherEmail(item: any): string {
    return item?.publisher?.email ? item.publisher.email : ''
}

function getOwnerName(item: any): string {
    return item?.owner?.name ? item.owner.name : ''
}

function getOwnerEmail(item: any): string {
    return item?.owner?.email ? item.owner.email : ''
}

function getIsSsoProtected(item: any): boolean {
    return item?.ssoProtected
}

function getResearchStageCount(item: any): number {
    return item?.stageCollection?.total
}

function getResearchStage(item: any, index: number): string {
    index = Math.round(index);
    if (!item?.stageCollection?.items || !Array.isArray(item.stageCollection?.items) ||
        item.stageCollection.items.length < index + 1 || !item.stageCollection.items[index]?.name) {
            return ''
        }
    return item.stageCollection.items[index].name
}

function getCategoryCount(item: any): number {
    return item?.categoryCollection?.total
}

function getCategory(item: any, index: number): string {
    index = Math.round(index);
    if (!item?.categoryCollection?.items || !Array.isArray(item.categoryCollection?.items) ||
        item.categoryCollection.items.length < index + 1 || !item.categoryCollection.items[index]?.name) {
            return ''
        }
    return item.categoryCollection.items[index].name
}

function getRelatedOrgCount(item: any): number {
    return item?.relatedOrgsCollection?.total
}

function getRelatedOrg(item: any, index: number): string {
    index = Math.round(index);
    if (!item?.relatedOrgsCollection?.items || !Array.isArray(item.relatedOrgsCollection?.items) ||
        item.relatedOrgsCollection.items.length < index + 1 || !item.relatedOrgsCollection.items[index]?.name) {
            return ''
        }
    return item.relatedOrgsCollection.items[index].name
}

function formatDate(date: Date): string {
    let dateString = date.toISOString()
    dateString = dateString.substring(0, dateString.indexOf('T'))
    return dateString
}

function getNextReview(item: any): string {
    return item?.nextReview ? formatDate(new Date(item.nextReview)) : ''
}

function getCreatedBy(item: any): string {
    return '' //to be implemented
}

function getRelatedContactCount(item: any): number {
    return item?.relatedContactsCollection?.total
}

function getRelatedContact(item: any, index: number): string {
    index = Math.round(index);
    if (!item?.relatedContactsCollection?.items || !Array.isArray(item.relatedContactsCollection?.items) ||
        item.relatedContactsCollection.items.length < index + 1 || !item.relatedContactsCollection.items[index]?.name) {
            return ''
        }
    return item.relatedContactsCollection.items[index].name
}

function getIsSearchable(item: any): boolean {
    return item?.searchable
}

function getFirstPublishedAt(item: any): string {
    return item?.sys?.firstPublishedAt ? formatDate(new Date(item.sys.firstPublishedAt)) : ''
}

function getLastUpdated(item: any): string {
    return item?.sys?.publishedAt ? formatDate(new Date(item.sys.publishedAt)) : ''
}

function getLastUpdatedBy(item: any): string {
    return '' //to be implemented
}

function getTagCount(item: any): number {
    return item?.contentfulMetadata?.tags?.length
}

function getTag(item: any, index: number): string {
    index = Math.round(index);
    if (!item?.contentfulMetadata?.tags || !Array.isArray(item.contentfulMetadata?.tags) ||
        item.contentfulMetadata.tags.length < index + 1 || !item.contentfulMetadata.tags[index]?.name) {
            return ''
        }
    return item.contentfulMetadata.tags[index].name
}

function getStatus(item: any): string {
    return '' //to be implemented
}

// This section contains implementations for parsing query data into tabular data
// As the return types all slightly differ it was easier to implement one mapping function
// for each type individually. However, this could be generalised and shortened.

function mapReportDataSubHubs(queryData: GetAllSubHubsQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.subHubCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}
function mapReportDataArticles(queryData: GetAllArticlesQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.articleCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}
function mapReportDataSoftwares(queryData: GetAllSoftwaresQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.softwareCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}
function mapReportDataOfficialDocuments(queryData: GetAllOfficialDocumentsQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.officialDocumentsCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getUrlField(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }
        return rowData;
    });
}
function mapReportDataLinkCards(queryData: GetAllLinkCardsQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.linkCardCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getUrlField(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
                }

        return rowData;
    });
}
function mapReportDataEvents(queryData: GetAllEventsQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.eventCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}
function mapReportDataPersons(queryData: GetAllPersonsQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.personCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getNameField(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLinkField(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}
function mapReportDataProcesses(queryData: GetAllProcessesQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.processCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}
function mapReportDataServices(queryData: GetAllServicesQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.serviceCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}
function mapReportDataVideos(queryData: GetAllVideosQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.videoCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getUrlField(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
                }

        return rowData;
    });
}
function mapReportDataCategories(queryData: GetAllCategoriesQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.categoryCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getNameField(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}

function mapReportDataInfrastructure(queryData: GetAllEquipmentQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.equipmentCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}

function mapReportDataCaseStudies(queryData: GetAllCaseStudiesQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.caseStudyCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}

function mapReportDataFundingPages(queryData: GetAllFundingPagesQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.fundingCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    });
}

function mapReportDataCapabilityPages(queryData: GetAllCapabilitiesQuery): Partial<ContentMetadataData>[] | undefined {
    return queryData.capabilityCollection?.items.map((item) => {
        const rowData: Partial<ContentMetadataData> = {
            title: getTitle(item),
            contentType: getTypeName(item),
            pagePath: getPagePath(item),
            link: getLink(item),
            previewLink: getPreviewLink(item),
            contentfulEditLink: getContentfulLink(item),
            publisher: getPublisherName(item),
            publisherEmail: getPublisherEmail(item),
            owner: getOwnerName(item),
            ownerEmail: getOwnerEmail(item),
            isSsoProtected: getIsSsoProtected(item),
            researchStages: getResearchStageCount(item),
            researchStages1: getResearchStage(item, 0),
            researchStages2: getResearchStage(item, 1),
            researchStages3: getResearchStage(item, 2),
            researchStages4: getResearchStage(item, 3),
            categories: getCategoryCount(item),
            categories1: getCategory(item, 0),
            categories2: getCategory(item, 1),
            categories3: getCategory(item, 2),
            categories4: getCategory(item, 3),
            relatedOrgs: getRelatedOrgCount(item),
            relatedOrgs1: getRelatedOrg(item, 0),
            relatedOrgs2: getRelatedOrg(item, 1),
            relatedOrgs3: getRelatedOrg(item, 2),
            relatedOrgs4: getRelatedOrg(item, 3),
            nextReview: getNextReview(item),
            createdBy: getCreatedBy(item),
            relatedContacts: getRelatedContactCount(item),
            relatedContacts1: getRelatedContact(item, 0),
            relatedContacts2: getRelatedContact(item, 1),
            relatedContacts3: getRelatedContact(item, 2),
            relatedContacts4: getRelatedContact(item, 3),
            isSearchable: getIsSearchable(item),
            firstPublishedAt: getFirstPublishedAt(item),
            lastUpdated: getLastUpdated(item),
            lastUpdatedBy: getLastUpdatedBy(item),
            tags: getTagCount(item),
            tags1: getTag(item, 0),
            tags2: getTag(item, 1),
            tags3: getTag(item, 2),
            tags4: getTag(item, 3),
            status: getStatus(item)
        }

        return rowData;
    })
}

// get contentful data

async function getData(): Promise<{ summary: ContentMetadataSummaryRow, report: ContentMetadataRow[] }> {
    const client = getApolloClient();

    const report: Partial<ContentMetadataData>[] = [];

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
    const processRows = await getRows(client, GetAllProcessesDocument);

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
    processRows ? report.push(...processRows.data) : null;

    const summary: ContentMetadataSummaryData = {
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
        capabilities: capabilityRows?.total ?? 0,
        processes: processRows?.total ?? 0
    };

    return {
        summary: makeMetadataSummaryRow(summary),
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
): Promise<{ data: Partial<ContentMetadataData>[], total: number } | undefined> {
    const rows: Partial<ContentMetadataData>[] = [];

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


function makeRow(data: Partial<ContentMetadataData>): ContentMetadataRow {
    return {
        "Title": data.title ?? '',
        "Content Type": data.contentType ?? '',
        "Page path" : data.pagePath ?? '',
        "Link": data.link ?? '',
        "Preview Link": data.previewLink ?? '',
        "Contentful Edit Link": data.contentfulEditLink ?? '',
        "Publisher": data.publisher ?? '',
        "Publisher Email": data.publisherEmail ?? '',
        "Owner": data.owner ?? '',
        "Owner Email": data.ownerEmail ?? '',
        "Is SSO Protected": data.isSsoProtected ?? '',
        "Research Stages": data.researchStages ?? 0,
        "Research Stages 1": data.researchStages1 ?? '',
        "Research Stages 2": data.researchStages2 ?? '',
        "Research Stages 3": data.researchStages3 ?? '',
        "Research Stages 4": data.researchStages4 ?? '',
        "Categories": data.categories ?? 0,
        "Categories 1": data.categories1 ?? '',
        "Categories 2": data.categories2 ?? '',
        "Categories 3": data.categories3 ?? '',
        "Categories 4": data.categories4 ?? '',
        "Related Orgs": data.relatedOrgs ?? 0,
        "Related Orgs 1": data.relatedOrgs1 ?? '',
        "Related Orgs 2": data.relatedOrgs2 ?? '',
        "Related Orgs 3": data.relatedOrgs3 ?? '',
        "Related Orgs 4": data.relatedOrgs4 ?? '',
        "Next Review": data.nextReview ?? '',
        "Created By": data.createdBy ?? '',
        "Related Contacts": data.relatedContacts ?? '',
        "Related Contacts 1": data.relatedContacts1 ?? '',
        "Related Contacts 2": data.relatedContacts2 ?? '',
        "Related Contacts 3": data.relatedContacts3 ?? '',
        "Related Contacts 4": data.relatedContacts4 ?? '',
        "Is Searchable": data.isSearchable ?? '',
        "First Published": data.firstPublishedAt ?? '',
        "Last Updated": data.lastUpdated ?? '',
        "Last Updated By": data.lastUpdatedBy ?? '',
        "Tags": data.tags ?? 0,
        "Tags 1": data.tags1 ?? '',
        "Tags 2": data.tags2 ?? '',
        "Tags 3": data.tags3 ?? '',
        "Tags 4": data.tags4 ?? '',
        "Status": data.status ?? '',
    };
}

function makeMetadataSummaryRow(data: ContentMetadataSummaryData): ContentMetadataSummaryRow {
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
        Capabilities: data.capabilities,
        Processes: data.processes
    };
}

