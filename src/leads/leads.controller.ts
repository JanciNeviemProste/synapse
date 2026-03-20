import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  Res,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { Lead } from '@prisma/client';
import { LeadsService } from './leads.service';
import { UpdateLeadDto } from './dto/update-lead.dto';

interface AddNoteBody {
  content: string;
}

@Controller()
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);

  constructor(private leadsService: LeadsService) {}

  @Get('/')
  async renderDashboard(@Res() res: Response): Promise<void> {
    try {
      const stats = await this.leadsService.getStats();
      res.render('dashboard', {
        title: 'Dashboard',
        currentPath: '/',
        stats,
      });
    } catch {
      res.render('dashboard', {
        title: 'Dashboard',
        currentPath: '/',
        stats: { total: 0, new: 0, contacted: 0, hot: 0 },
      });
    }
  }

  @Get('leads')
  async renderKanbanBoard(@Res() res: Response): Promise<void> {
    try {
      const leads = await this.leadsService.getLeads();
      res.render('leads/index', {
        title: 'Leads — Kanban',
        leads,
        currentPath: '/leads',
      });
    } catch (error) {
      this.logger.error('Failed to render kanban board', (error as Error).message);
      res.status(500).render('layouts/main', {
        title: 'Error',
        body: '<p>Failed to load leads</p>',
        currentPath: '/leads',
      });
    }
  }

  @Get('leads/stats')
  async renderStatsPage(@Res() res: Response): Promise<void> {
    try {
      const stats = await this.leadsService.getStats();
      res.render('leads/stats', {
        title: 'Leads — Statistiky',
        stats,
        currentPath: '/leads/stats',
      });
    } catch (error) {
      this.logger.error('Failed to render stats page', (error as Error).message);
      res.status(500).render('layouts/main', {
        title: 'Error',
        body: '<p>Failed to load stats</p>',
        currentPath: '/leads/stats',
      });
    }
  }

  @Get('leads/:id')
  async renderLeadDetail(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const lead = await this.leadsService.getLeadById(id);
      if (!lead) {
        throw new NotFoundException(`Lead ${id} not found`);
      }
      const leadData = lead as Lead & { authorName: string };
      res.render('leads/detail', {
        title: `Lead — ${leadData.authorName}`,
        lead,
        currentPath: '/leads',
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).render('layouts/main', {
          title: 'Not Found',
          body: '<p>Lead not found</p>',
          currentPath: '/leads',
        });
        return;
      }
      this.logger.error('Failed to render lead detail', (error as Error).message);
      res.status(500).render('layouts/main', {
        title: 'Error',
        body: '<p>Failed to load lead</p>',
        currentPath: '/leads',
      });
    }
  }

  @Get('api/leads')
  async getLeadsJson(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ): Promise<{ success: boolean; data: unknown }> {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const leads = await this.leadsService.getLeads(status, parsedLimit);
      return { success: true, data: leads };
    } catch (error) {
      this.logger.error('Failed to get leads JSON', (error as Error).message);
      return { success: false, data: [] };
    }
  }

  @Put('api/leads/:id/status')
  async updateLeadStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ): Promise<{ success: boolean; data: unknown }> {
    try {
      const lead = await this.leadsService.updateLeadStatus(id, dto.status);
      if (!lead) {
        throw new NotFoundException(`Lead ${id} not found`);
      }

      if (dto.note) {
        await this.leadsService.addNote(id, dto.note);
      }

      return { success: true, data: lead };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update lead ${id} status`,
        (error as Error).message,
      );
      return { success: false, data: null };
    }
  }

  @Post('api/leads/:id/notes')
  async addNote(
    @Param('id') id: string,
    @Body() body: AddNoteBody,
  ): Promise<{ success: boolean; data: unknown }> {
    try {
      const note = await this.leadsService.addNote(id, body.content);
      if (!note) {
        throw new NotFoundException(`Lead ${id} not found`);
      }
      return { success: true, data: note };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to add note to lead ${id}`,
        (error as Error).message,
      );
      return { success: false, data: null };
    }
  }
}
