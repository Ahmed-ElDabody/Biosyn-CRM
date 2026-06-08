"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { DetailAid, DetailAidPageImage, Product } from "../../../lib/api";
import {
  createProductAction,
  deleteProductAction,
  loadDeckPagesAction,
  refreshProductsAction,
  setProductRangeAction,
} from "./actions";

type Notice = { kind: "ok" | "err"; text: string };

export default function ProductsManager({
  initialProducts,
  detailAids,
}: {
  initialProducts: Product[];
  detailAids: DetailAid[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [name, setName] = useState("");
  const [totalSlides, setTotalSlides] = useState("");
  const [creating, startCreate] = useTransition();

  const readyAids = useMemo(() => detailAids.filter((a) => a.status === "ready"), [detailAids]);
  const aidById = useMemo(() => new Map(detailAids.map((a) => [a.id, a])), [detailAids]);

  const refresh = useCallback(async () => {
    setProducts(await refreshProductsAction());
  }, []);

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
        setNotice({ kind: "ok", text: "Product created. Map it to a deck range below." });
        await refresh();
      } else {
        setNotice({ kind: "err", text: res.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-biosyn-navy">Products</h1>
        <p className="mt-1 text-sm text-biosyn-navy/60">
          Map each product to a contiguous page range of a Detail Aid deck. The rep player shows
          only that range, renumbered from 1.
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
          <span className="text-xs font-medium text-biosyn-navy/70">Product name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Calmare Plus"
            className="w-56 rounded-md border border-biosyn-navy/20 px-3 py-1.5 text-sm outline-none focus:border-biosyn-teal"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-biosyn-navy/70">Total slides</span>
          <input
            value={totalSlides}
            onChange={(e) => setTotalSlides(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 9"
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

      {readyAids.length === 0 && (
        <div className="rounded-md bg-biosyn-amber/10 px-4 py-2 text-xs text-biosyn-amber">
          No ready decks yet. Upload a PDF under <strong>Detail Aids</strong> first, then map
          products to its page ranges.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-biosyn-navy/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-biosyn-paper text-left text-xs uppercase tracking-wide text-biosyn-navy/50">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Slides</th>
              <th className="px-4 py-2 font-medium">Detail-aid mapping</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-biosyn-navy/50">
                  No products yet. Add one above.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                readyAids={readyAids}
                aidName={p.detailAidId ? (aidById.get(p.detailAidId)?.name ?? "(unknown deck)") : null}
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
  readyAids,
  aidName,
  onChanged,
  onNotice,
}: {
  product: Product;
  readyAids: DetailAid[];
  aidName: string | null;
  onChanged: () => Promise<void>;
  onNotice: (n: Notice) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const mapped =
    product.detailAidId != null && product.pageStart != null && product.pageEnd != null;
  const rangeLen = mapped ? product.pageEnd! - product.pageStart! + 1 : null;
  const mismatch = rangeLen != null && rangeLen !== product.totalSlides;

  const onDelete = () => {
    if (!confirm(`Delete "${product.name}"?`)) return;
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

  const onUnassign = () => {
    startTransition(async () => {
      const res = await setProductRangeAction(product.id, {
        detailAidId: null,
        pageStart: null,
        pageEnd: null,
      });
      if (res.ok) {
        onNotice({ kind: "ok", text: `Cleared mapping for ${product.name}.` });
        await onChanged();
      } else {
        onNotice({ kind: "err", text: res.error });
      }
    });
  };

  return (
    <>
      <tr className="border-t border-biosyn-navy/10 align-top">
        <td className="px-4 py-3 font-medium text-biosyn-navy">{product.name}</td>
        <td className="px-4 py-3 text-biosyn-navy/70">{product.totalSlides}</td>
        <td className="px-4 py-3">
          {mapped ? (
            <div className="text-biosyn-navy/80">
              <span className="font-medium">{aidName}</span>
              <span className="text-biosyn-navy/50">
                {" "}
                · pages {product.pageStart}–{product.pageEnd} ({rangeLen} slides)
              </span>
              {mismatch && (
                <div className="mt-1 text-xs text-biosyn-amber">
                  ⚠ Range is {rangeLen} pages but total slides is {product.totalSlides}.
                </div>
              )}
            </div>
          ) : (
            <span className="text-biosyn-navy/40">Unassigned</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded-md border border-biosyn-navy/20 px-2.5 py-1 text-biosyn-navy hover:bg-biosyn-navy/5"
            >
              {editing ? "Close" : mapped ? "Edit mapping" : "Map to deck"}
            </button>
            {mapped && (
              <button
                onClick={onUnassign}
                disabled={pending}
                className="rounded-md border border-biosyn-navy/20 px-2.5 py-1 text-biosyn-navy hover:bg-biosyn-navy/5 disabled:opacity-50"
              >
                Unassign
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
        </td>
      </tr>
      {editing && (
        <tr className="border-t border-biosyn-navy/10 bg-biosyn-paper/50">
          <td colSpan={4} className="px-4 py-4">
            <RangeEditor
              product={product}
              readyAids={readyAids}
              onNotice={onNotice}
              onSaved={async () => {
                setEditing(false);
                await onChanged();
              }}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function RangeEditor({
  product,
  readyAids,
  onNotice,
  onSaved,
}: {
  product: Product;
  readyAids: DetailAid[];
  onNotice: (n: Notice) => void;
  onSaved: () => Promise<void>;
}) {
  const [deckId, setDeckId] = useState<string>(product.detailAidId ?? "");
  const [start, setStart] = useState<number | null>(product.pageStart ?? null);
  const [end, setEnd] = useState<number | null>(product.pageEnd ?? null);
  const [pages, setPages] = useState<DetailAidPageImage[] | null>(null);
  const [saving, startSave] = useTransition();

  // Load the selected deck's pages. setState runs only after the await, so the
  // effect doesn't synchronously cascade renders (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await loadDeckPagesAction(deckId);
        if (!cancelled) setPages(result);
      } catch {
        if (!cancelled) onNotice({ kind: "err", text: "Could not load deck pages." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId, onNotice]);

  const onSelectDeck = (id: string) => {
    setDeckId(id);
    setStart(null);
    setEnd(null);
    setPages(null);
  };

  // Click a thumbnail: first click sets start, second sets end; third resets.
  const onPageClick = (page: number) => {
    if (start == null || (start != null && end != null)) {
      setStart(page);
      setEnd(null);
    } else {
      if (page < start) {
        setEnd(start);
        setStart(page);
      } else {
        setEnd(page);
      }
    }
  };

  const inRange = (page: number) =>
    start != null && (end != null ? page >= start && page <= end : page === start);

  const canSave = deckId !== "" && start != null && end != null && start <= end;

  const onSave = () => {
    if (!canSave) {
      onNotice({ kind: "err", text: "Pick a deck and a start/end page." });
      return;
    }
    startSave(async () => {
      const res = await setProductRangeAction(product.id, {
        detailAidId: deckId,
        pageStart: start,
        pageEnd: end,
      });
      if (res.ok) {
        onNotice({
          kind: "ok",
          text: `Mapped ${product.name} to pages ${start}–${end} (${end! - start! + 1} slides).`,
        });
        await onSaved();
      } else {
        onNotice({ kind: "err", text: res.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-biosyn-navy/70">Deck</span>
          <select
            value={deckId}
            onChange={(e) => onSelectDeck(e.target.value)}
            className="w-64 rounded-md border border-biosyn-navy/20 bg-white px-3 py-1.5 text-sm outline-none focus:border-biosyn-teal"
          >
            <option value="">— select a ready deck —</option>
            {readyAids.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.pageCount} pages)
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-biosyn-navy/70">Start page</span>
          <input
            value={start ?? ""}
            onChange={(e) => setStart(e.target.value ? Number(e.target.value) : null)}
            inputMode="numeric"
            className="w-24 rounded-md border border-biosyn-navy/20 px-3 py-1.5 text-sm outline-none focus:border-biosyn-teal"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-biosyn-navy/70">End page</span>
          <input
            value={end ?? ""}
            onChange={(e) => setEnd(e.target.value ? Number(e.target.value) : null)}
            inputMode="numeric"
            className="w-24 rounded-md border border-biosyn-navy/20 px-3 py-1.5 text-sm outline-none focus:border-biosyn-teal"
          />
        </label>
        <div className="text-sm text-biosyn-navy/60">
          {canSave ? `${end! - start! + 1} slides selected` : "Pick start & end"}
        </div>
        <button
          onClick={onSave}
          disabled={!canSave || saving}
          className="rounded-md bg-biosyn-teal px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save mapping"}
        </button>
      </div>

      <p className="text-xs text-biosyn-navy/50">
        Tip: click a page to set the start, then click another to set the end.
      </p>

      {deckId && pages === null && (
        <div className="text-sm text-biosyn-navy/50">Loading deck pages…</div>
      )}
      {pages && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {pages.map((pg) => {
            const selected = inRange(pg.page);
            return (
              <button
                key={pg.page}
                type="button"
                onClick={() => onPageClick(pg.page)}
                className={`overflow-hidden rounded border text-left transition ${
                  selected
                    ? "border-biosyn-teal ring-2 ring-biosyn-teal"
                    : "border-biosyn-navy/10 hover:border-biosyn-navy/30"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pg.url} alt={`Page ${pg.page}`} className="block w-full" loading="lazy" />
                <span
                  className={`block px-1 py-0.5 text-center text-[11px] ${
                    selected ? "bg-biosyn-teal text-white" : "text-biosyn-navy/50"
                  }`}
                >
                  {pg.page}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
