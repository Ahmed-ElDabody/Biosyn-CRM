import EmptyState from "../_components/EmptyState";

export default function ApprovalsPage() {
  return (
    <EmptyState
      title="List approvals"
      body="No pending list-change requests. Once doctors are loaded and reps start submitting add / delete / create-new-account requests, this page will show the second-stage admin approval queue (the manager will have already acknowledged step 1)."
      spec="§7 List Management & Dual Approval"
    />
  );
}
