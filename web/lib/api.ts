import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ACCESS_COOKIE = "biosyn_access";
export const REFRESH_COOKIE = "biosyn_refresh";
export const USER_COOKIE = "biosyn_user";

export const API_BASE = process.env.BIOSYN_API_BASE ?? "http://localhost:4000/api";

export interface AuthUser {
  id: string;
  role: "rep" | "manager" | "admin";
  email: string;
  nameEn: string;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function readCookie(name: string): Promise<string | undefined> {
  const store = await cookies();
  return store.get(name)?.value;
}

/**
 * Server-side fetch against the Biosyn API. Attaches the access token from the
 * httpOnly cookie. On 401 it redirects to /login — the access token has either
 * expired or never existed. (A more polished build would attempt a refresh-token
 * round-trip here before bouncing; deferred until the cookie/refresh logic has
 * a UI surface.)
 */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  const token = await readCookie(ACCESS_COOKIE);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (res.status === 401) redirect("/login");
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, `GET ${path} failed: ${res.status}`, body);
  }
  return res.json();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const raw = await readCookie(USER_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as AuthUser;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login?error=admin_only");
  return user;
}
