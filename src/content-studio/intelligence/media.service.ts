import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';

export interface VideoMetadata {
  durationSeconds?: number;
  width?: number;
  height?: number;
}

/**
 * Media preprocessing via FFmpeg (spec 14.3) — replaceable service.
 * When ffmpeg/ffprobe is not installed, the pipeline degrades: no audio
 * extraction or thumbnails, metadata stays unknown, analysis still runs.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private availability: boolean | null = null;

  private run(cmd: string, args: string[], timeoutMs = 120_000): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      const out: Buffer[] = [];
      const err: Buffer[] = [];
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`${cmd} timed out`));
      }, timeoutMs);
      proc.stdout.on('data', (d: Buffer) => out.push(d));
      proc.stderr.on('data', (d: Buffer) => err.push(d));
      proc.on('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(Buffer.concat(out).toString('utf-8'));
        else
          reject(
            new Error(
              `${cmd} exited ${code}: ${Buffer.concat(err).toString('utf-8').substring(0, 300)}`,
            ),
          );
      });
    });
  }

  async isAvailable(): Promise<boolean> {
    if (this.availability !== null) return this.availability;
    try {
      await this.run('ffprobe', ['-version'], 10_000);
      this.availability = true;
    } catch {
      this.logger.warn('ffprobe/ffmpeg not available — media preprocessing degraded');
      this.availability = false;
    }
    return this.availability;
  }

  async probe(absPath: string): Promise<VideoMetadata> {
    if (!(await this.isAvailable())) return {};
    try {
      const json = await this.run('ffprobe', [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height:format=duration',
        '-of', 'json',
        absPath,
      ]);
      const data = JSON.parse(json) as {
        streams?: { width?: number; height?: number }[];
        format?: { duration?: string };
      };
      return {
        durationSeconds: data.format?.duration
          ? Math.round(parseFloat(data.format.duration) * 10) / 10
          : undefined,
        width: data.streams?.[0]?.width,
        height: data.streams?.[0]?.height,
      };
    } catch (error) {
      this.logger.warn(`ffprobe failed: ${(error as Error).message}`);
      return {};
    }
  }

  /** Extract mono 16kHz mp3 for transcription. Returns false when unavailable. */
  async extractAudio(videoAbsPath: string, audioAbsPath: string): Promise<boolean> {
    if (!(await this.isAvailable())) return false;
    try {
      await this.run('ffmpeg', [
        '-y', '-i', videoAbsPath,
        '-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k',
        audioAbsPath,
      ], 300_000);
      return true;
    } catch (error) {
      this.logger.warn(`audio extraction failed: ${(error as Error).message}`);
      return false;
    }
  }

  async extractThumbnail(videoAbsPath: string, thumbAbsPath: string): Promise<boolean> {
    if (!(await this.isAvailable())) return false;
    try {
      await this.run('ffmpeg', [
        '-y', '-i', videoAbsPath,
        '-ss', '00:00:01', '-frames:v', '1', '-vf', 'scale=480:-1',
        thumbAbsPath,
      ]);
      return true;
    } catch (error) {
      this.logger.warn(`thumbnail extraction failed: ${(error as Error).message}`);
      return false;
    }
  }
}
