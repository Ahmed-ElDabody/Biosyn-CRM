// Common shape for any tabular report the exporters can consume.
// Each report service produces its own typed rows; the controller maps
// those into a ReportPayload before invoking an exporter.

export interface ReportColumn {
  key: string;
  header: string;
  /** Optional cell-level coloring for XLSX/PDF tables.
   *  Return one of: 'red' (below threshold), 'gold' (warning), 'green' (good), or null. */
  color?: (row: Record<string, unknown>) => 'red' | 'gold' | 'green' | null;
}

export interface ReportPayload {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

export const BIOSYN_SLOGAN = 'A Commitment Towards Better Health';
export const BIOSYN_BRAND = 'Biosyn CRM';
