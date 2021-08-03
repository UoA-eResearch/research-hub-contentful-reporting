import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet";

export type CurrentReportWorkSheet = 'Meta Data' | 'Content Overview' | 'Pages Per Category' | 'Pages Per Org Unit';
export type DataOverTimeWorkSheet = 'Content Types';

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
        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
            throw Error("Could not find credentials");

        await this.doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/gm, '\n'),
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
        if (!process.env.CURRENT_REPORT_SPREADSHEET_ID) {
            throw('Could not find current-report sheet id');
        }
        super(process.env.CURRENT_REPORT_SPREADSHEET_ID);
    }

    public async getSheet(sheetTitle: CurrentReportWorkSheet): Promise<GoogleSpreadsheetWorksheet> {
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
        if(!process.env.DATA_OVER_TIME_SPREADSHEET_ID) {
            throw('Could not find data-over-time sheet id')
        }
        super(process.env.DATA_OVER_TIME_SPREADSHEET_ID);
    }

    public async getSheet(sheetTitle: DataOverTimeWorkSheet): Promise<GoogleSpreadsheetWorksheet> {
        if (!this._initialised) {
            await this.initialise();
        }

        return this.doc.sheetsByTitle[sheetTitle];
    }
}
