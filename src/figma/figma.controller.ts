import { Controller, Get, Post, Delete, Body, Param, Res, Logger } from '@nestjs/common';
import { DesignTaskStatus } from '@prisma/client';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../database/prisma.service';
import { FigmaService } from './figma.service';
import { FigmaCodegenService } from './figma-codegen.service';
import { FigmaCron } from './figma.cron';

@Controller()
export class FigmaController {
  private readonly logger = new Logger(FigmaController.name);

  constructor(
    private prisma: PrismaService,
    private figmaService: FigmaService,
    private figmaCodegenService: FigmaCodegenService,
    private figmaCron: FigmaCron,
  ) {}

  @Get('figma')
  async renderIndex(@Res() res: Response): Promise<void> {
    try {
      const tasks = await this.prisma.designTask.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.render(path.join('figma', 'index'), {
        title: 'Figma Pipeline',
        currentPath: '/figma',
        tasks,
      });
    } catch (error) {
      this.logger.error('Failed to render figma index', (error as Error).message);
      res.render(path.join('figma', 'index'), {
        title: 'Figma Pipeline',
        currentPath: '/figma',
        tasks: [],
      });
    }
  }

  @Get('figma/preview/:id')
  async renderPreview(@Param('id') id: string, @Res() res: Response): Promise<void> {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      res.status(400).send('Invalid ID');
      return;
    }
    try {
      const task = await this.prisma.designTask.findUnique({ where: { id } });
      if (!task) {
        res.status(404).send('Design task not found');
        return;
      }

      // If still processing, render preview with processing flag
      if (task.status === DesignTaskStatus.PENDING || task.status === DesignTaskStatus.PROCESSING) {
        res.render(path.join('figma', 'preview'), {
          title: `Preview — ${task.fileName || task.figmaFileKey}`,
          currentPath: '/figma',
          task,
          processing: true,
        });
        return;
      }

      // Check if output file exists on disk
      const outputFile = path.resolve(process.cwd(), 'output', 'figma', id, 'index.html');
      const fileExists = fs.existsSync(outputFile);

      if (!fileExists && task.generatedCode) {
        // File missing on disk but we have code in DB — recreate it
        const outputDir = path.resolve(process.cwd(), 'output', 'figma', id);
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(outputFile, task.generatedCode, 'utf-8');
        this.logger.log(`Recreated output file from DB for task ${id}`);
      }

      res.render(path.join('figma', 'preview'), {
        title: `Preview — ${task.fileName || task.figmaFileKey}`,
        currentPath: '/figma',
        task,
        processing: false,
      });
    } catch (error) {
      this.logger.error('Failed to render preview', (error as Error).message);
      res.status(500).send('Error loading preview');
    }
  }

  @Post('api/figma')
  async createDesignTask(@Body() body: { figmaUrl: string }): Promise<Record<string, unknown>> {
    try {
      const parsed = this.figmaService.parseUrl(body.figmaUrl);
      const task = await this.prisma.designTask.create({
        data: {
          figmaUrl: body.figmaUrl,
          figmaFileKey: parsed.fileKey,
          figmaNodeIds: parsed.nodeId || null,
          submittedBy: 'web',
          status: 'PENDING',
        },
      });
      return { success: true, data: task };
    } catch (error) {
      this.logger.error('Failed to create design task', (error as Error).message);
      return { success: false, error: (error as Error).message };
    }
  }

  @Get('api/figma')
  async listTasks(): Promise<Record<string, unknown>> {
    try {
      const tasks = await this.prisma.designTask.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { success: true, data: tasks };
    } catch (error) {
      this.logger.error('Failed to list design tasks', (error as Error).message);
      return { success: false, error: 'Failed to list design tasks' };
    }
  }

  @Post('api/figma/:id/retry')
  async retryTask(@Param('id') id: string): Promise<Record<string, unknown>> {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      return { success: false, error: 'Invalid ID' };
    }
    try {
      const task = await this.prisma.designTask.findUnique({ where: { id } });
      if (!task) return { success: false, error: 'Not found' };

      const blockedStatuses = ['PENDING', 'PROCESSING'];
      if (blockedStatuses.includes(task.status)) {
        return { success: false, error: 'Task is already being processed' };
      }

      await this.prisma.designTask.update({
        where: { id },
        data: {
          status: DesignTaskStatus.PROCESSING,
          errorMessage: null,
          processedAt: null,
          generatedCode: null,
          outputPath: null,
          previewUrl: null,
        },
      });

      // Trigger immediate processing instead of waiting for next cron cycle
      this.figmaCron.processDesignTask(id).catch((error) => {
        this.logger.error(`Immediate processing failed for task ${id}`, (error as Error).message);
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to retry task ${id}`, (error as Error).message);
      return { success: false, error: 'Failed to retry task' };
    }
  }

  @Delete('api/figma/:id')
  async deleteTask(@Param('id') id: string): Promise<Record<string, unknown>> {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      return { success: false, error: 'Invalid ID' };
    }
    try {
      const task = await this.prisma.designTask.findUnique({ where: { id } });
      if (!task) return { success: false, error: 'Not found' };

      await this.prisma.designTask.delete({ where: { id } });

      const outputDir = path.resolve(process.cwd(), 'output', 'figma', id);
      try {
        await fs.promises.rm(outputDir, { recursive: true, force: true });
      } catch {
        // Directory may not exist, ignore
      }

      this.logger.log(`Design task deleted: ${id}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete design task ${id}`, (error as Error).message);
      return { success: false, error: (error as Error).message };
    }
  }

  @Get('api/figma/:id')
  async getTask(@Param('id') id: string): Promise<Record<string, unknown>> {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      return { success: false, error: 'Invalid ID' };
    }
    try {
      const task = await this.prisma.designTask.findUnique({ where: { id } });
      if (!task) return { success: false, error: 'Not found' };
      return { success: true, data: task };
    } catch (error) {
      this.logger.error(`Failed to get design task ${id}`, (error as Error).message);
      return { success: false, error: 'Failed to get design task' };
    }
  }
}
