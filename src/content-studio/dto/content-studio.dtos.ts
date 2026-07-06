import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QuickIdeaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text!: string;
}

export class UpdateIdeaDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsString() @MaxLength(1000) keyMessage?: string;
  @IsOptional() @IsString() @MaxLength(100) suggestedGoal?: string;
  @IsOptional()
  @IsIn(['NEW', 'APPROVED', 'CONVERTED', 'REJECTED', 'ARCHIVED'])
  status?: 'NEW' | 'APPROVED' | 'CONVERTED' | 'REJECTED' | 'ARCHIVED';
}

export class MergeIdeasDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

export class BrandProfileDto {
  @IsString() @IsNotEmpty() @MaxLength(200) brandName!: string;
  @IsOptional() @IsString() @MaxLength(200) industry?: string;
  @IsOptional() @IsString() @MaxLength(2000) targetAudience?: string;
  @IsOptional() @IsString() @MaxLength(2000) communicationStyle?: string;
  @IsOptional() @IsIn(['tykanie', 'vykanie']) addressing?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) preferredPhrases?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) forbiddenPhrases?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) requiredCtas?: string[];
  @IsOptional() @IsInt() @Min(0) @Max(5) humorLevel?: number;
  @IsOptional() @IsInt() @Min(0) @Max(5) formalityLevel?: number;
  @IsOptional() @IsInt() @Min(0) @Max(5) energyLevel?: number;
  @IsOptional() @IsString() @MaxLength(4000) trustRules?: string;
  @IsOptional() @IsString() @MaxLength(4000) complianceNotes?: string;
}

export class KnowledgeDocDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsString() @IsNotEmpty() @MaxLength(100000) content!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class UpdateKnowledgeDocDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() @MaxLength(100000) content?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class TemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() structure?: unknown;
  @IsOptional() @IsString() @MaxLength(100) recommendedGoal?: string;
  @IsOptional() @IsString() @MaxLength(100) recommendedLength?: string;
  @IsOptional() @IsString() @MaxLength(100) recommendedStyle?: string;
  @IsOptional() @IsString() @MaxLength(100) recommendedEmotion?: string;
  @IsOptional() @IsString() @MaxLength(2000) hookPattern?: string;
  @IsOptional() @IsString() @MaxLength(4000) bodyPattern?: string;
  @IsOptional() @IsString() @MaxLength(2000) ctaPattern?: string;
  @IsOptional() @IsString() @MaxLength(4000) complianceRules?: string;
}

export class TemplateFlagsDto {
  @IsOptional() @IsBoolean() isFavorite?: boolean;
  @IsOptional() @IsBoolean() isArchived?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class PillarDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10) priority?: number;
  @IsOptional() @IsString() @MaxLength(100) targetFrequency?: string;
  @IsOptional() @IsString() @MaxLength(2000) complianceNotes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdatePillarDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10) priority?: number;
  @IsOptional() @IsString() @MaxLength(100) targetFrequency?: string;
  @IsOptional() @IsString() @MaxLength(2000) complianceNotes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class InspirationDto {
  @IsIn(['INSTAGRAM_PROFILE', 'INSTAGRAM_REEL', 'SCREENSHOT', 'VIDEO_UPLOAD', 'TRANSCRIPT', 'MANUAL_NOTE'])
  type!: 'INSTAGRAM_PROFILE' | 'INSTAGRAM_REEL' | 'SCREENSHOT' | 'VIDEO_UPLOAD' | 'TRANSCRIPT' | 'MANUAL_NOTE';
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) sourceUrl?: string;
  @IsOptional() @IsString() @MaxLength(50000) transcript?: string;
  @IsOptional() @IsString() @MaxLength(10000) userNotes?: string;
}

export class UpdateInspirationDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(1000) sourceUrl?: string;
  @IsOptional() @IsString() @MaxLength(50000) transcript?: string;
  @IsOptional() @IsString() @MaxLength(10000) userNotes?: string;
}
