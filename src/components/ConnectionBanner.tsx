"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ConnectionBanner() {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/linkedin/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setReady(Boolean(d.ready)))
      .catch(() => undefined);
  }, []);

  if (ready === null) return null;

  return (
    <Link
      href="/settings"
      className={`mb-6 flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
        ready
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${ready ? "bg-green-500" : "bg-amber-500"}`}
        />
        {ready
          ? "LinkedIn connected — campaigns launch for real."
          : "LinkedIn not connected — launches run in dry-run (simulated)."}
      </span>
      <span className="font-medium">
        {ready ? "Manage" : "Connect"} →
      </span>
    </Link>
  );
}
