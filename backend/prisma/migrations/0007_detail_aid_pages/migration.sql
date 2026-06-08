-- Detail Aid pre-split rendering: PDF detail aids are rasterized into per-page
-- WebP images at upload time. Tracks render status on the product and stores one
-- row per rendered page.

CREATE TYPE "DetailAidStatus" AS ENUM ('none', 'processing', 'ready', 'failed');

ALTER TABLE "products"
  ADD COLUMN "detail_aid_status"     "DetailAidStatus" NOT NULL DEFAULT 'none',
  ADD COLUMN "detail_aid_page_count" INTEGER,
  ADD COLUMN "detail_aid_error"      TEXT;

CREATE TABLE "detail_aid_pages" (
  "id"         UUID         NOT NULL,
  "product_id" UUID         NOT NULL,
  "page"       INTEGER      NOT NULL,
  "image_key"  TEXT         NOT NULL,
  "width"      INTEGER      NOT NULL,
  "height"     INTEGER      NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "detail_aid_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "detail_aid_pages_product_id_page_key" ON "detail_aid_pages"("product_id", "page");
CREATE INDEX "detail_aid_pages_product_id_idx" ON "detail_aid_pages"("product_id");

ALTER TABLE "detail_aid_pages"
  ADD CONSTRAINT "detail_aid_pages_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
