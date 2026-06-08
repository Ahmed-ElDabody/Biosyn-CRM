/**
 * import-products.ts
 *
 * Stub for the products + Detail Aid bulk import. The spec marks both
 * products and their Detail Aid files as [INPUT NEEDED] in Section 14.
 *
 * Once you drop a `Products.xlsx` (columns: name, total_slides, active)
 * and the corresponding PPTX/PDF files into the repo root, this script
 * will:
 *
 *   1. Parse the spreadsheet row by row.
 *   2. Upsert each product (matched by name).
 *   3. For each product, if a matching file exists locally, upload it
 *      to S3/MinIO via the same `StorageService` the API uses and
 *      store the s3:// URI on the product row.
 *
 * Run from backend/: `npm run import:products`
 */

import * as fs from "fs";
import * as path from "path";

const PRODUCTS_FILE_CANDIDATES = ["Products.xlsx", "products.xlsx"];
const DETAIL_AID_DIR_CANDIDATES = ["DetailAids", "detail-aids", "DetailAid", "detail_aids"];

function findFirstExisting(parent: string, names: string[]): string | null {
  for (const n of names) {
    const p = path.join(parent, n);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  const root = path.resolve(__dirname, "..", "..");
  const products = findFirstExisting(root, PRODUCTS_FILE_CANDIDATES);
  const detailAidDir = findFirstExisting(root, DETAIL_AID_DIR_CANDIDATES);

  if (!products) {
    console.log("No Products.xlsx found in the repo root.");
    console.log(`Looked for: ${PRODUCTS_FILE_CANDIDATES.join(", ")}`);
  } else {
    console.log(`Found products spreadsheet: ${products}`);
  }
  if (!detailAidDir) {
    console.log("No detail-aid directory found in the repo root.");
    console.log(`Looked for: ${DETAIL_AID_DIR_CANDIDATES.join(", ")}`);
  } else {
    console.log(`Found detail-aid directory: ${detailAidDir}`);
  }
  console.log(
    "TODO: full products import — implement once the actual layout is confirmed and files are dropped.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
