import { IsString, MinLength } from 'class-validator';

export class CreateDetailAidDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
