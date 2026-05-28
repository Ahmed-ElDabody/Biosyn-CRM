import EmptyState from "./_components/EmptyState";

export default function SessionTab() {
  return (
    <EmptyState
      title="Session"
      body="The Detail Aid player launches here. A valid visit needs 5+ slides browsed, ≥30 seconds duration, GPS inside the geofence (AM 150 m / PM 100 m), and no spoofing. Waiting on products + clinic coordinates before this comes alive."
      spec="§9 Detail Aid Player & Session Logic"
    />
  );
}
