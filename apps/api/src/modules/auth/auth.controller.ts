import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, NoTenant, Public } from '../../common/decorators.js';
import type { AuthUser } from '../../common/types.js';
import type { Env } from '../../config/env.js';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
  wantsCookie,
} from './auth.cookie.js';
import {
  ChangePasswordDto,
  GoogleSignInDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from './auth.dto.js';
import { AuthService } from './auth.service.js';

// Credential endpoints are public, so slow down guessing: 10 tries a minute per IP.
const credentialLimit = { default: { limit: 10, ttl: 60_000 } };
// Refresh is public too; a normal client refreshes a few times an hour.
const refreshLimit = { default: { limit: 30, ttl: 60_000 } };

type Issued = Awaited<ReturnType<AuthService['login']>>;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookies = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  /** Browsers get the refresh token as an httpOnly cookie, never in the body. */
  private deliver(req: Request, res: Response, issued: Issued) {
    if (!wantsCookie(req)) return issued;
    const { refreshToken, ...rest } = issued;
    setRefreshCookie(res, refreshToken, issued.refreshTokenExpiresAt, this.secureCookies);
    return rest;
  }

  /** Body token (apps) or, for browsers that opted in, the cookie. */
  private presentedToken(req: Request, body: RefreshTokenDto) {
    return body.refreshToken ?? (wantsCookie(req) ? readRefreshCookie(req) : undefined);
  }

  @Public()
  @Throttle(credentialLimit)
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.deliver(req, res, await this.auth.register(body));
  }

  @Public()
  @Throttle(credentialLimit)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.deliver(req, res, await this.auth.login(body));
  }

  @Public()
  @Throttle(credentialLimit)
  @Post('google')
  @HttpCode(200)
  async google(
    @Body() body: GoogleSignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.deliver(req, res, await this.auth.googleSignIn(body));
  }

  @Public()
  @Throttle(refreshLimit)
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.presentedToken(req, body);
    if (!token) throw new UnauthorizedException('Invalid or expired refresh token');
    try {
      return this.deliver(req, res, await this.auth.refresh(token));
    } catch (error) {
      if (wantsCookie(req)) clearRefreshCookie(res, this.secureCookies);
      throw error;
    }
  }

  /** Public so clients can log out even after the access token has expired. */
  @Public()
  @Throttle(refreshLimit)
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.presentedToken(req, body);
    if (wantsCookie(req)) clearRefreshCookie(res, this.secureCookies);
    return token ? this.auth.logout(token) : { success: true };
  }

  @ApiBearerAuth()
  @NoTenant()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @ApiBearerAuth()
  @NoTenant()
  @Patch('password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.id, body);
  }
}
