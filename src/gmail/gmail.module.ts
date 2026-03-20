import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GmailParser } from './gmail.parser';

@Module({
  providers: [GmailService, GmailParser],
  exports: [GmailService, GmailParser],
})
export class GmailModule {}
