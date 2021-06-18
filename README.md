# Research Hub Contentful Report

This is an AWS lambda function written in typescript. It's purpose is to generate reporting on the content stored in the contentful CMS for the research-hub. The lambda queries the contentful graphQL API and stores the report data in Google Sheets.
## Prerequisites

This lambda function needs access to a Google Service Account to store the generated report data in a Google Sheet. Follow the instructions [here](https://developers.google.com/identity/protocols/oauth2/service-account) and generate a key.
## Installation

```npm install```
## Generate Typescript types

This happens automatically when you run `npm install`, but it can also be triggered manually.

1. Run `npm run generate`

