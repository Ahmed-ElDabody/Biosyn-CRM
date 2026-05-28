import EmptyState from "./_components/EmptyState";

export default function DoctorListTab() {
  return (
    <EmptyState
      title="Doctor list not yet available"
      body="Your working list of doctors will appear here with frequency bars (grey → light orange → yellow → green) once the master doctor list is imported and your manager attaches doctors to your list."
      spec="§12 Rep app — Doctor List"
    />
  );
}
