import { apiGet, requireAdmin, type Product } from "../../../lib/api";
import ProductsManager from "./ProductsManager";

export default async function ProductsPage() {
  await requireAdmin();
  const products = await apiGet<Product[]>("/products");
  return <ProductsManager initialProducts={products} />;
}
