import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';

export type StorageCategory = 'audio' | 'video' | 'frames' | 'thumbnails' | 'transcripts';

const ALLOWED_MIME: Record<StorageCategory, string[]> = {
  audio: ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp3', 'audio/m4a', 'audio/x-m4a'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  frames: ['image/png', 'image/jpeg'],
  thumbnails: ['image/png', 'image/jpeg'],
  transcripts: ['text/plain', 'application/json'],
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a',
  'audio/m4a': 'm4a', 'audio/x-m4a': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
  'audio/ogg': 'ogg', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'image/png': 'png', 'image/jpeg': 'jpg', 'text/plain': 'txt', 'application/json': 'json',
};

/**
 * Private local-disk storage (spec §25, adapted per ADR 2026-07-06).
 * Files live outside the web roots (`output/`, `public/`) so nothing here
 * is ever served publicly. Filenames are generated — user input never
 * touches the path.
 */
@Injectable()
export class ContentStorageService {
  private readonly logger = new Logger(ContentStorageService.name);
  private readonly rootDir: string;

  constructor(private readonly configService: ConfigService) {
    this.rootDir = resolve(
      process.cwd(),
      this.configService.get<string>('contentStudio.storageDir') ||
        'storage/content-studio',
    );
  }

  validate(category: StorageCategory, mimeType: string, sizeBytes: number): string | null {
    // Browsers record as e.g. "audio/webm;codecs=opus" — compare the base type only.
    const baseType = (mimeType || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_MIME[category].includes(baseType)) {
      return `Nepodporovaný typ súboru: ${mimeType}`;
    }
    const maxMb =
      category === 'video'
        ? this.configService.get<number>('contentStudio.maxVideoSizeMb') || 300
        : this.configService.get<number>('contentStudio.maxAudioSizeMb') || 50;
    if (sizeBytes > maxMb * 1024 * 1024) {
      return `Súbor je príliš veľký (max ${maxMb} MB)`;
    }
    return null;
  }

  async save(
    category: StorageCategory,
    mimeType: string,
    data: Buffer,
  ): Promise<{ storagePath: string; sizeBytes: number }> {
    const error = this.validate(category, mimeType, data.length);
    if (error) {
      throw new Error(error);
    }
    const baseType = mimeType.split(';')[0].trim().toLowerCase();
    const ext = EXTENSION_BY_MIME[baseType] || 'bin';
    const relPath = join(category, `${randomUUID()}.${ext}`);
    const absPath = join(this.rootDir, relPath);
    await mkdir(join(this.rootDir, category), { recursive: true });
    await writeFile(absPath, data);
    this.logger.log(`stored ${category} file ${relPath} (${data.length} B)`);
    return { storagePath: relPath, sizeBytes: data.length };
  }

  /** Absolute path for tooling (ffmpeg). Validated against the storage root. */
  absolutePath(storagePath: string): string {
    return this.toAbsolute(storagePath);
  }

  private toAbsolute(storagePath: string): string {
    const abs = resolve(this.rootDir, storagePath);
    // Must be the root itself or strictly inside it — a bare startsWith would
    // also accept a sibling dir sharing the prefix (…/content-studio-evil).
    if (abs !== this.rootDir && !abs.startsWith(this.rootDir + sep)) {
      throw new Error('Invalid storage path');
    }
    return abs;
  }

  async read(storagePath: string): Promise<Buffer> {
    return readFile(this.toAbsolute(storagePath));
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      await stat(this.toAbsolute(storagePath));
      return true;
    } catch {
      return false;
    }
  }

  async delete(storagePath: string): Promise<void> {
    try {
      await unlink(this.toAbsolute(storagePath));
      this.logger.log(`deleted stored file ${storagePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
