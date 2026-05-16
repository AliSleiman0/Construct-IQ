import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrgAdminDto {
  @ApiProperty({ example: 'olivia.romero@constructiq.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Olivia' })
  @IsString()
  @MaxLength(64)
  firstName!: string;

  @ApiProperty({ example: 'Romero' })
  @IsString()
  @MaxLength(64)
  lastName!: string;

  @ApiPropertyOptional({ example: '+1-555-2001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Target organization the admin will manage' })
  @IsString()
  organizationId!: string;
}
