# Lead Intake & Scoring Automation

A contact form on a custom website feeds an n8n workflow that scores each lead, logs it to Google Sheets, and emails the owner when a lead is hot.

## Architecture

```
Browser form (Vercel static page)
   │  POST /api/lead
   ▼
Vercel function  ── validates fields, drops honeypot spam
   │  POST + X-Lead-Secret header
   ▼
n8n Webhook ─→ Score Lead ─→ Save to Google Sheets ─→ Respond to Webhook ─→ Is Hot Lead? ─→ Gmail alert
```

Why a Vercel function sits in the middle: the n8n webhook URL and secret never reach the browser, no CORS setup is needed, and input checks live in one place.

## Scoring

| Signal | Points |
|---|---|
| Budget | $20k+ = 35, $5k–$20k = 25, $1k–$5k = 15, under $1k = 5 |
| Company size | 200+ = 20, 51–200 = 15, 11–50 = 10, 1–10 = 5 |
| Timeline | This month = 20, 1–3 months = 15, 3+ months = 5 |
| Business email (not gmail/yahoo/etc.) | 10 |

Tiers: **Hot** ≥ 70, **Warm** ≥ 40, otherwise **Cold**. Only Hot leads trigger the email.

## The website

The site is for **Brightline Studio**, a fictional web design and automation studio. Studios, consultancies, and B2B or home-service companies all use this kind of lead scoring, and a studio's budget, company-size and timeline questions fit it naturally.

| Page | Purpose |
|---|---|
| `/` | Home: hero, services overview, process, sample work |
| `/services` | Four services with typical budgets, and a diagram of how this site's form works |
| `/work` | Three clearly labelled fictional sample projects |
| `/about` | Story and principles |
| `/contact` | The lead form, next steps and FAQ |
| `/privacy`, `404` | Privacy note and error page |

It is plain HTML and CSS with two small scripts, no build step. Pages are marked `noindex` because the company is fictional; remove the `robots` meta tag from each page to allow indexing.

## Repository layout

```
workflow.json          n8n workflow (import into n8n)
website/
  index.html, services.html, work.html, about.html,
  contact.html, privacy.html, 404.html    site pages
  styles.css, site.js, contact.js, favicon.svg
  vercel.json          clean URLs (/services instead of /services.html)
  api/lead.js          Vercel function: validate, then forward to n8n
  lib/validate.js      field validation shared by the function and tests
  test/                unit tests and site checks (npm test)
```

## Setup

### 1. n8n

1. Import `workflow.json` (**Workflows → Import from File**).
2. **Save to Google Sheets**: connect a Google Sheets credential and replace `REPLACE_WITH_GOOGLE_SHEET_ID` with your sheet's ID. The sheet needs a tab named `Leads` with this header row:
   `submittedAt | name | email | company | companySize | budget | timeline | message | businessEmail | score | tier`
3. **Send Hot Lead Email**: connect a Gmail credential and replace `REPLACE_WITH_YOUR_EMAIL`.
4. **Webhook**: create a **Header Auth** credential with name `X-Lead-Secret` and a long random value, and assign it to the node. Generate a value with:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
5. Publish the workflow. Copy the **production** URL from the Webhook node (`.../webhook/lead-intake`).

### 2. Vercel

1. Push this repo to GitHub and import it in Vercel, with **Root Directory** set to `website`.
2. Add environment variables:
   - `N8N_WEBHOOK_URL`: the production webhook URL
   - `N8N_WEBHOOK_SECRET`: the same value as the Header Auth credential
3. Deploy.

## Testing

Run the unit tests locally:

```
cd website
npm test
```

Then submit these on the live site and check the sheet and your inbox:

| Test | Company size | Budget | Timeline | Email | Expected |
|---|---|---|---|---|---|
| Hot | 200+ | $20k+ | This month | you@yourcompany.com | Row added, email sent |
| Warm | 11–50 | $1k–$5k | 1–3 months | you@gmail.com | Row added, no email |
| Cold | 1–10 | Under $1k | 3+ months | you@gmail.com | Row added, no email |

Also confirm that a request without the secret header is rejected by n8n, and that a submission with the hidden `website` field filled adds no row.

## Possible extensions

- Add Cloudflare Turnstile for stronger spam protection.
- Send an auto-reply to the lead.
- Enrich the company domain with a company-data API.
- Add an n8n Error Trigger workflow for failure alerts.
