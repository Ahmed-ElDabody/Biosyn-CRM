import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateLockOverrideDto {
  @IsUUID()
  repId!: string;

  @IsDateString()
  opensAt!: string;

  @IsDateString()
  closesAt!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string;
}
