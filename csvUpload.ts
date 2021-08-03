import { ExportToCsv, Options } from "export-to-csv";
import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { CurrentReportWorkSheet, DataOverTimeWorkSheet } from "./googleDocsWrapper";

export async function uploadCsv(data: unknown, sheet: CurrentReportWorkSheet | DataOverTimeWorkSheet, headers?: string[]): Promise<void> {
    const fileName = sheet.replace(/ /g, '-') + '.csv';

    const csvOptions: Options = {
        filename: fileName,
        showLabels: true,
        useKeysAsHeaders: headers ? false : true,
        headers: headers
    }

    const exporter = new ExportToCsv(csvOptions);
    const csv = exporter.generateCsv(data, true);

    await uploadToS3(fileName, csv);
}

async function uploadToS3(fileName: string, csv: unknown): Promise<void> {
    const path = '/tmp/' + fileName;

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fs.writeFileSync(path, csv as any);
    }
    catch (e) {
        console.log(`Error writing file ${fileName} to /tmp directory`, e)
    }

    try {
        const file = fs.readFileSync(path)    

        const bucketParams: PutObjectCommandInput = {
            Bucket: process.env.BUCKET_NAME,
            Key: 'reports/' + new Date().toDateString() + '/' + fileName,
            Body: file
        }

        const client = new S3Client({region: 'ap-southeast-2'})
        await client.send(new PutObjectCommand(bucketParams))
    }
    catch (e) {
        console.log(`Error uploading ${fileName} to S3 bucket`, e)
    }
}