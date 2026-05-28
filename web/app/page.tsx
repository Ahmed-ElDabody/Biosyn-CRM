import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "../lib/api";

export default async function Root() {
  const store = await cookies();
  redirect(store.get(ACCESS_COOKIE) ? "/admin" : "/login");
}
