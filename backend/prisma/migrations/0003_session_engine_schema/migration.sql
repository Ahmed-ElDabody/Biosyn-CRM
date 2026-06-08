-- Reshape Visit <-> Session from 1:1 to 1:many (a visit can detail multiple
-- products in one go per spec §9.1), and add client_id columns to both for
-- offline-sync dedup (spec §2).

-- DropForeignKey
ALTER TABLE "visits" DROP CONSTRAINT IF EXISTS "visits_session_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "visits_session_id_key";

-- AlterTable: drop the old 1:1 link on visits, add client_id
ALTER TABLE "visits" DROP COLUMN IF EXISTS "session_id";
ALTER TABLE "visits" ADD COLUMN "client_id" TEXT;

-- AlterTable: sessions get visit_id (1:many parent), client_id, and start/end server stamps
ALTER TABLE "sessions" ADD COLUMN "visit_id" UUID;
ALTER TABLE "sessions" ADD COLUMN "client_id" TEXT;
ALTER TABLE "sessions" ADD COLUMN "started_at_server" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN "ended_at_server" TIMESTAMP(3);

-- Backfill visit_id on any existing sessions (none expected — no DB applied yet).
-- If you ever bring a partially-populated DB through this migration, you'll need
-- a manual UPDATE before enforcing NOT NULL below.
UPDATE "sessions" SET "visit_id" = '00000000-0000-0000-0000-000000000000'::uuid WHERE "visit_id" IS NULL;
ALTER TABLE "sessions" ALTER COLUMN "visit_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_visit_id_fkey"
  FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "sessions_visit_id_idx" ON "sessions"("visit_id");
CREATE UNIQUE INDEX "sessions_visit_id_client_id_key" ON "sessions"("visit_id", "client_id");
CREATE UNIQUE INDEX "visits_rep_id_client_id_key" ON "visits"("rep_id", "client_id");
