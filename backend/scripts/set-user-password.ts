/**
 * set-user-password.ts
 *
 * One-shot helper to give a user a password (e.g. the imported employees
 * land in the DB without `password_hash`, so they can't log in until you
 * set one). Use this for admins/managers; for reps you'll typically use
 * the admin API once it's live.
 *
 * Usage (from backend/):
 *   npx tsx scripts/set-user-password.ts <email> <plaintext-password>
 */

import * as bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error("Usage: tsx scripts/set-user-password.ts <email> <password>");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash: hash },
      select: { id: true, email: true, nameEn: true, role: true },
    });
    console.log(`Password set for ${user.email} (${user.role}, ${user.nameEn})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
