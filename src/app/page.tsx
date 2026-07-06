import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import CampaignWizard from "@/components/CampaignWizard";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default function Home() {
  const user = getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-linkedin font-bold text-white">
            in
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight tracking-tight">
              Ads Launcher
            </h1>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
        <SignOutButton />
      </header>

      <p className="mb-6 text-sm text-slate-600">
        Upload a creative, choose an audience, set your budget, and launch. Your
        tracking template is appended automatically and every campaign is saved.
      </p>

      <CampaignWizard />
    </main>
  );
}
