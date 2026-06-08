// 21 Egyptian governorates (commonly used in IMS coverage). The brick
// import populates this same table from the Excel-derived governorate
// headers; this list backstops anything the import missed and is used by
// the seed script (`backend/scripts/seed-governorates.ts`).

export interface GovernorateSeed {
  nameEn: string;
  nameAr: string;
}

export const GOVERNORATES: GovernorateSeed[] = [
  { nameEn: 'Cairo', nameAr: 'القاهرة' },
  { nameEn: 'Alexandria', nameAr: 'الإسكندرية' },
  { nameEn: 'Giza', nameAr: 'الجيزة' },
  { nameEn: 'Qalyubia', nameAr: 'القليوبية' },
  { nameEn: 'Sharqia', nameAr: 'الشرقية' },
  { nameEn: 'Dakahlia', nameAr: 'الدقهلية' },
  { nameEn: 'Gharbia', nameAr: 'الغربية' },
  { nameEn: 'Menoufia', nameAr: 'المنوفية' },
  { nameEn: 'Kafr El Sheikh', nameAr: 'كفر الشيخ' },
  { nameEn: 'Beheira', nameAr: 'البحيرة' },
  { nameEn: 'Damietta', nameAr: 'دمياط' },
  { nameEn: 'Port Said', nameAr: 'بورسعيد' },
  { nameEn: 'Ismailia', nameAr: 'الإسماعيلية' },
  { nameEn: 'Suez', nameAr: 'السويس' },
  { nameEn: 'Fayoum', nameAr: 'الفيوم' },
  { nameEn: 'Beni Suef', nameAr: 'بني سويف' },
  { nameEn: 'Minya', nameAr: 'المنيا' },
  { nameEn: 'Assiut', nameAr: 'أسيوط' },
  { nameEn: 'Sohag', nameAr: 'سوهاج' },
  { nameEn: 'Qena', nameAr: 'قنا' },
  { nameEn: 'Luxor', nameAr: 'الأقصر' },
  { nameEn: 'Aswan', nameAr: 'أسوان' },
];
