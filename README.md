# LinkedIn Ads Launcher

A small full-stack app that automates launching a LinkedIn Ads campaign. You:

1. **Upload or select a creative image**
2. **Choose a predefined audience**
3. **Set a daily budget**
4. **Enter a destination URL**

…and the app **automatically appends your custom URL tracking template**, **saves
the campaign to Supabase**, and **launches the campaign** on the LinkedIn
Marketing API.

Built with Next.js 14 (App Router) + TypeScript + Tailwind + Supabase.

---

## How it works

```
CampaignForm (client)
   │  upload image ──────────────▶ POST /api/upload ──▶ Supabase Storage ──▶ public URL
   │  submit campaign ───────────▶ POST /api/campaigns
                                        │ 1. validate input (zod)
                                        │ 2. append URL tracking template
                                        │ 3. save draft row to Supabase
                                        │ 4. launch on LinkedIn Marketing API
                                        │ 5. update row with campaign/creative ids
                                        ▼
                                   { campaign, dryRun }
```

Key modules:

| File | Responsibility |
| --- | --- |
| `src/lib/audiences.ts` | Predefined audiences → LinkedIn targeting criteria |
| `src/lib/tracking.ts` | Appends the URL tracking template (placeholder substitution + param merge) |
| `src/lib/linkedin.ts` | LinkedIn Marketing API client (asset upload → campaign → creative → activate) |
| `src/lib/supabase.ts` | Storage upload + campaign persistence |
| `src/app/api/campaigns/route.ts` | Orchestrates the whole launch flow |

## Dry-run mode

If the LinkedIn env vars are **not** set, launches are **simulated**: the campaign
is still validated, tracked, and saved to Supabase, and the API returns
`dryRun: true` with mock ids. This lets you run the full app end-to-end without a
live, approved LinkedIn app. Set the LinkedIn vars to launch for real.

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

Create a project, then run the schema:

```bash
# Paste supabase/schema.sql into the Supabase SQL editor, or:
supabase db push
```

This creates the `campaigns` table and the public `ad-creatives` storage bucket.

### 3. Environment

```bash
cp .env.example .env.local
# fill in the Supabase values (required)
# fill in the LinkedIn values (optional — omit for dry-run mode)
```

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only; used to write campaigns & upload images |
| `SUPABASE_STORAGE_BUCKET` | — | Defaults to `ad-creatives` |
| `LINKEDIN_ACCESS_TOKEN` | for live launch | OAuth token with `r_ads` + `rw_ads` scopes |
| `LINKEDIN_AD_ACCOUNT_ID` | for live launch | Numeric ad account id |
| `LINKEDIN_ORGANIZATION_URN` | for live launch | e.g. `urn:li:organization:1234` |
| `URL_TRACKING_TEMPLATE` | — | Query fragment; placeholders below |

### 4. Run

```bash
npm run dev      # http://localhost:3000
npm test         # unit tests for the tracking logic
```

## URL tracking template

`URL_TRACKING_TEMPLATE` is a query-string fragment appended to every destination
URL. Supported placeholders (substituted at launch time):

- `{campaign_name}`
- `{campaign_id}` (the LinkedIn campaign URN, once known)
- `{audience}`
- `{date}` (YYYY-MM-DD)

Example:

```
utm_source=linkedin&utm_medium=paid-social&utm_campaign={campaign_name}&utm_content={campaign_id}
```

Existing query params on the destination URL are preserved; template params win
on collision so tracking stays deterministic.

## Notes on the LinkedIn integration

`src/lib/linkedin.ts` uses the versioned LinkedIn REST API and performs:

1. `POST /rest/images?action=initializeUpload` then PUT the bytes (register creative asset)
2. `POST /rest/adCampaigns` — create the campaign (PAUSED) with targeting + daily budget
3. `POST /rest/creatives` — create the single-image creative pointing at the tracked URL
4. `POST /rest/adCampaigns/{id}` (PARTIAL_UPDATE) — flip to `ACTIVE` to launch

Exact request shapes evolve with the API version; adjust `LINKEDIN_API_VERSION`
and payloads to match your app's approved products.
