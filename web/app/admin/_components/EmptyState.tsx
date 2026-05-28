export default function EmptyState({
  title,
  body,
  spec,
}: {
  title: string;
  body: string;
  spec?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-biosyn-navy">{title}</h1>
      <div className="bg-white rounded-lg border border-biosyn-navy/10 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-biosyn-amber/15 text-biosyn-amber text-xl mb-3">
          ⏳
        </div>
        <p className="text-sm text-biosyn-navy/70 max-w-md mx-auto">{body}</p>
        {spec && (
          <p className="mt-3 text-xs text-biosyn-navy/40 max-w-md mx-auto">
            Spec reference: {spec}
          </p>
        )}
      </div>
    </div>
  );
}
