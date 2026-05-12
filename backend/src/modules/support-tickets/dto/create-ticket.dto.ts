import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  subject: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({ enum: ['GENERAL', 'BILLING', 'TECHNICAL', 'FEATURE_REQUEST'] })
  @IsOptional()
  @IsEnum(['GENERAL', 'BILLING', 'TECHNICAL', 'FEATURE_REQUEST'])
  category?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;
}
