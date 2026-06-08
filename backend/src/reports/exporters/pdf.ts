import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import { BIOSYN_BRAND, BIOSYN_SLOGAN, ReportPayload } from './report-payload';

type Doc = PDFKit.PDFDocument;

const LOGO_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'biosyn-logo.png');

const HEX = {
  red: '#E2574C',
  gold: '#C9A14A',
  green: '#1FB6A6',
  navy: '#16284B',
  paper: '#F5F3EC',
};

export async function toPdf(payload: ReportPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc: Doc = new PDFDocument({ size: 'A4', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ----- header -----
    if (fs.existsSync(LOGO_PATH)) {
      try {
        doc.image(LOGO_PATH, 36, 30, { height: 40 });
      } catch {
        /* ignore */
      }
    }
    doc
      .fillColor(HEX.navy)
      .fontSize(18)
      .text(BIOSYN_BRAND, 100, 36);
    doc
      .fillColor(HEX.gold)
      .fontSize(10)
      .text(BIOSYN_SLOGAN, 100, 58);
    doc.moveDown(2);

    doc.fillColor('black').fontSize(14).text(payload.title);
    if (payload.subtitle) doc.fontSize(10).fillColor('#555').text(payload.subtitle);
    doc.fontSize(8).fillColor('#777').text(`Generated: ${payload.generatedAt.toISOString()}`);
    doc.moveDown(0.5);

    // ----- table -----
    const cols = payload.columns;
    const tableTop = doc.y;
    const tableLeft = 36;
    const usableWidth = doc.page.width - tableLeft - 36;
    const colWidth = usableWidth / cols.length;
    const rowHeight = 16;

    doc
      .fillColor('white')
      .rect(tableLeft, tableTop, usableWidth, rowHeight)
      .fill(HEX.navy);
    doc.fillColor('white').fontSize(9);
    cols.forEach((c, i) => {
      doc.text(c.header, tableLeft + i * colWidth + 3, tableTop + 3, {
        width: colWidth - 6,
        lineBreak: false,
      });
    });

    let y = tableTop + rowHeight;
    doc.fontSize(8);
    for (const row of payload.rows) {
      if (y > doc.page.height - 60) {
        addFooter(doc);
        doc.addPage();
        y = 36;
      }
      cols.forEach((c, i) => {
        const x = tableLeft + i * colWidth;
        const color = c.color?.(row);
        if (color) {
          doc.fillColor(HEX[color]).rect(x, y, colWidth, rowHeight).fill();
          doc.fillColor(color === 'gold' ? 'black' : 'white');
        } else {
          doc.fillColor('black');
        }
        const v = row[c.key];
        const s = v instanceof Date ? v.toISOString() : v === null || v === undefined ? '' : String(v);
        doc.text(s, x + 3, y + 3, { width: colWidth - 6, lineBreak: false });
      });
      y += rowHeight;
    }

    addFooter(doc);
    doc.end();
  });
}

function addFooter(doc: Doc) {
  const y = doc.page.height - 30;
  doc
    .fillColor('#777')
    .fontSize(8)
    .text(`${BIOSYN_BRAND} — ${BIOSYN_SLOGAN}`, 36, y, {
      width: doc.page.width - 72,
      align: 'center',
    });
}
