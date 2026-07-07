import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class PetoBrandDto {
  @IsString() @IsNotEmpty() @MaxLength(200) brandName!: string;
  @IsOptional() @IsString() @MaxLength(200) industry?: string;
  @IsOptional() @IsString() @MaxLength(2000) targetAudience?: string;
  @IsOptional() @IsString() @MaxLength(2000) communicationStyle?: string;
  @IsOptional() @IsIn(['tykanie', 'vykanie']) addressing?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) preferredPhrases?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) forbiddenPhrases?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) requiredCtas?: string[];
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}

export class PetoTemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(4000) structure?: string;
  @IsOptional() @IsString() @MaxLength(2000) hookPattern?: string;
  @IsOptional() @IsString() @MaxLength(2000) ctaPattern?: string;
}

export class PetoGenerateDto {
  @IsString() @IsNotEmpty() @MaxLength(20000) transcript!: string;
  @IsOptional() @IsString() templateId?: string;
}
