import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrgSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandColor?: string;

  @ApiPropertyOptional({ enum: ['light', 'dark', 'auto'] })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  weekStart?: string;

  @ApiPropertyOptional({ enum: ['imperial', 'metric'] })
  @IsOptional()
  @IsString()
  measurement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  notifications?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  twoFactorRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passwordPolicy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  sessionTimeoutMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ssoEnabled?: boolean;
}
