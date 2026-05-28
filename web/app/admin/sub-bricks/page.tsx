import { apiGet } from "../../../lib/api";

interface SubBrickRow {
  id: string;
  nameEn: string;
  parentBrick: { id: string; code: string | null; nameEn: string };
}

interface SubBricksResponse {
  items: SubBrickRow[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 100;

export default async function SubBricksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const qs = new URLSearchParams();
  qs.set("pageSize", String(PAGE_SIZE));
  qs.set("page", String(page));
  if (params.q) qs.set("q", params.q);

  const data = await apiGet<SubBricksResponse>(`/master-data/sub-bricks?${qs.toString()}`);
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-biosyn-navy">Sub-bricks</h1>
        <p className="text-sm text-biosyn-navy/60 mt-1">
          {data.total} of 708 territory entries loaded, each linked to a parent IMS brick.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 bg-white rounded-lg border border-biosyn-navy/10 p-3">
        <label className="flex flex-col gap-1 text-xs text-biosyn-navy/70">
          Search
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Sub-brick name"
            className="rounded-md border border-biosyn-navy/20 px-2 py-1.5 text-sm text-biosyn-navy outline-none focus:border-biosyn-teal"
          />
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
              <th className="text-left px-4 py-2.5 w-24">Parent code</th>
              <th className="text-left px-4 py-2.5">Parent brick</th>
              <th className="text-left px-4 py-2.5">Sub-brick</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((sb) => (
              <tr key={sb.id} className="border-t border-biosyn-navy/5">
                <td className="px-4 py-2.5 text-biosyn-navy/60 font-mono text-xs">
                  {sb.parentBrick.code ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-biosyn-navy/80">{sb.parentBrick.nameEn}</td>
                <td className="px-4 py-2.5 text-biosyn-navy font-medium">{sb.nameEn}</td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-biosyn-navy/50">
                  No sub-bricks match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-biosyn-navy/70">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), page: String(page - 1) }).toString()}`}
                className="rounded-md border border-biosyn-navy/20 px-3 py-1.5 hover:bg-biosyn-navy/5"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={`?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), page: String(page + 1) }).toString()}`}
                className="rounded-md border border-biosyn-navy/20 px-3 py-1.5 hover:bg-biosyn-navy/5"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
