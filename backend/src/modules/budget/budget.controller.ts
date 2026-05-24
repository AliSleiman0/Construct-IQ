import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { BudgetService } from './budget.service';
import { CreateBudgetDto, CreateBudgetLineDto, CreateExpenseDto } from './dto/create-budget.dto';
import { PartialType } from '@nestjs/mapped-types';

class UpdateBudgetDto extends PartialType(CreateBudgetDto) {}

@Controller('budget')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BUDGET.READ)
  findByProject(@CurrentUser() user: JwtPayload, @Query('projectId') projectId: string): Promise<any> {
    return this.budgetService.findByProject(projectId, user.organizationId, user.isSuperAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBudgetDto): Promise<any> {
    return this.budgetService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  update(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateBudgetDto): Promise<any> {
    return this.budgetService.update(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Post(':id/lines')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  addLine(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: CreateBudgetLineDto): Promise<any> {
    return this.budgetService.addLine(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Delete(':id/lines/:lineId')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  removeLine(@Param('id') id: string, @Param('lineId') lineId: string, @CurrentUser() user: JwtPayload): Promise<any> {
    return this.budgetService.removeLine(id, lineId, user.organizationId, user.isSuperAdmin);
  }

  @Post(':id/expenses')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  addExpense(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: CreateExpenseDto): Promise<any> {
    return this.budgetService.addExpense(id, user.organizationId, dto, user.isSuperAdmin);
  }

  @Get(':id/expenses')
  @RequirePermissions(PERMISSIONS.BUDGET.READ)
  listExpenses(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<any[]> {
    return this.budgetService.listExpenses(id, user.organizationId, user.isSuperAdmin);
  }

  @Delete(':id/expenses/:expenseId')
  @RequirePermissions(PERMISSIONS.BUDGET.MANAGE)
  removeExpense(
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.budgetService.removeExpense(id, expenseId, user.organizationId, user.isSuperAdmin);
  }
}
