import { uploadCsv } from "../csvUpload";
import { CurrentReportDoc } from "../googleDocsWrapper";
import { ContentLink, generateContentGraph } from "../graph";

type Row = {
    Type: string,
    Title: string,
    'Degree of connectivity': number,
    Link: string,
    Edit: string
};
type HeaderTitle = 'Type' | 'Title' | 'Degree of connectivity' | 'Link' | 'Edit';

const sheetHeaderFields: HeaderTitle[] = ['Type', 'Title', 'Degree of connectivity', 'Link', 'Edit'];

export async function runContentGraph(): Promise<void> {
    const currentReportDoc = CurrentReportDoc.instance;

    const data = await getData();

    uploadCsv(data, 'Content Graph');

    const reportSheet = await currentReportDoc.getSheet('Content Graph');
    await reportSheet.clear();
    await reportSheet.setHeaderRow(sheetHeaderFields);
    await reportSheet.addRows(data);
}

async function getData(): Promise<Row[]> {
    const graph = await generateContentGraph();

    const rows: Row[] = [];
    for (const node of graph.nodes) {
        const row: Row = {
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

    return rows.sort((a, b) => a["Degree of connectivity"] - b["Degree of connectivity"]);
}

function countLinks(nodeId: string, links: ContentLink[]): number {
    return links.filter(link => link.source === nodeId).length
}