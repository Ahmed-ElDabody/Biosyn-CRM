"use server";

import {
  apiGet,
  apiSend,
  apiUpload,
  ApiError,
  requireAdmin,
  type DetailAid,
  type DetailAidPageImage,
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

export async function createDetailAidAction(name: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await apiSend("/detail-aids", "POST", { name });
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
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing detail aid id" };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a PDF to upload" };
  }
  try {
    const forwarded = new FormData();
    forwarded.append("file", file, file.name);
    await apiUpload(`/detail-aids/${id}/upload`, forwarded);
    return { ok: true };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: toMessage(e) };
  }
}

export async function reprocessDetailAidAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await apiSend(`/detail-aids/${id}/reprocess`, "POST");
    return { ok: true };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: toMessage(e) };
  }
}

export async function deleteDetailAidAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await apiSend(`/detail-aids/${id}`, "DELETE");
    return { ok: true };
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { ok: false, error: toMessage(e) };
  }
}

export async function refreshDetailAidsAction(): Promise<DetailAid[]> {
  await requireAdmin();
  return apiGet<DetailAid[]>("/detail-aids");
}

export async function loadDetailAidPagesAction(id: string): Promise<DetailAidPageImage[]> {
  await requireAdmin();
  return apiGet<DetailAidPageImage[]>(`/detail-aids/${id}/pages/urls`);
}
