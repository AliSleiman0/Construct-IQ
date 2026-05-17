import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsString()
  brandColor?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emailSender?: string | null;

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
  @IsIn(['standard', 'strong', 'strict'])
  passwordPolicy?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  sessionTimeoutMin?: number;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(20)
  lockoutMaxAttempts?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  lockoutDurationMin?: number;

  // IPv4/IPv6 addresses or CIDR ranges. Empty array clears the allowlist.
  // Each entry validated as a string ≤ 64 chars; runtime IP/CIDR validation
  // happens in OrgSettingsService.update().
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  allowedIps?: string[];
}
