"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
    >
      Sign out
    </button>
  );
}
