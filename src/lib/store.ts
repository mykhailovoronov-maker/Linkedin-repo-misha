import crypto from "node:crypto";
import { isSupabaseConfigured } from "./env";
import {
  uploadCreativeImage,
  insertCampaign,
  updateCampaign as sbUpdateCampaign,
  listCampaigns as sbListCampaigns,
} from "./supabase";
import type { CampaignRecord } from "./types";

/**
 * Persistence facade. Uses Supabase when configured; otherwise falls back to an
 * in-memory store and data-URL images so the entire flow works out of the box
 * with zero external services (great for demos / trying the app).
 */

const g = globalThis as unknown as { __campaigns?: CampaignRecord[] };
g.__campaigns ??= [];
const memory = g.__campaigns;

export function usingMemoryStore(): boolean {
  return !isSupabaseConfigured();
}

/** Store a creative image and return a URL usable as the ad's image. */
export async function saveCreativeImage(
  bytes: ArrayBuffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  if (isSupabaseConfigured()) {
    return uploadCreativeImage(bytes, fileName, contentType);
  }
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

export async function createCampaign(
  record: CampaignRecord,
): Promise<CampaignRecord> {
  if (isSupabaseConfigured()) {
    return insertCampaign(record);
  }
  const saved: CampaignRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  memory.unshift(saved);
  return saved;
}

export async function patchCampaign(
  id: string,
  patch: Partial<CampaignRecord>,
): Promise<void> {
  if (isSupabaseConfigured()) {
    return sbUpdateCampaign(id, patch);
  }
  const idx = memory.findIndex((c) => c.id === id);
  if (idx !== -1) memory[idx] = { ...memory[idx], ...patch };
}

export async function getCampaigns(
  userEmail: string,
): Promise<CampaignRecord[]> {
  if (isSupabaseConfigured()) {
    return sbListCampaigns(userEmail);
  }
  return memory.filter((c) => c.userEmail === userEmail);
}
