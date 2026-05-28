import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  API_BASE,
  REFRESH_COOKIE,
  USER_COOKIE,
  type AuthUser,
} from "../../../../lib/api";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = await res.json();
    } catch {
      /* not json */
    }
    const message =
      (detail && typeof detail === "object" && "message" in detail
        ? String((detail as { message: unknown }).message)
        : null) ?? "Invalid credentials";
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };

  if (data.user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin role required to use this dashboard" },
      { status: 403 },
    );
  }

  const store = await cookies();
  // 15 min access, 7 day refresh — match backend defaults.
  store.set(ACCESS_COOKIE, data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });
  store.set(REFRESH_COOKIE, data.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  // Non-httpOnly so server-component reads via cookies() still work AND we can
  // surface the user's name in the layout without an extra round-trip.
  store.set(USER_COOKIE, encodeURIComponent(JSON.stringify(data.user)), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return NextResponse.json({ user: data.user });
}
