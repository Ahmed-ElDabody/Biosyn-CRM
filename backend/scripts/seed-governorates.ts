/**
 * seed-governorates.ts
 *
 * Ensures the 21 standard Egyptian governorates exist in the
 * `governorates` table. Idempotent (upserts by name_en). Safe to run
 * after `import:bricks` — fills in anything the bricks import missed
 * and tightens up Arabic names from the canonical list.
 *
 * Run from backend/: `npm run seed:governorates`
 */

import { PrismaClient } from "@prisma/client";
import { GOVERNORATES } from "../src/config/governorates";

async function main() {
  const prisma = new PrismaClient();
  try {
    let inserted = 0;
    let updated = 0;
    for (const g of GOVERNORATES) {
      const existing = await prisma.governorate.findUnique({ where: { nameEn: g.nameEn } });
      if (existing) {
        await prisma.governorate.update({
          where: { nameEn: g.nameEn },
          data: { nameAr: g.nameAr },
        });
        updated++;
      } else {
        await prisma.governorate.create({ data: g });
        inserted++;
      }
    }
    const total = await prisma.governorate.count();
    console.log(
      `governorates seeded: inserted=${inserted}, updated=${updated}, total in DB=${total}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
