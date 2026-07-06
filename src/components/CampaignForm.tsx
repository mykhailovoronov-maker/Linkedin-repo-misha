"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface AudienceOption {
  id: string;
  name: string;
  description: string;
}

interface LaunchedCampaign {
  name: string;
  trackedUrl: string;
  status: string;
  linkedinCampaignId?: string | null;
}

export default function CampaignForm() {
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [audienceId, setAudienceId] = useState("");
  const [name, setName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("50");
  const [currency, setCurrency] = useState("USD");
  const [destinationUrl, setDestinationUrl] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    campaign: LaunchedCampaign;
    dryRun: boolean;
  } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/audiences")
      .then((r) => r.json())
      .then((d) => {
        setAudiences(d.audiences ?? []);
        if (d.audiences?.[0]) setAudienceId(d.audiences[0].id);
      })
      .catch(() => setError("Could not load audiences."));
  }, []);

  const selectedAudience = useMemo(
    () => audiences.find((a) => a.id === audienceId),
    [audiences, audienceId],
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    setImagePreview(URL.createObjectURL(file));
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setImageUrl("");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          audienceId,
          dailyBudget: Number(dailyBudget),
          currency,
          destinationUrl,
          imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail =
          data.issues?.fieldErrors &&
          Object.values(data.issues.fieldErrors).flat().join(" ");
        throw new Error(detail || data.error || "Launch failed");
      }
      setResult({ campaign: data.campaign, dryRun: data.dryRun });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    !!name && !!audienceId && !!dailyBudget && !!destinationUrl && !!imageUrl;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {/* Creative image */}
      <Field label="Creative image" htmlFor="file">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500 hover:border-linkedin"
          >
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="Creative preview"
                className="h-full w-full object-cover"
              />
            ) : (
              "Click to upload"
            )}
          </button>
          <div className="text-xs text-slate-500">
            <p>PNG, JPG or GIF up to 8 MB.</p>
            {uploading && <p className="mt-1 text-linkedin">Uploading…</p>}
            {imageUrl && !uploading && (
              <p className="mt-1 text-green-600">Uploaded ✓</p>
            )}
          </div>
          <input
            id="file"
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </Field>

      {/* Campaign name */}
      <Field label="Campaign name" htmlFor="name">
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Q3 Product Launch"
          className={inputClass}
          required
        />
      </Field>

      {/* Audience */}
      <Field label="Audience" htmlFor="audience">
        <select
          id="audience"
          value={audienceId}
          onChange={(e) => setAudienceId(e.target.value)}
          className={inputClass}
          required
        >
          {audiences.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {selectedAudience && (
          <p className="mt-1 text-xs text-slate-500">
            {selectedAudience.description}
          </p>
        )}
      </Field>

      {/* Budget */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Daily budget" htmlFor="budget">
            <input
              id="budget"
              type="number"
              min="1"
              step="0.01"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
        </div>
        <Field label="Currency" htmlFor="currency">
          <input
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={3}
            className={inputClass}
          />
        </Field>
      </div>

      {/* Destination URL */}
      <Field label="Destination URL" htmlFor="url">
        <input
          id="url"
          type="url"
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder="https://example.com/landing"
          className={inputClass}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Your tracking template is appended automatically on launch.
        </p>
      </Field>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
          <p className="font-medium">
            {result.dryRun
              ? "Campaign saved & simulated (dry-run — LinkedIn not configured)."
              : "Campaign launched on LinkedIn 🎉"}
          </p>
          <p className="mt-2 break-all">
            <span className="font-medium">Tracked URL:</span>{" "}
            {result.campaign.trackedUrl}
          </p>
          {result.campaign.linkedinCampaignId && (
            <p className="mt-1 break-all">
              <span className="font-medium">Campaign ID:</span>{" "}
              {result.campaign.linkedinCampaignId}
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting || uploading}
        className="w-full rounded-lg bg-linkedin px-4 py-2.5 font-medium text-white transition hover:bg-linkedin-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Launching…" : "Launch campaign"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-linkedin focus:ring-1 focus:ring-linkedin";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
