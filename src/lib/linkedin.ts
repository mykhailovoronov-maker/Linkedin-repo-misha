import { env, isLinkedInConfigured } from "./env";
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
 * When credentials are absent the client runs in "dry-run" mode and returns
 * deterministic mock ids, so the whole app is exercisable without a live
 * LinkedIn app. See README for the required env vars and OAuth scopes
 * (r_ads, rw_ads).
 */

const API_BASE = "https://api.linkedin.com/rest";

export interface LaunchParams {
  campaignName: string;
  audience: Audience;
  dailyBudget: number;
  currency: string;
  trackedUrl: string;
  imageUrl: string;
}

export async function launchCampaign(
  params: LaunchParams,
): Promise<LaunchResult> {
  if (!isLinkedInConfigured()) {
    return {
      campaignId: `dry-run-campaign-${Date.now()}`,
      creativeId: `dry-run-creative-${Date.now()}`,
      dryRun: true,
    };
  }

  const assetUrn = await uploadImageAsset(params.imageUrl);
  const campaignUrn = await createCampaign(params);
  const creativeUrn = await createCreative(campaignUrn, assetUrn, params);
  await activateCampaign(campaignUrn);

  return {
    campaignId: campaignUrn,
    creativeId: creativeUrn,
    dryRun: false,
  };
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.linkedin.accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": env.linkedin.apiVersion,
  };
}

async function liFetch(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `LinkedIn API ${init.method ?? "GET"} ${path} failed (${res.status}): ${body}`,
    );
  }
  return res;
}

const accountUrn = () =>
  `urn:li:sponsoredAccount:${env.linkedin.adAccountId}`;

/** Register + upload the creative image, returning its image URN. */
async function uploadImageAsset(imageUrl: string): Promise<string> {
  // 1. Register an upload slot.
  const registerRes = await liFetch("/images?action=initializeUpload", {
    method: "POST",
    body: JSON.stringify({
      initializeUploadRequest: { owner: env.linkedin.organizationUrn },
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
    headers: { Authorization: `Bearer ${env.linkedin.accessToken}` },
    body: bytes,
  });
  if (!putRes.ok) {
    throw new Error(`Image upload to LinkedIn failed (${putRes.status})`);
  }

  return image; // e.g. "urn:li:image:C4D..."
}

/** Create a paused single-image sponsored campaign. Returns campaign URN. */
async function createCampaign(params: LaunchParams): Promise<string> {
  const body = {
    account: accountUrn(),
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

  const res = await liFetch("/adCampaigns", {
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
            {
              entity: imageUrn,
              landingPageUrl: params.trackedUrl,
            },
          ],
          title: params.campaignName,
        },
      },
    },
    intendedStatus: "ACTIVE",
  };

  const res = await liFetch("/creatives", {
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
async function activateCampaign(campaignUrn: string): Promise<void> {
  const id = campaignUrn.split(":").pop();
  await liFetch(`/adCampaigns/${id}`, {
    method: "POST",
    headers: { "X-RestLi-Method": "PARTIAL_UPDATE" },
    body: JSON.stringify({ patch: { $set: { status: "ACTIVE" } } }),
  });
}
