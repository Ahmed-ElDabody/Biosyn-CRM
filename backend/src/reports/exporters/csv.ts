import { ReportPayload } from './report-payload';

const escape = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function toCsv(payload: ReportPayload): string {
  const header = payload.columns.map((c) => escape(c.header)).join(',');
  const body = payload.rows
    .map((row) => payload.columns.map((c) => escape(row[c.key])).join(','))
    .join('\n');
  return `# ${payload.title}\n# Generated: ${payload.generatedAt.toISOString()}\n${header}\n${body}\n`;
}
