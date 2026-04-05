import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Users')
@ApiCookieAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('user.read')
  @ApiOperation({ summary: 'List all users in the organization' })
  findAll(@CurrentUser('organizationId') organizationId: string) {
    return this.usersService.findAllByOrganization(organizationId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.findById(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user.create')
  @ApiOperation({ summary: 'Create a new user in the organization' })
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(organizationId, dto);
  }
}
