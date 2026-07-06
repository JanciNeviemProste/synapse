import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContentIdea, ContentIdeaStatus, ContentSession, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentProviderFactory } from '../providers/provider.factory';
import { BrandProfileService } from './brand-profile.service';
import { KnowledgeService } from './knowledge.service';

/** Quick text idea capture + AI extraction (spec §7.1). */
@Injectable()
export class IdeasService {
  private readonly logger = new Logger(IdeasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ContentProviderFactory,
    private readonly brandProfile: BrandProfileService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async captureText(rawText: string): Promise<{ session: ContentSession; ideas: ContentIdea[] }> {
    const session = await this.prisma.contentSession.create({
      data: {
        type: 'TEXT_NOTE',
        title: rawText.substring(0, 80),
        status: 'PROCESSING',
        transcript: rawText,
      },
    });

    try {
      const [brand, knowledgeCtx] = await Promise.all([
        this.brandProfile.getContext(),
        this.knowledge.retrieve(rawText),
      ]);
      const extracted = await this.providerFactory
        .getStrategyProvider()
        .extractIdeas({
          rawText,
          sourceType: 'text_note',
          brand,
          knowledge: knowledgeCtx,
        });

      const ideas = await Promise.all(
        extracted.ideas.map((idea) =>
          this.prisma.contentIdea.create({
            data: {
              sessionId: session.id,
              title: idea.title,
              description: idea.description || null,
              keyMessage: idea.keyMessage || null,
              suggestedGoal: idea.suggestedGoal || null,
              sourceType: 'text_note',
            },
          }),
        ),
      );

      const updatedSession = await this.prisma.contentSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          summary: extracted.mainTopic || null,
          extractedData: extracted as unknown as Prisma.InputJsonValue,
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
      this.logger.error('idea extraction failed', (error as Error).message);
      throw error;
    }
  }

  async list(status?: ContentIdeaStatus): Promise<ContentIdea[]> {
    return this.prisma.contentIdea.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async listSessions(limit = 10): Promise<ContentSession[]> {
    return this.prisma.contentSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async update(
    id: string,
    input: { title?: string; description?: string; keyMessage?: string; suggestedGoal?: string; status?: ContentIdeaStatus },
  ): Promise<ContentIdea> {
    const existing = await this.prisma.contentIdea.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Idea not found');
    return this.prisma.contentIdea.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.keyMessage !== undefined && { keyMessage: input.keyMessage }),
        ...(input.suggestedGoal !== undefined && { suggestedGoal: input.suggestedGoal }),
        ...(input.status !== undefined && { status: input.status }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contentIdea.delete({ where: { id } });
  }

  /** Merge several ideas into one (spec §7.1); sources are archived. */
  async merge(ids: string[]): Promise<ContentIdea> {
    const ideas = await this.prisma.contentIdea.findMany({ where: { id: { in: ids } } });
    if (ideas.length < 2) throw new NotFoundException('Need at least 2 ideas to merge');
    const merged = await this.prisma.contentIdea.create({
      data: {
        title: ideas[0].title,
        description: ideas
          .map((i) => [i.title, i.description].filter(Boolean).join(': '))
          .join('\n'),
        keyMessage: ideas.map((i) => i.keyMessage).filter(Boolean).join(' / ') || null,
        suggestedGoal: ideas[0].suggestedGoal,
        sourceType: 'merged',
      },
    });
    await this.prisma.contentIdea.updateMany({
      where: { id: { in: ids } },
      data: { status: 'ARCHIVED' },
    });
    return merged;
  }
}
