import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { noteInputSchema, noteFields, type Note } from './contracts.js';
import { ApiError, notFound } from './errors.js';
import { transaction } from './database.js';
export function validateDates(data: Partial<Note>) {
  if (data.title !== undefined && !data.title.trim())
    throw new ApiError(400, 'INVALID_TITLE', 'Введите название заметки.');
  if (
    data.dueDate &&
    (Number.isNaN(Date.parse(data.dueDate)) ||
      new Date(data.dueDate).toISOString().slice(0, 10) !== data.dueDate)
  )
    throw new ApiError(400, 'INVALID_DATE', 'Некорректная дата.');
  for (const field of ['startDate', 'deadline'] as const)
    if (data[field]) {
      const value = data[field]!;
      if (
        !Number.isFinite(Date.parse(value)) ||
        new Date(value.slice(0, 10)).toISOString().slice(0, 10) !==
          value.slice(0, 10) ||
        Number(value.slice(11, 13)) > 23
      )
        throw new ApiError(400, 'INVALID_DATE', 'Некорректное время.');
    }
  if (
    data.startDate &&
    data.deadline &&
    Date.parse(data.startDate) > Date.parse(data.deadline)
  )
    throw new ApiError(400, 'INVALID_DATE', 'Начало должно быть до дедлайна.');
  if (data.timeZone)
    try {
      new Intl.DateTimeFormat('en', { timeZone: data.timeZone });
    } catch {
      throw new ApiError(400, 'INVALID_TIMEZONE', 'Некорректный часовой пояс.');
    }
}
export function noteDto(row: any): Note {
  return {
    ...row.data,
    id: row.id,
    audioId: row.audio_id || undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    ...(row.audio_id &&
    Number.isFinite(Number(row.audio_duration)) &&
    !row.audio_expired
      ? {
          audioUrl: `/api/v1/audio/${row.audio_id}/file`,
          audioDuration: Number(row.audio_duration),
        }
      : {}),
  };
}
export async function insertNote(
  client: pg.Pool | pg.PoolClient,
  owner: string,
  data: Partial<Note>,
  legacyId?: string,
  id: string = randomUUID(),
) {
  validateDates(data);
  const { audioId, createdAt, updatedAt, ...content } = data;
  if (content.status === 'completed' && !content.completedAt)
    content.completedAt = createdAt || new Date().toISOString();
  if (
    audioId &&
    !(
      await client.query(
        'SELECT id FROM audio_sources WHERE id=$1 AND owner_id=$2',
        [audioId, owner],
      )
    ).rows.length
  )
    notFound();
  const result = await client.query(
    `INSERT INTO notes(id,owner_id,data,audio_id,legacy_id,created_at,updated_at) VALUES($1,$2,$3,$4,$5,COALESCE($6::timestamptz,now()),COALESCE($7::timestamptz,now()))
    ON CONFLICT(owner_id,legacy_id) DO UPDATE SET legacy_id=EXCLUDED.legacy_id RETURNING *`,
    [
      id,
      owner,
      JSON.stringify(content),
      audioId || null,
      legacyId || null,
      createdAt || null,
      updatedAt || null,
    ],
  );
  return noteDto(
    (
      await client.query(`${select} WHERE n.id=$1 AND n.owner_id=$2`, [
        result.rows[0].id,
        owner,
      ])
    ).rows[0],
  );
}
const select = `SELECT n.*, (a.expired_at IS NOT NULL OR a.expires_at<=now()) AS audio_expired, a.duration_seconds AS audio_duration
 FROM notes n LEFT JOIN audio_sources a ON n.audio_id=a.id AND n.owner_id=a.owner_id`;
export function registerNotes(
  app: FastifyInstance,
  pool: pg.Pool,
  requireUser: (r: FastifyRequest) => Promise<void>,
) {
  app.get(
    '/api/v1/notes',
    {
      preHandler: requireUser,
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 200 },
            offset: { type: 'integer', minimum: 0, maximum: 100000 },
            scheduled: { type: 'string', enum: ['true', 'false'] },
            status: noteFields.status,
            q: { type: 'string', maxLength: 500 },
            sort: {
              type: 'string',
              enum: ['updated', 'title', 'priority', 'schedule'],
            },
          },
        },
      },
    },
    async (request) => {
      const {
        limit = 100,
        offset = 0,
        scheduled,
        status,
        q,
        sort = 'updated',
      } = request.query as {
        limit?: number;
        offset?: number;
        scheduled?: string;
        status?: string;
        q?: string;
        sort?: string;
      };
      const where = `WHERE n.owner_id=$1 AND ($2::text IS NULL OR n.data->>'status'=$2)
      AND ($3::text IS NULL OR n.data::text ILIKE '%'||$3||'%')
      AND ($4::boolean IS NULL OR (COALESCE(n.data->>'dueDate',n.data->>'deadline',n.data->>'startDate',n.data->>'dueTime','')<>'')=$4)`;
      const order =
        sort === 'title'
          ? "n.data->>'title'"
          : sort === 'priority'
            ? "CASE n.data->>'priority' WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END"
            : sort === 'schedule'
              ? "COALESCE(n.data->>'dueDate',n.data->>'deadline','9999')"
              : 'n.updated_at DESC';
      const values = [
        request.ownerId,
        status || null,
        q || null,
        scheduled === undefined ? null : scheduled === 'true',
      ];
      const rows = await pool.query(
        `${select} ${where} ORDER BY ${order},n.id LIMIT $5 OFFSET $6`,
        [...values, limit, offset],
      );
      const total = (
        await pool.query(`SELECT count(*) FROM notes n ${where}`, values)
      ).rows[0].count;
      return {
        notes: rows.rows.map(noteDto),
        total: Number(total),
        offset,
        limit,
      };
    },
  );
  const params = {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  };
  app.get(
    '/api/v1/notes/:id',
    { preHandler: requireUser, schema: { params } },
    async (request) => {
      const row = (
        await pool.query(`${select} WHERE n.id=$1 AND n.owner_id=$2`, [
          (request.params as { id: string }).id,
          request.ownerId,
        ])
      ).rows[0];
      if (!row) notFound();
      return { note: noteDto(row) };
    },
  );
  app.post(
    '/api/v1/notes',
    {
      preHandler: requireUser,
      schema: {
        body: {
          ...noteInputSchema,
          properties: { ...noteFields, id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const data = request.body as Partial<Note>;
      const { id, ...content } = data;
      const note = await transaction(pool, async (client) => {
        await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [
          request.ownerId,
        ]);
        if (id) {
          const existing = (
            await client.query(`${select} WHERE n.id=$1 AND n.owner_id=$2`, [
              id,
              request.ownerId,
            ])
          ).rows[0];
          if (existing) return noteDto(existing);
        }
        if (content.isFocus) {
          await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [
            request.ownerId,
          ]);
          await client.query(
            `UPDATE notes SET data=data||'{"isFocus":false,"isFocused":false}'::jsonb WHERE owner_id=$1`,
            [request.ownerId],
          );
        }
        return insertNote(client, request.ownerId, content, undefined, id);
      });
      return reply.status(201).send({ note });
    },
  );
  app.patch(
    '/api/v1/notes/:id',
    {
      preHandler: requireUser,
      schema: {
        params,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: noteFields,
        },
      },
    },
    async (request) => {
      const id = (request.params as { id: string }).id;
      return transaction(pool, async (client) => {
        await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [
          request.ownerId,
        ]);
        const current = (
          await client.query(
            'SELECT * FROM notes WHERE id=$1 AND owner_id=$2 FOR UPDATE',
            [id, request.ownerId],
          )
        ).rows[0];
        if (!current) notFound();
        const patch = request.body as Partial<Note>;
        const data = { ...current.data, ...patch };
        validateDates(data);
        if (
          patch.audioId &&
          !(
            await client.query(
              'SELECT id FROM audio_sources WHERE id=$1 AND owner_id=$2',
              [patch.audioId, request.ownerId],
            )
          ).rows.length
        )
          notFound();
        if (patch.status) {
          data.completedAt =
            patch.status === 'completed'
              ? data.completedAt || new Date().toISOString()
              : undefined;
          if (['completed', 'archived'].includes(patch.status))
            data.isFocus = data.isFocused = false;
        }
        if (patch.isFocus || patch.isFocused) {
          await client.query(
            `UPDATE notes SET data=data||'{"isFocus":false,"isFocused":false}'::jsonb WHERE owner_id=$1 AND id<>$2`,
            [request.ownerId, id],
          );
          data.isFocus = data.isFocused = true;
          if (data.status === 'todo') data.status = 'in_progress';
        }
        delete data.audioId;
        const row = (
          await client.query(
            'UPDATE notes SET data=$1,audio_id=$2,updated_at=now() WHERE id=$3 AND owner_id=$4 RETURNING *',
            [
              JSON.stringify(data),
              patch.audioId || current.audio_id,
              id,
              request.ownerId,
            ],
          )
        ).rows[0];
        return {
          note: noteDto(
            (
              await client.query(`${select} WHERE n.id=$1 AND n.owner_id=$2`, [
                row.id,
                request.ownerId,
              ])
            ).rows[0],
          ),
        };
      });
    },
  );
  app.delete(
    '/api/v1/notes/:id',
    { preHandler: requireUser, schema: { params } },
    async (request, reply) => {
      const result = await pool.query(
        'DELETE FROM notes WHERE id=$1 AND owner_id=$2',
        [(request.params as { id: string }).id, request.ownerId],
      );
      if (!result.rowCount) notFound();
      return reply.status(204).send();
    },
  );
  const importNoteSchema = {
    ...noteInputSchema,
    properties: {
      ...noteFields,
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      completedAt: { type: 'string', format: 'date-time' },
    },
  };
  app.post(
    '/api/v1/import/notes',
    {
      preHandler: requireUser,
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['notes'],
          properties: {
            notes: {
              type: 'array',
              maxItems: 100,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['legacyId', 'note'],
                properties: {
                  legacyId: { type: 'string', minLength: 1, maxLength: 200 },
                  note: importNoteSchema,
                },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const entries = (
        request.body as { notes: { legacyId: string; note: Note }[] }
      ).notes;
      const notes = await transaction(pool, async (client) => {
        const result = [];
        for (const entry of entries)
          result.push({
            legacyId: entry.legacyId,
            note: await insertNote(
              client,
              request.ownerId,
              entry.note,
              entry.legacyId,
            ),
          });
        return result;
      });
      return { notes, count: notes.length };
    },
  );
}
