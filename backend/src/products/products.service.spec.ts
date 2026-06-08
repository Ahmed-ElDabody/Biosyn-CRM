import { BadRequestException } from '@nestjs/common';
import { DetailAidRasterizerService } from '../detail-aid/detail-aid-rasterizer.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ProductsService } from './products.service';

function makeFile(mimetype: string): {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
} {
  const buffer = Buffer.from('fake');
  return {
    buffer,
    originalname: 'deck' + (mimetype === 'application/pdf' ? '.pdf' : '.pptx'),
    mimetype,
    size: buffer.length,
  };
}

describe('ProductsService — detail aid upload', () => {
  let prisma: {
    product: { findUnique: jest.Mock; update: jest.Mock };
    detailAidPage: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let storage: {
    buildKey: jest.Mock;
    upload: jest.Mock;
    delete: jest.Mock;
    parseKey: jest.Mock;
  };
  let rasterizer: { rasterize: jest.Mock };
  let service: ProductsService;

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'p1', detailAidFileUrl: null }),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'p1', ...data }),
          ),
      },
      detailAidPage: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    storage = {
      buildKey: jest.fn().mockReturnValue('detail-aids/p1/123.pdf'),
      upload: jest.fn().mockResolvedValue('s3://bucket/detail-aids/p1/123.pdf'),
      delete: jest.fn().mockResolvedValue(undefined),
      parseKey: jest.fn().mockReturnValue('detail-aids/p1/123.pdf'),
    };
    rasterizer = { rasterize: jest.fn() };

    service = new ProductsService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      rasterizer as unknown as DetailAidRasterizerService,
    );
  });

  it('rejects unsupported mime types', async () => {
    await expect(
      service.uploadDetailAid('p1', makeFile('text/plain')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('marks a PDF upload as processing and kicks off rasterization', async () => {
    // Never resolves during the test, so the background task can't race the assertions.
    rasterizer.rasterize.mockReturnValue(new Promise(() => {}));

    const result = await service.uploadDetailAid(
      'p1',
      makeFile('application/pdf'),
    );

    expect(result.detailAidStatus).toBe('processing');
    expect(storage.upload).toHaveBeenCalledTimes(1); // the original
    expect(rasterizer.rasterize).toHaveBeenCalledTimes(1);
  });

  it('stores non-PDF detail aids raw without rasterizing', async () => {
    const result = await service.uploadDetailAid(
      'p1',
      makeFile(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ),
    );

    expect(result.detailAidStatus).toBe('none');
    expect(rasterizer.rasterize).not.toHaveBeenCalled();
  });

  it('transitions to ready after a successful render', async () => {
    rasterizer.rasterize.mockResolvedValue([
      { page: 1, image: Buffer.from('a'), width: 1600, height: 900 },
      { page: 2, image: Buffer.from('b'), width: 1600, height: 900 },
    ]);

    // Exercise the background renderer directly for a deterministic assertion.
    await (
      service as unknown as {
        renderPages: (id: string, pdf: Buffer) => Promise<void>;
      }
    ).renderPages('p1', Buffer.from('pdf'));

    expect(storage.upload).toHaveBeenCalledTimes(2); // one per page
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('transitions to failed when rendering throws', async () => {
    rasterizer.rasterize.mockRejectedValue(new Error('corrupt pdf'));

    await (
      service as unknown as {
        renderPages: (id: string, pdf: Buffer) => Promise<void>;
      }
    ).renderPages('p1', Buffer.from('pdf'));

    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { detailAidStatus: 'failed', detailAidError: 'corrupt pdf' },
      }),
    );
  });
});
