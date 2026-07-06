import { env, isLinkedInOAuthConfigured } from "./env";
import { getConnection, patchConnection } from "./store";
import {
  refreshAccessToken,
  expiryFromNow,
} from "./linkedin-oauth";
import type { LinkedInCredentials } from "./linkedin";

/**
 * Resolve the credentials to use for a launch, in priority order:
 *   1. The signed-in user's LinkedIn connection (refreshing the token if it has
 *      expired and a refresh token is available).
 *   2. The env single-account fallback (LINKEDIN_ACCESS_TOKEN etc.).
 *   3. null → the caller runs in dry-run mode.
 */
export async function resolveCredentials(
  userEmail: string,
): Promise<Partial<LinkedInCredentials> | null> {
  const conn = await getConnection(userEmail);
  if (conn?.accessToken && conn.adAccountId && conn.organizationUrn) {
    let accessToken = conn.accessToken;

    const expired =
      conn.expiresAt && new Date(conn.expiresAt).getTime() < Date.now() + 60_000;
    if (expired && conn.refreshToken && isLinkedInOAuthConfigured()) {
      try {
        const t = await refreshAccessToken(conn.refreshToken);
        accessToken = t.access_token;
        await patchConnection(userEmail, {
          accessToken: t.access_token,
          refreshToken: t.refresh_token ?? conn.refreshToken,
          expiresAt: expiryFromNow(t.expires_in),
        });
      } catch {
        // Refresh failed — fall through with the (likely stale) token so the
        // launch surfaces a clear API error rather than silently dry-running.
      }
    }

    return {
      accessToken,
      adAccountId: conn.adAccountId,
      organizationUrn: conn.organizationUrn,
      apiVersion: env.linkedin.apiVersion,
    };
  }

  if (
    env.linkedin.accessToken &&
    env.linkedin.adAccountId &&
    env.linkedin.organizationUrn
  ) {
    return {
      accessToken: env.linkedin.accessToken,
      adAccountId: env.linkedin.adAccountId,
      organizationUrn: env.linkedin.organizationUrn,
      apiVersion: env.linkedin.apiVersion,
    };
  }

  return null;
}
