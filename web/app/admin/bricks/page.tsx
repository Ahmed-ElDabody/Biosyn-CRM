import { apiGet } from "../../../lib/api";

interface BrickRow {
  id: string;
  code: string | null;
  nameEn: string;
  nameAr: string | null;
  area: string | null;
  governorate: { id: string; nameEn: string } | null;
}

interface BricksResponse {
  items: BrickRow[];
  total: number;
}

interface Governorate {
  id: string;
  nameEn: string;
  nameAr: string | null;
}

export default async function BricksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; governorateId?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  qs.set("pageSize", "200");
  if (params.q) qs.set("q", params.q);
  if (params.governorateId) qs.set("governorateId", params.governorateId);

  const [data, governorates] = await Promise.all([
    apiGet<BricksResponse>(`/master-data/bricks?${qs.toString()}`),
    apiGet<Governorate[]>("/master-data/governorates"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-biosyn-navy">Bricks</h1>
        <p className="text-sm text-biosyn-navy/60 mt-1">
          {data.total} of 148 IMS bricks loaded. Code = stable IMS identifier.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 bg-white rounded-lg border border-biosyn-navy/10 p-3">
        <label className="flex flex-col gap-1 text-xs text-biosyn-navy/70">
          Search
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Name or code (e.g. B5)"
            className="rounded-md border border-biosyn-navy/20 px-2 py-1.5 text-sm text-biosyn-navy outline-none focus:border-biosyn-teal"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-biosyn-navy/70">
          Governorate
          <select
            name="governorateId"
            defaultValue={params.governorateId ?? ""}
            className="rounded-md border border-biosyn-navy/20 px-2 py-1.5 text-sm text-biosyn-navy bg-white outline-none focus:border-biosyn-teal"
          >
            <option value="">All</option>
            {governorates.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nameEn}
              </option>
            ))}
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
              <th className="text-left px-4 py-2.5 w-20">Code</th>
              <th className="text-left px-4 py-2.5">Name (EN)</th>
              <th className="text-right px-4 py-2.5" dir="rtl">
                الاسم
              </th>
              <th className="text-left px-4 py-2.5">Area</th>
              <th className="text-left px-4 py-2.5">Governorate</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((b) => (
              <tr key={b.id} className="border-t border-biosyn-navy/5">
                <td className="px-4 py-2.5 text-biosyn-navy/60 font-mono text-xs">
                  {b.code ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-biosyn-navy font-medium">{b.nameEn}</td>
                <td className="px-4 py-2.5 text-biosyn-navy/70 text-right" dir="rtl">
                  <bdi>{b.nameAr ?? "—"}</bdi>
                </td>
                <td className="px-4 py-2.5 text-biosyn-navy/70">{b.area ?? "—"}</td>
                <td className="px-4 py-2.5 text-biosyn-navy/70">
                  {b.governorate?.nameEn ?? "—"}
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-biosyn-navy/50">
                  No bricks match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
