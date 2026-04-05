import { IsString, IsOptional } from 'class-validator';

export class AddProjectMemberDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  role?: string; // project-level role override (Option B decision)
}
