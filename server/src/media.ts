import { createRequire } from 'node:module';
import { mkdtemp, writeFile, readFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ApiError } from './errors.js';
const require = createRequire(import.meta.url);
const ffmpeg = process.env.FFMPEG_PATH || (require('ffmpeg-static') as string);
const ffprobe =
  process.env.FFPROBE_PATH || (require('ffprobe-static').path as string);
const execute = promisify(execFile);
async function withMedia<T>(
  bytes: Buffer,
  fn: (input: string, output: string) => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'voicenotes-media-'));
  const input = join(dir, 'input'),
    output = join(dir, 'output.ogg');
  try {
    await writeFile(input, bytes, { mode: 0o600 });
    return await fn(input, output);
  } finally {
    await unlink(input).catch(() => {});
    await unlink(output).catch(() => {});
    await rmdir(dir).catch(() => {});
  }
}
export async function mediaDuration(bytes: Buffer): Promise<number> {
  try {
    return await withMedia(bytes, async (input) => {
      const { stdout } = await execute(
        ffprobe,
        [
          '-v',
          'error',
          '-protocol_whitelist',
          'file,pipe',
          '-show_entries',
          'format=duration:stream=codec_type,duration',
          '-of',
          'json',
          input,
        ],
        { timeout: 30000, maxBuffer: 100000, windowsHide: true },
      );
      const info = JSON.parse(stdout);
      if (
        !info.streams?.some((stream: any) => stream.codec_type === 'audio') ||
        info.streams?.some((stream: any) => stream.codec_type === 'video')
      )
        throw new Error();
      let duration =
        Number(info.format?.duration) ||
        Math.max(
          ...info.streams.map((stream: any) => Number(stream.duration) || 0),
        );
      if (!Number.isFinite(duration) || duration <= 0) {
        const { stdout } = await execute(
          ffmpeg,
          [
            '-v',
            'error',
            '-nostdin',
            '-protocol_whitelist',
            'file,pipe',
            '-i',
            input,
            '-map',
            '0:a:0',
            '-progress',
            'pipe:1',
            '-f',
            'null',
            '-',
          ],
          { timeout: 60000, maxBuffer: 1000000, windowsHide: true },
        );
        const times = [...stdout.matchAll(/out_time_us=(\d+)/g)].map(
          (match) => Number(match[1]) / 1000000,
        );
        duration = Math.max(...times);
      }
      if (!Number.isFinite(duration) || duration <= 0) throw new Error();
      return duration;
    });
  } catch {
    throw new ApiError(
      422,
      'AUDIO_DURATION',
      'Не удалось проверить длительность аудио.',
    );
  }
}
export async function speechKitAudio(bytes: Buffer): Promise<Buffer> {
  try {
    return await withMedia(bytes, async (input, output) => {
      await execute(
        ffmpeg,
        [
          '-v',
          'error',
          '-nostdin',
          '-protocol_whitelist',
          'file,pipe',
          '-i',
          input,
          '-vn',
          '-ac',
          '1',
          '-ar',
          '48000',
          '-c:a',
          'libopus',
          '-b:a',
          '32k',
          output,
        ],
        { timeout: 180000, maxBuffer: 100000, windowsHide: true },
      );
      return readFile(output);
    });
  } catch {
    throw new ApiError(
      422,
      'AUDIO_CONVERSION',
      'Не удалось преобразовать аудиофайл.',
    );
  }
}
