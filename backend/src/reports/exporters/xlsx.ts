import * as ExcelJS from 'exceljs';
import { BIOSYN_BRAND, BIOSYN_SLOGAN, ReportPayload } from './report-payload';

const COLOR_FG: Record<string, string> = {
  red: 'FFE2574C', // ARGB — coral from the spec palette
  gold: 'FFC9A14A',
  green: 'FF1FB6A6',
};

export async function toXlsx(payload: ReportPayload): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = BIOSYN_BRAND;
  wb.created = payload.generatedAt;

  const sheet = wb.addWorksheet(payload.title.slice(0, 30) || 'Report');

  // Header block (branded)
  sheet.addRow([BIOSYN_BRAND]).font = { bold: true, size: 16, color: { argb: 'FF16284B' } };
  sheet.addRow([BIOSYN_SLOGAN]).font = { italic: true, color: { argb: 'FFC9A14A' } };
  sheet.addRow([payload.title]).font = { bold: true, size: 14 };
  if (payload.subtitle) sheet.addRow([payload.subtitle]);
  sheet.addRow([`Generated: ${payload.generatedAt.toISOString()}`]);
  sheet.addRow([]);

  // Header row
  const headerRow = sheet.addRow(payload.columns.map((c) => c.header));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF16284B' },
  };

  // Data rows
  for (const row of payload.rows) {
    const values = payload.columns.map((c) => {
      const v = row[c.key];
      if (v instanceof Date) return v;
      if (typeof v === 'object' && v !== null) return JSON.stringify(v);
      return v;
    });
    const xlsxRow = sheet.addRow(values);
    payload.columns.forEach((c, i) => {
      const color = c.color?.(row);
      if (color) {
        xlsxRow.getCell(i + 1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLOR_FG[color]! },
        };
        if (color === 'red' || color === 'green') {
          xlsxRow.getCell(i + 1).font = { color: { argb: 'FFFFFFFF' } };
        }
      }
    });
  }

  // Autosize columns (best-effort)
  sheet.columns.forEach((col, i) => {
    const header = payload.columns[i]?.header ?? '';
    let max = header.length;
    if (col?.eachCell) {
      col.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        const s = v instanceof Date ? v.toISOString() : String(v ?? '');
        if (s.length > max) max = s.length;
      });
    }
    if (col) col.width = Math.min(60, max + 2);
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
