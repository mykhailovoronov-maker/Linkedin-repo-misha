# LinkedIn Ads Launcher

A small full-stack app that automates launching a LinkedIn Ads campaign, with a
simple guided flow anyone can use:

1. **Sign in** (authorization form)
2. **Step 1 — Upload your creative image**
3. **Step 2 — Choose an audience, set a daily budget, enter a destination URL**
4. **Step 3 — Review & launch** → campaign launched ✅

Behind the scenes the app **automatically appends your custom URL tracking
template**, **saves the campaign to Supabase**, and **launches the campaign** on
the LinkedIn Marketing API.

Built with Next.js 14 (App Router) + TypeScript + Tailwind + Supabase.

> **Runs with zero setup.** With no environment variables the app starts in
> **demo mode**: sign in with any email + the access code `demo1234`, campaigns
> are kept in memory, images become inline data URLs, and launches are
> simulated. Add Supabase + LinkedIn credentials to make it fully real.

---

## How it works

```
/login  ──▶ POST /api/auth/login|signup  ──▶ signed session cookie
   │
   ▼  (guided 3-step wizard)
CampaignWizard (client)
   │  upload image ──────────────▶ POST /api/upload ──▶ Supabase Storage / data URL
   │  launch ────────────────────▶ POST /api/campaigns
                                        │ 0. require session
                                        │ 1. validate input (zod)
                                        │ 2. append URL tracking template
                                        │ 3. save draft (Supabase or in-memory)
                                        │ 4. launch on LinkedIn Marketing API
                                        │ 5. update record with campaign/creative ids
                                        ▼
                                   { campaign, dryRun }
```

## Authorization

Set `APP_AUTH_MODE`:

- **`code`** — one shared access code (`APP_ACCESS_CODE`). Share the link + the
  code with a small group; anyone with both gets in. Each person still enters
  their own email, so their campaigns and LinkedIn connection are their own.
- **`accounts`** — individual email/password accounts via Supabase Auth.
- **`auto`** (default) — accounts if Supabase Auth is configured, else shared code.

Sessions are stateless HMAC-signed cookies (`APP_SESSION_SECRET`). Every
campaign and LinkedIn connection is scoped to the signed-in user's email.

> Sharing with a group? Use `APP_AUTH_MODE=code` and **change
> `APP_ACCESS_CODE`** from the default before you send the link.

Key modules:

| File | Responsibility |
| --- | --- |
| `src/components/AuthForm.tsx` | Sign in / create account form |
| `src/components/CampaignWizard.tsx` | Guided 3-step launch flow |
| `src/lib/auth.ts` + `src/lib/session.ts` | Credential check + signed session cookie |
| `src/lib/audiences.ts` | Predefined audiences → LinkedIn targeting criteria |
| `src/lib/tracking.ts` | Appends the URL tracking template (placeholder substitution + param merge) |
| `src/lib/linkedin.ts` | LinkedIn Marketing API client (asset upload → campaign → creative → activate) |
| `src/lib/store.ts` | Persistence facade: Supabase when configured, in-memory otherwise |
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

## Connecting a LinkedIn account

The app has a **Connect LinkedIn** button (Settings page) that runs the OAuth
flow and stores each user's token, so people connect their own ad account —
no token pasting. Real launches require your LinkedIn app to be approved for the
**Marketing Developer Platform**.

**See [`LINKEDIN_SETUP.md`](./LINKEDIN_SETUP.md) for the full step-by-step**
(create the app, get Marketing API approval, set the redirect URL, connect).

Credential priority at launch time (`src/lib/credentials.ts`):

1. The signed-in user's OAuth connection (auto-refreshed if expired)
2. The `LINKEDIN_ACCESS_TOKEN` env fallback (single-account testing)
3. Neither → **dry-run** (simulated launch)

Relevant routes: `GET /api/linkedin/connect` → `GET /api/linkedin/callback` →
`/settings` (pick ad account + org). Status is exposed at
`GET /api/linkedin/status`.

## Notes on the LinkedIn integration

`src/lib/linkedin.ts` uses the versioned LinkedIn REST API and performs:

1. `POST /rest/images?action=initializeUpload` then PUT the bytes (register creative asset)
2. `POST /rest/adCampaigns` — create the campaign (PAUSED) with targeting + daily budget
3. `POST /rest/creatives` — create the single-image creative pointing at the tracked URL
4. `POST /rest/adCampaigns/{id}` (PARTIAL_UPDATE) — flip to `ACTIVE` to launch

Exact request shapes evolve with the API version; adjust `LINKEDIN_API_VERSION`
and payloads to match your app's approved products.
