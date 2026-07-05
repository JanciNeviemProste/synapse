import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const AUTH_COOKIE_NAME = 'synapse_auth';

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/** Constant-time comparison that tolerates different input lengths. */
export function safeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a).digest();
  const digestB = createHash('sha256').update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const adminPassword = this.configService.get<string>('adminPassword');
    if (!adminPassword) {
      this.logger.error(
        'ADMIN_PASSWORD is not set — denying all admin requests (fail closed)',
      );
      throw new UnauthorizedException('Admin access is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();

    const headerPassword = request.headers['x-admin-password'];
    if (
      typeof headerPassword === 'string' &&
      safeEqual(headerPassword, adminPassword)
    ) {
      return true;
    }

    const cookieHash = readCookie(request, AUTH_COOKIE_NAME);
    if (cookieHash && safeEqual(cookieHash, hashPassword(adminPassword))) {
      return true;
    }

    this.logger.warn(`Unauthorized access attempt from ${request.ip}`);
    throw new UnauthorizedException('Invalid admin password');
  }
}
