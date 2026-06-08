import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalSlides!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // Optional detail-aid mapping: a contiguous page range of a shared deck.
  // Must be supplied together (validated in the service against a ready deck).
  @IsOptional()
  @IsUUID()
  detailAidId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageStart?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageEnd?: number;
}
