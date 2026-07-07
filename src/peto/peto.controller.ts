import { Controller, Get, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import { PetoService } from './peto.service';

/** SSR page for Peťové Studio. Admin-only via the global AuthGuard. */
@Controller('peto')
export class PetoController {
  private readonly logger = new Logger(PetoController.name);

  constructor(private readonly petoService: PetoService) {}

  @Get()
  async index(@Res() res: Response): Promise<void> {
    try {
      const [brand, templates, batches] = await Promise.all([
        this.petoService.getBrand(),
        this.petoService.listTemplates(),
        this.petoService.listBatches(10),
      ]);
      res.render(path.join('peto', 'index'), {
        brand,
        templates,
        starters: this.petoService.starterTemplates(),
        batches,
      });
    } catch (error) {
      this.logger.error('Failed to render Peťové Studio', (error as Error).message);
      res.status(500).send('Internal Server Error');
    }
  }
}
