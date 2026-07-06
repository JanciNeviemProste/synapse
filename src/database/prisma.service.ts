import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  isConnected(): boolean {
    return this.connected;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.connected = true;
      this.logger.log('Database connected');
    } catch (error) {
      // Graceful degradation: boot continues (auth, login, static routes work);
      // DB-backed requests fail per-request until the database is reachable.
      this.connected = false;
      this.logger.error(
        'Database connection failed — running DEGRADED (DB-backed routes will error)',
        (error as Error).message,
      );
    }
  }

  async onModuleDestroy() {
    if (!this.connected) return;
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
