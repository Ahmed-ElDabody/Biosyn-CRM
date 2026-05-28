import EmptyState from "../_components/EmptyState";

export default function ProductsPage() {
  return (
    <EmptyState
      title="Products"
      body="No products or Detail Aid files have been uploaded yet. Each product needs a name, total slide count, and a PPTX/PDF Detail Aid that will be uploaded to S3 and served via the rep tablet app."
      spec="§3 products, §9 Detail Aid Player, §14 [INPUT NEEDED]"
    />
  );
}
