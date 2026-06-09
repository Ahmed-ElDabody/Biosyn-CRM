/**
 * export-rep-lists.ts
 *
 * Dumps the derived rep↔account mapping (rep_doctor_list) to an Excel file at
 * the repo root for human review: Rep_Account_Mapping_review.xlsx. Three sheets:
 *
 *   Assignments  — one row per (rep, account): rep + region + account details.
 *   Per-Rep      — account count per rep, split by class (A/B) and type (AM/PM).
 *   Unassigned   — master accounts not on any rep's list (the coverage gap).
 *
 * Run from backend/: `npm run export:rep-lists`
 */
import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const OUT = path.resolve(__dirname, "..", "..", "Rep_Account_Mapping_review.xlsx");

const acctCols = (d: {
  nameAr: string;
  addressAr: string | null;
  class: string;
  accountType: string;
  specialty: string;
  accountSubtype: string | null;
  brick: { nameEn: string } | null;
  subBrick: { nameEn: string } | null;
  governorate: { nameEn: string } | null;
}) => ({
  "Account Name": d.nameAr.trim(),
  Address: (d.addressAr ?? "").trim(),
  Class: d.class,
  Type: d.accountType,
  Specialty: d.specialty,
  Subtype: d.accountSubtype ?? "",
  "Brick (Division)": d.brick?.nameEn ?? "",
  "Sub-Brick": d.subBrick?.nameEn ?? "",
  Governorate: d.governorate?.nameEn ?? "",
});

async function main() {
  const prisma = new PrismaClient();
  try {
    const doctorSelect = {
      id: true,
      nameAr: true,
      addressAr: true,
      class: true,
      accountType: true,
      specialty: true,
      accountSubtype: true,
      brick: { select: { nameEn: true } },
      subBrick: { select: { nameEn: true } },
      governorate: { select: { nameEn: true } },
    } as const;

    // --- Assignments sheet ---
    const links = await prisma.repDoctorList.findMany({
      where: { status: "active" },
      select: {
        rep: { select: { nameEn: true, region: true } },
        doctor: { select: doctorSelect },
      },
    });
    const assignmentRows = links
      .map((l) => ({
        Rep: l.rep.nameEn,
        Region: l.rep.region ?? "",
        ...acctCols(l.doctor),
        "Account ID": l.doctor.id.slice(0, 8),
      }))
      .sort(
        (a, b) =>
          a.Rep.localeCompare(b.Rep) ||
          a["Brick (Division)"].localeCompare(b["Brick (Division)"]) ||
          a["Account Name"].localeCompare(b["Account Name"]),
      );

    // --- Per-Rep summary sheet (all reps, even those with 0 accounts) ---
    const reps = await prisma.user.findMany({
      where: { role: "rep" },
      select: { id: true, nameEn: true, region: true },
    });
    const byRep = new Map<string, typeof links>();
    for (const l of links) {
      const key = l.rep.nameEn;
      if (!byRep.has(key)) byRep.set(key, []);
      byRep.get(key)!.push(l);
    }
    const perRepRows = reps
      .map((r) => {
        const ls = byRep.get(r.nameEn) ?? [];
        const docs = ls.map((l) => l.doctor);
        return {
          Rep: r.nameEn,
          Region: r.region ?? "",
          Accounts: docs.length,
          A: docs.filter((d) => d.class === "A").length,
          B: docs.filter((d) => d.class === "B").length,
          AM: docs.filter((d) => d.accountType === "AM").length,
          PM: docs.filter((d) => d.accountType === "PM").length,
        };
      })
      .sort((a, b) => b.Accounts - a.Accounts);

    // --- Unassigned sheet (accounts on no rep's list) ---
    const unassigned = await prisma.doctor.findMany({
      where: { deletedAt: null, repLists: { none: { status: "active" } } },
      select: doctorSelect,
      orderBy: [{ accountType: "asc" }, { nameAr: "asc" }],
    });
    const unassignedRows = unassigned.map((d) => ({
      ...acctCols(d),
      "Account ID": d.id.slice(0, 8),
    }));

    const wb = XLSX.utils.book_new();
    const wsA = XLSX.utils.json_to_sheet(assignmentRows);
    wsA["!cols"] = [
      { wch: 18 }, { wch: 16 }, { wch: 30 }, { wch: 28 }, { wch: 6 }, { wch: 5 },
      { wch: 15 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsA, "Assignments");
    const wsR = XLSX.utils.json_to_sheet(perRepRows);
    wsR["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 9 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }];
    XLSX.utils.book_append_sheet(wb, wsR, "Per-Rep");
    const wsU = XLSX.utils.json_to_sheet(unassignedRows);
    wsU["!cols"] = wsA["!cols"]!.slice(2);
    XLSX.utils.book_append_sheet(wb, wsU, "Unassigned");
    XLSX.writeFile(wb, OUT);

    console.log(`Wrote ${OUT}`);
    console.log(`  Assignments: ${assignmentRows.length} rows across ${byRep.size} reps`);
    console.log(`  Per-Rep:     ${perRepRows.length} reps`);
    console.log(`  Unassigned:  ${unassignedRows.length} accounts`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
