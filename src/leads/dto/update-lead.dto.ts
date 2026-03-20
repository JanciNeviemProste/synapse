import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class UpdateLeadDto {
  @IsEnum(LeadStatus, {
    message: `status must be one of: ${Object.values(LeadStatus).join(', ')}`,
  })
  status!: LeadStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
