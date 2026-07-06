import CampaignForm from "@/components/CampaignForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-linkedin font-bold text-white">
            in
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ads Launcher
          </h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Upload a creative, choose a predefined audience, set your daily
          budget, and launch. Your tracking template is appended automatically
          and every campaign is saved to Supabase.
        </p>
      </header>
      <CampaignForm />
    </main>
  );
}
