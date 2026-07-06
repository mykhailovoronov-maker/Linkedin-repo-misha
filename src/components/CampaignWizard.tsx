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

const STEPS = ["Creative", "Audience & Budget", "Review"] as const;

export default function CampaignWizard() {
  const [step, setStep] = useState(0);

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

  async function launch() {
    setError(null);
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

  function resetAll() {
    setResult(null);
    setStep(0);
    setName("");
    setDestinationUrl("");
    setImageUrl("");
    setImagePreview("");
    setDailyBudget("50");
  }

  const step1Valid = !!imageUrl && !uploading;
  const step2Valid =
    !!name && !!audienceId && Number(dailyBudget) > 0 && !!destinationUrl;

  // ---- Success screen ----
  if (result) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
          🎉
        </div>
        <h2 className="text-xl font-semibold">
          {result.dryRun ? "Campaign ready & simulated" : "Campaign launched!"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {result.dryRun
            ? "Saved and validated end-to-end. Add LinkedIn credentials to push it live."
            : "Your campaign is now live on LinkedIn."}
        </p>

        <dl className="mx-auto mt-6 max-w-md space-y-3 text-left text-sm">
          <Summary label="Campaign" value={result.campaign.name} />
          <Summary label="Status" value={result.campaign.status} />
          <Summary label="Tracked URL" value={result.campaign.trackedUrl} mono />
          {result.campaign.linkedinCampaignId && (
            <Summary
              label="Campaign ID"
              value={result.campaign.linkedinCampaignId}
              mono
            />
          )}
        </dl>

        <button
          onClick={resetAll}
          className="mt-8 rounded-lg bg-linkedin px-5 py-2.5 font-medium text-white hover:bg-linkedin-dark"
        >
          Launch another
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Stepper */}
      <div className="flex border-b border-slate-100">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex flex-1 items-center gap-2 px-4 py-3 text-sm ${
              i === step
                ? "font-medium text-linkedin"
                : i < step
                  ? "text-slate-500"
                  : "text-slate-400"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                i <= step ? "bg-linkedin text-white" : "bg-slate-200"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      <div className="p-6">
        {/* Step 1: Creative */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Upload your creative</h2>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-48 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 hover:border-linkedin"
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Creative preview"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span>Click to upload an image (PNG, JPG, GIF — up to 8 MB)</span>
              )}
            </button>
            {uploading && <p className="text-sm text-linkedin">Uploading…</p>}
            {imageUrl && !uploading && (
              <p className="text-sm text-green-600">Image ready ✓</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Step 2: Audience & Budget */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold">Set up targeting</h2>
            <Field label="Campaign name" htmlFor="name">
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q3 Product Launch"
                className={inputClass}
              />
            </Field>

            <Field label="Audience" htmlFor="audience">
              <select
                id="audience"
                value={audienceId}
                onChange={(e) => setAudienceId(e.target.value)}
                className={inputClass}
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

            <Field label="Destination URL" htmlFor="url">
              <input
                id="url"
                type="url"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://example.com/landing"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                Your tracking template is appended automatically on launch.
              </p>
            </Field>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Review & launch</h2>
            <div className="flex gap-4">
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Creative"
                  className="h-24 w-24 rounded-lg object-cover"
                />
              )}
              <dl className="flex-1 space-y-2 text-sm">
                <Summary label="Campaign" value={name} />
                <Summary
                  label="Audience"
                  value={selectedAudience?.name ?? audienceId}
                />
                <Summary
                  label="Daily budget"
                  value={`${currency} ${Number(dailyBudget).toFixed(2)}`}
                />
                <Summary label="Destination" value={destinationUrl} mono />
              </dl>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Nav */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-0"
          >
            Back
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 ? !step1Valid : !step2Valid}
              className="rounded-lg bg-linkedin px-5 py-2 text-sm font-medium text-white hover:bg-linkedin-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={launch}
              disabled={submitting || !step2Valid || !step1Valid}
              className="rounded-lg bg-linkedin px-5 py-2 text-sm font-medium text-white hover:bg-linkedin-dark disabled:opacity-50"
            >
              {submitting ? "Launching…" : "Launch campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
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

function Summary({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd
        className={`text-right ${mono ? "break-all font-mono text-xs" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}
