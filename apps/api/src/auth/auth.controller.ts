import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { Env } from '../config/env.validation.js';
import type { SessionResponse, UserResponse } from '@wts/contracts';
import { toPublicUser } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import {
  ACCESS_COOKIE,
  clearAuthCookies,
  readCookie,
  REFRESH_COOKIE,
  setAuthCookies,
} from './cookies.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard, type AuthedRequest } from './guards/jwt-auth.guard.js';

/**
 * Tighter than the global limit: each of these costs a password hash, and the
 * login one is what password guessing goes through. Resolved per request so it
 * reads the validated environment, not whatever existed at import time.
 */
const AUTH_LIMIT = {
  default: {
    limit: () => Number(process.env.AUTH_RATE_LIMIT ?? 10),
    ttl: 60_000,
  },
};

@Controller('auth')
export class AuthController {
  private readonly forceSecure: boolean;

  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    config: ConfigService<Env, true>,
  ) {
    this.forceSecure = config.get('COOKIE_SECURE', { infer: true });
  }

  @Post('register')
  @Throttle(AUTH_LIMIT)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponse> {
    const result = await this.auth.register(
      dto.username,
      dto.email,
      dto.password,
      req.get('user-agent'),
    );
    if ('taken' in result)
      throw new ConflictException({ code: `${result.taken}_taken` });
    setAuthCookies(req, res, result.tokens, this.forceSecure);
    return { user: toPublicUser(result.user) };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(AUTH_LIMIT)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponse> {
    const result = await this.auth.login(
      dto.identifier,
      dto.password,
      req.get('user-agent'),
    );
    if (!result)
      throw new UnauthorizedException({ code: 'invalid_credentials' });
    setAuthCookies(req, res, result.tokens, this.forceSecure);
    return { user: toPublicUser(result.user) };
  }

  /** Rotate the refresh token and mint a new access token. */
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponse> {
    const presented = readCookie(req, REFRESH_COOKIE);
    const result = presented
      ? await this.auth.refresh(presented, req.get('user-agent'))
      : null;
    if (!result) {
      clearAuthCookies(req, res, this.forceSecure);
      throw new UnauthorizedException({ code: 'unauthenticated' });
    }
    setAuthCookies(req, res, result.tokens, this.forceSecure);
    return { user: toPublicUser(result.user) };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(readCookie(req, REFRESH_COOKIE));
    clearAuthCookies(req, res, this.forceSecure);
  }

  /**
   * Restore the session on page load, in one call: the current user if the
   * access token is valid, otherwise a silent refresh, otherwise `null`.
   *
   * A guest is a normal state, not an error, so this answers 200 either way —
   * the console stays quiet and the client needs no retry dance to boot.
   */
  @Get('session')
  async session(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponse> {
    const access = readCookie(req, ACCESS_COOKIE);
    const payload = access ? await this.auth.verifyAccess(access) : null;
    if (payload) {
      const user = await this.users.findById(payload.sub);
      if (user) return { user: toPublicUser(user) };
    }
    const presented = readCookie(req, REFRESH_COOKIE);
    const refreshed = presented
      ? await this.auth.refresh(presented, req.get('user-agent'))
      : null;
    if (!refreshed) {
      if (access || presented) clearAuthCookies(req, res, this.forceSecure);
      return { user: null };
    }
    setAuthCookies(req, res, refreshed.tokens, this.forceSecure);
    return { user: toPublicUser(refreshed.user) };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthedRequest): Promise<UserResponse> {
    const user = await this.users.findById(req.auth.sub);
    if (!user) throw new NotFoundException({ code: 'not_found' });
    return { user: toPublicUser(user) };
  }
}
