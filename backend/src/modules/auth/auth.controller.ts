import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

const COOKIE_OPTIONS = (isProd: boolean) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ('none' as const) : ('lax' as const),
  path: '/',
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private get isProd() {
    return this.configService.get('app.nodeEnv') === 'production';
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    res.cookie('access_token', result.accessToken, {
      ...COOKIE_OPTIONS(this.isProd),
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS(this.isProd),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Non-httpOnly flag for middleware route protection
    res.cookie('logged_in', 'true', {
      secure: this.isProd,
      sameSite: this.isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { user: result.user };
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh cookie' })
  async refresh(
    @CurrentUser() user: { sub: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refresh(user.sub, user.refreshToken);

    res.cookie('access_token', tokens.accessToken, {
      ...COOKIE_OPTIONS(this.isProd),
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTIONS(this.isProd),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('logged_in', 'true', {
      secure: this.isProd,
      sameSite: this.isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { message: 'Tokens refreshed' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Logout and clear auth cookies' })
  async logout(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.clearCookie('logged_in');

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }
}
