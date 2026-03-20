import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { LeadStatus } from '@prisma/client';
import {
  bold,
  italic,
  code,
  formatLeadStatus,
  formatDate,
} from '../common/utils/telegram-formatter';

@Injectable()
export class LeadsReportCron {
  private readonly logger = new Logger(LeadsReportCron.name);

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
  ) {}

  @Cron('0 20 * * *')
  async handleDailyReport(): Promise<void> {
    try {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      const [
        todayLeads,
        totalLeads,
        statusCounts,
        todayActivities,
        hotLeads,
        recentConversions,
      ] = await Promise.all([
        this.prisma.lead.findMany({
          where: { createdAt: { gte: todayStart } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.lead.count(),
        this.prisma.lead.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        this.prisma.leadActivity.count({
          where: { createdAt: { gte: todayStart } },
        }),
        this.prisma.lead.findMany({
          where: { heatScore: { gte: 50 }, status: { not: LeadStatus.REJECTED } },
          orderBy: { heatScore: 'desc' },
          take: 5,
        }),
        this.prisma.lead.findMany({
          where: {
            status: LeadStatus.CONVERTED,
            updatedAt: { gte: todayStart },
          },
        }),
      ]);

      const byStatus: Record<string, number> = {};
      for (const sc of statusCounts) {
        byStatus[sc.status] = sc._count.status;
      }

      const todayContacted = todayLeads.filter(
        (l) => l.status !== LeadStatus.NEW,
      ).length;
      const todayRelevant = todayLeads.filter(
        (l) => l.confidence !== null && l.confidence >= 0.5,
      ).length;

      let report =
        `📊 ${bold('DENNY REPORT')} — ${formatDate(now)}\n\n` +
        `${bold('=== DNESNE LEADY ===')}\n` +
        `Novych: ${code(String(todayLeads.length))}\n` +
        `Relevantnych: ${code(String(todayRelevant))}\n` +
        `Kontaktovanych: ${code(String(todayContacted))}\n` +
        `Aktivit: ${code(String(todayActivities))}\n\n`;

      report +=
        `${bold('=== CELKOVY STAV ===')}\n` +
        `Celkovo leadov: ${code(String(totalLeads))}\n`;

      const allStatuses: string[] = Object.values(LeadStatus);
      for (const status of allStatuses) {
        const count = byStatus[status] || 0;
        report += `${formatLeadStatus(status)}: ${count}\n`;
      }
      report += '\n';

      if (hotLeads.length > 0) {
        report += `${bold('=== HOT LEADS ===')}\n`;
        for (const lead of hotLeads) {
          report +=
            `• ${lead.authorName} — Score: ${lead.heatScore}, ` +
            `Status: ${formatLeadStatus(lead.status)}\n`;
        }
        report += '\n';
      }

      if (recentConversions.length > 0) {
        report += `${bold('=== DNЕСNE KONVERZIE ===')}\n`;
        for (const lead of recentConversions) {
          report += `✅ ${lead.authorName} — ${lead.category || 'N/A'}\n`;
        }
        report += '\n';
      }

      if (todayLeads.length > 0) {
        report += `${bold('=== DNЕСNE LEADY (poslednych 5) ===')}\n`;
        const recentFive = todayLeads.slice(0, 5);
        for (const lead of recentFive) {
          const conf = lead.confidence
            ? `${Math.round(lead.confidence * 100)}%`
            : 'N/A';
          report +=
            `• ${lead.authorName} [${lead.category || '?'}] ` +
            `— Conf: ${conf}, Score: ${lead.heatScore}\n`;
        }
      }

      await this.telegramService.sendToOwner(report);
      this.logger.log('Daily report sent');
    } catch (error) {
      this.logger.error(
        'Failed to send daily report',
        (error as Error).message,
      );
    }
  }

  @Cron('0 8 * * 1')
  async handleWeeklyReport(): Promise<void> {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      const [
        weekLeads,
        prevWeekLeads,
        weekActivities,
        weekConversions,
        weekPerformances,
        topHeatLeads,
        totalLeads,
      ] = await Promise.all([
        this.prisma.lead.findMany({
          where: { createdAt: { gte: weekStart } },
        }),
        this.prisma.lead.count({
          where: {
            createdAt: {
              gte: new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000),
              lt: weekStart,
            },
          },
        }),
        this.prisma.leadActivity.count({
          where: { createdAt: { gte: weekStart } },
        }),
        this.prisma.lead.count({
          where: {
            status: LeadStatus.CONVERTED,
            updatedAt: { gte: weekStart },
          },
        }),
        this.prisma.messagePerformance.findMany({
          where: { createdAt: { gte: weekStart } },
        }),
        this.prisma.lead.findMany({
          where: {
            createdAt: { gte: weekStart },
            heatScore: { gte: 30 },
          },
          orderBy: { heatScore: 'desc' },
          take: 10,
        }),
        this.prisma.lead.count(),
      ]);

      const weekTotal = weekLeads.length;
      const weekRelevant = weekLeads.filter(
        (l) => l.confidence !== null && l.confidence >= 0.5,
      ).length;
      const weekContacted = weekLeads.filter(
        (l) => l.contactedAt !== null,
      ).length;
      const weekLinksOpened = weekLeads.filter((l) => l.linkOpened).length;
      const weekFormsCompleted = weekLeads.filter(
        (l) => l.formCompleted,
      ).length;

      const growthPercent =
        prevWeekLeads > 0
          ? Math.round(((weekTotal - prevWeekLeads) / prevWeekLeads) * 100)
          : 0;
      const growthIndicator = growthPercent >= 0 ? `+${growthPercent}` : String(growthPercent);

      const conversionRate =
        weekContacted > 0
          ? Math.round((weekConversions / weekContacted) * 100)
          : 0;

      const linkOpenRate =
        weekContacted > 0
          ? Math.round((weekLinksOpened / weekContacted) * 100)
          : 0;

      const categoryMap = new Map<string, number>();
      for (const lead of weekLeads) {
        const cat = lead.category || 'other';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      }
      const topCategories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1]);

      const avgConfidence =
        weekLeads.length > 0
          ? weekLeads
              .filter((l) => l.confidence !== null)
              .reduce((sum, l) => sum + (l.confidence || 0), 0) /
            Math.max(
              weekLeads.filter((l) => l.confidence !== null).length,
              1,
            )
          : 0;

      const avgHeatScore =
        weekLeads.length > 0
          ? Math.round(
              weekLeads.reduce((sum, l) => sum + l.heatScore, 0) /
                weekLeads.length,
            )
          : 0;

      const openedMessages = weekPerformances.filter(
        (p) => p.resultAction === 'opened',
      ).length;
      const messageSuccessRate =
        weekPerformances.length > 0
          ? Math.round((openedMessages / weekPerformances.length) * 100)
          : 0;

      let report =
        `📈 ${bold('TYZDENNY REPORT')} — ${formatDate(weekStart)} - ${formatDate(now)}\n\n` +
        `${bold('=== PREHLAD ===')}\n` +
        `Novych leadov: ${code(String(weekTotal))} (${growthIndicator}% vs minuly tyzden)\n` +
        `Relevantnych: ${code(String(weekRelevant))}\n` +
        `Kontaktovanych: ${code(String(weekContacted))}\n` +
        `Konverzii: ${code(String(weekConversions))}\n` +
        `Celkovo v DB: ${code(String(totalLeads))}\n\n`;

      report +=
        `${bold('=== METRIKY ===')}\n` +
        `Konverzny pomer: ${code(`${conversionRate}%`)}\n` +
        `Link open rate: ${code(`${linkOpenRate}%`)}\n` +
        `Formulare dokoncene: ${code(String(weekFormsCompleted))}\n` +
        `Priemerna relevancia: ${code(`${Math.round(avgConfidence * 100)}%`)}\n` +
        `Priemerny heat score: ${code(String(avgHeatScore))}\n` +
        `Uspesnost sprav: ${code(`${messageSuccessRate}%`)}\n` +
        `Celkom aktivit: ${code(String(weekActivities))}\n\n`;

      if (topCategories.length > 0) {
        report += `${bold('=== TOP KATEGORIE ===')}\n`;
        for (const [category, count] of topCategories) {
          const bar = '█'.repeat(Math.min(count, 20));
          report += `${category}: ${bar} ${count}\n`;
        }
        report += '\n';
      }

      if (topHeatLeads.length > 0) {
        report += `${bold('=== TOP LEADY (heat score) ===')}\n`;
        for (const lead of topHeatLeads) {
          const conf = lead.confidence
            ? `${Math.round(lead.confidence * 100)}%`
            : 'N/A';
          report +=
            `• ${lead.authorName} — Score: ${lead.heatScore}, ` +
            `Conf: ${conf}, Status: ${formatLeadStatus(lead.status)}\n`;
        }
        report += '\n';
      }

      report +=
        `${bold('=== FUNNEL ===')}\n` +
        `Nove: ${weekTotal} → Kontaktovane: ${weekContacted} → ` +
        `Link otvoreny: ${weekLinksOpened} → Formular: ${weekFormsCompleted} → ` +
        `Konverzie: ${weekConversions}\n\n`;

      const responseTimeAnalysis = this.analyzeResponseTimes(weekLeads);
      if (responseTimeAnalysis) {
        report += `${bold('=== OPTIMÁLNE ČASY NA ODPOVEĎ ===')}\n${responseTimeAnalysis}\n`;
      }

      await this.telegramService.sendToOwner(report);
      this.logger.log('Weekly report sent');
    } catch (error) {
      this.logger.error(
        'Failed to send weekly report',
        (error as Error).message,
      );
    }
  }

  private analyzeResponseTimes(
    leads: Array<{ createdAt: Date; groupName: string | null; contactedAt: Date | null; linkOpened: boolean }>,
  ): string | null {
    if (leads.length < 3) return null;

    const groupActivity = new Map<string, number[]>();

    for (const lead of leads) {
      const group = lead.groupName || 'Neznáma';
      const hour = lead.createdAt.getHours();
      if (!groupActivity.has(group)) groupActivity.set(group, []);
      groupActivity.get(group)!.push(hour);
    }

    const lines: string[] = [];

    for (const [group, hours] of groupActivity.entries()) {
      if (hours.length < 2) continue;

      const hourCounts = new Map<number, number>();
      for (const h of hours) {
        hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
      }

      const peakHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (peakHour) {
        lines.push(`⏰ "${group}" — najaktívnejší okolo ${peakHour[0]}:00`);
      }
    }

    const contactedLeads = leads.filter((l) => l.contactedAt && l.linkOpened);
    if (contactedLeads.length > 0) {
      const avgResponseTime = contactedLeads.reduce((sum, l) => {
        const diff = (l.contactedAt!.getTime() - l.createdAt.getTime()) / 60000;
        return sum + diff;
      }, 0) / contactedLeads.length;

      lines.push(`📊 Priemerný čas odpovede: ${Math.round(avgResponseTime)} min`);
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }
}
