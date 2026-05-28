import EmptyState from "../_components/EmptyState";

export default function LocksPage() {
  return (
    <EmptyState
      title="List locks"
      body="No active per-rep exceptional unlocks. The global edit window is the 15th–30th of each quarter-end month (Mar / Jun / Sep / Dec); outside that window admins can open editing for an individual rep on a manager's request."
      spec="§7.2 List Lock"
    />
  );
}
