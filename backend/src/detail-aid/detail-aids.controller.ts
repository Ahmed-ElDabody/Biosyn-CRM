import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DetailAidsService } from './detail-aids.service';
import { CreateDetailAidDto } from './dto/create-detail-aid.dto';

const MAX_DETAIL_AID_BYTES = 200 * 1024 * 1024; // 200 MB

@Controller('detail-aids')
@UseGuards(RolesGuard)
export class DetailAidsController {
  constructor(private detailAids: DetailAidsService) {}

  @Get()
  list() {
    return this.detailAids.list();
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.detailAids.getById(id);
  }

  @Get(':id/pages')
  listPages(@Param('id', ParseUUIDPipe) id: string) {
    return this.detailAids.listPages(id);
  }

  @Get(':id/pages/urls')
  presignPages(@Param('id', ParseUUIDPipe) id: string) {
    return this.detailAids.presignPages(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateDetailAidDto) {
    return this.detailAids.create(dto);
  }

  @Post(':id/upload')
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_DETAIL_AID_BYTES } }),
  )
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile()
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    return this.detailAids.uploadPdf(id, file);
  }

  @Post(':id/reprocess')
  @Roles('admin')
  reprocess(@Param('id', ParseUUIDPipe) id: string) {
    return this.detailAids.reprocess(id);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.detailAids.delete(id);
  }
}
