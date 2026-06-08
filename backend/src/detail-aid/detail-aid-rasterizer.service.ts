import { createCanvas } from '@napi-rs/canvas';
import { Injectable, Logger } from '@nestjs/common';

export interface RenderedPage {
  /** 1-based page number. */
  page: number;
  /** Encoded WebP image bytes. */
  image: Buffer;
  width: number;
  height: number;
}

export interface RasterizeOptions {
  /** Target length of the longest edge, in pixels. */
  maxEdge?: number;
  /** WebP quality, 0-100. */
  quality?: number;
}

// pdfjs-dist v6 is ESM-only. Load it through the Function constructor so tooling
// that transpiles this file to CommonJS (e.g. ts-jest) doesn't rewrite the
// dynamic import into a require()/vm callback and break ESM interop. At runtime
// in Node this is a plain native dynamic import — the `s` argument is a fixed
// literal at every call site, never user input.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const importEsm = new Function('s', 'return import(s)') as (
  s: string,
) => Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')>;

const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_WEBP_QUALITY = 82;
// Safety cap so a pathological upload can't exhaust memory/CPU.
const MAX_PAGES = 500;

/**
 * Rasterizes a PDF detail aid into per-page WebP images using pdfjs-dist
 * (legacy build, worker disabled) + @napi-rs/canvas. Pure-npm, no native
 * system libraries. Used at upload time to pre-split the deck so the rep
 * tablet streams plain images instead of rendering a PDF on-device.
 */
@Injectable()
export class DetailAidRasterizerService {
  private readonly logger = new Logger(DetailAidRasterizerService.name);

  async rasterize(
    pdf: Buffer,
    opts: RasterizeOptions = {},
  ): Promise<RenderedPage[]> {
    const maxEdge = opts.maxEdge ?? DEFAULT_MAX_EDGE;
    const quality = opts.quality ?? DEFAULT_WEBP_QUALITY;

    const pdfjs = await importEsm('pdfjs-dist/legacy/build/pdf.mjs');

    // Copy into a fresh Uint8Array — pdfjs may detach/transfer the buffer it's given.
    const data = new Uint8Array(pdf);
    // The legacy build runs on the main thread (no worker setup) in Node.
    const loadingTask = pdfjs.getDocument({ data });
    const doc = await loadingTask.promise;

    try {
      if (doc.numPages > MAX_PAGES) {
        throw new Error(
          `Detail aid has ${doc.numPages} pages; max supported is ${MAX_PAGES}.`,
        );
      }

      const pages: RenderedPage[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        try {
          const base = page.getViewport({ scale: 1 });
          const scale = maxEdge / Math.max(base.width, base.height);
          const viewport = page.getViewport({ scale });
          const width = Math.ceil(viewport.width);
          const height = Math.ceil(viewport.height);

          const canvas = createCanvas(width, height);
          const ctx = canvas.getContext('2d');
          await page.render({
            canvas: canvas as unknown as HTMLCanvasElement,
            canvasContext: ctx as unknown as CanvasRenderingContext2D,
            viewport,
          }).promise;

          const image = await canvas.encode('webp', quality);
          pages.push({ page: n, image, width, height });
        } finally {
          page.cleanup();
        }
      }

      this.logger.log(
        `Rasterized ${pages.length} page(s) at maxEdge=${maxEdge}.`,
      );
      return pages;
    } finally {
      await loadingTask.destroy();
    }
  }
}
