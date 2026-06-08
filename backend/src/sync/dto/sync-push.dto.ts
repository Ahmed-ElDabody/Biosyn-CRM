import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { CreateVisitDto } from '../../visits/dto/create-visit.dto';

export class SyncPushDto {
  // 100-visit cap matches a generous worst-case offline buffer per rep
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateVisitDto)
  visits!: CreateVisitDto[];
}

export interface SyncPushResult {
  clientId: string | null;
  status: 'ok' | 'idempotent' | 'error';
  visitId?: string;
  error?: string;
}
