import { Injectable, Logger } from '@nestjs/common';
import { ContentIdea, ContentSession, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { buildInterviewInstructions } from '../prompts/ai-content-interview.prompt';
import { ContentProviderFactory } from '../providers/provider.factory';
import {
  InterviewNextQuestion,
  InterviewTurn,
  RealtimeSessionToken,
} from '../providers/provider.interfaces';
import { BrandProfileService } from './brand-profile.service';

/**
 * AI content interview (spec §7.4).
 * Text mode works always (mock or anthropic); realtime voice mode is
 * available only when the realtime provider has credentials.
 */
@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ContentProviderFactory,
    private readonly brandProfile: BrandProfileService,
  ) {}

  async nextQuestion(history: InterviewTurn[]): Promise<InterviewNextQuestion> {
    const brand = await this.brandProfile.getContext();
    return this.providerFactory.getStrategyProvider().nextInterviewQuestion(history, brand);
  }

  /** End interview: persist session, build structured brief, create ideas. */
  async finish(
    history: InterviewTurn[],
  ): Promise<{ session: ContentSession; ideas: ContentIdea[] }> {
    const transcript = history
      .map((t) => `${t.role === 'ai' ? 'AI' : 'JA'}: ${t.text}`)
      .join('\n');

    const session = await this.prisma.contentSession.create({
      data: {
        type: 'AI_INTERVIEW',
        title: `AI interview ${new Date().toLocaleString('sk-SK')}`,
        status: 'PROCESSING',
        transcript,
      },
    });

    try {
      const brand = await this.brandProfile.getContext();
      const brief = await this.providerFactory
        .getStrategyProvider()
        .buildInterviewBrief(transcript, brand);

      const ideas = await Promise.all(
        brief.ideas.map((idea) =>
          this.prisma.contentIdea.create({
            data: {
              sessionId: session.id,
              title: idea.title,
              description: idea.description || null,
              keyMessage: idea.keyMessage || null,
              suggestedGoal: idea.suggestedGoal || null,
              sourceType: 'ai_interview',
            },
          }),
        ),
      );

      const updatedSession = await this.prisma.contentSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          summary: brief.summary,
          extractedData: brief as unknown as Prisma.InputJsonValue,
        },
      });

      return { session: updatedSession, ideas };
    } catch (error) {
      await this.prisma.contentSession.update({
        where: { id: session.id },
        data: {
          status: 'FAILED',
          errorMessage: (error as Error).message?.substring(0, 2000),
        },
      });
      this.logger.error('interview brief failed', (error as Error).message);
      throw error;
    }
  }

  isRealtimeAvailable(): boolean {
    return this.providerFactory.getRealtimeProvider().isAvailable();
  }

  async createRealtimeToken(): Promise<RealtimeSessionToken> {
    const brand = await this.brandProfile.getContext();
    return this.providerFactory
      .getRealtimeProvider()
      .createSessionToken({ instructions: buildInterviewInstructions(brand) });
  }
}
