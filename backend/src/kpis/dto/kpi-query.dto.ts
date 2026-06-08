import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export enum KpiPeriod {
  monthly = 'monthly',
  quarterly = 'quarterly',
}

export class KpiQueryDto {
  @IsEnum(KpiPeriod)
  period: KpiPeriod = KpiPeriod.monthly;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  quarter?: number;

  @IsOptional()
  @IsUUID()
  repId?: string;
}

/** Resolve missing year/month/quarter from `now` so the endpoints behave
 *  sensibly with default queries. */
export function resolvePeriod(q: KpiQueryDto, now: Date = new Date()) {
  const year = q.year ?? now.getUTCFullYear();
  if (q.period === KpiPeriod.quarterly) {
    const quarter = q.quarter ?? Math.floor(now.getUTCMonth() / 3) + 1;
    return { kind: 'quarterly' as const, year, quarter };
  }
  const month = q.month ?? now.getUTCMonth() + 1;
  return { kind: 'monthly' as const, year, month };
}
