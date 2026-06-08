import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

const MAX_DETAIL_AID_BYTES = 200 * 1024 * 1024; // 200 MB

@Controller('products')
@UseGuards(RolesGuard)
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  list() {
    return this.products.list();
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.getById(id);
  }

  @Get(':id/detail-aid/url')
  presignedDetailAid(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.presignDetailAid(id);
  }

  @Get(':id/pages')
  listPages(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.listPages(id);
  }

  @Get(':id/pages/urls')
  presignPages(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.presignPages(id);
  }

  @Post(':id/detail-aid/reprocess')
  @Roles('admin')
  reprocessDetailAid(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.reprocessDetailAid(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.products.delete(id);
  }

  @Post(':id/detail-aid')
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_DETAIL_AID_BYTES } }),
  )
  uploadDetailAid(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile()
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    return this.products.uploadDetailAid(id, file);
  }
}
