import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ClonerService } from './cloner.service';
import { CreateCloneDto } from './dto/create-clone.dto';
import * as path from 'path';
import * as fs from 'fs';

@Controller()
export class ClonerController {
  private readonly logger = new Logger(ClonerController.name);

  constructor(private clonerService: ClonerService) {}

  @Get('cloner/public')
  renderPublicForm(
    @Query('ref') ref: string | undefined,
    @Res() res: Response,
  ): void {
    try {
      res.render(path.join('cloner', 'public'), {
        ref: ref || null,
      });
    } catch (error) {
      this.logger.error(
        'Failed to render public cloner page',
        (error as Error).message,
      );
      res.status(500).send('Internal Server Error');
    }
  }

  @Get('cloner/admin')
  renderAdminPage(@Res() res: Response): void {
    try {
      res.render(path.join('cloner', 'admin'));
    } catch (error) {
      this.logger.error(
        'Failed to render admin cloner page',
        (error as Error).message,
      );
      res.status(500).send('Internal Server Error');
    }
  }

  @Get('cloner/preview/:id')
  async servePreview(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      res.status(400).send('Invalid ID');
      return;
    }
    try {
      const filePath = path.resolve(
        process.cwd(),
        'output',
        'cloner',
        id,
        'index.html',
      );

      // Try file on disk first
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.trim().length > 0) {
          res.sendFile(filePath);
          return;
        }
      }

      // Fallback to DB
      const clone = await this.clonerService.getCloneRequest(id);
      if (clone.generatedHtml && clone.generatedHtml.trim().length > 0) {
        res.type('html').send(clone.generatedHtml);
        return;
      }

      res.status(404).send('Preview not available — generated HTML is empty');
    } catch (error) {
      this.logger.error(
        `Failed to serve preview ${id}`,
        (error as Error).message,
      );
      res.status(500).send('Internal Server Error');
    }
  }

  @Get('api/cloner')
  async getCloneRequests() {
    try {
      const clones = await this.clonerService.getCloneRequests();
      return { success: true, data: clones };
    } catch (error) {
      this.logger.error(
        'Failed to get clone requests',
        (error as Error).message,
      );
      return { success: false, error: 'Failed to get clone requests' };
    }
  }

  @Post('api/cloner')
  async createCloneRequest(@Body() dto: CreateCloneDto) {
    try {
      const clone = await this.clonerService.createCloneRequest(dto);
      return { success: true, data: clone };
    } catch (error) {
      this.logger.error(
        'Failed to create clone request',
        (error as Error).message,
      );
      return { success: false, error: 'Failed to create clone request' };
    }
  }

  @Post('api/cloner/:id/retry')
  async retryCloneRequest(@Param('id') id: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      return { success: false, error: 'Invalid ID' };
    }
    try {
      await this.clonerService.retryClone(id);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to retry clone ${id}`, (error as Error).message);
      return { success: false, error: (error as Error).message };
    }
  }

  @Delete('api/cloner/:id')
  async deleteCloneRequest(@Param('id') id: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      return { success: false, error: 'Invalid ID' };
    }
    try {
      await this.clonerService.deleteClone(id);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete clone ${id}`, (error as Error).message);
      return { success: false, error: (error as Error).message };
    }
  }

  @Get('api/cloner/:id')
  async getCloneRequest(@Param('id') id: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) {
      return { success: false, error: 'Invalid ID' };
    }
    try {
      const clone = await this.clonerService.getCloneRequest(id);
      return {
        success: true,
        data: {
          id: clone.id,
          sourceUrl: clone.sourceUrl,
          clientName: clone.clientName,
          businessName: clone.businessName,
          status: clone.status,
          previewUrl: clone.previewUrl,
          createdAt: clone.createdAt,
          completedAt: clone.completedAt,
          errorMessage: clone.errorMessage,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get clone request ${id}`,
        (error as Error).message,
      );
      return { success: false, error: 'Clone request not found' };
    }
  }
}
