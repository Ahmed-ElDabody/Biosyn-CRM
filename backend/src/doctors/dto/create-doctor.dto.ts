import { AccountSubtype, AccountType, DoctorClass, DoctorStatus } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { SPECIALTIES } from '../../config/specialties';
import { IsArabicMultiPart } from './arabic-name';

export class CreateDoctorDto {
  @IsArabicMultiPart()
  nameAr!: string;

  @IsOptional()
  @IsString()
  addressAr?: string;

  @IsIn(SPECIALTIES as readonly string[])
  specialty!: string;

  @IsEnum(DoctorClass)
  class!: DoctorClass;

  @IsEnum(AccountType)
  accountType!: AccountType;

  @IsEnum(AccountSubtype)
  accountSubtype!: AccountSubtype;

  @IsOptional()
  @IsUUID()
  brickId?: string;

  @IsOptional()
  @IsUUID()
  governorateId?: string;

  @IsOptional()
  @IsLatitude()
  clinicLat?: number;

  @IsOptional()
  @IsLongitude()
  clinicLng?: number;

  @IsOptional()
  @IsEnum(DoctorStatus)
  status?: DoctorStatus;
}
