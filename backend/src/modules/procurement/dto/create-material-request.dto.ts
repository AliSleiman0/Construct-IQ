import { IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';

export class CreateMaterialRequestDto {
  @IsString() projectId!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsDateString() neededByDate?: string;
}

export class ReviewMaterialRequestDto {
  @IsOptional() @IsString() reviewNote?: string;
}

export class ConvertMaterialRequestDto {
  @IsString() poId!: string;
}
