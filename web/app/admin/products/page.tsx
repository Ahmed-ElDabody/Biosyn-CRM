import { apiGet, requireAdmin, type DetailAid, type Product } from "../../../lib/api";
import ProductsManager from "./ProductsManager";

export default async function ProductsPage() {
  await requireAdmin();
  const [products, detailAids] = await Promise.all([
    apiGet<Product[]>("/products"),
    apiGet<DetailAid[]>("/detail-aids"),
  ]);
  return <ProductsManager initialProducts={products} detailAids={detailAids} />;
}
