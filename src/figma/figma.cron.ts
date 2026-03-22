import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { FigmaService } from './figma.service';
import { FigmaCodegenService } from './figma-codegen.service';
import { DesignTaskStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FigmaCron {
  private readonly logger = new Logger(FigmaCron.name);
  private processing = false;

  constructor(
    private prisma: PrismaService,
    private telegramService: TelegramService,
    private figmaService: FigmaService,
    private figmaCodegenService: FigmaCodegenService,
  ) {}

  @Cron('*/30 * * * *')
  async processDesignTasks(): Promise<void> {
    if (this.processing) {
      this.logger.debug('Design task processing already in progress, skipping');
      return;
    }

    this.processing = true;

    try {
      const pendingTasks = await this.prisma.designTask.findMany({
        where: { status: DesignTaskStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        take: 1,
      });

      if (pendingTasks.length === 0) {
        this.logger.debug('No pending design tasks');
        return;
      }

      this.logger.log(`Processing ${pendingTasks.length} pending design tasks`);

      for (const task of pendingTasks) {
        await this.processDesignTask(task.id);
      }
    } catch (error) {
      this.logger.error(
        'Design task cron failed',
        (error as Error).message,
      );
    } finally {
      this.processing = false;
    }
  }

  async processDesignTask(taskId: string): Promise<void> {
    if (!this.figmaService.isEnabled()) {
      this.logger.warn(`Skipping design task ${taskId} — Figma service disabled`);
      await this.prisma.designTask.update({
        where: { id: taskId },
        data: {
          status: DesignTaskStatus.FAILED,
          errorMessage: 'Figma service disabled — FIGMA_ACCESS_TOKEN not set',
          processedAt: new Date(),
        },
      });
      return;
    }

    try {
      await this.prisma.designTask.update({
        where: { id: taskId },
        data: { status: DesignTaskStatus.PROCESSING },
      });

      const task = await this.prisma.designTask.findUniqueOrThrow({
        where: { id: taskId },
      });

      this.logger.log(`Processing design task ${taskId}: ${task.figmaUrl}`);

      const parsed = this.figmaService.parseUrl(task.figmaUrl);
      const nodeIds = parsed.nodeId || undefined;
      const fileData = await this.figmaService.getFileData(
        task.figmaFileKey,
        nodeIds,
      );

      const targetNodeId = nodeIds || fileData.document.id;

      const images = await this.figmaService.getNodeImages(
        task.figmaFileKey,
        targetNodeId,
      );

      const screenshotUrl =
        Object.values(images)[0] || '';

      if (!screenshotUrl) {
        throw new Error('No screenshot available for the Figma node');
      }

      const targetNode = nodeIds
        ? this.findNode(fileData.document, targetNodeId)
        : fileData.document;

      if (!targetNode) {
        throw new Error(
          `Node not found in Figma file: targetNodeId="${targetNodeId}", fileKey="${task.figmaFileKey}"`,
        );
      }

      const generatedCode = await this.figmaCodegenService.generateCode(
        targetNode as Parameters<FigmaCodegenService['generateCode']>[0],
        screenshotUrl,
      );

      const cleanedCode = this.extractHtml(generatedCode);

      const outputDir = path.resolve(
        process.cwd(),
        'output',
        'figma',
        taskId,
      );
      fs.mkdirSync(outputDir, { recursive: true });

      const outputFilePath = path.join(outputDir, 'index.html');
      fs.writeFileSync(outputFilePath, cleanedCode, 'utf-8');

      const previewUrl = `/figma/preview/${taskId}`;

      await this.prisma.designTask.update({
        where: { id: taskId },
        data: {
          status: DesignTaskStatus.COMPLETED,
          generatedCode: cleanedCode,
          outputPath: outputFilePath,
          previewUrl,
          processedAt: new Date(),
        },
      });

      this.logger.log(`Design task ${taskId} completed: ${outputFilePath}`);

      const notification = [
        '<b>Figma Design Converted</b>',
        '',
        `File: ${fileData.name}`,
        `Node: ${targetNodeId}`,
        `Output: ${previewUrl}`,
        '',
        `ID: <code>${taskId}</code>`,
      ].join('\n');

      await this.telegramService.sendToOwner(notification);
    } catch (error) {
      this.logger.error(
        `Design task ${taskId} failed`,
        (error as Error).message,
      );

      await this.prisma.designTask.update({
        where: { id: taskId },
        data: {
          status: DesignTaskStatus.FAILED,
          errorMessage: (error as Error).message,
          processedAt: new Date(),
        },
      });

      await this.telegramService.sendToOwner(
        `<b>Figma Task Failed</b>\n\nID: <code>${taskId}</code>\nError: ${(error as Error).message}`,
      );
    }
  }

  private findNode(
    node: Record<string, unknown>,
    targetId: string,
  ): Record<string, unknown> | null {
    if ((node as { id?: string }).id === targetId) {
      return node;
    }

    const children = node.children as Record<string, unknown>[] | undefined;
    if (children && Array.isArray(children)) {
      for (const child of children) {
        const found = this.findNode(child, targetId);
        if (found) return found;
      }
    }

    return null;
  }

  private extractHtml(raw: string): string {
    const codeBlockMatch = raw.match(/```html\s*\n([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();

    const doctypeIdx = raw.toLowerCase().indexOf('<!doctype');
    const htmlOpenIdx = raw.toLowerCase().indexOf('<html');
    const htmlCloseIdx = raw.toLowerCase().lastIndexOf('</html>');
    const startIdx = doctypeIdx >= 0 ? doctypeIdx : htmlOpenIdx;
    if (startIdx >= 0 && htmlCloseIdx > startIdx) {
      return raw.substring(startIdx, htmlCloseIdx + 7).trim();
    }

    return raw.trim();
  }
}
