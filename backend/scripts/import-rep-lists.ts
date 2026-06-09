/**
 * import-rep-lists.ts
 *
 * Seeds rep_doctor_list (each rep's personal account list) by deriving the
 * rep↔account mapping from each rep's territory. The Master List has no rep
 * column, but every rep in Employees.xlsx has a Region, and each Region
 * corresponds to one (or a few) of the 148 IMS bricks — the brick is named
 * after the rep's town and holds its surrounding villages. A rep gets every
 * master account whose brick falls in their Region.
 *
 * Regions with no matching brick in this Master List (Faisal, Helwan — Giza /
 * South Cairo aren't covered here) simply get no accounts. Bricks not claimed
 * by any Region stay unassigned (they belong to other / vacant territories).
 *
 * DRY RUN by default — prints the coverage report and writes nothing. Pass
 * `--apply` (or APPLY=1) to actually (re)seed rep_doctor_list.
 *
 * Run from backend/:
 *   npm run import:rep-lists            # dry run (review only)
 *   npm run import:rep-lists -- --apply # persist
 *
 * Prerequisites: import:employees (reps) and import:doctors (accounts).
 */

import { Prisma, PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply") || process.env.APPLY === "1";

// Region (as stored on user.region, original Employees.xlsx spelling) -> the
// brick name_en(s) that make up that rep's territory. Brick-level because that
// is the granularity at which accounts carry a territory (doctor.brickId).
const REGION_BRICKS: Record<string, string[]> = {
  "Kafr El Sheikh": ["Kafr El Sheikh 1"],
  Desouk: ["Kafr El Sheikh 3"],
  Mahalla: ["Gharbeia 3"],
  Shebin: ["Menofeya 1"],
  Tanta: ["Gharbeia 1", "Gharbeia 2"],
  Ashmoun: ["Menofeya 5"],
  Damnhour: ["Behera 2"],
  Etay: ["Behera 6"],
  "Alex East": ["East Alex 1", "East Alex 2", "East Alex 3", "East Alex 4", "East Alex 5"],
  "Alex Center": ["Alex Center 1", "Alex Center 2"],
  "Alex West": ["Alex West 1", "Alex West 2", "Alex West/Marsa Matrouh 1"],
  Mansoura: ["Dakahleia 1"],
  Dekernes: ["Dakahleia 7"],
  Ismalia: ["Ismailia 1"],
  Zagazig: ["Sharkia 1"],
  Hehya: ["Sharkia 6"],
  "10th of Ramadan": ["Sharkia 5"],
  Marg: ["East Cairo 4"],
  "Nasr City": ["Nasr City 1", "Nasr City 2"],
  Banha: ["Kalubeia 1"],
  Shobra: ["Shobra El Khima 1"],
  Heliobolis: ["Heliopolis 1", "Heliopolis 2", "Heliopolis 3", "Heliopolis 4"],
  Faisal: [],
  Helwan: [],
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const reps = await prisma.user.findMany({
      where: { role: "rep" },
      select: { id: true, nameEn: true, region: true },
      orderBy: { nameEn: "asc" },
    });

    // Resolve brick names -> ids once.
    const bricks = await prisma.brick.findMany({ select: { id: true, nameEn: true } });
    const brickIdByName = new Map(bricks.map((b) => [b.nameEn, b.id]));

    // Validate the mapping references real bricks.
    const badBricks = new Set<string>();
    for (const names of Object.values(REGION_BRICKS))
      for (const n of names) if (!brickIdByName.has(n)) badBricks.add(n);
    if (badBricks.size) throw new Error(`Unknown brick name(s) in REGION_BRICKS: ${[...badBricks].join(", ")}`);

    // Build (repId -> doctorIds) and track coverage.
    const assignments: { repId: string; doctorId: string }[] = [];
    const perRep: { name: string; region: string; bricks: number; accounts: number }[] = [];
    const unmappedRegions: string[] = [];
    const accountRepCount = new Map<string, number>(); // doctorId -> # reps assigned

    for (const rep of reps) {
      const region = (rep.region ?? "").trim();
      const brickNames = REGION_BRICKS[region];
      if (brickNames === undefined) {
        unmappedRegions.push(`${rep.nameEn} (region "${region}")`);
        perRep.push({ name: rep.nameEn, region, bricks: 0, accounts: 0 });
        continue;
      }
      const brickIds = brickNames.map((n) => brickIdByName.get(n)!);
      const docs = brickIds.length
        ? await prisma.doctor.findMany({
            where: { brickId: { in: brickIds }, deletedAt: null },
            select: { id: true },
          })
        : [];
      for (const d of docs) {
        assignments.push({ repId: rep.id, doctorId: d.id });
        accountRepCount.set(d.id, (accountRepCount.get(d.id) ?? 0) + 1);
      }
      perRep.push({ name: rep.nameEn, region, bricks: brickNames.length, accounts: docs.length });
    }

    // Coverage stats.
    const totalAccounts = await prisma.doctor.count({ where: { deletedAt: null } });
    const assignedAccounts = accountRepCount.size;
    const conflicts = [...accountRepCount.values()].filter((n) => n > 1).length;
    const orphanAccounts = totalAccounts - assignedAccounts;
    const assignedBrickNames = new Set(Object.values(REGION_BRICKS).flat());
    const orphanBricks = bricks
      .map((b) => b.nameEn)
      .filter((n) => !assignedBrickNames.has(n));

    console.log(`Mode: ${APPLY ? "APPLY (writing rep_doctor_list)" : "DRY RUN (no writes)"}\n`);
    console.log("Per-rep assignment:");
    for (const r of perRep.sort((a, b) => b.accounts - a.accounts)) {
      const flag = r.accounts === 0 ? "   <-- no accounts" : "";
      console.log(`  ${r.name.padEnd(22)} ${r.region.padEnd(18)} ${String(r.accounts).padStart(4)} accts (${r.bricks} bricks)${flag}`);
    }
    console.log(
      `\nCoverage: ${assignedAccounts}/${totalAccounts} accounts assigned to a rep; ` +
        `${orphanAccounts} unassigned (other/vacant territories); ${conflicts} multi-rep conflicts.`,
    );
    if (unmappedRegions.length)
      console.log(`Regions with no brick mapping: ${unmappedRegions.join(", ")}`);
    console.log(`\nUnassigned bricks (${orphanBricks.length}): ${orphanBricks.join(", ")}`);

    if (!APPLY) {
      console.log("\nDRY RUN — nothing written. Re-run with `--apply` to persist.");
      return;
    }

    // Guard: don't clobber app-generated list activity (pending add/delete).
    const nonActive = await prisma.repDoctorList.count({ where: { status: { not: "active" } } });
    if (nonActive > 0)
      throw new Error(`Aborting: ${nonActive} rep_doctor_list row(s) are pending add/delete (app activity). Resolve before reseeding.`);

    const deleted = await prisma.repDoctorList.deleteMany({});
    console.log(`\nDeleted ${deleted.count} existing rep_doctor_list row(s).`);

    const BATCH = 1000;
    let inserted = 0;
    const data: Prisma.RepDoctorListCreateManyInput[] = assignments.map((a) => ({
      repId: a.repId,
      doctorId: a.doctorId,
      status: "active",
    }));
    for (let i = 0; i < data.length; i += BATCH) {
      const res = await prisma.repDoctorList.createMany({ data: data.slice(i, i + BATCH), skipDuplicates: true });
      inserted += res.count;
    }
    const total = await prisma.repDoctorList.count();
    console.log(`Inserted ${inserted} rep_doctor_list rows; table now has ${total}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
