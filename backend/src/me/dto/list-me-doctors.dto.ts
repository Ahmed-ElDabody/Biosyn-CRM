import { AccountType, DoctorClass, RepDoctorListStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListMyDoctorsDto {
  @IsOptional()
  @IsEnum(DoctorClass)
  class?: DoctorClass;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsEnum(RepDoctorListStatus)
  listStatus?: RepDoctorListStatus;

  @IsOptional()
  @IsString()
  q?: string; // search nameAr / addressAr

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
