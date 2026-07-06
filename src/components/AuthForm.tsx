"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((d) => setDemo(d.mode === "demo"))
      .catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const endpoint = mode === "signin" ? "/api/auth/login" : "/api/auth/signup";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      if (data.needsConfirmation) {
        setInfo(data.message);
        setMode("signin");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded bg-linkedin font-bold text-white">
          in
        </span>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Ads Launcher</h1>
          <p className="text-xs text-slate-500">
            {mode === "signin" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>
      </div>

      {demo && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Demo mode — sign in with <strong>any email</strong> and the access
          code <strong>demo1234</strong>.
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            {demo ? "Access code" : "Password"}
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {error && (
          <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}
        {info && (
          <p className="rounded bg-green-50 p-2 text-sm text-green-700">{info}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-linkedin px-4 py-2.5 font-medium text-white transition hover:bg-linkedin-dark disabled:opacity-50"
        >
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      {!demo && (
        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="font-medium text-linkedin hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-linkedin focus:ring-1 focus:ring-linkedin";
