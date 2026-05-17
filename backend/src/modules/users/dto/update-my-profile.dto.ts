import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMyNotificationsDto {
  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'never'] })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'never'])
  digest?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() newProject?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() invoiceDue?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() invoicePaid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ticketUpdate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() productNews?: boolean;
}

export class UpdateMyLocalizationDto {
  @ApiPropertyOptional({ enum: ['en', 'fr', 'es', 'ar'] })
  @IsOptional()
  @IsIn(['en', 'fr', 'es', 'ar'])
  language?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({
    enum: ['MMM D, YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
  })
  @IsOptional()
  @IsIn(['MMM D, YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'])
  dateFormat?: string;

  @ApiPropertyOptional({ enum: ['12h', '24h'] })
  @IsOptional()
  @IsIn(['12h', '24h'])
  timeFormat?: string;

  @ApiPropertyOptional({ enum: ['sunday', 'monday', 'saturday'] })
  @IsOptional()
  @IsIn(['sunday', 'monday', 'saturday'])
  firstDayOfWeek?: string;

  @ApiPropertyOptional({ enum: ['imperial', 'metric'] })
  @IsOptional()
  @IsIn(['imperial', 'metric'])
  measurement?: string;
}

export class UpdateMyProfileDto {
  @ApiPropertyOptional({ type: UpdateMyLocalizationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMyLocalizationDto)
  localization?: UpdateMyLocalizationDto;

  @ApiPropertyOptional({ type: UpdateMyNotificationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMyNotificationsDto)
  notifications?: UpdateMyNotificationsDto;
}
