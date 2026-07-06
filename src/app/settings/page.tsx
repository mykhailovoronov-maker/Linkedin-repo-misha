import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/session";
import ConnectionPanel from "@/components/ConnectionPanel";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const user = getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          ← Back to launcher
        </Link>
      </header>

      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <ConnectionPanel />
      </Suspense>
    </main>
  );
}
