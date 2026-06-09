-- Master List import support.
--
-- The central Master List (Master_List_clean.xlsx) is the source for the
-- master account directory (the `doctors` table). Two adjustments:
--
--   1. account_subtype becomes nullable. The Master List carries only AM/PM,
--      not the Section 6 institution/clinic subtype, so bulk-imported accounts
--      start with no subtype and an admin fills it in later.
--
--   2. doctors gain a nullable sub_brick_id FK. The file's granular "Brick"
--      column is the 708 sub-brick level; its "Division" column maps to the
--      existing 148-brick level (brick_id). Nullable when a row's sub-brick
--      name does not resolve.

ALTER TABLE "doctors" ALTER COLUMN "account_subtype" DROP NOT NULL;

ALTER TABLE "doctors" ADD COLUMN "sub_brick_id" UUID;

CREATE INDEX "doctors_sub_brick_id_idx" ON "doctors"("sub_brick_id");

ALTER TABLE "doctors"
  ADD CONSTRAINT "doctors_sub_brick_id_fkey"
  FOREIGN KEY ("sub_brick_id") REFERENCES "sub_bricks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
