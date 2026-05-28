/**
 * import-territories.ts
 *
 * Reads ../"Standard Structure.xlsx" (708 rows: Territory_NAME_148_Max,
 * BRICK_NAME_700) and populates the `sub_bricks` table, linking each
 * sub-brick to its parent IMS brick (matched by English name).
 *
 * Run from backend/: `npm run import:territories`
 *
 * Prerequisite: run `import:bricks` first so the 148 parent bricks exist.
 */

import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

// Note: the task text uses an underscore ("Standard_Structure.xlsx"), but the
// file on disk has a space in the name. We use the on-disk name.
const SOURCE_FILE = path.resolve(__dirname, "..", "..", "Standard Structure.xlsx");
const SHEET = "Sheet1";

interface Row {
  territoryNameEn: string;
  subBrickNameEn: string;
}

// The Territory_NAME_148_Max column in Standard Structure.xlsx and the
// brick names produced by import-bricks.ts use slightly different
// conventions for spelling, punctuation, word order, and the "1" suffix
// of solo-brick series. canonicalize() folds both sides into a single
// matchable form so the 148 territories pair up cleanly with the 148
// bricks. Known divergences handled here:
//   - spelling:  Bahera/Behera, Bani Suif/Beni Suef, Assuit/Asuit,
//                Kalubia/Kalubeia, Menofia/Menofeya, Gharbia/Gharbeia,
//                Dakahlia/Dakahleia, Abassia/Abbasia, Koubah/Qouba,
//                Khemah/Khima
//   - punctuation:  "X / Y" vs "X/Y", "N." vs "N", "Heliopolis4" vs
//                   "Heliopolis 4"
//   - direction prefix:  "Cairo East" vs "East Cairo"
//   - N./S. Sinai vs North/South Sinai
const SPELLING_ALIASES: Record<string, string> = {
  bahera: "behera",
  bani: "beni",
  suif: "suef",
  assuit: "asuit",
  kalubia: "kalubeia",
  menofia: "menofeya",
  gharbia: "gharbeia",
  dakahlia: "dakahleia",
  abassia: "abbasia",
  koubah: "qouba",
  khemah: "khima",
};

function canonicalize(name: string): string {
  let s = name.toLowerCase().trim();
  s = s.replace(/\./g, "");
  // Apply spelling aliases via \b boundaries so they fire regardless of
  // adjacent punctuation (e.g. "Assuit/New Valley" → "asuit/new valley").
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

function parseSheet(filePath: string): Row[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`Sheet "${SHEET}" not found in ${filePath}`);
  const rows = XLSX.utils.sheet_to_json<{
    Territory_NAME_148_Max?: string;
    BRICK_NAME_700?: string;
  }>(ws, { defval: null });
  const out: Row[] = [];
  for (const r of rows) {
    const t = (r.Territory_NAME_148_Max ?? "").toString().trim();
    const s = (r.BRICK_NAME_700 ?? "").toString().trim();
    if (!t || !s) continue;
    out.push({ territoryNameEn: t, subBrickNameEn: s });
  }
  return out;
}

async function main() {
  console.log(`Reading: ${SOURCE_FILE}`);
  const rows = parseSheet(SOURCE_FILE);
  console.log(`Parsed ${rows.length} sub-brick rows.`);

  const prisma = new PrismaClient();
  try {
    // Build canonical-name -> brick id index. Use canonicalize() to fold
    // spelling/punctuation/word-order/abbreviation variants.
    const bricks = await prisma.brick.findMany({ select: { id: true, nameEn: true } });
    const byCanonical = new Map<string, string>();
    for (const b of bricks) byCanonical.set(canonicalize(b.nameEn), b.id);

    const unresolved: string[] = [];
    let inserted = 0;
    for (const r of rows) {
      const key = canonicalize(r.territoryNameEn);
      // Solo-brick series (e.g. "El Qouba", "Ismailia") are stored with a
      // " 1" suffix on the brick side; territories drop it.
      const parentId = byCanonical.get(key) ?? byCanonical.get(`${key} 1`);
      if (!parentId) {
        unresolved.push(r.territoryNameEn);
        continue;
      }
      await prisma.subBrick.upsert({
        where: {
          parentBrickId_nameEn: {
            parentBrickId: parentId,
            nameEn: r.subBrickNameEn,
          },
        },
        update: {},
        create: {
          parentBrickId: parentId,
          nameEn: r.subBrickNameEn,
        },
      });
      inserted++;
    }

    const total = await prisma.subBrick.count();
    console.log(`sub_bricks rows: ${total} (inserted/updated this run: ${inserted})`);
    const uniqueUnresolved = Array.from(new Set(unresolved));
    if (uniqueUnresolved.length) {
      console.warn(
        `Unresolved territory parents (${uniqueUnresolved.length} unique, ${unresolved.length} rows):`,
      );
      for (const u of uniqueUnresolved) console.warn(`  - ${u}`);
    } else {
      console.log("All 708 sub-bricks linked to a parent IMS brick.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
