import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AudioStorage } from './storage.js';
import type { AIProvider, AIContext } from './ai.js';
import { validateStructure } from './ai.js';
import { ApiError, notFound } from './errors.js';
import { transaction } from './database.js';
import { insertNote } from './notes.js';
import type { StructuredNote } from './contracts.js';
import { mediaDuration } from './media.js';
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const RETENTION_MS = 14 * 86400000;
export function detectMime(bytes: Buffer): string {
  if (
    bytes.subarray(0, 4).toString() === 'RIFF' &&
    bytes.subarray(8, 12).toString() === 'WAVE'
  )
    return 'audio/wav';
  if (bytes.subarray(0, 4).toString() === 'OggS') return 'audio/ogg';
  if (bytes.subarray(4, 8).toString() === 'ftyp') return 'audio/mp4';
  if (bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))
    return 'audio/webm';
  if (
    bytes.subarray(0, 3).toString() === 'ID3' ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  )
    return 'audio/mpeg';
  throw new ApiError(
    415,
    'AUDIO_FORMAT',
    'Поддерживаются MP3, M4A, WAV, WebM и OGG.',
  );
}
export async function inspectAudio(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_AUDIO_BYTES)
    throw new ApiError(
      413,
      'AUDIO_SIZE',
      'Максимальный размер аудио — 100 МБ.',
    );
  const mime = detectMime(bytes);
  try {
    const duration = await mediaDuration(bytes);
    if (!duration || !Number.isFinite(duration) || duration <= 0)
      throw new ApiError(
        422,
        'AUDIO_DURATION',
        'Не удалось проверить длительность аудио.',
      );
    if (duration > 7200)
      throw new ApiError(
        422,
        'AUDIO_DURATION',
        'Максимальная длительность — 2 часа.',
      );
    return { mime, duration };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(415, 'AUDIO_FORMAT', 'Повреждённый аудиофайл.');
  }
}
export async function cleanupAudio(
  pool: pg.Pool,
  storage: AudioStorage,
  now = new Date(),
  reportError: (code: string) => void = () => {},
) {
  const rows = await pool.query(
    `SELECT a.* FROM audio_sources a WHERE a.expired_at IS NULL AND a.expires_at<=$1
    AND NOT EXISTS(SELECT 1 FROM audio_jobs j WHERE j.audio_id=a.id AND j.stage IN ('queued','transcribing','analyzing'))`,
    [now],
  );
  let deleted = 0;
  for (const audio of rows.rows) {
    try {
      await storage.remove(audio.file_key);
      await pool.query(
        'UPDATE audio_sources SET expired_at=$1 WHERE id=$2 AND file_key=$3 AND expires_at<=$1 AND expired_at IS NULL',
        [now, audio.id, audio.file_key],
      );
      deleted++;
    } catch {
      reportError('AUDIO_DELETE_FAILED');
    }
  }
  await storage.sweep(
    new Set(
      (
        await pool.query(
          'SELECT file_key FROM audio_sources WHERE expired_at IS NULL',
        )
      ).rows.map((row) => row.file_key),
    ),
    new Date(),
  );
  return deleted;
}
export class AudioWorker {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private stopping = false;
  constructor(
    private pool: pg.Pool,
    private storage: AudioStorage,
    private provider: AIProvider,
    private reportError: (code: string) => void = () => {},
  ) {}
  start() {
    this.timer = setInterval(
      () =>
        void this.tick().catch(() => this.reportError('AUDIO_WORKER_FAILED')),
      2000,
    );
    this.timer.unref();
    void this.tick().catch(() => this.reportError('AUDIO_WORKER_FAILED'));
  }
  async stop() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    while (this.running) await new Promise((r) => setTimeout(r, 50));
  }
  async tick() {
    if (this.running || this.stopping) return;
    this.running = true;
    try {
      const lease = randomUUID();
      const job = await transaction(this.pool, async (client) => {
        const row = (
          await client.query(`SELECT j.*,a.file_key,a.mime_type,a.temporary,a.filename FROM audio_jobs j JOIN audio_sources a ON a.id=j.audio_id
          WHERE j.stage IN ('queued','transcribing','analyzing') AND (j.lease_until IS NULL OR j.lease_until<now())
          ORDER BY j.created_at FOR UPDATE OF j SKIP LOCKED LIMIT 1`)
        ).rows[0];
        if (row)
          await client.query(
            `UPDATE audio_jobs SET stage=$2,lease_until=now()+interval '20 minutes',lease_token=$3 WHERE id=$1`,
            [row.id, row.transcript ? 'analyzing' : 'transcribing', lease],
          );
        return row;
      });
      if (job) await this.process(job, lease);
      await cleanupAudio(this.pool, this.storage, new Date(), this.reportError);
    } finally {
      this.running = false;
    }
  }
  private async process(job: any, lease: string) {
    const heartbeat = setInterval(() => {
      void this.pool
        .query(
          "UPDATE audio_jobs SET lease_until=now()+interval '20 minutes' WHERE id=$1 AND lease_token=$2 AND lease_until>now() AND stage IN ('transcribing','analyzing')",
          [job.id, lease],
        )
        .catch(() => {});
    }, 30000);
    heartbeat.unref();
    try {
      const transcript =
        job.transcript ||
        (await this.provider.transcribe(
          await this.storage.read(job.file_key),
          job.mime_type,
        ));
      if (
        typeof transcript !== 'string' ||
        !transcript.trim() ||
        transcript.length > 500000
      )
        throw new ApiError(
          502,
          'AI_INVALID_RESPONSE',
          'Некорректный транскрипт.',
        );
      if (!job.transcript) {
        const savedTranscript = await this.pool.query(
          "UPDATE audio_jobs SET transcript=$3,stage='analyzing' WHERE id=$1 AND lease_token=$2 AND lease_until>now() AND stage='transcribing'",
          [job.id, lease, transcript],
        );
        if (!savedTranscript.rowCount) return;
      }
      const single = job.temporary
        ? validateStructure(await this.provider.structure(transcript, job.processing_context || {}))
        : null;
      const result = single
        ? { summary: single.description, candidates: [] }
        : await this.provider.analyze(transcript, job.processing_context || {});
      if (
        typeof result.summary !== 'string' ||
        result.summary.length > 100000 ||
        !Array.isArray(result.candidates) ||
        result.candidates.length > 100
      )
        throw new ApiError(
          502,
          'AI_INVALID_RESPONSE',
          'Некорректный анализ аудио.',
        );
      result.candidates = result.candidates.map(validateStructure);
      await transaction(this.pool, async (client) => {
        const claimed = await client.query(
          "SELECT id FROM audio_jobs WHERE id=$1 AND lease_token=$2 AND lease_until>now() AND stage='analyzing' FOR UPDATE",
          [job.id, lease],
        );
        if (!claimed.rows.length) return;
        await insertNote(
          client,
          job.owner_id,
          {
            ...(single
              ? structuredToNote(single)
              : {
                  title: job.filename,
                  description: result.summary,
                  status: 'todo' as const,
                  priority: 'medium' as const,
                  categoryTag: '#Аудио',
                  isFocus: false,
                }),
            transcriptText: transcript,
            audioId: job.audio_id,
          },
          `audio-result:${job.id}`,
        );
        await client.query(
          "UPDATE audio_jobs SET stage='completed',summary=$3,candidates=$4,error=NULL,lease_until=NULL WHERE id=$1 AND lease_token=$2",
          [job.id, lease, result.summary, JSON.stringify(result.candidates)],
        );
      });
    } catch (error) {
      await this.pool.query(
        "UPDATE audio_jobs SET stage='error',error=$3,lease_until=NULL WHERE id=$1 AND lease_token=$2 AND lease_until>now() AND stage IN ('transcribing','analyzing')",
        [
          job.id,
          lease,
          error instanceof ApiError ? error.code : 'AUDIO_PROCESSING_FAILED',
        ],
      );
    } finally {
      clearInterval(heartbeat);
      if (job.temporary) {
        const expired = await this.pool.query(
          `UPDATE audio_sources SET expires_at=now() WHERE id=$1 AND EXISTS(
            SELECT 1 FROM audio_jobs WHERE id=$2 AND lease_token=$3 AND stage IN ('completed','error'))`,
          [job.audio_id, job.id, lease],
        );
        if (expired.rowCount)
          await cleanupAudio(
            this.pool,
            this.storage,
            new Date(),
            this.reportError,
          );
      }
    }
  }
}
export function registerAudio(
  app: FastifyInstance,
  pool: pg.Pool,
  storage: AudioStorage,
  requireUser: (r: FastifyRequest) => Promise<void>,
  requireMediaUser: (r: FastifyRequest) => Promise<void>,
) {
  const getJob = async (id: string, owner: string) => {
    const row = (
      await pool.query(
        `SELECT j.*,a.filename FROM audio_jobs j JOIN audio_sources a ON a.id=j.audio_id WHERE j.id=$1 AND j.owner_id=$2`,
        [id, owner],
      )
    ).rows[0];
    if (!row) notFound();
    return jobDto(row);
  };
  app.post(
    '/api/v1/audio/upload',
    {
      preHandler: requireUser,
      bodyLimit: MAX_AUDIO_BYTES + 100000,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const file = await request.file();
      if (!file)
        throw new ApiError(400, 'AUDIO_REQUIRED', 'Выберите аудиофайл.');
      const bytes = await file.toBuffer();
      if (file.file.truncated)
        throw new ApiError(413, 'AUDIO_SIZE', 'Максимальный размер — 100 МБ.');
      const { mime, duration } = await inspectAudio(bytes);
      const fields = file.fields as Record<string, { value?: unknown }>;
      const temporary = fields.temporary?.value === 'true';
      const mode = fields.mode?.value ?? 'fast';
      const style = fields.style?.value ?? 'concise';
      const currentIsoDate = fields.currentIsoDate?.value;
      const timeZone = fields.timeZone?.value;
      if (!['fast', 'deep'].includes(String(mode)) || !['concise', 'detailed', 'action_plan'].includes(String(style)))
        throw new ApiError(400, 'AI_OPTIONS', 'Некорректные параметры обработки.');
      if (currentIsoDate !== undefined && (typeof currentIsoDate !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(currentIsoDate) || !Number.isFinite(Date.parse(currentIsoDate))))
        throw new ApiError(400, 'AI_OPTIONS', 'Некорректная дата обработки.');
      if (timeZone !== undefined) {
        try {
          if (typeof timeZone !== 'string' || timeZone.length > 100) throw new Error();
          new Intl.DateTimeFormat('en', { timeZone });
        } catch { throw new ApiError(400, 'AI_OPTIONS', 'Некорректный часовой пояс.'); }
      }
      const context: AIContext = { mode: mode as AIContext['mode'], style: style as AIContext['style'], currentIsoDate: currentIsoDate as string | undefined, timeZone: timeZone as string | undefined };
      const legacyId =
        typeof fields.legacyId?.value === 'string'
          ? fields.legacyId.value
          : undefined;
      if (legacyId && legacyId.length > 200)
        throw new ApiError(400, 'LEGACY_ID', 'Некорректный ID импорта.');
      const key = await storage.write(bytes);
      const audioId = randomUUID(),
        jobId = randomUUID();
      let previousKey: string | undefined;
      let retainedNewFile = false;
      let storedAudioId = audioId;
      try {
        await transaction(pool, async (client) => {
          await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [
            request.ownerId,
          ]);
          if (legacyId) {
            const previous = (
              await client.query(
                'SELECT id,file_key,expires_at,expired_at FROM audio_sources WHERE owner_id=$1 AND legacy_id=$2 FOR UPDATE',
                [request.ownerId, legacyId],
              )
            ).rows[0];
            if (previous) {
              storedAudioId = previous.id;
              if (previous.expired_at || new Date(previous.expires_at).getTime() <= Date.now()) {
                await client.query(
                  `UPDATE audio_sources SET file_key=$3,filename=$4,mime_type=$5,size_bytes=$6,duration_seconds=$7,
                   temporary=$8,expires_at=date_trunc('milliseconds',now())+interval '14 days',expired_at=NULL
                   WHERE id=$1 AND owner_id=$2`,
                  [previous.id, request.ownerId, key, file.filename.slice(0, 255), mime, bytes.length, duration, temporary],
                );
                previousKey = previous.file_key;
                retainedNewFile = true;
              } else {
                await client.query(
                  `UPDATE audio_sources SET expires_at=date_trunc('milliseconds',now())+interval '14 days'
                   WHERE id=$1 AND owner_id=$2`,
                  [previous.id, request.ownerId],
                );
              }
              return;
            }
          }
          if (!legacyId) {
            const pending = await client.query(
              "SELECT count(*) FROM audio_jobs WHERE owner_id=$1 AND stage IN ('queued','transcribing','analyzing')",
              [request.ownerId],
            );
            if (Number(pending.rows[0].count) >= 3)
              throw new ApiError(
                429,
                'AUDIO_QUEUE_FULL',
                'Дождитесь обработки предыдущих файлов.',
              );
          }
          await client.query(
            `INSERT INTO audio_sources(id,owner_id,file_key,filename,mime_type,size_bytes,duration_seconds,temporary,expires_at,legacy_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,date_trunc('milliseconds',now())+interval '14 days',$9)`,
            [
              audioId,
              request.ownerId,
              key,
              file.filename.slice(0, 255),
              mime,
              bytes.length,
              duration,
              temporary,
              legacyId || null,
            ],
          );
          if (!legacyId)
            await client.query(
              "INSERT INTO audio_jobs(id,owner_id,audio_id,stage,processing_context) VALUES($1,$2,$3,'queued',$4)",
              [jobId, request.ownerId, audioId, JSON.stringify(context)],
            );
          retainedNewFile = true;
        });
      } catch (error) {
        await storage.remove(key);
        throw error;
      }
      if (!retainedNewFile) await storage.remove(key);
      if (previousKey) await storage.remove(previousKey).catch(() => reportError('AUDIO_DELETE_FAILED'));
      return reply
        .status(201)
        .send(
          legacyId
            ? { audioId: storedAudioId }
            : { job: await getJob(jobId, request.ownerId) },
        );
    },
  );
  app.get(
    '/api/v1/audio/jobs',
    { preHandler: requireUser },
    async (request) => ({
      jobs: (
        await pool.query(
          "SELECT j.*,a.filename FROM audio_jobs j JOIN audio_sources a ON a.id=j.audio_id WHERE j.owner_id=$1 ORDER BY CASE WHEN j.stage IN ('queued','transcribing','analyzing') THEN 0 ELSE 1 END,j.created_at DESC LIMIT 100",
          [request.ownerId],
        )
      ).rows.map(jobDto),
    }),
  );
  const params = {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  };
  app.get(
    '/api/v1/audio/jobs/:id',
    { preHandler: requireUser, schema: { params } },
    async (request) => ({
      job: await getJob((request.params as { id: string }).id, request.ownerId),
    }),
  );
  app.post(
    '/api/v1/audio/jobs/:id/retry',
    { preHandler: requireUser, schema: { params } },
    async (request) => {
      const id = (request.params as { id: string }).id;
      const result = await pool.query(
        `UPDATE audio_jobs j SET stage=CASE WHEN transcript='' THEN 'queued' ELSE 'analyzing' END,error=NULL,lease_until=NULL,lease_token=NULL
      FROM audio_sources a WHERE j.audio_id=a.id AND j.id=$1 AND j.owner_id=$2 AND j.stage='error' AND (a.expired_at IS NULL OR j.transcript<>'') RETURNING j.id`,
        [id, request.ownerId],
      );
      if (!result.rowCount)
        throw new ApiError(
          409,
          'RETRY_UNAVAILABLE',
          'Исходник недоступен или обработка уже запущена.',
        );
      return { job: await getJob(id, request.ownerId) };
    },
  );
  app.post(
    '/api/v1/audio/jobs/:id/approve',
    {
      preHandler: requireUser,
      schema: {
        params,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['candidates'],
          properties: {
            candidates: {
              type: 'array',
              maxItems: 100,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['index', 'note'],
                properties: {
                  index: { type: 'integer', minimum: 0 },
                  note: structuredSchemaForApproval(),
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const id = (request.params as { id: string }).id;
      return transaction(pool, async (client) => {
        const job = (
          await client.query(
            'SELECT * FROM audio_jobs WHERE id=$1 AND owner_id=$2 FOR UPDATE',
            [id, request.ownerId],
          )
        ).rows[0];
        if (!job) notFound();
        if (job.approved_at) return { ids: job.approved_ids };
        if (job.stage !== 'completed')
          throw new ApiError(409, 'JOB_NOT_READY', 'Обработка не завершена.');
        const candidates = (
          request.body as {
            candidates: { index: number; note: StructuredNote }[];
          }
        ).candidates;
        if (
          new Set(candidates.map((c) => c.index)).size !== candidates.length ||
          candidates.some((c) => !job.candidates[c.index])
        )
          throw new ApiError(
            400,
            'INVALID_CANDIDATES',
            'Некорректный выбор действий.',
          );
        const ids = [];
        for (const candidate of candidates) {
          const note = validateStructure(candidate.note);
          const created = await insertNote(
            client,
            request.ownerId,
            structuredToNote(note),
            `audio-candidate:${id}:${candidate.index}`,
          );
          ids.push(created.id);
        }
        await client.query(
          'UPDATE audio_jobs SET approved_at=now(),approved_ids=$2 WHERE id=$1',
          [id, JSON.stringify(ids)],
        );
        return { ids };
      });
    },
  );
  app.get(
    '/api/v1/audio/:id',
    { preHandler: requireUser, schema: { params } },
    async (request) => {
      const row = (
        await pool.query(
          'SELECT id,filename,mime_type,duration_seconds,expires_at,expired_at FROM audio_sources WHERE id=$1 AND owner_id=$2',
          [(request.params as { id: string }).id, request.ownerId],
        )
      ).rows[0];
      if (!row) notFound();
      return {
        audio: {
          id: row.id,
          filename: row.filename,
          mimeType: row.mime_type,
          duration: Number(row.duration_seconds),
          expiresAt: new Date(row.expires_at).toISOString(),
          expired:
            Boolean(row.expired_at) ||
            new Date(row.expires_at).getTime() <= Date.now(),
        },
      };
    },
  );
  app.get(
    '/api/v1/audio/:id/file',
    { preHandler: requireMediaUser, schema: { params } },
    async (request, reply) => {
      const audio = (
        await pool.query(
          'SELECT * FROM audio_sources WHERE id=$1 AND owner_id=$2',
          [(request.params as { id: string }).id, request.ownerId],
        )
      ).rows[0];
      if (!audio) notFound();
      if (audio.expired_at || Date.parse(audio.expires_at) <= Date.now())
        throw new ApiError(410, 'AUDIO_EXPIRED', 'Срок хранения аудио истёк.');
      const size = Number(audio.size_bytes);
      reply
        .header('Content-Type', audio.mime_type)
        .header('Accept-Ranges', 'bytes')
        .header('Cache-Control', 'private, no-store')
        .header('X-Content-Type-Options', 'nosniff');
      let start = 0,
        end = size - 1;
      if (request.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        if (!match || (!match[1] && !match[2]))
          return reply
            .code(416)
            .header('Content-Range', `bytes */${size}`)
            .send();
        if (!match[1]) start = Math.max(0, size - Number(match[2]));
        else {
          start = Number(match[1]);
          end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        }
        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start > end ||
          start >= size
        )
          return reply
            .code(416)
            .header('Content-Range', `bytes */${size}`)
            .send();
        reply
          .code(206)
          .header('Content-Range', `bytes ${start}-${end}/${size}`);
      }
      reply.header('Content-Length', end - start + 1);
      try {
        return reply.send(await storage.stream(audio.file_key, start, end));
      } catch {
        throw new ApiError(410, 'AUDIO_UNAVAILABLE', 'Исходник недоступен.');
      }
    },
  );
}
import { structuredSchema } from './contracts.js';
function structuredSchemaForApproval() {
  return structuredSchema;
}
export function structuredToNote(note: StructuredNote) {
  return {
    title: note.title,
    description: note.description,
    ...(note.due_date?.includes('T')
      ? { deadline: note.due_date }
      : { dueDate: note.due_date }),
    startDate: note.start_date,
    estimatedMinutes: note.estimated_minutes,
    deadline:
      note.deadline ||
      (note.due_date?.includes('T') ? note.due_date : undefined),
    status: 'todo' as const,
    priority: note.priority,
    categoryTag: note.category_tag,
    isFocus: false,
    checklist: note.checklist?.map((text, index) => ({
      id: randomUUID(),
      text,
      isCompleted: false,
      sortOrder: index + 1,
    })),
  };
}
function jobDto(row: any) {
  return {
    id: row.id,
    audioId: row.audio_id,
    filename: row.filename,
    stage: row.stage,
    transcript: row.transcript,
    summary: row.summary,
    candidates: row.candidates,
    error: row.error || undefined,
    approvedAt: row.approved_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}
