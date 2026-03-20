import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { v4 as uuid } from 'uuid';

interface LearningInsights {
  topPhrases: string[];
  avoidPhrases: string[];
  recommendedTone: string;
  builderConversionRate: number;
  bookingConversionRate: number;
}

@Injectable()
export class AiLearningService {
  private readonly logger = new Logger(AiLearningService.name);

  constructor(private prisma: PrismaService) {}

  async recordMessagePerformance(data: {
    leadId: string;
    variant: string;
    messageType: string;
    toneStyle?: string;
    phraseUsed?: string;
    linkType?: string;
  }): Promise<void> {
    try {
      await this.prisma.messagePerformance.create({
        data: {
          id: uuid(),
          leadId: data.leadId,
          variant: data.variant,
          messageType: data.messageType,
          toneStyle: data.toneStyle,
          phraseUsed: data.phraseUsed,
          linkType: data.linkType,
        },
      });
    } catch (error) {
      this.logger.error('Failed to record message performance', (error as Error).message);
    }
  }

  async updateResult(leadId: string, resultAction: string): Promise<void> {
    try {
      const performance = await this.prisma.messagePerformance.findFirst({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
      });

      if (performance) {
        await this.prisma.messagePerformance.update({
          where: { id: performance.id },
          data: { resultAction },
        });
      }
    } catch (error) {
      this.logger.error('Failed to update result', (error as Error).message);
    }
  }

  async markConversion(leadId: string, type: 'call' | 'sale', amount?: number): Promise<void> {
    try {
      const performance = await this.prisma.messagePerformance.findFirst({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
      });

      if (performance) {
        await this.prisma.messagePerformance.update({
          where: { id: performance.id },
          data: {
            convertedToCall: type === 'call' ? true : performance.convertedToCall,
            convertedToSale: type === 'sale' ? true : performance.convertedToSale,
            saleAmount: amount ?? performance.saleAmount,
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to mark conversion', (error as Error).message);
    }
  }

  async getInsights(): Promise<LearningInsights> {
    try {
      const performances = await this.prisma.messagePerformance.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      if (performances.length < 5) {
        return {
          topPhrases: [],
          avoidPhrases: [],
          recommendedTone: 'helpful',
          builderConversionRate: 0,
          bookingConversionRate: 0,
        };
      }

      const opened = performances.filter((p) => p.resultAction === 'opened');
      const ignored = performances.filter((p) => p.resultAction === 'ignored');

      const topPhrases = opened
        .filter((p) => p.phraseUsed)
        .map((p) => p.phraseUsed!)
        .slice(0, 5);

      const avoidPhrases = ignored
        .filter((p) => p.phraseUsed)
        .map((p) => p.phraseUsed!)
        .slice(0, 5);

      const tones = opened.reduce<Record<string, number>>((acc, p) => {
        if (p.toneStyle) acc[p.toneStyle] = (acc[p.toneStyle] || 0) + 1;
        return acc;
      }, {});

      const recommendedTone = Object.entries(tones).sort((a, b) => b[1] - a[1])[0]?.[0] || 'helpful';

      const builderMessages = performances.filter((p) => p.linkType === 'builder');
      const bookingMessages = performances.filter((p) => p.linkType === 'booking');

      const builderConversionRate = builderMessages.length > 0
        ? builderMessages.filter((p) => p.resultAction === 'opened' || p.resultAction === 'completed').length / builderMessages.length * 100
        : 0;

      const bookingConversionRate = bookingMessages.length > 0
        ? bookingMessages.filter((p) => p.resultAction === 'opened' || p.resultAction === 'completed').length / bookingMessages.length * 100
        : 0;

      return {
        topPhrases,
        avoidPhrases,
        recommendedTone,
        builderConversionRate: Math.round(builderConversionRate),
        bookingConversionRate: Math.round(bookingConversionRate),
      };
    } catch (error) {
      this.logger.error('Failed to get insights', (error as Error).message);
      return {
        topPhrases: [],
        avoidPhrases: [],
        recommendedTone: 'helpful',
        builderConversionRate: 0,
        bookingConversionRate: 0,
      };
    }
  }
}
