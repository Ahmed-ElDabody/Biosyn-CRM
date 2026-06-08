/**
 * import-doctors.ts
 *
 * Stub for the master doctor-list import. The spec marks the doctor list
 * as [INPUT NEEDED] in Section 14 — once you drop the file (e.g.
 * `Master_Doctors.xlsx`) into the repo root, this script will:
 *
 *   1. Parse name_ar (Arabic, min two parts), address_ar, specialty,
 *      class (A/B/C), account_type (AM/PM), account_subtype, brick,
 *      governorate, clinic GPS (if available).
 *   2. Resolve brick + governorate names to ids (matching by name_en).
 *   3. Insert doctors with status=active.
 *   4. Log the final count.
 *
 * Run from backend/: `npm run import:doctors`
 */

import * as fs from "fs";
import * as path from "path";

const CANDIDATE_FILES = [
  "Master_Doctors.xlsx",
  "MasterDoctors.xlsx",
  "Doctors.xlsx",
  "doctors.xlsx",
];

function findSource(): string | null {
  const root = path.resolve(__dirname, "..", "..");
  for (const name of CANDIDATE_FILES) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  const source = findSource();
  if (!source) {
    console.log("No master-doctor-list file found in the repo root.");
    console.log(`Looked for: ${CANDIDATE_FILES.join(", ")}`);
    console.log(
      "Drop the file in (any of those names work) and re-run `npm run import:doctors`.",
    );
    return;
  }
  console.log(`Found source: ${source}`);
  console.log(
    "TODO: full doctor-import logic — implement once the actual column layout is confirmed.",
  );
  // When ready, follow this outline (see import-bricks.ts for parser patterns):
  //   const wb = XLSX.readFile(source);
  //   const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  //   for (const r of rows) {
  //     // resolve brick / governorate by name
  //     // validate name_ar (min two parts)
  //     // upsert via prisma.doctor.upsert
  //   }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
