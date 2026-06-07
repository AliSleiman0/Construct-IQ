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

// `secure` is driven by COOKIE_SECURE (not NODE_ENV) so the app can run in
// production over plain HTTP without the browser dropping the cookies.
// `sameSite: 'lax'` is correct because the nginx reverse proxy serves the app
// and the API from the same origin (SameSite=None would require Secure).
const COOKIE_OPTIONS = (secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: 'lax' as const,
  path: '/',
});

// Options for the non-httpOnly flag cookies (read by the frontend middleware).
const FLAG_COOKIE_OPTIONS = (secure: boolean) => ({
  secure,
  sameSite: 'lax' as const,
  path: '/',
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private get cookieSecure(): boolean {
    return this.configService.get<boolean>('app.cookieSecure') ?? false;
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
      ...COOKIE_OPTIONS(this.cookieSecure),
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS(this.cookieSecure),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Non-httpOnly flag for middleware route protection
    res.cookie('logged_in', 'true', {
      ...FLAG_COOKIE_OPTIONS(this.cookieSecure),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Non-httpOnly flag so the frontend middleware knows if this is Super Admin
    res.cookie('is_super_admin', result.user.isSuperAdmin ? 'true' : 'false', {
      ...FLAG_COOKIE_OPTIONS(this.cookieSecure),
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
      ...COOKIE_OPTIONS(this.cookieSecure),
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTIONS(this.cookieSecure),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('logged_in', 'true', {
      ...FLAG_COOKIE_OPTIONS(this.cookieSecure),
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

    // Options must match those used in res.cookie() for browsers to clear them
    res.clearCookie('access_token', COOKIE_OPTIONS(this.cookieSecure));
    res.clearCookie('refresh_token', COOKIE_OPTIONS(this.cookieSecure));
    res.clearCookie('logged_in', FLAG_COOKIE_OPTIONS(this.cookieSecure));
    res.clearCookie('is_super_admin', FLAG_COOKIE_OPTIONS(this.cookieSecure));

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }
}
