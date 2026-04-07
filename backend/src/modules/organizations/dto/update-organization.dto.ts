import { IsString, IsOptional, IsEmail, IsUrl, IsInt, Min } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  /** Update the user cap for this organization. Null = unlimited. */
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number | null;
}
