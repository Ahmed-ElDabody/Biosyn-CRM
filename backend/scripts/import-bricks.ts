/**
 * import-bricks.ts
 *
 * Reads ../Updated_IMS_148_Bricks.xlsx (sheet "IMS EST 148 Bricks") and
 * populates the `bricks` table (and the parent `governorates` lookup) with
 * the 148 official IMS bricks, each keyed by its stable IMS code (B1..B148).
 *
 * Run from backend/: `npm run import:bricks`
 *
 * Expects `docker compose up -d` (Postgres reachable) and the initial
 * migration to have been applied first.
 */

import * as path from "path";
import * as assert from "assert";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const SOURCE_FILE = path.resolve(__dirname, "..", "..", "Updated_IMS_148_Bricks.xlsx");
const IMS_SHEET = "IMS EST 148 Bricks";

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LATIN_RE = /[A-Za-z]/;
const AREA_RE = /^Area\s+[IVX]+$/i;
const BRICK_RE = /^B\s*(\d+)\s*(.*)$/i;

// The "X- ..." headers in the IMS sheet name a governorate (Cairo, Giza)
// for sections 1-2 and a multi-governorate region for sections 3-6.
// When the source line has no English half (sections 4-6) we fall back
// to a stable English label so the row still produces a usable record.
const REGION_EN: Record<string, string> = {
  "1": "Cairo",
  "2": "Giza",
  "3": "Delta",
  "4": "Alexandria/Behera",
  "5": "Canal/Sinai",
  "6": "Upper Egypt",
};

interface ParsedBrick {
  code: string;
  area: string;
  governorateEn: string;
  governorateAr: string | null;
  nameEn: string;
  nameAr: string | null;
}

function splitBilingual(raw: string): { en: string; ar: string } {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  const arParts: string[] = [];
  const enParts: string[] = [];
  let buf = "";
  let mode: "ar" | "en" | "neutral" = "neutral";
  const flush = () => {
    if (!buf) return;
    if (mode === "ar") arParts.push(buf.trim());
    else if (mode === "en") enParts.push(buf.trim());
    buf = "";
  };
  for (const ch of trimmed) {
    if (ARABIC_RE.test(ch)) {
      if (mode !== "ar") flush();
      mode = "ar";
      buf += ch;
    } else if (LATIN_RE.test(ch)) {
      if (mode !== "en") flush();
      mode = "en";
      buf += ch;
    } else {
      buf += ch;
    }
  }
  flush();
  return {
    en: enParts.join(" ").replace(/\s+/g, " ").trim(),
    ar: arParts.join(" ").replace(/\s+/g, " ").trim(),
  };
}

function parseRegionHeader(raw: string): { en: string; ar: string } | null {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  const m = trimmed.match(/^(\d+)\s*-\s*(.+)$/);
  if (!m) return null;
  const num = m[1];
  const split = splitBilingual(m[2]);
  return {
    en: split.en || REGION_EN[num] || "",
    ar: split.ar || "",
  };
}

// "East Cairo I", "Heliopolis II", "Alex West II/Marsa Matrouh",
// "DakahleiaII", "Quena1/Red Sea" all denote a sub-group inside the same
// brick series ("East Cairo", "Heliopolis", "Alex West/Marsa Matrouh",
// "Dakahleia", "Quena/Red Sea"). Bricks in IMS are numbered sequentially
// across all sub-groups of a series, not restarted at each group, so we
// derive the series stem by dropping the trailing roman or digit suffix.
// The suffix may be space-separated or directly attached, and may sit
// before a slash separator inside multi-region group labels.
function seriesStem(groupEn: string): string {
  let s = groupEn;
  // Roman/digit suffix attached directly to a letter ("DakahleiaII", "Quena1")
  s = s.replace(/([A-Za-z])(?:I{1,3}|IV|V|VI{0,3}|IX|X|\d+)(?=\/|\s|$)/g, "$1");
  // Roman/digit suffix separated by whitespace ("Heliopolis I", "Asuit I /...")
  s = s.replace(/\s+(?:I{1,3}|IV|V|VI{0,3}|IX|X|\d+)(?=\/|\s|$)/g, "");
  // Roman/digit prefix ("III South Cairo")
  s = s.replace(/^(?:I{1,3}|IV|V|VI{0,3}|IX|X|\d+)\s+/i, "");
  s = s.replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim();
  return s;
}

function seriesStemAr(groupAr: string | null): string | null {
  if (!groupAr) return null;
  return groupAr
    .replace(/(\S)\s*\d+(?=\/|\s|$)/g, "$1")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function parseImsSheet(filePath: string): ParsedBrick[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[IMS_SHEET];
  if (!ws) throw new Error(`Sheet "${IMS_SHEET}" not found in ${filePath}`);
  const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    defval: null,
    header: 1,
  });

  const bricks: ParsedBrick[] = [];
  let currentArea = "";
  let currentGovEn = "";
  let currentGovAr: string | null = null;
  let currentSeriesEn = "";
  let currentSeriesAr: string | null = null;
  const seriesCount: Record<string, number> = {};

  const tryGroupFromCell = (cell: string): boolean => {
    if (ARABIC_RE.test(cell) && LATIN_RE.test(cell)) {
      const g = splitBilingual(cell);
      if (g.en && g.ar) {
        currentSeriesEn = seriesStem(g.en);
        currentSeriesAr = seriesStemAr(g.ar);
        return true;
      }
    }
    return false;
  };

  for (const r of rows) {
    if (!r) continue;
    const c1 = r[1];
    const c2 = r[2];

    if (typeof c2 === "string") {
      const t = c2.replace(/\s+/g, " ").trim();
      if (t) {
        if (AREA_RE.test(t)) {
          currentArea = t;
          continue;
        }
        if (/^\d+\s*-\s*\S/.test(t)) {
          const g = parseRegionHeader(t);
          if (g) {
            currentGovEn = g.en;
            currentGovAr = g.ar || null;
            currentSeriesEn = "";
            currentSeriesAr = null;
            continue;
          }
        }
        if ((c1 == null || c1 === "") && tryGroupFromCell(t)) {
          continue;
        }
      }
    }

    if (typeof c1 === "string") {
      const t = c1.replace(/\s+/g, " ").trim();
      if (!t) continue;

      const m = t.match(BRICK_RE);
      if (m) {
        const num = parseInt(m[1], 10);
        // The explicit name in the spreadsheet ("B 1 Heliopolis 1", "B12 East 4",
        // "B4 Heliopolis4") is inconsistent: missing for unnamed rows, missing
        // spaces, sometimes truncated ("East" instead of "East Cairo"). We
        // synthesize every brick name from the running series + a series-wide
        // counter so all 148 bricks use one consistent naming convention.
        const key = `${currentGovEn}|${currentSeriesEn || `area:${currentArea}`}`;
        seriesCount[key] = (seriesCount[key] || 0) + 1;
        const idx = seriesCount[key];
        const nameEn = currentSeriesEn ? `${currentSeriesEn} ${idx}` : `Brick B${num}`;
        const nameAr = currentSeriesAr ? `${currentSeriesAr} ${idx}` : null;
        bricks.push({
          code: `B${num}`,
          area: currentArea,
          governorateEn: currentGovEn,
          governorateAr: currentGovAr,
          nameEn,
          nameAr,
        });
        continue;
      }

      if (tryGroupFromCell(t)) continue;
    }
  }

  return bricks;
}

async function main() {
  console.log(`Reading: ${SOURCE_FILE}`);
  const parsed = parseImsSheet(SOURCE_FILE);
  console.log(`Parsed ${parsed.length} brick rows from "${IMS_SHEET}".`);

  const codes = parsed.map((b) => b.code);
  const dupeCodes = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (dupeCodes.length) {
    throw new Error(`Duplicate codes in parsed data: ${[...new Set(dupeCodes)].join(", ")}`);
  }

  const nameKey = (b: ParsedBrick) => `${b.governorateEn}::${b.nameEn}`;
  const nameSeen = new Map<string, string>();
  for (const b of parsed) {
    const k = nameKey(b);
    if (nameSeen.has(k)) {
      throw new Error(
        `Duplicate (governorate, nameEn) within parsed data: ${k} (codes ${nameSeen.get(k)} and ${b.code})`,
      );
    }
    nameSeen.set(k, b.code);
  }

  const prisma = new PrismaClient();
  try {
    const govNamesEn = new Set(parsed.map((b) => b.governorateEn).filter(Boolean));
    for (const nameEn of govNamesEn) {
      const sample = parsed.find((b) => b.governorateEn === nameEn);
      await prisma.governorate.upsert({
        where: { nameEn },
        update: { nameAr: sample?.governorateAr ?? null },
        create: { nameEn, nameAr: sample?.governorateAr ?? null },
      });
    }
    console.log(`Ensured ${govNamesEn.size} governorates.`);

    let inserted = 0;
    let updated = 0;
    for (const b of parsed) {
      const gov = b.governorateEn
        ? await prisma.governorate.findUnique({ where: { nameEn: b.governorateEn } })
        : null;
      const existing = await prisma.brick.findUnique({ where: { code: b.code } });
      await prisma.brick.upsert({
        where: { code: b.code },
        update: {
          nameEn: b.nameEn,
          nameAr: b.nameAr,
          area: b.area || null,
          governorateId: gov?.id ?? null,
        },
        create: {
          code: b.code,
          nameEn: b.nameEn,
          nameAr: b.nameAr,
          area: b.area || null,
          governorateId: gov?.id ?? null,
        },
      });
      if (existing) updated++;
      else inserted++;
    }

    const total = await prisma.brick.count();
    console.log(`bricks rows: ${total} (inserted ${inserted}, updated ${updated})`);
    assert.strictEqual(parsed.length, 148, `Expected 148 bricks but parsed ${parsed.length}`);
    assert.strictEqual(total, 148, `Expected 148 bricks but DB has ${total}`);
    console.log("OK — 148 bricks verified.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
