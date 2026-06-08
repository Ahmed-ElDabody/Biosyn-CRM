import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DetailAidRasterizerService } from './detail-aid-rasterizer.service';
import { CreateDetailAidDto } from './dto/create-detail-aid.dto';

const PDF_MIME = 'application/pdf';

/**
 * Manages uploaded detail-aid decks: stores the original PDF, pre-splits it into
 * per-page WebP images at upload time, and tracks render status. One deck is a
 * shared asset — products map to a page range of it (see ProductsService).
 */
@Injectable()
export class DetailAidsService {
  private readonly logger = new Logger(DetailAidsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private rasterizer: DetailAidRasterizerService,
  ) {}

  list() {
    return this.prisma.detailAid.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getById(id: string) {
    const aid = await this.prisma.detailAid.findUnique({ where: { id } });
    if (!aid) throw new NotFoundException('Detail aid not found');
    return aid;
  }

  create(dto: CreateDetailAidDto) {
    return this.prisma.detailAid.create({ data: { name: dto.name } });
  }

  async uploadPdf(
    id: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    const aid = await this.getById(id);
    if (file.mimetype !== PDF_MIME) {
      throw new BadRequestException('Detail aid must be a PDF.');
    }

    await this.clearArtifacts(aid.id, aid.fileUrl);

    const key = this.storage.buildKey(`detail-aids/${id}`, file.originalname);
    const uri = await this.storage.upload(key, file.buffer, file.mimetype);
    const updated = await this.prisma.detailAid.update({
      where: { id },
      data: {
        fileUrl: uri,
        status: 'processing',
        pageCount: null,
        error: null,
      },
    });

    // Fire-and-forget: render in the background so upload returns promptly.
    void this.renderPages(id, file.buffer);
    return updated;
  }

  /** Re-run rasterization from the stored original (recovery / re-render). */
  async reprocess(id: string) {
    const aid = await this.getById(id);
    if (!aid.fileUrl)
      throw new BadRequestException('Detail aid has no file to reprocess.');
    const key = this.storage.parseKey(aid.fileUrl);
    if (!key)
      throw new BadRequestException(
        'Detail aid file is not on the configured bucket.',
      );

    await this.deletePageObjects(id);
    await this.prisma.detailAidPage.deleteMany({ where: { detailAidId: id } });
    const updated = await this.prisma.detailAid.update({
      where: { id },
      data: { status: 'processing', pageCount: null, error: null },
    });

    const pdf = await this.storage.download(key);
    void this.renderPages(id, pdf);
    return updated;
  }

  async listPages(id: string) {
    await this.getById(id);
    return this.prisma.detailAidPage.findMany({
      where: { detailAidId: id },
      orderBy: { page: 'asc' },
      select: { page: true, width: true, height: true },
    });
  }

  async presignPages(id: string) {
    await this.getById(id);
    const pages = await this.prisma.detailAidPage.findMany({
      where: { detailAidId: id },
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

  async delete(id: string) {
    const aid = await this.getById(id);
    await this.deletePageObjects(id);
    if (aid.fileUrl) {
      const key = this.storage.parseKey(aid.fileUrl);
      if (key) {
        try {
          await this.storage.delete(key);
        } catch {
          /* original may already be gone — ignore */
        }
      }
    }
    // Page rows cascade; products referencing this aid have detailAidId set null.
    return this.prisma.detailAid.delete({ where: { id } });
  }

  // ---------- internals ----------

  private async renderPages(detailAidId: string, pdf: Buffer) {
    try {
      const rendered = await this.rasterizer.rasterize(pdf);
      for (const r of rendered) {
        const key = `detail-aids/${detailAidId}/pages/${r.page}.webp`;
        await this.storage.upload(key, r.image, 'image/webp');
      }
      await this.prisma.$transaction([
        this.prisma.detailAidPage.deleteMany({ where: { detailAidId } }),
        this.prisma.detailAidPage.createMany({
          data: rendered.map((r) => ({
            detailAidId,
            page: r.page,
            imageKey: `detail-aids/${detailAidId}/pages/${r.page}.webp`,
            width: r.width,
            height: r.height,
          })),
        }),
        this.prisma.detailAid.update({
          where: { id: detailAidId },
          data: { status: 'ready', pageCount: rendered.length },
        }),
      ]);
      this.logger.log(
        `Detail aid ${detailAidId} ready (${rendered.length} pages).`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Detail aid render failed for ${detailAidId}: ${message}`,
      );
      await this.prisma.detailAid
        .update({
          where: { id: detailAidId },
          data: { status: 'failed', error: message },
        })
        .catch(() => {
          /* aid may have been deleted mid-render — ignore */
        });
    }
  }

  private async clearArtifacts(detailAidId: string, oldFileUrl: string | null) {
    await this.deletePageObjects(detailAidId);
    await this.prisma.detailAidPage.deleteMany({ where: { detailAidId } });
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

  private async deletePageObjects(detailAidId: string) {
    const pages = await this.prisma.detailAidPage.findMany({
      where: { detailAidId },
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
