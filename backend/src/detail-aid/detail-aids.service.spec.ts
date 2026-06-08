import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DetailAidRasterizerService } from './detail-aid-rasterizer.service';
import { DetailAidsService } from './detail-aids.service';

function makeFile(mimetype: string) {
  const buffer = Buffer.from('fake');
  return { buffer, originalname: 'deck.pdf', mimetype, size: buffer.length };
}

describe('DetailAidsService — upload & render', () => {
  let prisma: {
    detailAid: { findUnique: jest.Mock; update: jest.Mock };
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
  let service: DetailAidsService;

  beforeEach(() => {
    prisma = {
      detailAid: {
        findUnique: jest.fn().mockResolvedValue({ id: 'd1', fileUrl: null }),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 'd1', ...data }),
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
      buildKey: jest.fn().mockReturnValue('detail-aids/d1/123.pdf'),
      upload: jest.fn().mockResolvedValue('s3://bucket/detail-aids/d1/123.pdf'),
      delete: jest.fn().mockResolvedValue(undefined),
      parseKey: jest.fn().mockReturnValue('detail-aids/d1/123.pdf'),
    };
    rasterizer = { rasterize: jest.fn() };

    service = new DetailAidsService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
      rasterizer as unknown as DetailAidRasterizerService,
    );
  });

  it('rejects a non-PDF upload', async () => {
    await expect(
      service.uploadPdf('d1', makeFile('image/png')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('marks the deck processing and kicks off rendering', async () => {
    rasterizer.rasterize.mockReturnValue(new Promise(() => {})); // never resolves during the test
    const res = await service.uploadPdf('d1', makeFile('application/pdf'));
    expect(res.status).toBe('processing');
    expect(storage.upload).toHaveBeenCalledTimes(1); // the original
    expect(rasterizer.rasterize).toHaveBeenCalledTimes(1);
  });

  it('transitions to ready after a successful render', async () => {
    rasterizer.rasterize.mockResolvedValue([
      { page: 1, image: Buffer.from('a'), width: 1600, height: 900 },
      { page: 2, image: Buffer.from('b'), width: 1600, height: 900 },
    ]);
    await (
      service as unknown as {
        renderPages: (id: string, pdf: Buffer) => Promise<void>;
      }
    ).renderPages('d1', Buffer.from('pdf'));

    expect(storage.upload).toHaveBeenCalledTimes(2); // one per page
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('transitions to failed when rendering throws', async () => {
    rasterizer.rasterize.mockRejectedValue(new Error('corrupt pdf'));
    await (
      service as unknown as {
        renderPages: (id: string, pdf: Buffer) => Promise<void>;
      }
    ).renderPages('d1', Buffer.from('pdf'));

    expect(prisma.detailAid.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'failed', error: 'corrupt pdf' },
      }),
    );
  });
});
