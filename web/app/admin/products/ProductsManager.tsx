"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { DetailAidPageImage, DetailAidStatus, Product } from "../../../lib/api";
import {
  createProductAction,
  deleteProductAction,
  loadPagesAction,
  refreshProductsAction,
  reprocessDetailAidAction,
  uploadDetailAidAction,
} from "./actions";

const STATUS_STYLES: Record<DetailAidStatus, { label: string; cls: string }> = {
  none: { label: "No detail aid", cls: "bg-biosyn-navy/10 text-biosyn-navy/50" },
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

export default function ProductsManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [name, setName] = useState("");
  const [totalSlides, setTotalSlides] = useState("");
  const [creating, startCreate] = useTransition();

  const refresh = useCallback(async () => {
    const fresh = await refreshProductsAction();
    setProducts(fresh);
  }, []);

  // Poll while any detail aid is rendering, so the badge flips on its own.
  const anyProcessing = products.some((p) => p.detailAidStatus === "processing");
  useEffect(() => {
    if (!anyProcessing) return;
    const t = setInterval(() => {
      void refresh();
    }, 2500);
    return () => clearInterval(t);
  }, [anyProcessing, refresh]);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const slides = Number(totalSlides);
    if (!name.trim() || !Number.isInteger(slides) || slides < 1) {
      setNotice({ kind: "err", text: "Enter a name and a slide count of 1 or more." });
      return;
    }
    startCreate(async () => {
      const res = await createProductAction({ name: name.trim(), totalSlides: slides });
      if (res.ok) {
        setName("");
        setTotalSlides("");
        setNotice({ kind: "ok", text: "Product created." });
        await refresh();
      } else {
        setNotice({ kind: "err", text: res.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-biosyn-navy">Products &amp; Detail Aids</h1>
        <p className="mt-1 text-sm text-biosyn-navy/60">
          Upload a PDF detail aid and it is pre-split into per-page images for the rep tablet.
          Rendering runs in the background — the status updates automatically.
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

      {/* Create */}
      <form
        onSubmit={onCreate}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-biosyn-navy/10 bg-white p-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-biosyn-navy/70">Product name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Biosyn-D3"
            className="w-56 rounded-md border border-biosyn-navy/20 px-3 py-1.5 text-sm outline-none focus:border-biosyn-teal"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-biosyn-navy/70">Total slides</span>
          <input
            value={totalSlides}
            onChange={(e) => setTotalSlides(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 27"
            className="w-28 rounded-md border border-biosyn-navy/20 px-3 py-1.5 text-sm outline-none focus:border-biosyn-teal"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-biosyn-navy px-4 py-1.5 text-sm font-medium text-white hover:bg-biosyn-deep disabled:opacity-50"
        >
          {creating ? "Adding…" : "Add product"}
        </button>
      </form>

      {/* List */}
      <div className="overflow-hidden rounded-lg border border-biosyn-navy/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-biosyn-paper text-left text-xs uppercase tracking-wide text-biosyn-navy/50">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Slides</th>
              <th className="px-4 py-2 font-medium">Detail aid</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-biosyn-navy/50">
                  No products yet. Add one above to upload its detail aid.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onChanged={refresh}
                onNotice={setNotice}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  onChanged,
  onNotice,
}: {
  product: Product;
  onChanged: () => Promise<void>;
  onNotice: (n: { kind: "ok" | "err"; text: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [pages, setPages] = useState<DetailAidPageImage[] | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const slideMismatch =
    product.detailAidStatus === "ready" &&
    product.detailAidPageCount != null &&
    product.detailAidPageCount !== product.totalSlides;

  const onUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      onNotice({ kind: "err", text: "Choose a file first." });
      return;
    }
    const form = new FormData();
    form.append("id", product.id);
    form.append("file", file, file.name);
    startTransition(async () => {
      const res = await uploadDetailAidAction(form);
      if (res.ok) {
        if (fileRef.current) fileRef.current.value = "";
        setPages(null);
        setExpanded(false);
        onNotice({ kind: "ok", text: `Uploaded for ${product.name}. Rendering started.` });
        await onChanged();
      } else {
        onNotice({ kind: "err", text: res.error });
      }
    });
  };

  const onReprocess = () => {
    startTransition(async () => {
      const res = await reprocessDetailAidAction(product.id);
      if (res.ok) {
        setPages(null);
        onNotice({ kind: "ok", text: `Re-rendering ${product.name}…` });
        await onChanged();
      } else {
        onNotice({ kind: "err", text: res.error });
      }
    });
  };

  const onDelete = () => {
    if (!confirm(`Delete "${product.name}"? This removes its detail aid and page images.`)) return;
    startTransition(async () => {
      const res = await deleteProductAction(product.id);
      if (res.ok) {
        onNotice({ kind: "ok", text: `Deleted ${product.name}.` });
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
        setPages(await loadPagesAction(product.id));
      } catch {
        onNotice({ kind: "err", text: "Could not load page images." });
      } finally {
        setLoadingPages(false);
      }
    }
  };

  return (
    <>
      <tr className="border-t border-biosyn-navy/10 align-top">
        <td className="px-4 py-3">
          <div className="font-medium text-biosyn-navy">{product.name}</div>
          {!product.active && <div className="text-xs text-biosyn-navy/40">inactive</div>}
        </td>
        <td className="px-4 py-3 text-biosyn-navy/70">{product.totalSlides}</td>
        <td className="px-4 py-3">
          <StatusBadge status={product.detailAidStatus} />
          {product.detailAidStatus === "ready" && product.detailAidPageCount != null && (
            <div className="mt-1 text-xs text-biosyn-navy/50">
              {product.detailAidPageCount} page{product.detailAidPageCount === 1 ? "" : "s"} rendered
            </div>
          )}
          {slideMismatch && (
            <div className="mt-1 text-xs text-biosyn-amber">
              ⚠ Rendered {product.detailAidPageCount} pages but slide count is {product.totalSlides}.
            </div>
          )}
          {product.detailAidStatus === "failed" && product.detailAidError && (
            <div className="mt-1 max-w-xs text-xs text-biosyn-coral">{product.detailAidError}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-2">
            <form onSubmit={onUpload} className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg"
                className="max-w-[180px] text-xs file:mr-2 file:rounded file:border-0 file:bg-biosyn-navy/10 file:px-2 file:py-1 file:text-biosyn-navy"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-biosyn-teal px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Upload
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {product.detailAidStatus === "ready" && (
                <button
                  onClick={onTogglePages}
                  className="rounded-md border border-biosyn-navy/20 px-2.5 py-1 text-biosyn-navy hover:bg-biosyn-navy/5"
                >
                  {expanded ? "Hide pages" : "View pages"}
                </button>
              )}
              {(product.detailAidStatus === "ready" || product.detailAidStatus === "failed") &&
                product.detailAidFileUrl && (
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
            {!loadingPages && pages && pages.length === 0 && (
              <div className="text-sm text-biosyn-navy/50">No rendered pages.</div>
            )}
            {!loadingPages && pages && pages.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {pages.map((pg) => (
                  <figure key={pg.page} className="overflow-hidden rounded border border-biosyn-navy/10 bg-white">
                    {/* Presigned URLs come from a dynamic bucket host, so a plain img avoids next/image remote config. */}
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
