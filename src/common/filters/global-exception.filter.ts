import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Map raw provider/DB error messages to clean HTTP responses so users never
 * see a bare 500 with a technical string. Centralised here so it applies to
 * every controller (Content Studio, Peťo, everything), not just the ones with
 * explicit try/catch. Pure — unit tested.
 */
export function mapKnownError(
  raw: string,
): { status: HttpStatus; message: string } | null {
  const m = raw || '';
  // Prisma "record not found" (e.g. deleting an already-deleted row)
  if (m.includes('P2025') || m.includes('No record was found')) {
    return { status: HttpStatus.NOT_FOUND, message: 'Záznam neexistuje.' };
  }
  // AI provider rejected the API key
  if (
    /401/.test(m) &&
    (m.includes('OpenRouter') || m.includes('Transcription API') || m.includes('API error'))
  ) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message:
        'AI služba odmietla API kľúč (401). Skontroluj kľúč v .env (OPENROUTER_API_KEY / GROQ_API_KEY) a reštartuj server.',
    };
  }
  // AI provider overloaded / rate limited
  if (/\b429\b/.test(m) && (m.includes('OpenRouter') || m.includes('API error'))) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'AI služba je momentálne preťažená (429). Skús to o chvíľu.',
    };
  }
  // AI returned unparseable output
  if (m.includes('AI output is not valid JSON') || m.includes('AI returned invalid JSON') || m.includes('failed schema validation')) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'AI vrátila neplatný výstup. Skús generovať znova.',
    };
  }
  // No AI backend configured at all
  if (m.includes('AI service not initialized') || m.includes('OPENROUTER_API_KEY missing')) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'AI nie je nakonfigurovaná — chýba API kľúč v .env.',
    };
  }
  return null;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>).message as string || message;
    } else if (exception instanceof Error) {
      const mapped = mapKnownError(exception.message);
      if (mapped) {
        status = mapped.status;
        message = mapped.message;
        this.logger.warn(`Handled provider/DB error → ${status}: ${exception.message}`);
      } else {
        message = exception.message;
        this.logger.error(
          `Unhandled exception: ${exception.message}`,
          exception.stack,
        );
      }
    }

    const isApiRequest = request.path.startsWith('/api/');

    // Browser hitting a protected page without auth → send to login instead of a bare 401.
    if (status === HttpStatus.UNAUTHORIZED && !isApiRequest) {
      response.redirect(
        302,
        `/login?next=${encodeURIComponent(request.originalUrl)}`,
      );
      return;
    }

    if (isApiRequest) {
      response.status(status).json({
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      response.status(status).render('layouts/main', {
        title: `Error ${status}`,
        body: `<div class="flex items-center justify-center min-h-[60vh]">
          <div class="text-center">
            <h1 class="text-6xl font-bold text-gray-300">${status}</h1>
            <p class="mt-4 text-xl text-gray-600">${message}</p>
            <a href="/" class="mt-6 inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Back to Dashboard
            </a>
          </div>
        </div>`,
        currentPath: request.path,
      });
    }
  }
}
