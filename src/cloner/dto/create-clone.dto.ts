import {
  IsString,
  IsEmail,
  IsUrl,
  IsOptional,
} from 'class-validator';

export class CreateCloneDto {
  @IsUrl()
  sourceUrl!: string;

  @IsString()
  clientName!: string;

  @IsEmail()
  clientEmail!: string;

  @IsString()
  businessName!: string;

  @IsString()
  businessField!: string;

  @IsString()
  businessInfo!: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  trackingRef?: string;
}
