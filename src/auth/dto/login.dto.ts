import { IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  next?: string;
}
