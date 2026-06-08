import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DetailAidRasterizerService } from '../detail-aid/detail-aid-rasterizer.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const ALLOWED_DETAIL_AID_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'image/png',
  'image/jpeg',
]);

const PDF_MIME = 'application/pdf';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private rasterizer: DetailAidRasterizerService,
  ) {}

  list() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  async getById(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        totalSlides: dto.totalSlides,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.getById(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const product = await this.getById(id);
    // Remove rendered page images from S3 (the DB rows cascade with the product).
    await this.deletePageObjects(id);
    if (product.detailAidFileUrl) {
      const key = this.storage.parseKey(product.detailAidFileUrl);
      if (key) {
        try {
          await this.storage.delete(key);
        } catch {
          /* original may already be gone — ignore */
        }
      }
    }
    return this.prisma.product.delete({ where: { id } });
  }

  async uploadDetailAid(
    id: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    const product = await this.getById(id);
    if (!ALLOWED_DETAIL_AID_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: PDF, PPT(X), PNG, JPEG.`,
      );
    }

    // Drop any previously rendered pages (S3 objects + DB rows) and the old original.
    await this.clearDetailAidArtifacts(product.id, product.detailAidFileUrl);

    const key = this.storage.buildKey(`detail-aids/${id}`, file.originalname);
    const uri = await this.storage.upload(key, file.buffer, file.mimetype);

    const isPdf = file.mimetype === PDF_MIME;
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        detailAidFileUrl: uri,
        // Only PDFs are pre-split into page images; everything else is stored raw.
        detailAidStatus: isPdf ? 'processing' : 'none',
        detailAidPageCount: null,
        detailAidError: null,
      },
    });

    if (isPdf) {
      // Fire-and-forget: render in the background so the upload returns promptly.
      // The admin UI polls detailAidStatus until it flips to ready/failed.
      void this.renderPages(id, file.buffer);
    }

    return updated;
  }

  /** Re-run rasterization from the already-stored original PDF (recovery / re-render). */
  async reprocessDetailAid(id: string) {
    const product = await this.getById(id);
    if (!product.detailAidFileUrl) {
      throw new BadRequestException(
        'Product has no detail aid file to reprocess.',
      );
    }
    const key = this.storage.parseKey(product.detailAidFileUrl);
    if (!key) {
      throw new BadRequestException(
        'Detail aid file is not on the configured bucket.',
      );
    }
    if (!key.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Only PDF detail aids can be rasterized.');
    }

    await this.deletePageObjects(id);
    await this.prisma.detailAidPage.deleteMany({ where: { productId: id } });
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        detailAidStatus: 'processing',
        detailAidPageCount: null,
        detailAidError: null,
      },
    });

    const pdf = await this.storage.download(key);
    void this.renderPages(id, pdf);
    return updated;
  }

  async listPages(id: string) {
    await this.getById(id);
    return this.prisma.detailAidPage.findMany({
      where: { productId: id },
      orderBy: { page: 'asc' },
      select: { page: true, width: true, height: true },
    });
  }

  /** Presigned URLs for every rendered page, in order. */
  async presignPages(id: string) {
    await this.getById(id);
    const pages = await this.prisma.detailAidPage.findMany({
      where: { productId: id },
      orderBy: { page: 'asc' },
    });
    return Promise.all(
      pages.map(async (p) => ({
        page: p.page,
        width: p.width,
        height: p.height,
        url: await this.storage.getPresignedUrl(p.imageKey),
      })),
    );
  }

  async presignDetailAid(id: string) {
    const p = await this.getById(id);
    if (!p.detailAidFileUrl)
      throw new NotFoundException('Product has no detail aid file');
    const key = this.storage.parseKey(p.detailAidFileUrl);
    if (!key)
      throw new NotFoundException(
        'Detail aid file is not on the configured bucket',
      );
    const url = await this.storage.getPresignedUrl(key);
    return { url };
  }

  // ---------- internals ----------

  /** Render the PDF to per-page WebP, store them, and flip status to ready/failed. */
  private async renderPages(productId: string, pdf: Buffer) {
    try {
      const rendered = await this.rasterizer.rasterize(pdf);
      for (const r of rendered) {
        const key = `detail-aids/${productId}/pages/${r.page}.webp`;
        await this.storage.upload(key, r.image, 'image/webp');
      }
      await this.prisma.$transaction([
        this.prisma.detailAidPage.deleteMany({ where: { productId } }),
        this.prisma.detailAidPage.createMany({
          data: rendered.map((r) => ({
            productId,
            page: r.page,
            imageKey: `detail-aids/${productId}/pages/${r.page}.webp`,
            width: r.width,
            height: r.height,
          })),
        }),
        this.prisma.product.update({
          where: { id: productId },
          data: {
            detailAidStatus: 'ready',
            detailAidPageCount: rendered.length,
          },
        }),
      ]);
      this.logger.log(
        `Detail aid for product ${productId} ready (${rendered.length} pages).`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Detail aid render failed for product ${productId}: ${message}`,
      );
      await this.prisma.product
        .update({
          where: { id: productId },
          data: { detailAidStatus: 'failed', detailAidError: message },
        })
        .catch(() => {
          /* product may have been deleted mid-render — ignore */
        });
    }
  }

  /** Delete rendered page images from S3 and their DB rows for a product. */
  private async clearDetailAidArtifacts(
    productId: string,
    oldFileUrl: string | null,
  ) {
    await this.deletePageObjects(productId);
    await this.prisma.detailAidPage.deleteMany({ where: { productId } });
    if (oldFileUrl) {
      const oldKey = this.storage.parseKey(oldFileUrl);
      if (oldKey) {
        try {
          await this.storage.delete(oldKey);
        } catch {
          /* old original may already be gone — ignore */
        }
      }
    }
  }

  /** Remove the S3 objects backing a product's rendered pages (leaves DB rows untouched). */
  private async deletePageObjects(productId: string) {
    const pages = await this.prisma.detailAidPage.findMany({
      where: { productId },
      select: { imageKey: true },
    });
    await Promise.all(
      pages.map((p) =>
        this.storage.delete(p.imageKey).catch(() => {
          /* page object may already be gone — ignore */
        }),
      ),
    );
  }
}
