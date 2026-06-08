import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  list() {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  async getById(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async create(dto: CreateProductDto) {
    await this.validateRange(
      dto.detailAidId ?? null,
      dto.pageStart ?? null,
      dto.pageEnd ?? null,
    );
    return this.prisma.product.create({
      data: {
        name: dto.name,
        totalSlides: dto.totalSlides,
        active: dto.active ?? true,
        detailAidId: dto.detailAidId ?? null,
        pageStart: dto.pageStart ?? null,
        pageEnd: dto.pageEnd ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.getById(id);
    // Resolve effective range from the patch layered over current values.
    const detailAidId =
      dto.detailAidId !== undefined ? dto.detailAidId : existing.detailAidId;
    const pageStart =
      dto.pageStart !== undefined ? dto.pageStart : existing.pageStart;
    const pageEnd = dto.pageEnd !== undefined ? dto.pageEnd : existing.pageEnd;
    await this.validateRange(detailAidId, pageStart, pageEnd);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.getById(id);
    return this.prisma.product.delete({ where: { id } });
  }

  /** Page metadata for the product's slice, renumbered to a local 1..k deck. */
  async listPages(id: string) {
    const { pages } = await this.resolveSlice(id);
    return pages.map((p, i) => ({
      page: i + 1,
      sourcePage: p.page,
      width: p.width,
      height: p.height,
    }));
  }

  /** Presigned image URLs for the product's slice, renumbered to a local 1..k deck. */
  async presignPages(id: string) {
    const { pages } = await this.resolveSlice(id);
    return Promise.all(
      pages.map(async (p, i) => ({
        page: i + 1,
        sourcePage: p.page,
        width: p.width,
        height: p.height,
        url: await this.storage.getPresignedUrl(p.imageKey),
      })),
    );
  }

  // ---------- internals ----------

  /** The ordered DetailAidPage rows within a product's [pageStart..pageEnd] range. */
  private async resolveSlice(id: string) {
    const product = await this.getById(id);
    if (
      product.detailAidId == null ||
      product.pageStart == null ||
      product.pageEnd == null
    ) {
      return {
        product,
        pages: [] as Awaited<ReturnType<typeof this.findPages>>,
      };
    }
    const pages = await this.findPages(
      product.detailAidId,
      product.pageStart,
      product.pageEnd,
    );
    return { product, pages };
  }

  private findPages(detailAidId: string, start: number, end: number) {
    return this.prisma.detailAidPage.findMany({
      where: { detailAidId, page: { gte: start, lte: end } },
      orderBy: { page: 'asc' },
    });
  }

  /**
   * A product's detail-aid mapping is all-or-nothing: either no aid assigned, or
   * a valid (aid, start, end) where the range fits inside a ready deck.
   */
  private async validateRange(
    detailAidId: string | null,
    pageStart: number | null,
    pageEnd: number | null,
  ) {
    const anySet = detailAidId != null || pageStart != null || pageEnd != null;
    if (!anySet) return;

    if (detailAidId == null || pageStart == null || pageEnd == null) {
      throw new BadRequestException(
        'detailAidId, pageStart and pageEnd must be provided together.',
      );
    }
    if (pageStart < 1 || pageEnd < 1 || pageStart > pageEnd) {
      throw new BadRequestException(
        'Invalid page range: require 1 <= pageStart <= pageEnd.',
      );
    }

    const aid = await this.prisma.detailAid.findUnique({
      where: { id: detailAidId },
    });
    if (!aid) throw new BadRequestException('Detail aid not found.');
    if (aid.status !== 'ready' || aid.pageCount == null) {
      throw new BadRequestException(
        'Detail aid is not ready (still rendering or failed).',
      );
    }
    if (pageEnd > aid.pageCount) {
      throw new BadRequestException(
        `pageEnd ${pageEnd} exceeds the deck's page count (${aid.pageCount}).`,
      );
    }
  }
}
