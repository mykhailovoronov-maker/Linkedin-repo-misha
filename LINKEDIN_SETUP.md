# Connecting your LinkedIn account

Launching real campaigns needs two things: (1) a LinkedIn app that's **approved
for the Marketing API**, and (2) each user connecting their account via the
**Connect LinkedIn** button. Step 1 is a one-time approval; step 2 is a click.

Until this is set up, the app runs in **dry-run mode** — everything works
(validation, tracking, saving), but launches are simulated instead of hitting
LinkedIn.

---

## Step 1 — Create the LinkedIn app (one-time)

1. **Company Page** — you need a LinkedIn Company Page to run ads. Create one at
   linkedin.com/company/setup/new if you don't have one.
2. **Developer app** — go to
   [developer.linkedin.com/apps](https://www.linkedin.com/developers/apps) →
   **Create app**. Associate it with your Company Page and verify the Page.
3. **Request Marketing API access** — on the app's **Products** tab, request
   **Marketing Developer Platform**. This is a **review** (you describe your use
   case). Approval typically takes a few days to ~2 weeks. **You cannot create
   campaigns via the API until this is granted** — calls return `403` before then.
4. Once approved, confirm your app has the scopes: `r_ads`, `rw_ads`,
   `r_ads_reporting`.

## Step 2 — Configure OAuth

1. On the app's **Auth** tab, copy the **Client ID** and **Client Secret**.
2. Add an **Authorized redirect URL** that exactly matches where this app runs:
   ```
   https://YOUR-APP-DOMAIN/api/linkedin/callback
   ```
   For local dev: `http://localhost:3000/api/linkedin/callback`.
3. Put these in your `.env.local`:
   ```
   LINKEDIN_CLIENT_ID=xxxxxxxx
   LINKEDIN_CLIENT_SECRET=xxxxxxxx
   LINKEDIN_REDIRECT_URI=https://YOUR-APP-DOMAIN/api/linkedin/callback
   ```
   (Leave `LINKEDIN_REDIRECT_URI` blank to auto-derive it from the request origin —
   but it must still be registered on the app exactly.)

## Step 3 — Connect + pick your ad account

1. Restart the app and open **Settings** (the banner on the launcher links there).
2. Click **Connect LinkedIn** → authorize on LinkedIn → you're redirected back.
3. Enter your **Ad account ID** and **Organization URN**:
   - **Ad account ID** — the numeric ID in
     [Campaign Manager](https://www.linkedin.com/campaignmanager/) (e.g. `512345678`).
   - **Organization URN** — your Company Page as `urn:li:organization:1234567`
     (the number is in your Page's admin URL).
4. Save. The banner turns green — launches now go live on LinkedIn.

---

## Testing on just your own account (skip OAuth)

If you only want to launch into your own account and already have a token, you
can skip the button and set the fallback env vars instead:

```
LINKEDIN_ACCESS_TOKEN=your-token
LINKEDIN_AD_ACCOUNT_ID=512345678
LINKEDIN_ORGANIZATION_URN=urn:li:organization:1234567
```

A per-user connection made through the button always takes priority over these.

## Notes

- **Token lifetime** — access tokens last ~60 days. If your approved app issues
  refresh tokens, the app refreshes automatically before a launch.
- **Where tokens live** — with Supabase configured, each user's token is stored
  in the `linkedin_connections` table (see `supabase/schema.sql`). Without
  Supabase, connections are kept in memory (fine for local testing).
- **API version** — set `LINKEDIN_API_VERSION` (default `202406`) to match your
  app's approved version; request payloads in `src/lib/linkedin.ts` may need
  small adjustments per version.
