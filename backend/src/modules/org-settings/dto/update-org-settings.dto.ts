import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsString()
  brandColor?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsString()
  weekStart?: string;

  @IsOptional()
  @IsString()
  measurement?: string;

  @IsOptional()
  @IsObject()
  notifications?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  twoFactorRequired?: boolean;

  @IsOptional()
  @IsString()
  passwordPolicy?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  sessionTimeoutMin?: number;

  @IsOptional()
  @IsBoolean()
  ssoEnabled?: boolean;
}
