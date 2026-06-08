import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "../../lib/api";
import LogoutButton from "./LogoutButton";

const NAV_ITEMS: Array<{ href: string; label: string; group?: string }> = [
  { href: "/admin", label: "Dashboard", group: "Overview" },
  { href: "/admin/users", label: "Users", group: "Master data" },
  { href: "/admin/bricks", label: "Bricks", group: "Master data" },
  { href: "/admin/sub-bricks", label: "Sub-bricks", group: "Master data" },
  { href: "/admin/doctors", label: "Doctors", group: "Master data" },
  { href: "/admin/detail-aids", label: "Detail Aids", group: "Master data" },
  { href: "/admin/products", label: "Products", group: "Master data" },
  { href: "/admin/approvals", label: "List approvals", group: "Operations" },
  { href: "/admin/locks", label: "List locks", group: "Operations" },
  { href: "/admin/reports", label: "Reports", group: "Operations" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdmin();

  const groups = new Map<string, typeof NAV_ITEMS>();
  for (const item of NAV_ITEMS) {
    const g = item.group ?? "Other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(item);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-biosyn-navy text-white">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/biosyn-logo.png"
              alt="Biosyn"
              width={110}
              height={32}
              priority
              className="brightness-0 invert"
            />
            <div className="hidden sm:block border-l border-white/20 pl-4">
              <div className="text-sm font-semibold">Biosyn CRM</div>
              <div className="text-[11px] italic text-white/70">
                A Commitment Towards Better Health
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">{user.nameEn}</div>
              <div className="text-[11px] text-white/60">{user.email}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 shrink-0 bg-white border-r border-biosyn-navy/10">
          <nav className="p-4 flex flex-col gap-5">
            {Array.from(groups.entries()).map(([groupName, items]) => (
              <div key={groupName} className="flex flex-col gap-1">
                <div className="text-[11px] uppercase tracking-wider text-biosyn-navy/50 px-2">
                  {groupName}
                </div>
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md px-2 py-1.5 text-sm text-biosyn-navy hover:bg-biosyn-navy/5 hover:text-biosyn-deep transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
