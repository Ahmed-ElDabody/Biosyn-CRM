import { AccountSubtype, AccountType, DoctorClass } from '@prisma/client';
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
import { IsArabicMultiPart } from '../../doctors/dto/arabic-name';

// Used when type = create_account: full new-account details (spec §7.1).
export class CreateAccountPayloadDto {
  @IsArabicMultiPart()
  nameAr!: string;

  @IsString()
  addressAr!: string;

  @IsIn(SPECIALTIES as readonly string[])
  specialty!: string;

  @IsEnum(DoctorClass)
  class!: DoctorClass;

  @IsEnum(AccountType)
  accountType!: AccountType;

  @IsEnum(AccountSubtype)
  accountSubtype!: AccountSubtype;

  @IsUUID()
  brickId!: string;

  @IsUUID()
  governorateId!: string;

  @IsOptional()
  @IsLatitude()
  clinicLat?: number;

  @IsOptional()
  @IsLongitude()
  clinicLng?: number;
}
