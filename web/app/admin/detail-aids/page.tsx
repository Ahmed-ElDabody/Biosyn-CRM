import { apiGet, requireAdmin, type DetailAid } from "../../../lib/api";
import DetailAidsManager from "./DetailAidsManager";

export default async function DetailAidsPage() {
  await requireAdmin();
  const detailAids = await apiGet<DetailAid[]>("/detail-aids");
  return <DetailAidsManager initialDetailAids={detailAids} />;
}
