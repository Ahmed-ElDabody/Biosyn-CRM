import { IsString, MinLength } from 'class-validator';

export class RejectListChangeDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
