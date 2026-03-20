import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { CoderService } from './coder.service';
import * as path from 'path';

interface CreateTaskBody {
  prompt: string;
  type: string;
}

@Controller()
export class CoderController {
  private readonly logger = new Logger(CoderController.name);

  constructor(private coderService: CoderService) {}

  @Get('coder')
  renderIndex(@Res() res: Response): void {
    try {
      res.render(path.join('coder', 'index'));
    } catch (error) {
      this.logger.error(
        'Failed to render coder index',
        (error as Error).message,
      );
      res.status(500).send('Internal Server Error');
    }
  }

  @Get('coder/history')
  renderHistory(@Res() res: Response): void {
    try {
      res.render(path.join('coder', 'history'));
    } catch (error) {
      this.logger.error(
        'Failed to render coder history',
        (error as Error).message,
      );
      res.status(500).send('Internal Server Error');
    }
  }

  @Get('coder/preview/:id')
  async renderPreview(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      res.status(400).send('Invalid ID');
      return;
    }
    try {
      const task = await this.coderService.getTask(id);
      if (!task.response) {
        res.status(404).send('Preview not available');
        return;
      }
      res.type('html').send(task.response);
    } catch (error) {
      this.logger.error(`Failed to serve preview ${id}`, (error as Error).message);
      res.status(404).send('Task not found');
    }
  }

  @Post('api/coder')
  async createTask(@Body() body: CreateTaskBody) {
    try {
      const task = await this.coderService.createTask(
        body.prompt,
        body.type || 'web',
      );
      return { success: true, data: task };
    } catch (error) {
      this.logger.error(
        'Failed to create coder task',
        (error as Error).message,
      );
      return { success: false, error: 'Failed to create task' };
    }
  }

  @Post('api/coder/:id/retry')
  async retryTask(@Param('id') id: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      return { success: false, error: 'Invalid ID' };
    }
    try {
      await this.coderService.retryTask(id);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to retry task ${id}`, (error as Error).message);
      return { success: false, error: (error as Error).message };
    }
  }

  @Delete('api/coder/:id')
  async deleteTask(@Param('id') id: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      return { success: false, error: 'Invalid ID' };
    }
    try {
      await this.coderService.deleteTask(id);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete task ${id}`, (error as Error).message);
      return { success: false, error: (error as Error).message };
    }
  }

  @Get('api/coder/:id/status')
  async getTaskStatus(@Param('id') id: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      return { success: false, error: 'Invalid ID' };
    }
    try {
      const task = await this.coderService.getTask(id);
      return {
        success: true,
        data: {
          id: task.id,
          status: task.status,
          deployUrl: task.deployUrl,
          repoUrl: task.repoUrl,
          duration: task.duration,
          completedAt: task.completedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get task status ${id}`,
        (error as Error).message,
      );
      return { success: false, error: 'Task not found' };
    }
  }

  @Get('api/coder')
  async listTasks(@Query('limit') limit?: string) {
    try {
      const numLimit = limit ? parseInt(limit, 10) : 20;
      const validLimit = isNaN(numLimit) || numLimit < 1 ? 20 : Math.min(numLimit, 100);
      const tasks = await this.coderService.getTasks(validLimit);
      return { success: true, data: tasks };
    } catch (error) {
      this.logger.error('Failed to list tasks', (error as Error).message);
      return { success: false, error: 'Failed to list tasks' };
    }
  }
}
