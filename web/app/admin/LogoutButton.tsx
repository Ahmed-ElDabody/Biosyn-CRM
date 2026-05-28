"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="text-xs rounded-md border border-white/30 px-3 py-1.5 text-white hover:bg-white/10 disabled:opacity-50 transition"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
