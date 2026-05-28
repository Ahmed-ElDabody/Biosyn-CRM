import EmptyState from "./_components/EmptyState";

export default function WeeklyPlanTab() {
  return (
    <EmptyState
      title="Weekly Plan"
      body="The weekly plan composer needs doctors on your list to plan against. Once doctors are loaded you can search-and-add up to your weekly quota, with a Thursday 11 PM submission deadline and manager approval by Saturday 10 AM."
      spec="§8 Weekly Planning & Approval Workflow"
    />
  );
}
