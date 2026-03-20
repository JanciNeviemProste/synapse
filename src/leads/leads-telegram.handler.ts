import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TelegramUpdate } from '../telegram/telegram.update';
import { TelegramService } from '../telegram/telegram.service';
import { LeadsService } from './leads.service';
import { PrismaService } from '../database/prisma.service';
import { InlineKeyboard } from 'grammy';
import { LeadStatus } from '@prisma/client';
import {
  bold,
  code,
  formatLeadStatus,
  truncate,
} from '../common/utils/telegram-formatter';

@Injectable()
export class LeadsTelegramHandler implements OnModuleInit {
  private readonly logger = new Logger(LeadsTelegramHandler.name);

  constructor(
    private telegramUpdate: TelegramUpdate,
    private telegramService: TelegramService,
    private leadsService: LeadsService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Direct commands
    this.telegramUpdate.registerCommand('leads', this.handleLeads.bind(this));
    this.telegramUpdate.registerCommand('stats', this.handleStats.bind(this));
    this.telegramUpdate.registerCommand('blacklist', this.handleBlacklist.bind(this));
    this.telegramUpdate.registerCommand('whitelist', this.handleWhitelist.bind(this));

    // Prefix-based commands: /lead_{id}, /status_{id}_{S}, /unblacklist_{id}
    this.telegramUpdate.registerCommand('lead', this.handleLeadById.bind(this));
    this.telegramUpdate.registerCommand('status', this.handleStatusChange.bind(this));
    this.telegramUpdate.registerCommand('unblacklist', this.handleUnblacklist.bind(this));

    // Callback handlers
    this.telegramUpdate.registerCallback('lead_contact', this.handleLeadContact.bind(this));
    this.telegramUpdate.registerCallback('lead_reject', this.handleLeadReject.bind(this));
    this.telegramUpdate.registerCallback('lead_detail', this.handleLeadDetail.bind(this));
    this.telegramUpdate.registerCallback('lead_blacklist', this.handleLeadBlacklist.bind(this));
    this.telegramUpdate.registerCallback('lead_snooze', this.handleLeadSnooze.bind(this));
    this.telegramUpdate.registerCallback('lead_copy', this.handleLeadCopy.bind(this));
    this.telegramUpdate.registerCallback('lead_commented', this.handleLeadCommented.bind(this));
    this.telegramUpdate.registerCallback('lead_messaged', this.handleLeadMessaged.bind(this));

    this.logger.log('Leads Telegram commands registered');
  }

  private async handleLeads(chatId: number): Promise<void> {
    const leads = await this.leadsService.getLeads(undefined, 10);

    if (leads.length === 0) {
      await this.telegramService.sendMessage(chatId, 'Zatiaľ žiadne leady.');
      return;
    }

    let message = `${bold('Posledných 10 leadov:')}\n\n`;

    for (const lead of leads) {
      const conf = lead.confidence ? `${Math.round(lead.confidence * 100)}%` : 'N/A';
      message +=
        `• ${lead.authorName} [${lead.category || '?'}]\n` +
        `  ${formatLeadStatus(lead.status)} | Trust: ${lead.trustScore} | Heat: ${lead.heatScore} | Conf: ${conf}\n` +
        `  /lead_${lead.id.substring(0, 8)}\n\n`;
    }

    await this.telegramService.sendMessage(chatId, message);
  }

  private async handleStats(chatId: number): Promise<void> {
    const stats = await this.leadsService.getStats();

    const message =
      `📊 ${bold('Štatistiky leadov')}\n\n` +
      `Celkovo: ${code(String(stats.total))}\n` +
      `Dnes: ${code(String(stats.todayCount))}\n` +
      `Tento týždeň: ${code(String(stats.weekCount))}\n` +
      `Konverzný pomer: ${code(`${stats.conversionRate}%`)}\n` +
      `Priem. heat score: ${code(String(stats.avgHeatScore))}\n` +
      `Priem. confidence: ${code(`${Math.round(stats.avgConfidence * 100)}%`)}\n\n` +
      `${bold('Status:')}\n` +
      Object.entries(stats.byStatus).map(([s, c]) => `${formatLeadStatus(s)}: ${c}`).join('\n') +
      (stats.topCategories.length > 0
        ? `\n\n${bold('Top kategórie:')}\n` +
          stats.topCategories.map((tc) => `${tc.category}: ${tc.count}`).join('\n')
        : '');

    await this.telegramService.sendMessage(chatId, message);
  }

  private async handleBlacklist(chatId: number, args: string): Promise<void> {
    if (!args.trim()) {
      await this.telegramService.sendMessage(chatId, 'Použitie: /blacklist {meno}');
      return;
    }

    try {
      await this.prisma.blacklist.create({
        data: { name: args.trim() },
      });
      await this.telegramService.sendMessage(chatId, `✅ "${args.trim()}" pridaný na blacklist.`);
    } catch {
      await this.telegramService.sendMessage(chatId, `❌ Nepodarilo sa pridať na blacklist.`);
    }
  }

  private async handleWhitelist(chatId: number): Promise<void> {
    const entries = await this.prisma.blacklist.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (entries.length === 0) {
      await this.telegramService.sendMessage(chatId, 'Blacklist je prázdny.');
      return;
    }

    let message = `${bold('Blacklist:')}\n\n`;
    for (const entry of entries) {
      message += `• ${entry.name}${entry.profileUrl ? ` (${entry.profileUrl})` : ''}\n  /unblacklist_${entry.id.substring(0, 8)}\n`;
    }

    await this.telegramService.sendMessage(chatId, message);
  }

  private async handleUnblacklist(chatId: number, args: string): Promise<void> {
    const idPrefix = args.trim();
    if (!idPrefix) {
      await this.telegramService.sendMessage(chatId, 'Použitie: /unblacklist {id}');
      return;
    }

    try {
      const entry = await this.prisma.blacklist.findFirst({
        where: { id: { startsWith: idPrefix } },
      });

      if (!entry) {
        await this.telegramService.sendMessage(chatId, '❌ Záznam nenájdený.');
        return;
      }

      await this.prisma.blacklist.delete({ where: { id: entry.id } });
      await this.telegramService.sendMessage(chatId, `✅ "${entry.name}" odstránený z blacklistu.`);
    } catch {
      await this.telegramService.sendMessage(chatId, '❌ Nepodarilo sa odstrániť z blacklistu.');
    }
  }

  private async handleLeadContact(chatId: number, data: string): Promise<void> {
    const leadId = data.replace('lead_contact_', '');
    await this.leadsService.updateLeadStatus(leadId, LeadStatus.CONTACTED);
    await this.telegramService.sendMessage(chatId, `✅ Lead označený ako kontaktovaný.`);
  }

  private async handleLeadReject(chatId: number, data: string): Promise<void> {
    const leadId = data.replace('lead_reject_', '');
    await this.leadsService.updateLeadStatus(leadId, LeadStatus.REJECTED);
    await this.telegramService.sendMessage(chatId, `❌ Lead ignorovaný.`);
  }

  private async handleLeadDetail(chatId: number, data: string): Promise<void> {
    const leadId = data.replace('lead_detail_', '');
    const lead = await this.leadsService.getLeadById(leadId);

    if (!lead) {
      await this.telegramService.sendMessage(chatId, 'Lead nenájdený.');
      return;
    }

    let message =
      `📋 ${bold('Detail leadu')}\n\n` +
      `${bold('Meno:')} ${lead.authorName}\n` +
      `${bold('Status:')} ${formatLeadStatus(lead.status)}\n` +
      `${bold('Kategória:')} ${lead.category || 'N/A'}\n` +
      `${bold('Trust Score:')} ${lead.trustScore}\n` +
      `${bold('Heat Score:')} ${lead.heatScore}\n` +
      `${bold('Confidence:')} ${lead.confidence ? `${Math.round(lead.confidence * 100)}%` : 'N/A'}\n` +
      `${bold('Vytvorený:')} ${lead.createdAt.toLocaleString('sk-SK')}\n`;

    if (lead.researchSummary) message += `\n${bold('Research:')}\n${lead.researchSummary}\n`;
    if (lead.webAnalysis) message += `\n${bold('Web analýza:')}\n${lead.webAnalysis}\n`;
    if (lead.priceEstimate) message += `\n${bold('Cenový odhad:')}\n${lead.priceEstimate}\n`;

    message += `\n${bold('Príspevok:')}\n${truncate(lead.postSummary, 500)}`;

    if (lead.notes.length > 0) {
      message += `\n\n${bold('Poznámky:')}`;
      for (const note of lead.notes.slice(0, 5)) {
        message += `\n• ${truncate(note.content, 200)}`;
      }
    }

    const keyboard = new InlineKeyboard()
      .text('Kontaktovaný', `lead_contact_${lead.id}`)
      .text('Ignorovať', `lead_reject_${lead.id}`);

    await this.telegramService.sendWithKeyboard(chatId, message, keyboard);
  }

  private async handleLeadBlacklist(chatId: number, data: string): Promise<void> {
    const leadId = data.replace('lead_blacklist_', '');
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead) {
      await this.telegramService.sendMessage(chatId, 'Lead nenájdený.');
      return;
    }

    await this.prisma.blacklist.create({
      data: {
        name: lead.authorName,
        profileUrl: lead.profileUrl || undefined,
      },
    });

    await this.leadsService.updateLeadStatus(leadId, LeadStatus.REJECTED);
    await this.telegramService.sendMessage(chatId, `🚫 "${lead.authorName}" pridaný na blacklist a lead zamietnutý.`);
  }

  private async handleLeadSnooze(chatId: number, data: string): Promise<void> {
    const leadId = data.replace('lead_snooze_', '');
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { reminderSentAt: null },
    });
    await this.telegramService.sendMessage(chatId, `⏰ Pripomienka odložená o 30 minút.`);
  }

  private async handleLeadById(chatId: number, args: string): Promise<void> {
    const idPrefix = args.trim();
    if (!idPrefix) {
      await this.telegramService.sendMessage(chatId, 'Použitie: /lead_{id}');
      return;
    }

    const lead = await this.prisma.lead.findFirst({
      where: { id: { startsWith: idPrefix } },
      include: { notes: { orderBy: { createdAt: 'desc' } }, activities: { orderBy: { createdAt: 'desc' } } },
    });

    if (!lead) {
      await this.telegramService.sendMessage(chatId, 'Lead nenájdený.');
      return;
    }

    await this.handleLeadDetail(chatId, `lead_detail_${lead.id}`);
  }

  private async handleStatusChange(chatId: number, args: string): Promise<void> {
    // Format: /status_{id}_{STATUS} → args = "{id}_{STATUS}"
    const parts = args.split('_');
    if (parts.length < 2) {
      await this.telegramService.sendMessage(chatId, 'Použitie: /status_{id}_{NEW|CONTACTED|REPLIED|CONVERTED|REJECTED}');
      return;
    }

    const statusStr = parts.pop()!.toUpperCase();
    const idPrefix = parts.join('_');

    const validStatuses = Object.values(LeadStatus);
    if (!validStatuses.includes(statusStr as LeadStatus)) {
      await this.telegramService.sendMessage(chatId, `Neplatný status. Dostupné: ${validStatuses.join(', ')}`);
      return;
    }

    const lead = await this.prisma.lead.findFirst({
      where: { id: { startsWith: idPrefix } },
    });

    if (!lead) {
      await this.telegramService.sendMessage(chatId, 'Lead nenájdený.');
      return;
    }

    await this.leadsService.updateLeadStatus(lead.id, statusStr);
    await this.telegramService.sendMessage(chatId, `✅ Status leadu "${lead.authorName}" zmenený na ${formatLeadStatus(statusStr)}.`);
  }

  private async handleLeadCopy(chatId: number, data: string): Promise<void> {
    // "copy" callback — just acknowledge, user copies text from the message above
    await this.telegramService.sendMessage(chatId, '📋 Text je pripravený na skopírovanie z predchádzajúcej správy.');
  }

  private async handleLeadCommented(chatId: number, data: string): Promise<void> {
    const leadId = data.replace('lead_commented_', '');
    await this.leadsService.updateLeadStatus(leadId, LeadStatus.CONTACTED);
    await this.telegramService.sendMessage(chatId, '✅ Komentár použitý, lead označený ako kontaktovaný.');
  }

  private async handleLeadMessaged(chatId: number, data: string): Promise<void> {
    const leadId = data.replace('lead_messaged_', '');
    await this.leadsService.updateLeadStatus(leadId, LeadStatus.CONTACTED);
    await this.telegramService.sendMessage(chatId, '✅ Správa odoslaná, lead označený ako kontaktovaný.');
  }
}
