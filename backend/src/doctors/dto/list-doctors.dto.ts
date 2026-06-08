import { AccountType, DoctorClass, DoctorStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ListDoctorsDto {
  @IsOptional()
  @IsUUID()
  brickId?: string;

  @IsOptional()
  @IsUUID()
  governorateId?: string;

  @IsOptional()
  @IsEnum(DoctorClass)
  class?: DoctorClass;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsEnum(DoctorStatus)
  status?: DoctorStatus;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number = 50;
}
