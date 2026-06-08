// Canonical list of medical specialties supported by the master doctor list.
// The spec (Section 3) describes specialty as "enum/lookup" and leaves the
// concrete list open. Keep this file as the single source of truth and
// validate DoctorDto.specialty against it.

export const SPECIALTIES = [
  'Cardiology',
  'Endocrinology',
  'Internal Medicine',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'Orthopedics',
  'Neurology',
  'Psychiatry',
  'Dermatology',
  'Otolaryngology',
  'Ophthalmology',
  'Urology',
  'General Surgery',
  'Pulmonology',
  'Gastroenterology',
  'Nephrology',
  'Rheumatology',
  'Oncology',
  'Hematology',
  'Family Medicine',
  'Emergency Medicine',
  'Anesthesiology',
  'Radiology',
  'Pathology',
  'Plastic Surgery',
  'Vascular Surgery',
  'Infectious Disease',
  'Allergy & Immunology',
  'Geriatrics',
  'General Practice',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const SPECIALTY_SET = new Set<string>(SPECIALTIES);
