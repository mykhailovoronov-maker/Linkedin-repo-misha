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
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function isLinkedInConfigured(): boolean {
  return Boolean(
    env.linkedin.accessToken &&
      env.linkedin.adAccountId &&
      env.linkedin.organizationUrn,
  );
}
