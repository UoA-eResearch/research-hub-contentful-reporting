import { GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { uploadCsv } from "../csvUpload";
import { CurrentReportDoc } from "../googleDocsWrapper";
import { ContentGraph, ContentLink, generateContentGraph } from "../graph";

type ContentGraphRow = {
    Type: string,
    Title: string,
    'Degree of connectivity': number,
    Link: string,
    Edit: string
};
type ContentLinksRow = { [key in ContentLinksHeaderTitle]: string };
type ContentGraphHeaderTitle = 'Type' | 'Title' | 'Degree of connectivity' | 'Link' | 'Edit';
type ContentLinksHeaderTitle = 'Item1' | 'Id1' | 'Link1' | 'Edit1' | 'Item2' | 'Id2' | 'Link2' | 'Edit2';

const contentGraphHeaderFields: ContentGraphHeaderTitle[] = ['Title', 'Type', 'Degree of connectivity', 'Link', 'Edit'];
const contentLinksHeaderFields: ContentLinksHeaderTitle[] = ['Item1', 'Id1', 'Link1', 'Edit1', 'Item2', 'Id2', 'Link2', 'Edit2'];

export async function runContentGraphReports(): Promise<void> {
    const currentReportDoc = CurrentReportDoc.instance;

    const graph = await generateContentGraph();

    await runConnectivityReport(graph, await currentReportDoc.getSheet('Content Graph'));
    await runLinksReport(graph, await currentReportDoc.getSheet('Connection List'));
}

async function runConnectivityReport(graph: ContentGraph, sheet: GoogleSpreadsheetWorksheet): Promise<void> {
    const rows: ContentGraphRow[] = [];
    for (const node of graph.nodes) {
        const row: ContentGraphRow = {
            Type: node.type,
            Title: node.name,
            'Degree of connectivity': countLinks(node.id, graph.links),
            Link: `https://research-hub.auckland.ac.nz/${node.type}/${node.slug}`,
            Edit: process.env.CONTENTFUL_SPACE_ID
                ? `https://app.contentful.com/spaces/${process.env.CONTENTFUL_SPACE_ID}/entries/${node.id}`
                : ''
        }

        rows.push(row);
    }

    rows.sort((a, b) => a["Degree of connectivity"] - b["Degree of connectivity"]);

    uploadCsv(rows, 'Content Graph');

    await sheet.clear();
    await sheet.setHeaderRow(contentGraphHeaderFields);
    await sheet.addRows(rows);
}

function countLinks(nodeId: string, links: ContentLink[]): number {
    return links.filter(link => link.source === nodeId).length
}

async function runLinksReport(graph: ContentGraph, sheet: GoogleSpreadsheetWorksheet): Promise<void> {
    const rows: ContentLinksRow[] = [];
    for (const link of graph.links) {
        const sourceNode = graph.nodes.find(node => node.id === link.source);
        const targetNode = graph.nodes.find(node => node.id === link.target);

        if (sourceNode === undefined || targetNode === undefined) continue;
        const row: ContentLinksRow = {
            Item1: sourceNode.name,
            Id1: link.source,
            Link1: `https://research-hub.auckland.ac.nz/${sourceNode.type}/${sourceNode.slug}`,
            Edit1: process.env.CONTENTFUL_SPACE_ID
                ? `https://app.contentful.com/spaces/${process.env.CONTENTFUL_SPACE_ID}/entries/${sourceNode.id}`
                : '',
            Item2: targetNode.name,
            Id2: link.target,
            Link2: `https://research-hub.auckland.ac.nz/${targetNode.type}/${targetNode.slug}`,
            Edit2: process.env.CONTENTFUL_SPACE_ID
                ? `https://app.contentful.com/spaces/${process.env.CONTENTFUL_SPACE_ID}/entries/${targetNode.id}`
                : ''
        }

        rows.push(row);
    }

    uploadCsv(rows, 'Connection List');

    await sheet.clear();
    await sheet.setHeaderRow(contentLinksHeaderFields);
    await sheet.addRows(rows);
}