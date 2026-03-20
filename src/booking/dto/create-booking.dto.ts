import {
  IsString,
  IsEmail,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  clientName!: string;

  @IsEmail()
  clientEmail!: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsDateString()
  dateTime!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  leadId?: string;
}
