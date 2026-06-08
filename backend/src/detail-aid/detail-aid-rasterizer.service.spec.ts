import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DetailAidRasterizerService } from './detail-aid-rasterizer.service';

// The real sample deck lives in the repo root (one level above backend/).
const SAMPLE_PDF = join(process.cwd(), '..', 'Biosyn Detail Aid.pdf');

// pdfjs is ESM-only, so this test needs jest run with --experimental-vm-modules
// (the npm `test` scripts set it via cross-env). Skip cleanly otherwise.
const esmEnabled = (process.env.NODE_OPTIONS ?? '').includes(
  'experimental-vm-modules',
);
const describeIfSample =
  existsSync(SAMPLE_PDF) && esmEnabled ? describe : describe.skip;

describeIfSample('DetailAidRasterizerService (integration, real PDF)', () => {
  const service = new DetailAidRasterizerService();

  it('rasterizes every page to a non-empty WebP with sane dimensions', async () => {
    const pdf = readFileSync(SAMPLE_PDF);
    // Smaller edge keeps the test fast while still exercising the full pipeline.
    const pages = await service.rasterize(pdf, { maxEdge: 600 });

    expect(pages).toHaveLength(27);
    expect(pages.map((p) => p.page)).toEqual(
      Array.from({ length: 27 }, (_, i) => i + 1),
    );

    for (const p of pages) {
      expect(p.image.length).toBeGreaterThan(0);
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
      expect(Math.max(p.width, p.height)).toBeLessThanOrEqual(601); // ceil() may add 1px
    }
  }, 60000);
});
