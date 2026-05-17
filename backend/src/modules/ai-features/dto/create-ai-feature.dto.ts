import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches, MaxLength } from 'class-validator';

export class CreateAiFeatureDto {
  /** Unique snake_case key — must start with a letter, lowercase letters/digits/underscores only */
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'key must start with a letter and contain only lowercase letters, digits, and underscores',
  })
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
