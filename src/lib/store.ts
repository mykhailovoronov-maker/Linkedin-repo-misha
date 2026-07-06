import crypto from "node:crypto";
import { isSupabaseConfigured } from "./env";
import {
  uploadCreativeImage,
  insertCampaign,
  updateCampaign as sbUpdateCampaign,
  listCampaigns as sbListCampaigns,
  getConnectionRow,
  upsertConnectionRow,
  deleteConnectionRow,
} from "./supabase";
import type { CampaignRecord, LinkedInConnection } from "./types";

/**
 * Persistence facade. Uses Supabase when configured; otherwise falls back to an
 * in-memory store and data-URL images so the entire flow works out of the box
 * with zero external services (great for demos / trying the app).
 */

const g = globalThis as unknown as {
  __campaigns?: CampaignRecord[];
  __connections?: Record<string, LinkedInConnection>;
};
g.__campaigns ??= [];
g.__connections ??= {};
const memory = g.__campaigns;
const memoryConnections = g.__connections;

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

/* --- LinkedIn connection --- */

export async function getConnection(
  userEmail: string,
): Promise<LinkedInConnection | null> {
  if (isSupabaseConfigured()) return getConnectionRow(userEmail);
  return memoryConnections[userEmail] ?? null;
}

export async function saveConnection(
  conn: LinkedInConnection,
): Promise<void> {
  const withDefaults = {
    ...conn,
    connectedAt: conn.connectedAt ?? new Date().toISOString(),
  };
  if (isSupabaseConfigured()) return upsertConnectionRow(withDefaults);
  memoryConnections[conn.userEmail] = withDefaults;
}

/** Merge a partial update into an existing connection. */
export async function patchConnection(
  userEmail: string,
  patch: Partial<LinkedInConnection>,
): Promise<LinkedInConnection | null> {
  const existing = await getConnection(userEmail);
  if (!existing) return null;
  const merged = { ...existing, ...patch, userEmail };
  await saveConnection(merged);
  return merged;
}

export async function deleteConnection(userEmail: string): Promise<void> {
  if (isSupabaseConfigured()) return deleteConnectionRow(userEmail);
  delete memoryConnections[userEmail];
}
