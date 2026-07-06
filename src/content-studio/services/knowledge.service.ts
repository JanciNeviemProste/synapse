import { Injectable } from '@nestjs/common';
import { KnowledgeDoc, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { KnowledgeContext } from '../providers/provider.interfaces';

const EXCERPT_LENGTH = 1200;
const MAX_SOURCES = 4;

/**
 * Score a document against topic keywords. Pure — unit tested.
 * V1 keyword retrieval (spec §11); architecture ready for pgvector later.
 */
export function scoreDocument(
  doc: { title: string; content: string; tags: string[] },
  keywords: string[],
): number {
  if (keywords.length === 0) return 0;
  let score = 0;
  const title = doc.title.toLowerCase();
  const content = doc.content.toLowerCase();
  const tags = doc.tags.map((t) => t.toLowerCase());
  for (const raw of keywords) {
    const kw = raw.toLowerCase();
    if (kw.length < 3) continue;
    if (title.includes(kw)) score += 5;
    if (tags.some((t) => t.includes(kw))) score += 4;
    const matches = content.split(kw).length - 1;
    score += Math.min(matches, 5);
  }
  return score;
}

export function extractKeywords(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-záäčďéíĺľňóôŕšťúýžA-Z0-9]+/i)
        .filter((w) => w.length >= 4),
    ),
  ].slice(0, 20);
}

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<KnowledgeDoc[]> {
    return this.prisma.knowledgeDoc.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async create(input: {
    title: string;
    category?: string;
    content: string;
    tags?: string[];
  }): Promise<KnowledgeDoc> {
    return this.prisma.knowledgeDoc.create({
      data: {
        title: input.title,
        category: input.category ?? null,
        content: input.content,
        tags: (input.tags ?? []) as Prisma.InputJsonValue,
      },
    });
  }

  async update(
    id: string,
    input: { title?: string; category?: string; content?: string; tags?: string[]; isActive?: boolean },
  ): Promise<KnowledgeDoc> {
    return this.prisma.knowledgeDoc.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.tags !== undefined && { tags: input.tags as Prisma.InputJsonValue }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.knowledgeDoc.delete({ where: { id } });
  }

  /**
   * Select relevant context for a topic (spec §11) — never the whole KB.
   * Returns which sources were used so the UI can display references.
   */
  async retrieve(topic: string): Promise<KnowledgeContext> {
    const docs = await this.prisma.knowledgeDoc.findMany({ where: { isActive: true } });
    const keywords = extractKeywords(topic);
    const scored = docs
      .map((doc) => ({
        doc,
        score: scoreDocument(
          {
            title: doc.title,
            content: doc.content,
            tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
          },
          keywords,
        ),
      }))
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SOURCES);

    return {
      sources: scored.map(({ doc }) => ({
        title: doc.title,
        excerpt: doc.content.substring(0, EXCERPT_LENGTH),
      })),
    };
  }
}
