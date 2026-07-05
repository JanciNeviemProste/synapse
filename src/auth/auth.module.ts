import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthGuard } from '../common/guards/auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    // Order matters: throttling runs before auth so brute-force is rate-limited pre-auth.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
