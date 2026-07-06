import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseAuthConfigured } from "./env";
import type { SessionUser } from "./session";

/**
 * Credential verification. When Supabase Auth is configured, real email/password
 * accounts are used. Otherwise the app runs in "demo" mode: any email plus the
 * shared access code (APP_ACCESS_CODE) signs you in, so the whole flow is
 * usable by anyone without provisioning accounts.
 */

export type AuthMode = "supabase" | "demo";

export function authMode(): AuthMode {
  return isSupabaseAuthConfigured() ? "supabase" : "demo";
}

function anonClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function demoUserId(email: string): string {
  return "demo-" + crypto.createHash("sha256").update(email).digest("hex").slice(0, 24);
}

export async function authenticate(
  email: string,
  password: string,
): Promise<SessionUser> {
  if (authMode() === "supabase") {
    const { data, error } = await anonClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? "Invalid email or password");
    }
    return { id: data.user.id, email: data.user.email ?? email };
  }

  if (password !== env.appAccessCode) {
    throw new Error("Invalid access code");
  }
  return { id: demoUserId(email), email };
}

export interface RegisterResult {
  user: SessionUser | null;
  needsConfirmation: boolean;
}

export async function register(
  email: string,
  password: string,
): Promise<RegisterResult> {
  if (authMode() === "supabase") {
    const { data, error } = await anonClient().auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (data.session && data.user) {
      return {
        user: { id: data.user.id, email: data.user.email ?? email },
        needsConfirmation: false,
      };
    }
    // Email confirmation is enabled on the project.
    return { user: null, needsConfirmation: true };
  }

  // Demo mode: "signing up" is the same as signing in with the access code.
  return {
    user: { id: demoUserId(email), email },
    needsConfirmation: false,
  };
}
