import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const password =
      request.query.password ||
      request.headers['x-admin-password'] ||
      request.cookies?.adminPassword;

    const adminPassword = this.configService.get<string>('adminPassword');

    if (password === adminPassword) {
      return true;
    }

    this.logger.warn(`Unauthorized access attempt from ${request.ip}`);
    throw new UnauthorizedException('Invalid admin password');
  }
}
