import { IsString, IsOptional } from 'class-validator';

export class UpdateProjectMemberDto {
  @IsOptional()
  @IsString()
  role?: string; // project-level role override (free-text)
}
