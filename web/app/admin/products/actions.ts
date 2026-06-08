"use server";

import {
  apiGet,
  apiSend,
  apiUpload,
  ApiError,
  requireAdmin,
  type DetailAidPageImage,
  type Product,
} from "../../../lib/api";

export type ActionResult = { ok: true } | { ok: false; error: string };

// redirect() (e.g. from a 401 inside apiSend) throws a framework control-flow
// error we must never swallow in a catch.
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
    await apiSend("/products", "POST", {
      name: input.name,
      totalSlides: input.totalSlides,
    });
    return { ok: true };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: toMessage(e) };
  }
}

export async function updateProductAction(
  id: string,
  patch: Partial<Pick<Product, "name" | "totalSlides" | "active">>,
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

export async function uploadDetailAidAction(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = form.get("id");
  const file = form.get("file");
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing product id" };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a file to upload" };
  }
  try {
    const forwarded = new FormData();
    forwarded.append("file", file, file.name);
    await apiUpload(`/products/${id}/detail-aid`, forwarded);
    return { ok: true };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: toMessage(e) };
  }
}

export async function reprocessDetailAidAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await apiSend(`/products/${id}/detail-aid/reprocess`, "POST");
    return { ok: true };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: toMessage(e) };
  }
}

/** Fresh product list — used by the client to poll while a render is in progress. */
export async function refreshProductsAction(): Promise<Product[]> {
  await requireAdmin();
  return apiGet<Product[]>("/products");
}

/** Presigned per-page image URLs for the thumbnail grid. */
export async function loadPagesAction(id: string): Promise<DetailAidPageImage[]> {
  await requireAdmin();
  return apiGet<DetailAidPageImage[]>(`/products/${id}/pages/urls`);
}
