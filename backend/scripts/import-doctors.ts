/**
 * import-doctors.ts
 *
 * Imports the central Master List (Master_List_clean.xlsx) into the `doctors`
 * table — the master account directory. The file has one sheet, "Master List",
 * with 7 columns:
 *
 *   Account Name (Arabic)  -> name_ar
 *   Address (Arabic)       -> address_ar
 *   Classification (A/B)   -> class
 *   Account Type (AM/PM)   -> account_type
 *   Speciality             -> specialty   (PEDIA/ENT/CHEST/GP, mapped to canonical names)
 *   Division               -> brick_id    (the 148 IMS bricks; Territory_NAME_148 level)
 *   Brick                  -> sub_brick_id (the 708 sub-bricks; BRICK_NAME_700 level)
 *
 * Note the file's naming is inverted relative to our DB hierarchy:
 *   Governorate -> Brick (148, "Division") -> SubBrick (708, "Brick").
 *
 * The file has NO rep column (the Master List is a central directory; the
 * rep<->account mapping lives separately in rep_doctor_list) and NO subtype or
 * coordinates (account_subtype is filled in later by an admin; clinic GPS is
 * captured on the rep's first visit). Accounts are inserted with status=active
 * and created_by=null (the system-import marker).
 *
 * Idempotent via truncate & reload: each run deletes the import-sourced doctors
 * (created_by IS NULL) and re-inserts from the file. It ABORTS if any existing
 * doctor has dependent activity (visits, plan items, rep-list entries, list
 * changes) so a re-run can never clobber real field data.
 *
 * Run from backend/: `npm run import:doctors`
 *
 * Prerequisites: `import:bricks` (148 bricks) and `import:territories` (708
 * sub-bricks) must have run first so Division/Brick names resolve.
 */

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { Prisma, PrismaClient } from "@prisma/client";

const SOURCE_FILE = path.resolve(__dirname, "..", "..", "Master_List_clean.xlsx");
const SHEET = "Master List";

// Speciality codes in the file -> canonical names in config/specialties.ts.
const SPECIALTY_MAP: Record<string, string> = {
  PEDIA: "Pediatrics",
  ENT: "Otolaryngology",
  CHEST: "Pulmonology",
  GP: "General Practice",
};

interface RawRow {
  nameAr: string;
  addressAr: string;
  classRaw: string;
  accountTypeRaw: string;
  specialtyRaw: string;
  division: string;
  brick: string;
}

// ---------------------------------------------------------------------------
// Name canonicalization for Division -> brick (148) matching.
//
// The file's "Division" values carry an extra A/B sub-split suffix ("Menofia
// 3 A", "Sharkia 1B") and some spelling variants vs the 148 brick names
// (Territory_NAME_148). This mirrors the canonicalize() in import-territories.ts
// and adds: (a) stripping the trailing A/B sub-split, (b) the Dahaklia spelling.
// ---------------------------------------------------------------------------
const SPELLING_ALIASES: Record<string, string> = {
  bahera: "behera",
  bani: "beni",
  suif: "suef",
  assuit: "asuit",
  kalubia: "kalubeia",
  menofia: "menofeya",
  gharbia: "gharbeia",
  dakahlia: "dakahleia",
  dahaklia: "dakahleia",
  abassia: "abbasia",
  koubah: "qouba",
  khemah: "khima",
};

function canonicalize(name: string): string {
  let s = name.toLowerCase().trim();
  s = s.replace(/\./g, "");
  for (const [from, to] of Object.entries(SPELLING_ALIASES)) {
    s = s.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }
  s = s.replace(/\s*\/\s*/g, "/");
  s = s.replace(/\bnorth\s+sinai\b/g, "n sinai");
  s = s.replace(/\bsouth\s+sinai\b/g, "s sinai");
  s = s.replace(/([a-z])(\d)/g, "$1 $2");
  s = s.replace(/^cairo\s+(east|west|south|center)(\s+\d+)?$/, (_m, dir, num) =>
    num ? `${dir} cairo${num}` : `${dir} cairo`,
  );
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// Drop the trailing " A"/" B" (or "1B") sub-split suffix the Division column
// adds on top of the 148-brick name: "Menofia 3 A" -> "Menofia 3".
function stripSubSplit(name: string): string {
  return name.replace(/\s*([ab])$/i, "").replace(/\s+/g, " ").trim();
}

// Sub-brick names ("Brick" column) are matched literally apart from
// whitespace/case folding; they are looked up scoped to the resolved parent
// brick first, then by a globally-unique name.
function normSub(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseSheet(filePath: string): RawRow[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`Sheet "${SHEET}" not found in ${filePath}`);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
  });
  const out: RawRow[] = [];
  for (const r of rows) {
    const get = (k: string) => (r[k] ?? "").toString().trim();
    const nameAr = get("Account Name");
    if (!nameAr) continue; // skip blank rows
    out.push({
      nameAr,
      addressAr: get("Address"),
      classRaw: get("Classification"),
      accountTypeRaw: get("Account Type"),
      specialtyRaw: get("Speciality"),
      division: get("Division"),
      brick: get("Brick"),
    });
  }
  return out;
}

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`Master List file not found: ${SOURCE_FILE}`);
    process.exit(1);
  }
  console.log(`Reading: ${SOURCE_FILE}`);
  const rows = parseSheet(SOURCE_FILE);
  console.log(`Parsed ${rows.length} account rows from "${SHEET}".`);

  const prisma = new PrismaClient();
  try {
    // --- Build resolution indexes from the already-imported geography ----
    const bricks = await prisma.brick.findMany({
      select: { id: true, nameEn: true, governorateId: true },
    });
    const brickByCanonical = new Map<string, { id: string; governorateId: string | null }>();
    for (const b of bricks) {
      brickByCanonical.set(canonicalize(b.nameEn), {
        id: b.id,
        governorateId: b.governorateId,
      });
    }
    const resolveBrick = (division: string) => {
      const key = canonicalize(division);
      // Solo-brick series are stored with a " 1" suffix on the brick side.
      return (
        brickByCanonical.get(key) ??
        brickByCanonical.get(`${key} 1`) ??
        brickByCanonical.get(canonicalize(stripSubSplit(division))) ??
        brickByCanonical.get(`${canonicalize(stripSubSplit(division))} 1`) ??
        null
      );
    };

    const subBricks = await prisma.subBrick.findMany({
      select: { id: true, nameEn: true, parentBrickId: true },
    });
    // Scoped index: (parentBrickId, normName) -> subBrickId.
    const subByParent = new Map<string, string>();
    // Global index: normName -> subBrickId, but only when the name is unique
    // across all sub-bricks (ambiguous names are dropped from this index).
    const subByNameCount = new Map<string, number>();
    const subByName = new Map<string, string>();
    for (const s of subBricks) {
      subByParent.set(`${s.parentBrickId}::${normSub(s.nameEn)}`, s.id);
      const n = normSub(s.nameEn);
      subByNameCount.set(n, (subByNameCount.get(n) ?? 0) + 1);
      subByName.set(n, s.id);
    }
    const resolveSubBrick = (brick: string, parentBrickId: string | null): string | null => {
      const n = normSub(brick);
      if (parentBrickId) {
        const scoped = subByParent.get(`${parentBrickId}::${n}`);
        if (scoped) return scoped;
      }
      if ((subByNameCount.get(n) ?? 0) === 1) return subByName.get(n) ?? null;
      return null;
    };

    // --- Map rows to doctor records, tracking what didn't resolve --------
    const unresolvedDivisions = new Map<string, number>();
    const unresolvedBricks = new Map<string, number>();
    const unmappedSpecialties = new Map<string, number>();
    const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

    const data: Prisma.DoctorCreateManyInput[] = [];
    for (const r of rows) {
      const brick = resolveBrick(r.division);
      if (!brick) bump(unresolvedDivisions, r.division);

      const subBrickId = resolveSubBrick(r.brick, brick?.id ?? null);
      if (!subBrickId) bump(unresolvedBricks, r.brick);

      const specialty = SPECIALTY_MAP[r.specialtyRaw.toUpperCase()];
      if (!specialty) bump(unmappedSpecialties, r.specialtyRaw);

      const classVal = r.classRaw.toUpperCase();
      const accountType = r.accountTypeRaw.toUpperCase();

      data.push({
        nameAr: r.nameAr,
        addressAr: r.addressAr || null,
        specialty: specialty ?? r.specialtyRaw,
        class: classVal as Prisma.DoctorCreateManyInput["class"],
        accountType: accountType as Prisma.DoctorCreateManyInput["accountType"],
        accountSubtype: null,
        brickId: brick?.id ?? null,
        subBrickId,
        governorateId: brick?.governorateId ?? null,
        status: "active",
        createdById: null,
      });
    }

    // --- Safety guard: never clobber doctors with real field activity ----
    const dependents = await prisma.doctor.findMany({
      where: {
        OR: [
          { visits: { some: {} } },
          { planItems: { some: {} } },
          { repLists: { some: {} } },
          { listRequests: { some: {} } },
        ],
      },
      select: { id: true },
    });
    if (dependents.length > 0) {
      throw new Error(
        `Aborting: ${dependents.length} existing doctor(s) have dependent activity ` +
          `(visits/plan items/rep-list/list-change). Truncate-and-reload would orphan them. ` +
          `Resolve these before re-importing.`,
      );
    }

    // --- Truncate import-sourced doctors, then bulk insert ---------------
    const deleted = await prisma.doctor.deleteMany({ where: { createdById: null } });
    console.log(`Deleted ${deleted.count} previously import-sourced doctor(s).`);

    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < data.length; i += BATCH) {
      const res = await prisma.doctor.createMany({ data: data.slice(i, i + BATCH) });
      inserted += res.count;
    }

    // --- Report ----------------------------------------------------------
    const total = await prisma.doctor.count();
    console.log(`\nInserted ${inserted} accounts. doctors table now has ${total} rows.`);

    const tally = (label: string, m: Map<string, unknown>) =>
      console.log(`  ${label}: ${[...m.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`);
    const countBy = (key: (d: Prisma.DoctorCreateManyInput) => string) => {
      const m = new Map<string, number>();
      for (const d of data) m.set(key(d), (m.get(key(d)) ?? 0) + 1);
      return m;
    };
    tally("by class", countBy((d) => String(d.class)));
    tally("by type", countBy((d) => String(d.accountType)));
    tally("by specialty", countBy((d) => String(d.specialty)));

    const linkedBrick = data.filter((d) => d.brickId).length;
    const linkedSub = data.filter((d) => d.subBrickId).length;
    console.log(
      `\nLinked to a brick (Division):   ${linkedBrick}/${data.length}` +
        `\nLinked to a sub-brick (Brick):  ${linkedSub}/${data.length}`,
    );

    const dumpUnresolved = (label: string, m: Map<string, number>) => {
      if (m.size === 0) return;
      const rowsAffected = [...m.values()].reduce((a, b) => a + b, 0);
      console.warn(`\nUnresolved ${label} (${m.size} distinct, ${rowsAffected} rows):`);
      for (const [k, v] of [...m.entries()].sort((a, b) => b[1] - a[1])) {
        console.warn(`  - ${k} (${v})`);
      }
    };
    dumpUnresolved("Divisions -> brick", unresolvedDivisions);
    dumpUnresolved("Bricks -> sub_brick", unresolvedBricks);
    if (unmappedSpecialties.size) dumpUnresolved("Specialities", unmappedSpecialties);

    console.log("\nDone. Unresolved rows imported with null links for later fixup.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
