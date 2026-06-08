import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PlanItemInput {
  @IsUUID()
  doctorId!: string;

  // ISO day-of-week: 1=Mon..7=Sun
  @IsInt()
  @Min(1)
  @Max(7)
  plannedDay!: number;
}

export class UpsertPlanItemsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PlanItemInput)
  items!: PlanItemInput[];
}
