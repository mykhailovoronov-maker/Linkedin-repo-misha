"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface Status {
  oauthConfigured: boolean;
  envFallback: boolean;
  connected: boolean;
  ready: boolean;
  adAccountId: string | null;
  organizationUrn: string | null;
  expiresAt: string | null;
}

export default function ConnectionPanel() {
  const params = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [adAccountId, setAdAccountId] = useState("");
  const [organizationUrn, setOrganizationUrn] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const banner =
    params.get("connected") === "1"
      ? { kind: "ok", text: "LinkedIn connected." }
      : params.get("error")
        ? { kind: "err", text: decodeURIComponent(params.get("error")!) }
        : null;

  async function load() {
    const res = await fetch("/api/linkedin/status");
    if (!res.ok) return;
    const d: Status = await res.json();
    setStatus(d);
    setAdAccountId(d.adAccountId ?? "");
    setOrganizationUrn(d.organizationUrn ?? "");
  }
  useEffect(() => {
    load();
  }, []);

  async function saveIds(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/linkedin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adAccountId, organizationUrn }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      setMsg("Saved.");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    await fetch("/api/linkedin/disconnect", { method: "POST" });
    load();
  }

  if (!status) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  const stateLabel = status.ready
    ? { text: "Ready to launch", cls: "bg-green-100 text-green-800" }
    : status.connected
      ? { text: "Connected — add account details", cls: "bg-amber-100 text-amber-800" }
      : { text: "Not connected (dry-run)", cls: "bg-slate-100 text-slate-600" };

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`rounded-lg p-3 text-sm ${
            banner.kind === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">LinkedIn connection</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${stateLabel.cls}`}
          >
            {stateLabel.text}
          </span>
        </div>

        {!status.oauthConfigured && !status.envFallback && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            The LinkedIn OAuth app isn&apos;t configured on the server yet, so
            launches run in dry-run mode. Add <code>LINKEDIN_CLIENT_ID</code> and{" "}
            <code>LINKEDIN_CLIENT_SECRET</code> (see LINKEDIN_SETUP.md) to enable
            the button below.
          </p>
        )}

        {status.connected ? (
          <button
            onClick={disconnect}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Disconnect LinkedIn
          </button>
        ) : (
          <a
            href="/api/linkedin/connect"
            aria-disabled={!status.oauthConfigured}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white ${
              status.oauthConfigured
                ? "bg-linkedin hover:bg-linkedin-dark"
                : "pointer-events-none bg-slate-300"
            }`}
          >
            <span className="font-bold">in</span> Connect LinkedIn
          </a>
        )}
      </div>

      <form
        onSubmit={saveIds}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-base font-semibold">Ad account</h2>
          <p className="mt-1 text-xs text-slate-500">
            Find these in{" "}
            <a
              className="text-linkedin hover:underline"
              href="https://www.linkedin.com/campaignmanager/"
              target="_blank"
              rel="noreferrer"
            >
              Campaign Manager
            </a>
            . The app launches campaigns into this account.
          </p>
        </div>

        <div>
          <label htmlFor="acct" className="mb-1 block text-sm font-medium">
            Ad account ID
          </label>
          <input
            id="acct"
            value={adAccountId}
            onChange={(e) => setAdAccountId(e.target.value)}
            placeholder="512345678"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="org" className="mb-1 block text-sm font-medium">
            Organization URN
          </label>
          <input
            id="org"
            value={organizationUrn}
            onChange={(e) => setOrganizationUrn(e.target.value)}
            placeholder="urn:li:organization:1234567"
            className={inputClass}
          />
        </div>

        {msg && <p className="text-sm text-slate-600">{msg}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-linkedin px-4 py-2 text-sm font-medium text-white hover:bg-linkedin-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save account details"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-linkedin focus:ring-1 focus:ring-linkedin";
