import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  startSlide!: number;

  @IsInt()
  @Min(0)
  slidesSeen!: number;

  @IsInt()
  @Min(1)
  maxSlide!: number;

  @IsInt()
  @Min(0)
  durationSeconds!: number;

  @IsOptional()
  @IsLatitude()
  startLat?: number;

  @IsOptional()
  @IsLongitude()
  startLng?: number;

  @IsOptional()
  @IsDateString()
  startedAtClient?: string;

  @IsOptional()
  @IsDateString()
  endedAtClient?: string;

  // [{ slide: number, ts: ISO }]
  @IsArray()
  slideEvents!: unknown[];

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, unknown>;

  @IsOptional()
  mockLocationDetected?: boolean;

  @IsOptional()
  @IsInt()
  clockDriftSeconds?: number;
}

export class CreateVisitDto {
  // Client-generated UUID for offline-sync idempotency (spec §2)
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsUUID()
  doctorId!: string;

  @IsOptional()
  @IsUUID()
  planItemId?: string;

  @IsDateString()
  startedAtClient!: string;

  @IsOptional()
  @IsDateString()
  endedAtClient?: string;

  @IsOptional()
  @IsLatitude()
  gpsLat?: number;

  @IsOptional()
  @IsLongitude()
  gpsLng?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSessionDto)
  sessions!: CreateSessionDto[];
}
