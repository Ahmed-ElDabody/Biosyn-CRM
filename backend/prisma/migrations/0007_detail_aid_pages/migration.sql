-- Detail aids become a shared, pre-split asset: one uploaded PDF deck is
-- rasterized to per-page WebP images, and multiple products can each map to a
-- contiguous page range [page_start..page_end] of the same deck.

CREATE TYPE "DetailAidStatus" AS ENUM ('none', 'processing', 'ready', 'failed');

-- The uploaded deck + render status.
CREATE TABLE "detail_aids" (
  "id"         UUID            NOT NULL,
  "name"       TEXT            NOT NULL,
  "file_url"   TEXT,
  "status"     "DetailAidStatus" NOT NULL DEFAULT 'none',
  "page_count" INTEGER,
  "error"      TEXT,
  "created_at" TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "detail_aids_pkey" PRIMARY KEY ("id")
);

-- One rendered page (1-based) of a deck.
CREATE TABLE "detail_aid_pages" (
  "id"            UUID         NOT NULL,
  "detail_aid_id" UUID         NOT NULL,
  "page"          INTEGER      NOT NULL,
  "image_key"     TEXT         NOT NULL,
  "width"         INTEGER      NOT NULL,
  "height"        INTEGER      NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "detail_aid_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "detail_aid_pages_detail_aid_id_page_key" ON "detail_aid_pages"("detail_aid_id", "page");
CREATE INDEX "detail_aid_pages_detail_aid_id_idx" ON "detail_aid_pages"("detail_aid_id");

ALTER TABLE "detail_aid_pages"
  ADD CONSTRAINT "detail_aid_pages_detail_aid_id_fkey"
  FOREIGN KEY ("detail_aid_id") REFERENCES "detail_aids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Products now reference a shared deck + a page range instead of owning a file.
ALTER TABLE "products" DROP COLUMN "detail_aid_file_url";
ALTER TABLE "products"
  ADD COLUMN "detail_aid_id" UUID,
  ADD COLUMN "page_start"    INTEGER,
  ADD COLUMN "page_end"      INTEGER;

CREATE INDEX "products_detail_aid_id_idx" ON "products"("detail_aid_id");

ALTER TABLE "products"
  ADD CONSTRAINT "products_detail_aid_id_fkey"
  FOREIGN KEY ("detail_aid_id") REFERENCES "detail_aids"("id") ON DELETE SET NULL ON UPDATE CASCADE;
