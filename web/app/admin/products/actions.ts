"use server";

import {
  apiGet,
  apiSend,
  ApiError,
  requireAdmin,
  type DetailAid,
  type DetailAidPageImage,
  type Product,
  type ProductPageImage,
} from "../../../lib/api";

export type ActionResult = { ok: true } | { ok: false; error: string };

function isRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function toMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as { message?: unknown } | null;
    const m = body && typeof body === "object" ? body.message : undefined;
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
    return e.message;
  }
  return e instanceof Error ? e.message : "Unexpected error";
}

export async function createProductAction(input: {
  name: string;
  totalSlides: number;
}): Promise<ActionResult> {
  await requireAdmin();
  try {
    await apiSend("/products", "POST", input);
    return { ok: true };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: toMessage(e) };
  }
}

export interface ProductRangePatch {
  detailAidId: string | null;
  pageStart: number | null;
  pageEnd: number | null;
}

/** Assign or clear a product's deck mapping. Pass all-null to unassign. */
export async function setProductRangeAction(
  id: string,
  patch: ProductRangePatch,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await apiSend(`/products/${id}`, "PATCH", patch);
    return { ok: true };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: toMessage(e) };
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await apiSend(`/products/${id}`, "DELETE");
    return { ok: true };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: toMessage(e) };
  }
}

export async function refreshProductsAction(): Promise<Product[]> {
  await requireAdmin();
  return apiGet<Product[]>("/products");
}

/** Ready decks only — the ones a product can be mapped to. */
export async function loadReadyDetailAidsAction(): Promise<DetailAid[]> {
  await requireAdmin();
  const all = await apiGet<DetailAid[]>("/detail-aids");
  return all.filter((a) => a.status === "ready");
}

/** All pages of a deck — used to drive the visual range picker. */
export async function loadDeckPagesAction(detailAidId: string): Promise<DetailAidPageImage[]> {
  await requireAdmin();
  return apiGet<DetailAidPageImage[]>(`/detail-aids/${detailAidId}/pages/urls`);
}

/** A product's mapped slice (local 1..k numbering). */
export async function loadProductPagesAction(id: string): Promise<ProductPageImage[]> {
  await requireAdmin();
  return apiGet<ProductPageImage[]>(`/products/${id}/pages/urls`);
}
