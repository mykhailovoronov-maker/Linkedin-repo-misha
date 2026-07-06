import { env } from "./env";
import type { Audience, LaunchResult } from "./types";

/**
 * Thin client over the LinkedIn Marketing (Ad) API. Implements the minimal
 * launch flow:
 *   1. Upload the creative image as an ad asset.
 *   2. Create a campaign (single-image sponsored content) with targeting +
 *      daily budget, in PAUSED state.
 *   3. Create a creative referencing the image + tracked destination URL.
 *   4. Flip the campaign to ACTIVE to launch.
 *
 * Credentials are passed in per-launch (resolved from the user's connection or
 * the env fallback). When they're absent/incomplete the client runs in
 * "dry-run" mode and returns deterministic mock ids, so the whole app is
 * exercisable without a live LinkedIn app. See LINKEDIN_SETUP.md.
 */

const API_BASE = "https://api.linkedin.com/rest";

export interface LinkedInCredentials {
  accessToken: string;
  adAccountId: string;
  organizationUrn: string;
  apiVersion?: string;
}

export interface LaunchParams {
  campaignName: string;
  audience: Audience;
  dailyBudget: number;
  currency: string;
  trackedUrl: string;
  imageUrl: string;
}

export function credentialsComplete(
  creds: Partial<LinkedInCredentials> | null | undefined,
): creds is LinkedInCredentials {
  return Boolean(
    creds?.accessToken && creds.adAccountId && creds.organizationUrn,
  );
}

export async function launchCampaign(
  params: LaunchParams,
  creds?: Partial<LinkedInCredentials> | null,
): Promise<LaunchResult> {
  if (!credentialsComplete(creds)) {
    return {
      campaignId: `dry-run-campaign-${Date.now()}`,
      creativeId: `dry-run-creative-${Date.now()}`,
      dryRun: true,
    };
  }

  const assetUrn = await uploadImageAsset(creds, params.imageUrl);
  const campaignUrn = await createCampaign(creds, params);
  const creativeUrn = await createCreative(creds, campaignUrn, assetUrn, params);
  await activateCampaign(creds, campaignUrn);

  return { campaignId: campaignUrn, creativeId: creativeUrn, dryRun: false };
}

function headers(creds: LinkedInCredentials): Record<string, string> {
  return {
    Authorization: `Bearer ${creds.accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": creds.apiVersion ?? env.linkedin.apiVersion,
  };
}

async function liFetch(
  creds: LinkedInCredentials,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers(creds), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `LinkedIn API ${init.method ?? "GET"} ${path} failed (${res.status}): ${body}`,
    );
  }
  return res;
}

const accountUrn = (creds: LinkedInCredentials) =>
  `urn:li:sponsoredAccount:${creds.adAccountId}`;

/** Register + upload the creative image, returning its image URN. */
async function uploadImageAsset(
  creds: LinkedInCredentials,
  imageUrl: string,
): Promise<string> {
  // 1. Register an upload slot.
  const registerRes = await liFetch(creds, "/images?action=initializeUpload", {
    method: "POST",
    body: JSON.stringify({
      initializeUploadRequest: { owner: creds.organizationUrn },
    }),
  });
  const registerJson = (await registerRes.json()) as {
    value: { uploadUrl: string; image: string };
  };
  const { uploadUrl, image } = registerJson.value;

  // 2. Fetch the source bytes and PUT them to the upload URL.
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Could not fetch creative image: ${imageUrl}`);
  }
  const bytes = await imgRes.arrayBuffer();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${creds.accessToken}` },
    body: bytes,
  });
  if (!putRes.ok) {
    throw new Error(`Image upload to LinkedIn failed (${putRes.status})`);
  }

  return image; // e.g. "urn:li:image:C4D..."
}

/** Create a paused single-image sponsored campaign. Returns campaign URN. */
async function createCampaign(
  creds: LinkedInCredentials,
  params: LaunchParams,
): Promise<string> {
  const body = {
    account: accountUrn(creds),
    name: params.campaignName,
    type: "SPONSORED_UPDATES",
    costType: "CPM",
    // Budgets are sent in fractional currency amounts as strings.
    dailyBudget: {
      currencyCode: params.currency,
      amount: params.dailyBudget.toFixed(2),
    },
    locale: { country: "US", language: "en" },
    runSchedule: { start: Date.now() },
    status: "PAUSED",
    targetingCriteria: params.audience.targetingCriteria,
  };

  const res = await liFetch(creds, "/adCampaigns", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const id = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id");
  if (!id) {
    throw new Error("LinkedIn did not return a campaign id");
  }
  return `urn:li:sponsoredCampaign:${id}`;
}

/** Create the single-image creative linked to the campaign. */
async function createCreative(
  creds: LinkedInCredentials,
  campaignUrn: string,
  imageUrn: string,
  params: LaunchParams,
): Promise<string> {
  const body = {
    campaign: campaignUrn,
    inlineContent: {
      spec: {
        content: {
          contentEntities: [
            { entity: imageUrn, landingPageUrl: params.trackedUrl },
          ],
          title: params.campaignName,
        },
      },
    },
    intendedStatus: "ACTIVE",
  };

  const res = await liFetch(creds, "/creatives", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const id = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id");
  if (!id) {
    throw new Error("LinkedIn did not return a creative id");
  }
  return id.startsWith("urn:") ? id : `urn:li:sponsoredCreative:${id}`;
}

/** Flip the campaign from PAUSED to ACTIVE — this launches it. */
async function activateCampaign(
  creds: LinkedInCredentials,
  campaignUrn: string,
): Promise<void> {
  const id = campaignUrn.split(":").pop();
  await liFetch(creds, `/adCampaigns/${id}`, {
    method: "POST",
    headers: { "X-RestLi-Method": "PARTIAL_UPDATE" },
    body: JSON.stringify({ patch: { $set: { status: "ACTIVE" } } }),
  });
}
