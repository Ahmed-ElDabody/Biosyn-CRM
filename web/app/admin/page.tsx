import { apiGet } from "../../lib/api";

interface Stats {
  governorates: number;
  bricks: number;
  subBricks: number;
  users: { total: number; admins: number; managers: number; reps: number };
  doctors: number;
  products: number;
}

function StatCard({
  label,
  value,
  hint,
  tone = "navy",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "navy" | "teal" | "gold" | "coral";
}) {
  const toneClass = {
    navy: "border-biosyn-navy/15 text-biosyn-navy",
    teal: "border-biosyn-teal/30 text-biosyn-teal",
    gold: "border-biosyn-gold/40 text-biosyn-gold",
    coral: "border-biosyn-coral/40 text-biosyn-coral",
  }[tone];
  return (
    <div className={`bg-white rounded-xl border ${toneClass} p-5 shadow-sm`}>
      <div className="text-xs uppercase tracking-wide text-biosyn-navy/60">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-biosyn-navy/50">{hint}</div>}
    </div>
  );
}

export default async function Dashboard() {
  const stats = await apiGet<Stats>("/master-data/stats");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-biosyn-navy">Dashboard</h1>
        <p className="text-sm text-biosyn-navy/60 mt-1">
          Current foundation. Doctor and product datasets are not yet loaded.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-medium text-biosyn-navy/70 uppercase tracking-wide mb-3">
          Geography
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Governorates" value={stats.governorates} />
          <StatCard label="Bricks" value={stats.bricks} hint="IMS 148" />
          <StatCard label="Sub-bricks" value={stats.subBricks} hint="IMS 708" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-biosyn-navy/70 uppercase tracking-wide mb-3">
          People
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Users" value={stats.users.total} />
          <StatCard label="Admins" value={stats.users.admins} tone="gold" />
          <StatCard label="Managers" value={stats.users.managers} tone="teal" />
          <StatCard label="Reps" value={stats.users.reps} tone="teal" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-biosyn-navy/70 uppercase tracking-wide mb-3">
          Awaiting data
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Doctors"
            value={stats.doctors}
            hint="Awaiting master doctor list"
            tone="coral"
          />
          <StatCard
            label="Products"
            value={stats.products}
            hint="Awaiting product list + detail aids"
            tone="coral"
          />
        </div>
      </section>
    </div>
  );
}
