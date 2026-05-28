import EmptyState from "../_components/EmptyState";

export default function ReportsPage() {
  return (
    <EmptyState
      title="Reports"
      body="The 5 reports (KPIs, PM working hours, AM accounts, visit intervals, integrity/anti-gaming) all require visit + session data from the rep mobile app. No visits have been logged yet, so there's nothing to summarize."
      spec="§11 Reports"
    />
  );
}
