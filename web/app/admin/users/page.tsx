import { apiGet } from "../../../lib/api";

interface UserRow {
  id: string;
  role: "rep" | "manager" | "admin";
  nameEn: string;
  email: string;
  phone: string | null;
  region: string | null;
  managerId: string | null;
  isActive: boolean;
}

interface UsersResponse {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
}

const ROLE_TONE: Record<UserRow["role"], string> = {
  admin: "bg-biosyn-gold/15 text-biosyn-gold border-biosyn-gold/40",
  manager: "bg-biosyn-teal/10 text-biosyn-teal border-biosyn-teal/40",
  rep: "bg-biosyn-deep/10 text-biosyn-deep border-biosyn-deep/30",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  qs.set("pageSize", "200");
  if (params.role) qs.set("role", params.role);
  if (params.q) qs.set("q", params.q);

  const data = await apiGet<UsersResponse>(`/users?${qs.toString()}`);

  const byId = new Map(data.items.map((u) => [u.id, u]));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-biosyn-navy">Users</h1>
        <p className="text-sm text-biosyn-navy/60 mt-1">
          {data.total} user{data.total === 1 ? "" : "s"} imported from Employees.xlsx.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 bg-white rounded-lg border border-biosyn-navy/10 p-3">
        <label className="flex flex-col gap-1 text-xs text-biosyn-navy/70">
          Search
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Name or email"
            className="rounded-md border border-biosyn-navy/20 px-2 py-1.5 text-sm text-biosyn-navy outline-none focus:border-biosyn-teal"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-biosyn-navy/70">
          Role
          <select
            name="role"
            defaultValue={params.role ?? ""}
            className="rounded-md border border-biosyn-navy/20 px-2 py-1.5 text-sm text-biosyn-navy bg-white outline-none focus:border-biosyn-teal"
          >
            <option value="">All</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="rep">Rep</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-biosyn-navy text-white text-sm px-3 py-1.5 hover:bg-biosyn-deep transition"
        >
          Apply
        </button>
      </form>

      <div className="bg-white rounded-lg border border-biosyn-navy/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-biosyn-navy/5 text-biosyn-navy/70 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-2.5">Name</th>
              <th className="text-left px-4 py-2.5">Role</th>
              <th className="text-left px-4 py-2.5">Email</th>
              <th className="text-left px-4 py-2.5">Region</th>
              <th className="text-left px-4 py-2.5">Manager</th>
              <th className="text-left px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => {
              const manager = u.managerId ? byId.get(u.managerId) : null;
              return (
                <tr key={u.id} className="border-t border-biosyn-navy/5">
                  <td className="px-4 py-2.5 text-biosyn-navy font-medium">{u.nameEn}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${ROLE_TONE[u.role]}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-biosyn-navy/70">{u.email}</td>
                  <td className="px-4 py-2.5 text-biosyn-navy/70">{u.region ?? "—"}</td>
                  <td className="px-4 py-2.5 text-biosyn-navy/70">
                    {manager ? manager.nameEn : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.isActive ? (
                      <span className="text-biosyn-mint text-xs font-medium">Active</span>
                    ) : (
                      <span className="text-biosyn-coral text-xs font-medium">Inactive</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-biosyn-navy/50">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
