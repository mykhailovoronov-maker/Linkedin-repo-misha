/**
 * Centralized environment access. Nothing here throws at import time so the app
 * still boots (in "dry-run" mode) when optional integrations are unconfigured.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Server-only. Used by API routes to write with elevated privileges.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "ad-creatives",

  linkedin: {
    // --- OAuth app credentials (for the "Connect LinkedIn" button) ---
    clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    // Must exactly match a redirect URL registered on your LinkedIn app.
    // If empty, it is derived from the incoming request origin.
    redirectUri: process.env.LINKEDIN_REDIRECT_URI ?? "",
    scope: process.env.LINKEDIN_SCOPE ?? "r_ads rw_ads r_ads_reporting",

    // --- Optional single-account fallback (skips OAuth; good for testing your
    //     own account). A per-user connection always takes priority. ---
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN ?? "",
    // Numeric ad account id, e.g. "512345678".
    adAccountId: process.env.LINKEDIN_AD_ACCOUNT_ID ?? "",
    // Organization URN that acts as the ad sponsor, e.g. "urn:li:organization:1234".
    organizationUrn: process.env.LINKEDIN_ORGANIZATION_URN ?? "",
    apiVersion: process.env.LINKEDIN_API_VERSION ?? "202406",
  },

  // Tracking template appended to every destination URL. Supports the
  // placeholders documented in lib/tracking.ts.
  trackingTemplate:
    process.env.URL_TRACKING_TEMPLATE ??
    "utm_source=linkedin&utm_medium=paid-social&utm_campaign={campaign_name}&utm_content={campaign_id}",

  // Secret used to sign the session cookie. Override in production.
  sessionSecret:
    process.env.APP_SESSION_SECRET ?? "dev-insecure-session-secret-change-me",
  // Shared access code used for demo login when Supabase Auth is not configured.
  appAccessCode: process.env.APP_ACCESS_CODE ?? "demo1234",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

/** True when we can verify real user credentials via Supabase Auth. */
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Env-level single-account fallback is fully set. */
export function isLinkedInConfigured(): boolean {
  return Boolean(
    env.linkedin.accessToken &&
      env.linkedin.adAccountId &&
      env.linkedin.organizationUrn,
  );
}

/** The OAuth app is configured, so the "Connect LinkedIn" button can work. */
export function isLinkedInOAuthConfigured(): boolean {
  return Boolean(env.linkedin.clientId && env.linkedin.clientSecret);
}
