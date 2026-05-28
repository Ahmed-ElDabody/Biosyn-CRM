import EmptyState from "./_components/EmptyState";

export default function ManageListTab() {
  return (
    <EmptyState
      title="Manage List"
      body="Add doctors from the master list or create new accounts. Both flows trigger the manager → admin dual-approval cycle. Editing is open only during the 15th–30th of Mar / Jun / Sep / Dec, unless an admin opens an exceptional per-rep window."
      spec="§7 List Management, Lock Windows & Dual Approval"
    />
  );
}
