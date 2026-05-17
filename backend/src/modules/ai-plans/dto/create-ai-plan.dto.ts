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
import { AiPlanTier } from '../../../common/enums';

export class CreateAiPlanDto {
  @IsString() @MaxLength(100) name!: string;
  @IsEnum(AiPlanTier) tier!: AiPlanTier;
  @IsNumber() @Min(0) pricePerMonth!: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsBoolean() isPopular?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
