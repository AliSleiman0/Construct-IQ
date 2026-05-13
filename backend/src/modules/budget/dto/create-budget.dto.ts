import { IsString, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateBudgetDto {
  @IsString() projectId!: string;
  @IsNumber() @Min(0) totalAmount!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateBudgetLineDto {
  @IsString() @MaxLength(200) category!: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) plannedAmount!: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateExpenseDto {
  @IsOptional() @IsString() budgetLineId?: string;
  @IsString() description!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() currency?: string;
  @IsString() date!: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
}
