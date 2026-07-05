import { Body, Controller, Get, Post, Query, Res, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import {
  AUTH_COOKIE_NAME,
  hashPassword,
  safeEqual,
} from '../common/guards/auth.guard';
import { LoginDto } from './dto/login.dto';

const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Only allow same-origin absolute paths as redirect targets. */
function sanitizeNext(next: string | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return '/';
  }
  return next;
}

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private configService: ConfigService) {}

  @Public()
  @Get('login')
  renderLogin(
    @Query('next') next: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): void {
    res.render('login', {
      next: sanitizeNext(next),
      error: error === '1',
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Res() res: Response): void {
    const adminPassword = this.configService.get<string>('adminPassword');
    const next = sanitizeNext(dto.next);

    if (adminPassword && safeEqual(dto.password, adminPassword)) {
      res.cookie(AUTH_COOKIE_NAME, hashPassword(adminPassword), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE_MS,
        secure: process.env.NODE_ENV === 'production',
      });
      res.redirect(next);
      return;
    }

    this.logger.warn('Failed login attempt');
    res.redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  @Public()
  @Post('logout')
  logout(@Res() res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.redirect('/login');
  }
}
