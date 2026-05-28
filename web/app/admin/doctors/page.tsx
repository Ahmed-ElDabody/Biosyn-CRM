import EmptyState from "../_components/EmptyState";

export default function DoctorsPage() {
  return (
    <EmptyState
      title="Doctors"
      body="The master doctor list has not been imported yet. Once you drop a file with name_ar, address_ar, specialty, class, account_type, account_subtype, brick, and governorate columns, the import script will populate this view."
      spec="§3 doctors, §6 Classification & Account Types, §14 [INPUT NEEDED]"
    />
  );
}
