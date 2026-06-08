/**
 * import-employees.ts
 *
 * Reads ../Employees.xlsx (sheet "employees") and populates the `users`
 * table with the 33 employees listed there. Two passes: insert users
 * first, then resolve each row's "Direct Manager" name to a user id.
 *
 * Role mapping:
 *   "MR"          -> rep
 *   "*Admin*"     -> admin   (e.g. "CRM Admin")
 *   anything else -> manager (Sales Manager, District Manager, etc.)
 *
 * Run from backend/: `npm run import:employees`
 */

import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaClient, Role } from "@prisma/client";

const SOURCE_FILE = path.resolve(__dirname, "..", "..", "Employees.xlsx");
const SHEET = "employees";

interface RawEmployee {
  sr: number;
  name: string;
  region: string;
  roleRaw: string;
  managerName: string | null;
}

function mapRole(raw: string): Role {
  const r = raw.toLowerCase().trim();
  if (r === "mr") return "rep" as Role;
  if (r.includes("admin")) return "admin" as Role;
  return "manager" as Role;
}

function slugifyEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
  return `${slug}@biosyn.local`;
}

function parseSheet(filePath: string): RawEmployee[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`Sheet "${SHEET}" not found in ${filePath}`);
  const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, {
    defval: null,
    header: 1,
  });

  const out: RawEmployee[] = [];
  for (const row of rows) {
    if (!row) continue;
    const sr = row[0];
    const name = row[1];
    if (typeof sr !== "number" || typeof name !== "string") continue; // skip header / blanks
    out.push({
      sr,
      name: name.trim(),
      region: typeof row[2] === "string" ? row[2].trim() : "",
      roleRaw: typeof row[3] === "string" ? row[3].trim() : "",
      managerName: typeof row[4] === "string" ? row[4].trim() : null,
    });
  }
  return out;
}

async function main() {
  console.log(`Reading: ${SOURCE_FILE}`);
  const employees = parseSheet(SOURCE_FILE);
  console.log(`Parsed ${employees.length} employee rows.`);

  const prisma = new PrismaClient();
  try {
    // Pass 1: insert all users (no manager link yet)
    for (const e of employees) {
      const role = mapRole(e.roleRaw);
      const email = slugifyEmail(e.name);
      await prisma.user.upsert({
        where: { email },
        update: {
          nameEn: e.name,
          region: e.region || null,
          role,
          isActive: true,
        },
        create: {
          nameEn: e.name,
          email,
          region: e.region || null,
          role,
          isActive: true,
        },
      });
    }

    // Pass 2: resolve direct-manager names -> user ids
    const allUsers = await prisma.user.findMany();
    const byName = new Map<string, string>();
    for (const u of allUsers) byName.set(u.nameEn.toLowerCase().trim(), u.id);

    const unresolved: string[] = [];
    for (const e of employees) {
      if (!e.managerName) continue;
      const managerId = byName.get(e.managerName.toLowerCase().trim());
      const email = slugifyEmail(e.name);
      if (!managerId) {
        unresolved.push(`${e.name} -> "${e.managerName}"`);
        continue;
      }
      await prisma.user.update({
        where: { email },
        data: { managerId },
      });
    }

    const total = await prisma.user.count();
    const byRole = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } });
    console.log(`users rows: ${total}`);
    for (const r of byRole) console.log(`  ${r.role}: ${r._count._all}`);
    if (unresolved.length) {
      console.warn(`Unresolved direct-manager names (${unresolved.length}):`);
      for (const u of unresolved) console.warn(`  - ${u}`);
    } else {
      console.log("All direct-manager names resolved.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
