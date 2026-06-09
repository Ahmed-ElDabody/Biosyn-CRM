/**
 * export-doctors.ts
 *
 * Dumps the current master account directory (doctors table) to an Excel file
 * at the repo root for human review: Master_List_final_review.xlsx. Includes the
 * backfilled account_subtype and the resolved English geography (brick /
 * sub-brick / governorate). AM accounts whose subtype is only the
 * general_hospital fallback are flagged in a "Review Note" column.
 *
 * Run from backend/: `npm run export:doctors`
 */
import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const OUT = path.resolve(__dirname, "..", "..", "Master_List_final_review.xlsx");
// Names carrying a positive general-hospital signal; without one, an AM
// general_hospital row is just the heuristic's default and wants review.
const INDICATOR = /مستشفى|مستشفي|عام|مركز[يى]|المركز|تخصصي|جامع|الهلال|مبر[ةه]/;

async function main() {
  const prisma = new PrismaClient();
  try {
    const docs = await prisma.doctor.findMany({
      select: {
        id: true, nameAr: true, addressAr: true, class: true, accountType: true,
        specialty: true, accountSubtype: true, status: true,
        brick: { select: { nameEn: true } },
        subBrick: { select: { nameEn: true } },
        governorate: { select: { nameEn: true } },
      },
      orderBy: [{ accountType: "asc" }, { accountSubtype: "asc" }, { nameAr: "asc" }],
    });

    const rows = docs.map((d) => ({
      ID: d.id.slice(0, 8),
      "Account Name": d.nameAr.trim(),
      Address: (d.addressAr ?? "").trim(),
      Class: d.class,
      Type: d.accountType,
      Specialty: d.specialty,
      Subtype: d.accountSubtype ?? "",
      "Brick (Division)": d.brick?.nameEn ?? "",
      "Sub-Brick": d.subBrick?.nameEn ?? "",
      Governorate: d.governorate?.nameEn ?? "",
      Status: d.status,
      "Review Note":
        d.accountType === "AM" &&
        d.accountSubtype === "general_hospital" &&
        !INDICATOR.test(d.nameAr)
          ? "subtype defaulted — review"
          : "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 9 }, { wch: 32 }, { wch: 30 }, { wch: 6 }, { wch: 5 }, { wch: 16 },
      { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 8 }, { wch: 26 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Accounts");
    XLSX.writeFile(wb, OUT);

    const flagged = rows.filter((r) => r["Review Note"]).length;
    console.log(`Wrote ${rows.length} accounts to ${OUT}`);
    console.log(`  flagged for review (defaulted subtype): ${flagged}`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
