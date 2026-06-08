"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { DetailAid, DetailAidPageImage, DetailAidStatus } from "../../../lib/api";
import {
  createDetailAidAction,
  deleteDetailAidAction,
  loadDetailAidPagesAction,
  refreshDetailAidsAction,
  reprocessDetailAidAction,
  uploadDetailAidAction,
} from "./actions";

const STATUS_STYLES: Record<DetailAidStatus, { label: string; cls: string }> = {
  none: { label: "No file", cls: "bg-biosyn-navy/10 text-biosyn-navy/50" },
  processing: { label: "Processing…", cls: "bg-biosyn-amber/15 text-biosyn-amber" },
  ready: { label: "Ready", cls: "bg-biosyn-mint/20 text-biosyn-teal" },
  failed: { label: "Failed", cls: "bg-biosyn-coral/15 text-biosyn-coral" },
};

function StatusBadge({ status }: { status: DetailAidStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function DetailAidsManager({
  initialDetailAids,
}: {
  initialDetailAids: DetailAid[];
}) {
  const [aids, setAids] = useState<DetailAid[]>(initialDetailAids);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [name, setName] = useState("");
  const [creating, startCreate] = useTransition();

  const refresh = useCallback(async () => {
    setAids(await refreshDetailAidsAction());
  }, []);

  const anyProcessing = aids.some((a) => a.status === "processing");
  useEffect(() => {
    if (!anyProcessing) return;
    const t = setInterval(() => void refresh(), 2500);
    return () => clearInterval(t);
  }, [anyProcessing, refresh]);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNotice({ kind: "err", text: "Enter a deck name (2+ chars)." });
      return;
    }
    startCreate(async () => {
      const res = await createDetailAidAction(name.trim());
      if (res.ok) {
        setName("");
        setNotice({ kind: "ok", text: "Deck created. Upload its PDF to render pages." });
        await refresh();
      } else {
        setNotice({ kind: "err", text: res.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-biosyn-navy">Detail Aids</h1>
        <p className="mt-1 text-sm text-biosyn-navy/60">
          Upload a PDF deck once; it is pre-split into per-page images. Products then map to a
          page range of a deck (a single deck can serve several products).
        </p>
      </div>

      {notice && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            notice.kind === "ok"
              ? "bg-biosyn-mint/15 text-biosyn-teal"
              : "bg-biosyn-coral/15 text-biosyn-coral"
          }`}
        >
          {notice.text}
        </div>
      )}

      <form
        onSubmit={onCreate}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-biosyn-navy/10 bg-white p-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-biosyn-navy/70">Deck name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 Combined Deck"
            className="w-72 rounded-md border border-biosyn-navy/20 px-3 py-1.5 text-sm outline-none focus:border-biosyn-teal"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-biosyn-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-biosyn-deep disabled:opacity-50"
        >
          {creating ? "Adding…" : "Add deck"}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-biosyn-navy/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-biosyn-paper text-left text-xs uppercase tracking-wide text-biosyn-navy/50">
            <tr>
              <th className="px-4 py-2 font-medium">Deck</th>
              <th className="px-4 py-2 font-medium">Pages</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {aids.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-biosyn-navy/50">
                  No decks yet. Add one above, then upload its PDF.
                </td>
              </tr>
            )}
            {aids.map((a) => (
              <DeckRow key={a.id} aid={a} onChanged={refresh} onNotice={setNotice} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeckRow({
  aid,
  onChanged,
  onNotice,
}: {
  aid: DetailAid;
  onChanged: () => Promise<void>;
  onNotice: (n: { kind: "ok" | "err"; text: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [pages, setPages] = useState<DetailAidPageImage[] | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      onNotice({ kind: "err", text: "Choose a PDF first." });
      return;
    }
    const form = new FormData();
    form.append("id", aid.id);
    form.append("file", file, file.name);
    startTransition(async () => {
      const res = await uploadDetailAidAction(form);
      if (res.ok) {
        if (fileRef.current) fileRef.current.value = "";
        setPages(null);
        setExpanded(false);
        onNotice({ kind: "ok", text: `Uploaded for "${aid.name}". Rendering started.` });
        await onChanged();
      } else {
        onNotice({ kind: "err", text: res.error });
      }
    });
  };

  const onReprocess = () => {
    startTransition(async () => {
      const res = await reprocessDetailAidAction(aid.id);
      if (res.ok) {
        setPages(null);
        onNotice({ kind: "ok", text: `Re-rendering "${aid.name}"…` });
        await onChanged();
      } else {
        onNotice({ kind: "err", text: res.error });
      }
    });
  };

  const onDelete = () => {
    if (!confirm(`Delete deck "${aid.name}"? Products mapped to it will lose their pages.`)) return;
    startTransition(async () => {
      const res = await deleteDetailAidAction(aid.id);
      if (res.ok) {
        onNotice({ kind: "ok", text: `Deleted "${aid.name}".` });
        await onChanged();
      } else {
        onNotice({ kind: "err", text: res.error });
      }
    });
  };

  const onTogglePages = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && pages === null) {
      setLoadingPages(true);
      try {
        setPages(await loadDetailAidPagesAction(aid.id));
      } catch {
        onNotice({ kind: "err", text: "Could not load pages." });
      } finally {
        setLoadingPages(false);
      }
    }
  };

  return (
    <>
      <tr className="border-t border-biosyn-navy/10 align-top">
        <td className="px-4 py-3 font-medium text-biosyn-navy">{aid.name}</td>
        <td className="px-4 py-3 text-biosyn-navy/70">{aid.pageCount ?? "—"}</td>
        <td className="px-4 py-3">
          <StatusBadge status={aid.status} />
          {aid.status === "failed" && aid.error && (
            <div className="mt-1 max-w-xs text-xs text-biosyn-coral">{aid.error}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-2">
            <form onSubmit={onUpload} className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="max-w-[180px] text-xs file:mr-2 file:rounded file:border-0 file:bg-biosyn-navy/10 file:px-2 file:py-1 file:text-biosyn-navy"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-biosyn-teal px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Upload PDF
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {aid.status === "ready" && (
                <button
                  onClick={onTogglePages}
                  className="rounded-md border border-biosyn-navy/20 px-2.5 py-1 text-biosyn-navy hover:bg-biosyn-navy/5"
                >
                  {expanded ? "Hide pages" : "View pages"}
                </button>
              )}
              {(aid.status === "ready" || aid.status === "failed") && aid.fileUrl && (
                <button
                  onClick={onReprocess}
                  disabled={pending}
                  className="rounded-md border border-biosyn-navy/20 px-2.5 py-1 text-biosyn-navy hover:bg-biosyn-navy/5 disabled:opacity-50"
                >
                  Re-render
                </button>
              )}
              <button
                onClick={onDelete}
                disabled={pending}
                className="rounded-md border border-biosyn-coral/40 px-2.5 py-1 text-biosyn-coral hover:bg-biosyn-coral/10 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-biosyn-navy/10 bg-biosyn-paper/50">
          <td colSpan={4} className="px-4 py-4">
            {loadingPages && <div className="text-sm text-biosyn-navy/50">Loading pages…</div>}
            {!loadingPages && pages && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {pages.map((pg) => (
                  <figure
                    key={pg.page}
                    className="overflow-hidden rounded border border-biosyn-navy/10 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pg.url} alt={`Page ${pg.page}`} className="block w-full" loading="lazy" />
                    <figcaption className="px-2 py-1 text-center text-xs text-biosyn-navy/50">
                      {pg.page}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
