/**
 * URL tracking template handling.
 *
 * The template is a query-string fragment, e.g.
 *   utm_source=linkedin&utm_medium=paid-social&utm_campaign={campaign_name}
 *
 * Supported placeholders (case-insensitive), substituted at append time:
 *   {campaign_name}  {campaign_id}  {audience}  {date}
 *
 * Existing query parameters on the destination URL are preserved. Template
 * params override collisions so tracking is deterministic.
 */

export interface TrackingContext {
  campaignName: string;
  campaignId?: string;
  audience?: string;
}

function resolvePlaceholders(template: string, ctx: TrackingContext): string {
  const values: Record<string, string> = {
    campaign_name: ctx.campaignName,
    campaign_id: ctx.campaignId ?? "",
    audience: ctx.audience ?? "",
    date: new Date().toISOString().slice(0, 10),
  };

  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key.toLowerCase()];
    return value !== undefined ? value : "";
  });
}

/**
 * Merge the tracking template into a destination URL and return the full URL.
 * Throws if the destination URL is not a valid absolute http(s) URL.
 */
export function appendTrackingTemplate(
  destinationUrl: string,
  template: string,
  ctx: TrackingContext,
): string {
  let url: URL;
  try {
    url = new URL(destinationUrl);
  } catch {
    throw new Error(`Invalid destination URL: ${destinationUrl}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Destination URL must be http(s): ${destinationUrl}`);
  }

  const resolved = resolvePlaceholders(template, ctx);
  const templateParams = new URLSearchParams(resolved);

  for (const [key, value] of templateParams.entries()) {
    if (value === "") continue; // skip unresolved / empty placeholders
    url.searchParams.set(key, value);
  }

  return url.toString();
}
