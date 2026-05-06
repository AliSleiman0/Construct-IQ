import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ManpowerEntryDto {
  @IsString() trade!: string;
  @IsNumber() @Min(0) count!: number;
  @IsOptional() @IsString() contractor?: string;
  @IsOptional() @IsString() notes?: string;
}

export class MaterialEntryDto {
  @IsString() material!: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsString() unit!: string;
  @IsOptional() @IsString() notes?: string;
}

export class EquipmentEntryDto {
  @IsString() name!: string;
  @IsNumber() @Min(0) hours!: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateDailyReportDto {
  @IsString()
  projectId!: string;

  @IsDateString()
  reportDate!: string;

  @IsOptional()
  @IsString()
  weather?: string;

  @IsOptional()
  @IsNumber()
  highTempC?: number;

  @IsOptional()
  @IsNumber()
  lowTempC?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  workCompleted?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  blockers?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManpowerEntryDto)
  manpowerEntries?: ManpowerEntryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialEntryDto)
  materialEntries?: MaterialEntryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentEntryDto)
  equipmentEntries?: EquipmentEntryDto[];
}
