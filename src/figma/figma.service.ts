import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FigmaFileResponse {
  name: string;
  lastModified: string;
  document: FigmaNode;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  fills?: FigmaFill[];
  strokes?: FigmaStroke[];
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  style?: Record<string, unknown>;
  characters?: string;
  [key: string]: unknown;
}

interface FigmaFill {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
  imageRef?: string;
}

interface FigmaStroke {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
}

interface FigmaImagesResponse {
  images: Record<string, string>;
}

interface ParsedFigmaUrl {
  fileKey: string;
  nodeId: string | null;
}

@Injectable()
export class FigmaService {
  private readonly logger = new Logger(FigmaService.name);
  private accessToken: string;
  private readonly baseUrl = 'https://api.figma.com/v1';

  constructor(private configService: ConfigService) {
    this.accessToken =
      this.configService.get<string>('figma.accessToken') || '';

    if (!this.accessToken) {
      this.logger.warn('FIGMA_ACCESS_TOKEN not set — Figma service disabled');
    }
  }

  isEnabled(): boolean {
    return !!this.accessToken;
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = 5,
  ): Promise<Response> {
    const delays = [5000, 15000, 30000, 60000, 60000];

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        if (response.status === 429 && attempt < retries) {
          const delay = delays[attempt] || 8000;
          this.logger.warn(
            `Figma API rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return response;
      } catch (error) {
        if (attempt < retries && (error as Error).name === 'AbortError') {
          const delay = delays[attempt] || 8000;
          this.logger.warn(
            `Figma API request timed out, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error('Figma API request failed after all retries');
  }

  async getFileData(
    fileKey: string,
    nodeIds?: string,
  ): Promise<FigmaFileResponse> {
    try {
      let url = `${this.baseUrl}/files/${fileKey}?geometry=paths`;
      if (nodeIds) {
        url += `&ids=${encodeURIComponent(nodeIds)}`;
      }

      const response = await this.fetchWithRetry(url, {
        headers: { 'X-Figma-Token': this.accessToken },
      });

      if (!response.ok) {
        throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as FigmaFileResponse;
      this.logger.log(`Fetched Figma file: ${data.name} (${fileKey})`);
      return data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Figma file ${fileKey}`,
        (error as Error).message,
      );
      throw error;
    }
  }

  async getNodeImages(
    fileKey: string,
    nodeIds: string,
  ): Promise<Record<string, string>> {
    try {
      const url = `${this.baseUrl}/images/${fileKey}?ids=${encodeURIComponent(nodeIds)}&format=png&scale=2`;

      const response = await this.fetchWithRetry(url, {
        headers: { 'X-Figma-Token': this.accessToken },
      });

      if (!response.ok) {
        throw new Error(`Figma images API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as FigmaImagesResponse;
      this.logger.log(
        `Fetched images for ${Object.keys(data.images).length} nodes`,
      );
      return data.images;
    } catch (error) {
      this.logger.error(
        `Failed to fetch node images for ${fileKey}`,
        (error as Error).message,
      );
      throw error;
    }
  }

  parseUrl(figmaUrl: string): ParsedFigmaUrl {
    try {
      const url = new URL(figmaUrl);

      const fileMatch = url.pathname.match(
        /\/(?:file|design)\/([a-zA-Z0-9]+)/,
      );
      if (!fileMatch) {
        throw new Error('Invalid Figma URL — could not extract file key');
      }

      const fileKey = fileMatch[1];

      let nodeId: string | null = null;
      const nodeParam = url.searchParams.get('node-id');
      if (nodeParam) {
        nodeId = decodeURIComponent(nodeParam).replace(/-/g, ':');
      }

      this.logger.debug(
        `Parsed Figma URL: fileKey=${fileKey}, nodeId=${nodeId}`,
      );

      return { fileKey, nodeId };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid Figma URL')) {
        throw error;
      }
      this.logger.error(
        'Failed to parse Figma URL',
        (error as Error).message,
      );
      throw new Error(`Failed to parse Figma URL: ${figmaUrl}`);
    }
  }
}
