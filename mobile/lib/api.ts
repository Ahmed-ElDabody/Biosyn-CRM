import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "biosyn_access";
const REFRESH_KEY = "biosyn_refresh";
const USER_KEY = "biosyn_user";

export const API_BASE: string =
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ??
  "http://localhost:4000/api";

export interface AuthUser {
  id: string;
  role: "rep" | "manager" | "admin";
  email: string;
  nameEn: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let detail = "Invalid credentials";
    try {
      const body = await res.json();
      if (body?.message) detail = String(body.message);
    } catch {
      /* not JSON */
    }
    throw new ApiError(res.status, detail);
  }
  const data = (await res.json()) as LoginResponse;
  await SecureStore.setItemAsync(ACCESS_KEY, data.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

/**
 * Authenticated GET against the Biosyn API. Returns null on 401 — callers
 * decide whether to redirect to login. (Refresh-token retry is deferred
 * until we have screens that need data fetching beyond the placeholder shell.)
 */
export async function apiGet<T = unknown>(path: string): Promise<T | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new ApiError(res.status, `GET ${path} failed`);
  return res.json() as Promise<T>;
}

// ---- Rep doctor list (GET /me/doctors) ------------------------------------

export type DoctorClass = "A" | "B" | "C";
export type AccountType = "AM" | "PM";
export type FrequencyState = "todo" | "in_progress" | "done" | "over";

export interface DoctorFrequency {
  doctorId: string;
  class: DoctorClass;
  target: number;
  actual: number;
  remaining: number;
  overBy: number;
  progressPct: number; // 0..100+ (uncapped — over-achievement allowed)
  state: FrequencyState;
}

export interface MeDoctor {
  id: string;
  nameAr: string;
  addressAr: string | null;
  specialty: string;
  class: DoctorClass;
  accountType: AccountType;
  accountSubtype: string | null;
}

export interface MeDoctorListItem {
  listEntryId: string;
  listStatus: "active" | "pending_add" | "pending_delete";
  addedAt: string;
  doctor: MeDoctor;
  frequency: DoctorFrequency;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListMyDoctorsParams {
  class?: DoctorClass;
  accountType?: AccountType;
  q?: string;
  page?: number;
  pageSize?: number;
}

export function listMyDoctors(
  params: ListMyDoctorsParams = {},
): Promise<Paginated<MeDoctorListItem> | null> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString();
  return apiGet<Paginated<MeDoctorListItem>>(`/me/doctors${query ? `?${query}` : ""}`);
}
