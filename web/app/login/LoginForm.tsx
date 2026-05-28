"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("mai.aladawi@biosyn.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>(initialError);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Sign-in failed (${res.status})`);
        setBusy(false);
        return;
      }
      router.push(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-biosyn-navy">Email</span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-lg border border-biosyn-navy/20 bg-biosyn-paper px-3 py-2 text-biosyn-navy outline-none focus:border-biosyn-teal focus:ring-2 focus:ring-biosyn-teal/30"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-biosyn-navy">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-lg border border-biosyn-navy/20 bg-biosyn-paper px-3 py-2 text-biosyn-navy outline-none focus:border-biosyn-teal focus:ring-2 focus:ring-biosyn-teal/30"
        />
      </label>

      {error && (
        <div className="rounded-lg bg-biosyn-coral/10 border border-biosyn-coral/30 px-3 py-2 text-sm text-biosyn-coral">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 rounded-lg bg-biosyn-navy py-2.5 text-sm font-semibold text-white hover:bg-biosyn-deep disabled:opacity-50 transition"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
