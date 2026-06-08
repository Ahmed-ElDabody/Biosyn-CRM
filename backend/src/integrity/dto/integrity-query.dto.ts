import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class IntegrityWindowDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsUUID()
  repId?: string;
}

export class RouteReplayDto {
  @IsUUID()
  repId!: string;

  @IsDateString()
  date!: string; // YYYY-MM-DD or full ISO
}

export class InsightsDto {
  @IsOptional()
  @IsUUID()
  repId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  asOf?: string;
}
