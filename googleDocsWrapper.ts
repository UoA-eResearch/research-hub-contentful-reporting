import { GoogleSpreadsheet } from "google-spreadsheet";
import * as googleDocsConfig from "./googleDocsConfig.json";

type CurrentReportWorkSheet = 'Meta Data' | 'Content Overview' | 'Pages/Category';
type DataOverTimeWorkSheet = 'Content Types';

class GoogleDoc {
    public doc: GoogleSpreadsheet;
    protected _initialised = false;

    public get initialised(): boolean {
        return this._initialised;
    }

    constructor(id: string) {
        this.doc = new GoogleSpreadsheet(id);
    }

    public async initialise(): Promise<void> {
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY)
            throw Error("Could not find credentials");

        await this.doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY,
        });

        await this.doc.loadInfo();

        this._initialised = true;
    }

}

export class CurrentReportDoc extends GoogleDoc {
    private static _instance: CurrentReportDoc;

    public static get instance(): CurrentReportDoc {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        super(googleDocsConfig.CURRENT_REPORT_SPREADSHEET_ID);
    }

    public async getSheet(sheetTitle: CurrentReportWorkSheet) {
        if (!this._initialised) {
            await this.initialise();
        }

        return this.doc.sheetsByTitle[sheetTitle];
    }
}

export class DataOverTimeDoc extends GoogleDoc {
    private static _instance: DataOverTimeDoc;

    public static get instance(): DataOverTimeDoc {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        super(googleDocsConfig.DATA_OVER_TIME_SPREADSHEET_ID);
    }

    public async getSheet(sheetTitle: DataOverTimeWorkSheet) {
        if (!this._initialised) {
            await this.initialise();
        }

        return this.doc.sheetsByTitle[sheetTitle];
    }
}
