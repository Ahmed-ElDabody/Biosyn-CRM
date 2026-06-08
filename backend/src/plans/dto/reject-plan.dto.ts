import { IsString, MinLength } from 'class-validator';

export class RejectPlanDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
