import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { PlanTier } from '../../../common/enums';

export class CreatePlanDto {
  @IsString() @MaxLength(100) name!: string;
  @IsEnum(PlanTier) tier!: PlanTier;
  @IsNumber() @Min(0) pricePerMonth!: number;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(1) maxUsers!: number;
  @IsNumber() @Min(1) maxProjects!: number;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsBoolean() isPopular?: boolean;
}
