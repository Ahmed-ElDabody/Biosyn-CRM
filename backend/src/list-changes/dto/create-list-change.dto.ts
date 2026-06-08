import { ListChangeType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateAccountPayloadDto } from './create-account-payload.dto';

export class CreateListChangeRequestDto {
  @IsEnum(ListChangeType)
  type!: ListChangeType;

  // Required when type ∈ {add_from_master, delete}
  @ValidateIf((o: CreateListChangeRequestDto) => o.type !== 'create_account')
  @IsUUID()
  doctorId?: string;

  // Required when type = create_account
  @ValidateIf((o: CreateListChangeRequestDto) => o.type === 'create_account')
  @ValidateNested()
  @Type(() => CreateAccountPayloadDto)
  payload?: CreateAccountPayloadDto;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}
