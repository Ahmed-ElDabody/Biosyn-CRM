import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ProductsService } from './products.service';

describe('ProductsService — detail-aid range mapping', () => {
  let prisma: {
    product: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    detailAid: { findUnique: jest.Mock };
    detailAidPage: { findMany: jest.Mock };
  };
  let storage: { getPresignedUrl: jest.Mock };
  let service: ProductsService;

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'p1', ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'p1', ...data }),
          ),
        delete: jest.fn().mockResolvedValue({ id: 'p1' }),
      },
      detailAid: { findUnique: jest.fn() },
      detailAidPage: { findMany: jest.fn() },
    };
    storage = {
      getPresignedUrl: jest
        .fn()
        .mockImplementation((key: string) => Promise.resolve(`signed:${key}`)),
    };
    service = new ProductsService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
    );
  });

  it('creates a product with no detail-aid mapping (range untouched)', async () => {
    const res = await service.create({ name: 'Panmist', totalSlides: 7 });
    expect(prisma.detailAid.findUnique).not.toHaveBeenCalled();
    expect(res.detailAidId).toBeNull();
    expect(res.pageStart).toBeNull();
  });

  it('rejects a partial range (start without aid/end)', async () => {
    await expect(
      service.create({ name: 'X', totalSlides: 9, pageStart: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects start > end', async () => {
    prisma.detailAid.findUnique.mockResolvedValue({
      id: 'd1',
      status: 'ready',
      pageCount: 27,
    });
    await expect(
      service.create({
        name: 'X',
        totalSlides: 9,
        detailAidId: 'd1',
        pageStart: 9,
        pageEnd: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a range when the deck is not ready', async () => {
    prisma.detailAid.findUnique.mockResolvedValue({
      id: 'd1',
      status: 'processing',
      pageCount: null,
    });
    await expect(
      service.create({
        name: 'X',
        totalSlides: 9,
        detailAidId: 'd1',
        pageStart: 1,
        pageEnd: 9,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects pageEnd beyond the deck page count', async () => {
    prisma.detailAid.findUnique.mockResolvedValue({
      id: 'd1',
      status: 'ready',
      pageCount: 27,
    });
    await expect(
      service.create({
        name: 'X',
        totalSlides: 9,
        detailAidId: 'd1',
        pageStart: 21,
        pageEnd: 28,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a product mapped to a valid range', async () => {
    prisma.detailAid.findUnique.mockResolvedValue({
      id: 'd1',
      status: 'ready',
      pageCount: 27,
    });
    const res = await service.create({
      name: 'Calmare Plus',
      totalSlides: 9,
      detailAidId: 'd1',
      pageStart: 1,
      pageEnd: 9,
    });
    // The mock echoes back the `data` passed to product.create.
    expect(prisma.product.create).toHaveBeenCalledTimes(1);
    expect(res.detailAidId).toBe('d1');
    expect(res.pageStart).toBe(1);
    expect(res.pageEnd).toBe(9);
  });

  it('presigns the slice renumbered to a local 1..k deck', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'p1',
      detailAidId: 'd1',
      pageStart: 10,
      pageEnd: 12,
    });
    prisma.detailAidPage.findMany.mockResolvedValue([
      {
        page: 10,
        width: 1600,
        height: 900,
        imageKey: 'detail-aids/d1/pages/10.webp',
      },
      {
        page: 11,
        width: 1600,
        height: 900,
        imageKey: 'detail-aids/d1/pages/11.webp',
      },
      {
        page: 12,
        width: 1600,
        height: 900,
        imageKey: 'detail-aids/d1/pages/12.webp',
      },
    ]);

    const out = await service.presignPages('p1');

    expect(out).toHaveLength(3);
    expect(out.map((p) => p.page)).toEqual([1, 2, 3]); // local numbering
    expect(out.map((p) => p.sourcePage)).toEqual([10, 11, 12]); // absolute in the deck
    expect(out[0].url).toBe('signed:detail-aids/d1/pages/10.webp');
    // queried only within the product's range
    expect(prisma.detailAidPage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { detailAidId: 'd1', page: { gte: 10, lte: 12 } },
      }),
    );
  });

  it('returns an empty slice for an unassigned product', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'p1',
      detailAidId: null,
      pageStart: null,
      pageEnd: null,
    });
    expect(await service.presignPages('p1')).toEqual([]);
    expect(prisma.detailAidPage.findMany).not.toHaveBeenCalled();
  });
});
