import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic | null = null;
  private model: string;
  private provider: 'claude-cli' | 'anthropic-api';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('anthropic.apiKey');
    this.model =
      this.configService.get<string>('anthropic.model') ||
      'claude-sonnet-4-20250514';
    const providerSetting =
      this.configService.get<string>('anthropic.provider') || 'auto';

    if (
      providerSetting === 'claude-cli' ||
      (!apiKey && providerSetting === 'auto')
    ) {
      this.provider = 'claude-cli';
      this.logger.log('AI service using Claude Code CLI');
    } else if (apiKey) {
      this.provider = 'anthropic-api';
      this.client = new Anthropic({ apiKey });
      this.logger.log(`AI service using Anthropic API (model: ${this.model})`);
    } else {
      this.provider = 'claude-cli';
      this.logger.warn(
        'ANTHROPIC_API_KEY not set — falling back to Claude Code CLI',
      );
    }
  }

  async generateText(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    if (this.provider === 'claude-cli') {
      return this.callClaudeCli(systemPrompt, userMessage);
    }

    if (!this.client) {
      throw new Error('AI service not initialized — ANTHROPIC_API_KEY missing');
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock?.text || '';
    } catch (error) {
      this.logger.error('AI generation failed', (error as Error).message);
      throw error;
    }
  }

  async generateJson<T = Record<string, unknown>>(
    systemPrompt: string,
    userMessage: string,
  ): Promise<T> {
    const raw = await this.generateText(systemPrompt, userMessage);

    try {
      const cleaned = raw
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(cleaned) as T;
    } catch {
      this.logger.error(
        'Failed to parse AI JSON response',
        raw.substring(0, 200),
      );
      throw new Error('AI returned invalid JSON');
    }
  }

  async analyzeImage(
    systemPrompt: string,
    imageUrl: string,
    userMessage: string,
  ): Promise<string> {
    if (this.provider === 'claude-cli') {
      return this.callClaudeCliWithImage(systemPrompt, imageUrl, userMessage);
    }

    if (!this.client) {
      throw new Error('AI service not initialized');
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: imageUrl } },
              { type: 'text', text: userMessage },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock?.text || '';
    } catch (error) {
      this.logger.error('AI image analysis failed', (error as Error).message);
      throw error;
    }
  }

  // --- Claude Code CLI provider ---

  private runClaude(
    args: string[],
    stdinData?: string,
    timeoutMs = 300_000,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const cmd =
        process.platform === 'win32' ? 'cmd' : 'claude';
      const cmdArgs =
        process.platform === 'win32'
          ? ['/c', 'claude', ...args]
          : args;

      const proc = spawn(cmd, cmdArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        proc.kill();
        reject(new Error('Claude CLI timed out'));
      }, timeoutMs);

      proc.stdout.on('data', (d: Buffer) => chunks.push(d));
      proc.stderr.on('data', (d: Buffer) => errChunks.push(d));

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (killed) return;
        const stdout = Buffer.concat(chunks).toString('utf-8').trim();
        const stderr = Buffer.concat(errChunks).toString('utf-8').trim();

        if (stderr) {
          this.logger.debug(`Claude CLI stderr: ${stderr.substring(0, 500)}`);
        }

        this.logger.debug(
          `Claude CLI finished: code=${code}, stdout=${stdout.length} chars, stderr=${stderr.length} chars`,
        );

        if (code === 0) {
          if (!stdout) {
            reject(
              new Error(
                'Claude CLI exited with code 0 but produced empty stdout — likely a pipe/buffer issue',
              ),
            );
            return;
          }
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Claude CLI exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      if (stdinData) {
        proc.stdin.write(stdinData, (err) => {
          if (err) {
            this.logger.error('Failed to write to Claude CLI stdin', err.message);
            proc.kill();
            reject(new Error(`stdin write failed: ${err.message}`));
            return;
          }
          proc.stdin.end();
        });
      } else {
        proc.stdin.end();
      }
    });
  }

  private async callClaudeCli(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const sysFile = join(tmpdir(), `synapse-sys-${Date.now()}.txt`);

    try {
      this.logger.debug('Calling Claude CLI for text generation');

      await writeFile(sysFile, systemPrompt, 'utf-8');
      const result = await this.runClaude(
        ['-p', '--model', this.model, '--append-system-prompt-file', sysFile],
        userMessage,
        600_000,
      );

      return result;
    } catch (error) {
      this.logger.error(
        'Claude CLI generation failed',
        (error as Error).message,
      );
      throw new Error(`Claude CLI failed: ${(error as Error).message}`);
    } finally {
      await unlink(sysFile).catch(() => {});
    }
  }

  private async callClaudeCliWithImage(
    systemPrompt: string,
    imageUrl: string,
    userMessage: string,
  ): Promise<string> {
    const sysFile = join(tmpdir(), `synapse-sys-${Date.now()}.txt`);
    const imgFile = join(tmpdir(), `synapse-img-${Date.now()}.png`);

    try {
      this.logger.debug('Calling Claude CLI for image analysis');

      await writeFile(sysFile, systemPrompt, 'utf-8');

      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(imgFile, buffer);

      const result = await this.runClaude(
        ['-p', '--model', this.model, '--append-system-prompt-file', sysFile, imgFile],
        userMessage,
        600_000,
      );

      return result;
    } catch (error) {
      this.logger.error(
        'Claude CLI image analysis failed',
        (error as Error).message,
      );
      throw new Error(`Claude CLI image analysis failed: ${(error as Error).message}`);
    } finally {
      await unlink(sysFile).catch(() => {});
      await unlink(imgFile).catch(() => {});
    }
  }
}
