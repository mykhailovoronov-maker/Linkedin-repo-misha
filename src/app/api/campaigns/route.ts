import { NextResponse } from "next/server";
import { campaignInputSchema } from "@/lib/validation";
import { getAudienceById } from "@/lib/audiences";
import { appendTrackingTemplate } from "@/lib/tracking";
import { launchCampaign } from "@/lib/linkedin";
import { createCampaign, patchCampaign, getCampaigns } from "@/lib/store";
import { env } from "@/lib/env";
import { getSessionUser } from "@/lib/session";
import type { CampaignRecord } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const campaigns = await getCampaigns(user.email);
    return NextResponse.json({ campaigns });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list" },
      { status: 500 },
    );
  }
}

/**
 * Orchestrates a launch:
 *   auth → validate → append tracking template → save draft →
 *   launch on LinkedIn → update the saved record with the result.
 */
export async function POST(request: Request) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = campaignInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const audience = getAudienceById(input.audienceId);
  if (!audience) {
    return NextResponse.json({ error: "Unknown audience" }, { status: 400 });
  }

  // 1. Build the tracked destination URL from the custom template.
  let trackedUrl: string;
  try {
    trackedUrl = appendTrackingTemplate(
      input.destinationUrl,
      env.trackingTemplate,
      { campaignName: input.name, audience: audience.name },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bad destination URL" },
      { status: 400 },
    );
  }

  // 2. Persist a draft record first so nothing is lost if the launch fails.
  const draft: CampaignRecord = {
    name: input.name,
    userEmail: user.email,
    audienceId: input.audienceId,
    audienceName: audience.name,
    dailyBudget: input.dailyBudget,
    currency: input.currency,
    destinationUrl: input.destinationUrl,
    trackedUrl,
    imageUrl: input.imageUrl,
    status: "launching",
  };

  let saved: CampaignRecord;
  try {
    saved = await createCampaign(draft);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 500 },
    );
  }

  // 3. Launch on LinkedIn (or simulate in dry-run mode).
  try {
    const result = await launchCampaign({
      campaignName: input.name,
      audience,
      dailyBudget: input.dailyBudget,
      currency: input.currency,
      trackedUrl,
      imageUrl: input.imageUrl,
    });

    // Re-derive the tracked URL with the real campaign id now that we have one.
    const finalTrackedUrl = appendTrackingTemplate(
      input.destinationUrl,
      env.trackingTemplate,
      {
        campaignName: input.name,
        campaignId: result.campaignId,
        audience: audience.name,
      },
    );

    await patchCampaign(saved.id!, {
      status: "active",
      trackedUrl: finalTrackedUrl,
      linkedinCampaignId: result.campaignId,
      linkedinCreativeId: result.creativeId,
      error: null,
    });

    return NextResponse.json({
      campaign: {
        ...saved,
        status: "active",
        trackedUrl: finalTrackedUrl,
        linkedinCampaignId: result.campaignId,
        linkedinCreativeId: result.creativeId,
      },
      dryRun: result.dryRun,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Launch failed";
    await patchCampaign(saved.id!, { status: "failed", error: message }).catch(
      () => undefined,
    );
    return NextResponse.json(
      { error: message, campaignId: saved.id },
      { status: 502 },
    );
  }
}
