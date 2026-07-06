import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env";
import type { CampaignRecord } from "./types";

let cached: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the service-role key. Never import this
 * into client components — the service-role key must stay on the server.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!cached) {
    cached = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/** Upload a creative image to storage and return its public URL. */
export async function uploadCreativeImage(
  file: ArrayBuffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const path = `${Date.now()}-${sanitizeFileName(fileName)}`;

  const { error } = await supabase.storage
    .from(env.supabaseBucket)
    .upload(path, file, { contentType, upsert: false });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(env.supabaseBucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Insert a campaign row and return the persisted record (with id). */
export async function insertCampaign(
  record: CampaignRecord,
): Promise<CampaignRecord> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("campaigns")
    .insert(toRow(record))
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save campaign: ${error.message}`);
  }
  return fromRow(data);
}

/** Patch an existing campaign row (status, launch ids, error). */
export async function updateCampaign(
  id: string,
  patch: Partial<CampaignRecord>,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("campaigns")
    .update(toRow(patch))
    .eq("id", id);
  if (error) {
    throw new Error(`Failed to update campaign: ${error.message}`);
  }
}

export async function listCampaigns(
  userEmail?: string,
): Promise<CampaignRecord[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (userEmail) query = query.eq("user_email", userEmail);
  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list campaigns: ${error.message}`);
  }
  return (data ?? []).map(fromRow);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "creative";
}

/* --- row <-> record mapping (snake_case columns) --- */

function toRow(record: Partial<CampaignRecord>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (record.name !== undefined) row.name = record.name;
  if (record.userEmail !== undefined) row.user_email = record.userEmail;
  if (record.audienceId !== undefined) row.audience_id = record.audienceId;
  if (record.audienceName !== undefined) row.audience_name = record.audienceName;
  if (record.dailyBudget !== undefined) row.daily_budget = record.dailyBudget;
  if (record.currency !== undefined) row.currency = record.currency;
  if (record.destinationUrl !== undefined)
    row.destination_url = record.destinationUrl;
  if (record.trackedUrl !== undefined) row.tracked_url = record.trackedUrl;
  if (record.imageUrl !== undefined) row.image_url = record.imageUrl;
  if (record.status !== undefined) row.status = record.status;
  if (record.linkedinCampaignId !== undefined)
    row.linkedin_campaign_id = record.linkedinCampaignId;
  if (record.linkedinCreativeId !== undefined)
    row.linkedin_creative_id = record.linkedinCreativeId;
  if (record.error !== undefined) row.error = record.error;
  return row;
}

function fromRow(row: Record<string, any>): CampaignRecord {
  return {
    id: row.id,
    name: row.name,
    userEmail: row.user_email,
    audienceId: row.audience_id,
    audienceName: row.audience_name,
    dailyBudget: Number(row.daily_budget),
    currency: row.currency,
    destinationUrl: row.destination_url,
    trackedUrl: row.tracked_url,
    imageUrl: row.image_url,
    status: row.status,
    linkedinCampaignId: row.linkedin_campaign_id,
    linkedinCreativeId: row.linkedin_creative_id,
    error: row.error,
    createdAt: row.created_at,
  };
}
