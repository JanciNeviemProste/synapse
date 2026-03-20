import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface UnsplashPhoto {
  id: string;
  urls: { raw: string; full: string; regular: string; small: string };
  alt_description: string | null;
  user: { name: string };
}

export interface PhotoResult {
  url: string;
  alt: string;
  source: 'pexels' | 'unsplash';
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private unsplashKey: string;
  private pexelsKey: string;

  constructor(private configService: ConfigService) {
    this.unsplashKey =
      this.configService.get<string>('unsplash.accessKey') || '';
    this.pexelsKey =
      this.configService.get<string>('pexels.apiKey') || '';
  }

  async searchForPrompt(
    description: string,
    count = 8,
  ): Promise<PhotoResult[]> {
    const query = this.extractSearchQuery(description);
    this.logger.debug(`Searching images for: "${query}"`);

    if (this.pexelsKey) {
      const photos = await this.searchPexels(query, count);
      if (photos.length > 0) return photos;
    }

    if (this.unsplashKey) {
      const photos = await this.searchUnsplash(query, count);
      if (photos.length > 0) return photos;
    }

    this.logger.warn('No image API keys configured');
    return [];
  }

  private extractSearchQuery(description: string): string {
    const lower = description.toLowerCase();
    const skToEn: Record<string, string> = {
      'kaviar': 'coffee shop cafe people smiling',
      'káv': 'coffee shop barista people',
      'reštaurác': 'restaurant dining people smiling',
      'hotel': 'hotel luxury resort people',
      'pizz': 'pizza restaurant chef people',
      'kočík': 'baby stroller happy family',
      'čisten': 'cleaning service team people',
      'fitnes': 'fitness gym people workout',
      'kader': 'hair salon barber people portrait',
      'auto': 'car dealership people',
      'kvet': 'flowers florist people smiling',
      'web': 'modern business team people',
      'eshop': 'online store shopping people',
      'e-shop': 'online store shopping people',
      'landing': 'business team professional people',
      'agentúr': 'agency team professional portrait',
      'škol': 'school education students people',
      'lekár': 'doctor medical healthcare people',
      'právn': 'lawyer legal office professional',
    };

    for (const [sk, en] of Object.entries(skToEn)) {
      if (lower.includes(sk)) return en;
    }

    return description.replace(/[^\w\s]/g, '').substring(0, 50) + ' people';
  }

  async searchPexels(
    query: string,
    count = 8,
  ): Promise<PhotoResult[]> {
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
      const response = await fetch(url, {
        headers: { Authorization: this.pexelsKey },
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        photos: Array<{
          src: { large2x: string; large: string };
          alt: string;
        }>;
      };

      return (data.photos || []).map((p) => ({
        url: p.src.large2x || p.src.large,
        alt: p.alt || query,
        source: 'pexels' as const,
      }));
    } catch (error) {
      this.logger.error('Pexels search failed', (error as Error).message);
      return [];
    }
  }

  async searchUnsplash(
    query: string,
    count = 8,
  ): Promise<PhotoResult[]> {
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
      const response = await fetch(url, {
        headers: { Authorization: `Client-ID ${this.unsplashKey}` },
      });

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        results: UnsplashPhoto[];
      };

      return (data.results || []).map((p) => ({
        url: `${p.urls.raw}&w=1200&h=800&fit=crop&q=80`,
        alt: p.alt_description || query,
        source: 'unsplash' as const,
      }));
    } catch (error) {
      this.logger.error('Unsplash search failed', (error as Error).message);
      return [];
    }
  }

  // Legacy method for backward compatibility
  async searchPhotos(query: string, count = 5): Promise<UnsplashPhoto[]> {
    if (!this.unsplashKey) return [];
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
      const response = await fetch(url, {
        headers: { Authorization: `Client-ID ${this.unsplashKey}` },
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    } catch {
      return [];
    }
  }

  getPhotoUrl(photo: UnsplashPhoto, width = 1200, height = 800): string {
    return `${photo.urls.raw}&w=${width}&h=${height}&fit=crop&q=80`;
  }
}
