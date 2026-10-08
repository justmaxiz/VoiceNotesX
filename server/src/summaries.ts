import { randomUUID, createHash } from "node:crypto";
import type pg from "pg";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { transaction } from "./database.js";
import { noteDto } from "./notes.js";
import { ApiError, notFound } from "./errors.js";
import type { AIProvider } from "./ai.js";
import {
  normalizePeriod,
  localParts,
  localInstant,
  addDays,
  presetPeriod,
  summaryPeriodSchema,
  summarySettingsSchema,
  type SummaryPeriod,
  type SummaryReport,
  type SummaryJob,
  type SummarySettings,
} from "./summaryContracts.js";
import {
  buildSummaryContext,
  factualSummary,
  periodKey,
  defaultSummaryLimits,
  SUMMARY_VERSION,
  type SummaryContext,
  type SummaryLimits,
} from "./summaryFacts.js";
import { validateSummary } from "./summaryAI.js";

export const summaryJob = (row: any): SummaryJob => ({
  id: row.id,
  stage: row.stage,
  attempts: row.attempts,
  ...(row.error ? { error: row.error } : {}),
  ...(row.report_id ? { reportId: row.report_id } : {}),
});
const settingsDto = (r: any): SummarySettings =>
  r
    ? {
        enabled: r.enabled,
        timeZone: r.time_zone,
        localTime: r.local_time,
        version: r.version,
        nextRun: new Date(r.next_run).toISOString(),
      }
    : {
        enabled: false,
        timeZone: null,
        localTime: "21:00",
        version: 0,
        nextRun: null,
      };
export function nextSummaryRun(
  now: Date,
  timeZone: string,
  time: string,
): Date {
  const date = localParts(now, timeZone).date;
  const today = localInstant(date, time, timeZone);
  return new Date(
    today > +now ? today : localInstant(addDays(date, 1), time, timeZone),
  );
}
export class SummaryService {
  constructor(
    public pool: pg.Pool,
    public provider: AIProvider,
    public limits: SummaryLimits = defaultSummaryLimits,
    public clock = () => new Date(),
    public modelVersion = SUMMARY_VERSION,
  ) {}
  period(value: SummaryPeriod) {
    try {
      return normalizePeriod(value, this.limits.maxDays);
    } catch {
      throw new ApiError(
        400,
        "SUMMARY_PERIOD",
        "Проверьте даты, диапазон и часовой пояс.",
      );
    }
  }
  async snapshot(
    client: pg.PoolClient,
    owner: string,
    p: SummaryPeriod,
    now = this.clock(),
  ) {
    // Projection excludes transcript/audio even before mapping. No API pagination cap.
    const rows = await client.query(
      `SELECT id, data - 'transcriptText' AS data,created_at,updated_at FROM notes WHERE owner_id=$1 ORDER BY id`,
      [owner],
    );
    const context = buildSummaryContext(
      rows.rows.map(noteDto),
      p,
      now,
      this.limits,
    );
    context.sourceFingerprint = createHash("sha256")
      .update(`${context.sourceFingerprint}:${this.modelVersion}`)
      .digest("hex");
    return context;
  }
  async facts(owner: string, input: SummaryPeriod) {
    const p = this.period(input);
    return transaction(this.pool, async (client) => {
      await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
      const c = await this.snapshot(client, owner, p);
      const rows = await client.query(
        `SELECT r.report FROM summary_slots s JOIN summary_reports r ON r.id=s.latest_id AND r.owner_id=s.owner_id WHERE s.owner_id=$1 AND s.slot_key=$2`,
        [owner, periodKey(p)],
      );
      const report = rows.rows[0]?.report as SummaryReport | undefined;
      if (report) {
        report.freshness =
          report.sourceFingerprint !== c.sourceFingerprint
            ? "stale"
            : p.endDateExclusive <= localParts(this.clock(), p.timeZone).date
              ? "historical_snapshot"
              : "current";
        const available = new Set(
          (
            await client.query("SELECT id FROM notes WHERE owner_id=$1", [
              owner,
            ])
          ).rows.map((r) => r.id),
        );
        report.sources.forEach((s) => (s.available = available.has(s.id)));
      }
      return {
        period: p,
        asOf: c.asOf,
        metrics: c.metrics,
        facts: c.facts,
        coverage: c.coverage,
        sourceFingerprint: c.sourceFingerprint,
        report: report || null,
      };
    });
  }
  async enqueue(
    owner: string,
    input: SummaryPeriod,
    trigger: "manual" | "scheduled" = "manual",
  ) {
    const p = this.period(input);
    return transaction(this.pool, async (client) => {
      // Serialize owner enqueue across processes; budget checks and UNIQUE are in the same transaction.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `summary-owner:${owner}`,
      ]);
      const c = await this.snapshot(client, owner, p);
      const key = periodKey(p);
      const cached = (
        await client.query(
          `SELECT report FROM summary_reports WHERE owner_id=$1 AND slot_key=$2 AND fingerprint=$3 AND report->>'generationMode' IN ('ai','empty') ORDER BY version DESC LIMIT 1`,
          [owner, key, c.sourceFingerprint],
        )
      ).rows[0]?.report as SummaryReport | undefined;
      if (cached) {
        await client.query(
          "UPDATE summary_slots SET latest_id=$3 WHERE owner_id=$1 AND slot_key=$2",
          [owner, key, cached.id],
        );
        cached.freshness =
          p.endDateExclusive <= localParts(this.clock(), p.timeZone).date
            ? "historical_snapshot"
            : "current";
        return {
          job: {
            id: cached.id,
            stage: "completed" as const,
            attempts: 0,
            reportId: cached.id,
          },
          report: cached,
        };
      }
      const existing = (
        await client.query(
          "SELECT * FROM summary_jobs WHERE owner_id=$1 AND slot_key=$2 AND fingerprint=$3",
          [owner, key, c.sourceFingerprint],
        )
      ).rows[0];
      const checkBudget = async () => {
        const budget = await client.query(
          `SELECT COALESCE(sum(GREATEST(attempts + CASE WHEN stage='queued' THEN 1 ELSE 0 END,1)),0) AS count FROM summary_jobs WHERE owner_id=$1 AND created_at > now()-interval '1 hour'`,
          [owner],
        );
        if (Number(budget.rows[0].count) >= this.limits.maxPerHour)
          throw new ApiError(
            429,
            "SUMMARY_RATE_LIMIT",
            "Лимит сводок: повторите через час.",
          );
      };
      if (existing) {
        if (
          trigger === "manual" &&
          existing.stage === "error" &&
          (existing.attempts < 2 ||
            new Date(existing.created_at).getTime() <= Date.now() - 3600000)
        ) {
          await checkBudget();
          const retry = await client.query(
            `UPDATE summary_jobs SET stage='queued',attempts=$4,error=NULL,report_id=NULL,context=$3,next_attempt=now(),created_at=now(),lease_until=NULL,lease_token=NULL WHERE id=$1 AND owner_id=$2 RETURNING *`,
            [existing.id, owner, c, existing.attempts >= 2 ? 0 : existing.attempts],
          );
          return { job: summaryJob(retry.rows[0]), report: null };
        }
        const report = existing.report_id
          ? (
              await client.query(
                "SELECT report FROM summary_reports WHERE owner_id=$1 AND id=$2",
                [owner, existing.report_id],
              )
            ).rows[0]?.report
          : null;
        return {
          job: summaryJob(existing),
          report: report as SummaryReport | null,
        };
      }
      await checkBudget();
      await client.query(
        "INSERT INTO summary_slots(owner_id,slot_key,period) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [owner, key, p],
      );
      const job = await client.query(
        `INSERT INTO summary_jobs(id,owner_id,slot_key,fingerprint,period,context,trigger) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [randomUUID(), owner, key, c.sourceFingerprint, p, c, trigger],
      );
      return { job: summaryJob(job.rows[0]), report: null };
    });
  }
  async report(owner: string, id: string) {
    const row = (
      await this.pool.query(
        "SELECT report FROM summary_reports WHERE id=$1 AND owner_id=$2",
        [id, owner],
      )
    ).rows[0];
    if (!row) return notFound();
    const r: SummaryReport = row.report;
    const current = await this.facts(owner, r.period);
    r.freshness =
      current.sourceFingerprint === r.sourceFingerprint
        ? r.period.endDateExclusive <=
          localParts(this.clock(), r.period.timeZone).date
          ? "historical_snapshot"
          : "current"
        : "stale";
    const available = new Set(
      (
        await this.pool.query("SELECT id FROM notes WHERE owner_id=$1", [owner])
      ).rows.map((n) => n.id),
    );
    r.sources.forEach((s) => (s.available = available.has(s.id)));
    return r;
  }
  async settings(owner: string) {
    return settingsDto(
      (
        await this.pool.query(
          "SELECT * FROM summary_settings WHERE owner_id=$1",
          [owner],
        )
      ).rows[0],
    );
  }
  async saveSettings(
    owner: string,
    patch: Partial<SummarySettings> & { initialize?: boolean },
  ) {
    return transaction(this.pool, async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `summary-settings:${owner}`,
      ]);
      const row = (
        await client.query(
          "SELECT * FROM summary_settings WHERE owner_id=$1 FOR UPDATE",
          [owner],
        )
      ).rows[0];
      if (patch.initialize && row) return settingsDto(row);
      const zone = patch.timeZone || row?.time_zone;
      if (!zone)
        throw new ApiError(
          400,
          "SUMMARY_TIMEZONE",
          "Укажите часовой пояс для вечерних сводок.",
        );
      try {
        new Intl.DateTimeFormat("en", { timeZone: zone });
      } catch {
        throw new ApiError(
          400,
          "SUMMARY_TIMEZONE",
          "Некорректный часовой пояс.",
        );
      }
      const time = patch.localTime || row?.local_time || "21:00";
      const next = nextSummaryRun(this.clock(), zone, time);
      const result = await client.query(
        `INSERT INTO summary_settings(owner_id,enabled,time_zone,local_time,next_run) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(owner_id) DO UPDATE SET enabled=EXCLUDED.enabled,time_zone=EXCLUDED.time_zone,local_time=EXCLUDED.local_time,next_run=EXCLUDED.next_run,last_local_date=NULL,version=summary_settings.version+1 RETURNING *`,
        [owner, patch.enabled ?? row?.enabled ?? true, zone, time, next],
      );
      return settingsDto(result.rows[0]);
    });
  }
  async scheduled() {
    // A due row is locked until enqueue completes. Crash rolls back next_run and can retry.
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const rows = await client.query(
        "SELECT * FROM summary_settings WHERE enabled AND next_run <= $1 ORDER BY next_run FOR UPDATE SKIP LOCKED LIMIT 10",
        [this.clock()],
      );
      for (const row of rows.rows) {
        const now = this.clock();
        const today = localParts(now, row.time_zone).date;
        const date =
          localInstant(today, row.local_time, row.time_zone) <= +now
            ? today
            : addDays(today, -1);
        try {
          if (
            String(
              row.last_local_date?.toISOString?.().slice(0, 10) ||
                row.last_local_date,
            ) !== date
          ) {
            const p = presetPeriod(
              "day",
              row.time_zone,
              new Date(localInstant(date, "12:00", row.time_zone)),
            );
            await this.enqueue(row.owner_id, p, "scheduled");
          }
          await client.query(
            "UPDATE summary_settings SET next_run=$2,last_local_date=$3 WHERE owner_id=$1",
            [
              row.owner_id,
              nextSummaryRun(now, row.time_zone, row.local_time),
              date,
            ],
          );
        } catch (error) {
          await client.query(
            `UPDATE summary_settings SET next_run=$2 WHERE owner_id=$1`,
            [
              row.owner_id,
              new Date(
                +now +
                  (error instanceof ApiError && error.statusCode === 429
                    ? 3600000
                    : 900000),
              ),
            ],
          );
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async workOne(): Promise<boolean> {
    const lease = randomUUID();
    const row = await transaction(this.pool, async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(7261066)");
      await client.query(
        `UPDATE summary_jobs SET stage='error',error='SUMMARY_ATTEMPTS_EXHAUSTED',lease_token=NULL WHERE stage='running' AND lease_until<now() AND attempts>=2`,
      );
      const active = Number(
        (
          await client.query(
            `SELECT count(*) FROM summary_jobs WHERE stage='running' AND lease_until>now()`,
          )
        ).rows[0].count,
      );
      if (active >= this.limits.concurrency) return null;
      const result = await client.query(
        `UPDATE summary_jobs SET stage='running',attempts=attempts+1,lease_token=$1,lease_until=now()+interval '120 seconds'
        WHERE id=(SELECT j.id FROM summary_jobs j WHERE (j.stage='queued' OR (j.stage='running' AND j.lease_until<now())) AND j.next_attempt<=now() AND j.attempts<2
        AND NOT EXISTS(SELECT 1 FROM summary_jobs a WHERE a.owner_id=j.owner_id AND a.stage='running' AND a.lease_until>now())
        ORDER BY j.created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
        [lease],
      );
      return result.rows[0] || null;
    });
    if (!row) return false;
    const c: SummaryContext = row.context;
    const started = performance.now();
    const generationInfo: NonNullable<SummaryReport["generationInfo"]> = {
      generatorVersion: SUMMARY_VERSION,
      modelVersion: this.modelVersion,
      inputChars: 0,
      outputChars: 0,
      durationMs: 0,
    };
    let content = factualSummary(c);
    let mode: SummaryReport["generationMode"] = c.coverage.total
      ? "facts"
      : "empty";
    let error: string | null = null;
    if (c.coverage.total) {
      try {
        if (!this.provider.summarize)
          throw new ApiError(
            503,
            "AI_NOT_CONFIGURED",
            "ИИ сводок не настроен.",
          );
        // Only selected facts' allowed references; aggregate counts still cover all records.
        const allowed = new Set(c.notes.map((n) => n.id));
        const { sources: _evidence, ...selectedContext } = c;
        const payload = {
          ...selectedContext,
          sources: c.sources.filter((s) => allowed.has(s.id)),
          facts: c.facts.map((f) => ({
            ...f,
            noteIds: f.noteIds.filter((id) => allowed.has(id)),
          })),
        };
        if (JSON.stringify(payload).length > this.limits.maxChars)
          throw new ApiError(
            413,
            "SUMMARY_INPUT_BUDGET",
            "Слишком большой контекст.",
          );
        generationInfo.inputChars = JSON.stringify(payload).length;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let raw: unknown;
        try {
          raw = await Promise.race([
            this.provider.summarize(payload),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () =>
                  reject(
                    new ApiError(504, "AI_TIMEOUT", "ИИ не ответил вовремя."),
                  ),
                35000,
              );
              timer.unref();
            }),
          ]);
        } finally {
          if (timer) clearTimeout(timer);
        }
        if (
          raw &&
          typeof raw === "object" &&
          "result" in raw &&
          "usage" in raw
        ) {
          const usage = raw.usage as Record<string, number>;
          if (Number.isFinite(usage.inputTokens) && usage.inputTokens >= 0)
            generationInfo.inputTokens = usage.inputTokens;
          if (Number.isFinite(usage.outputTokens) && usage.outputTokens >= 0)
            generationInfo.outputTokens = usage.outputTokens;
          raw = raw.result;
        }
        generationInfo.outputChars = JSON.stringify(raw)?.length || 0;
        if (generationInfo.outputChars > 20000)
          throw new ApiError(
            502,
            "SUMMARY_INVALID_RESPONSE",
            "Ответ превышает бюджет.",
          );
        content = validateSummary(raw, c);
        mode = "ai";
      } catch (e) {
        error = e instanceof ApiError ? e.code : "SUMMARY_INVALID_RESPONSE";
      }
    }
    generationInfo.durationMs = Math.round(performance.now() - started);
    await transaction(this.pool, async (client) => {
      const own = await client.query(
        `SELECT id FROM summary_jobs WHERE id=$1 AND lease_token=$2 AND lease_until>now() FOR UPDATE`,
        [row.id, lease],
      );
      if (!own.rows.length) return;
      // Serialize versions and publication; expired workers cannot publish.
      const slot = (
        await client.query(
          "SELECT latest_id FROM summary_slots WHERE owner_id=$1 AND slot_key=$2 FOR UPDATE",
          [row.owner_id, row.slot_key],
        )
      ).rows[0];
      const version = Number(
        (
          await client.query(
            "SELECT COALESCE(max(version),0)+1 AS v FROM summary_reports WHERE owner_id=$1 AND slot_key=$2",
            [row.owner_id, row.slot_key],
          )
        ).rows[0].v,
      );
      const fresh = await this.snapshot(client, row.owner_id, c.period);
      const used = new Set(
        [
          content.overview,
          ...content.highlights,
          ...content.observations,
          ...content.themes,
          ...content.suggestions,
        ].flatMap((e) => [
          ...e.noteIds,
          ...e.factIds.flatMap(
            (id) => c.facts.find((f) => f.id === id)?.noteIds || [],
          ),
        ]),
      );
      const report: SummaryReport = {
        ...content,
        id: randomUUID(),
        slotKey: row.slot_key,
        version,
        period: c.period,
        asOf: c.asOf,
        generatedAt: this.clock().toISOString(),
        metrics: c.metrics,
        facts: c.facts,
        sources: c.sources.filter((n) => used.has(n.id)),
        coverage: c.coverage,
        sourceFingerprint: c.sourceFingerprint,
        generationMode: mode,
        generationInfo,
        freshness:
          fresh.sourceFingerprint !== c.sourceFingerprint
            ? "stale"
            : c.period.endDateExclusive <=
                localParts(this.clock(), c.period.timeZone).date
              ? "historical_snapshot"
              : "current",
      };
      await client.query(
        "INSERT INTO summary_reports(id,owner_id,slot_key,version,fingerprint,report) VALUES($1,$2,$3,$4,$5,$6)",
        [
          report.id,
          row.owner_id,
          row.slot_key,
          version,
          c.sourceFingerprint,
          report,
        ],
      );
      if (!error || !slot.latest_id)
        await client.query(
          "UPDATE summary_slots SET latest_id=$3 WHERE owner_id=$1 AND slot_key=$2",
          [row.owner_id, row.slot_key, report.id],
        );
      await client.query(
        `UPDATE summary_jobs SET stage=$3,error=$4,report_id=$5,lease_until=NULL,lease_token=NULL WHERE id=$1 AND lease_token=$2`,
        [row.id, lease, error ? "error" : "completed", error, report.id],
      );
      // Retain minimal evidence only, not input descriptions after processing.
      await client.query(`UPDATE summary_jobs SET context='{}' WHERE id=$1`, [
        row.id,
      ]);
    });
    return true;
  }
  start(onError: () => void) {
    let stopped = false,
      running: Promise<void> | null = null;
    const tick = () => {
      if (running || stopped) return;
      running = (async () => {
        await this.scheduled();
        await this.pool.query(
          `DELETE FROM summary_jobs WHERE stage IN ('completed','error') AND created_at<now()-interval '30 days'`,
        );
        for (let i = 0; i < 10 && !stopped; i++)
          if (!(await this.workOne())) break;
      })()
        .catch(onError)
        .finally(() => {
          running = null;
        });
    };
    const timer = setInterval(tick, 15000);
    timer.unref();
    tick();
    return async () => {
      stopped = true;
      clearInterval(timer);
      await running;
    };
  }
}
export function registerSummaries(
  app: FastifyInstance,
  service: SummaryService,
  requireUser: (r: FastifyRequest) => Promise<void>,
) {
  const periodQuery = {
    type: "object",
    additionalProperties: false,
    required: ["period"],
    properties: { period: { type: "string", maxLength: 4000 } },
  };
  const readPeriod = (request: FastifyRequest) => {
    try {
      return JSON.parse(
        (request.query as { period: string }).period,
      ) as SummaryPeriod;
    } catch {
      throw new ApiError(400, "SUMMARY_PERIOD", "Некорректный период.");
    }
  };
  app.get(
    "/api/v1/summaries/facts",
    { preHandler: requireUser, schema: { querystring: periodQuery } },
    (r) => service.facts(r.ownerId, readPeriod(r)),
  );
  app.post(
    "/api/v1/summaries/generate",
    { preHandler: requireUser, schema: { body: summaryPeriodSchema } },
    async (r, reply) => {
      try {
        const result = await service.enqueue(
          r.ownerId,
          r.body as SummaryPeriod,
        );
        return reply
          .code(result.report ? 200 : result.job.stage === "error" ? 200 : 202)
          .send(result);
      } catch (e) {
        if (e instanceof ApiError && e.statusCode === 429)
          reply.header("Retry-After", "3600");
        throw e;
      }
    },
  );
  app.get("/api/v1/summaries/settings", { preHandler: requireUser }, (r) =>
    service.settings(r.ownerId),
  );
  app.patch(
    "/api/v1/summaries/settings",
    { preHandler: requireUser, schema: { body: summarySettingsSchema } },
    (r) => service.saveSettings(r.ownerId, r.body as Partial<SummarySettings>),
  );
  app.get(
    "/api/v1/summaries/jobs/:id",
    { preHandler: requireUser },
    async (r) => {
      const row = (
        await service.pool.query(
          "SELECT * FROM summary_jobs WHERE id=$1 AND owner_id=$2",
          [(r.params as { id: string }).id, r.ownerId],
        )
      ).rows[0];
      if (!row) return notFound();
      return { job: summaryJob(row) };
    },
  );
  app.get("/api/v1/summaries/reports/:id", { preHandler: requireUser }, (r) =>
    service.report(r.ownerId, (r.params as { id: string }).id),
  );
  app.get(
    "/api/v1/summaries/archive",
    {
      preHandler: requireUser,
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            offset: { type: "integer", minimum: 0, maximum: 100000 },
            limit: { type: "integer", minimum: 1, maximum: 50 },
          },
        },
      },
    },
    async (r) => {
      const q = r.query as { offset?: number; limit?: number };
      const limit = q.limit || 20,
        offset = q.offset || 0;
      const rows = await service.pool.query(
        `SELECT r.report FROM summary_slots s JOIN summary_reports r ON r.owner_id=s.owner_id AND r.id=s.latest_id WHERE s.owner_id=$1 ORDER BY r.generated_at DESC,r.id LIMIT $2 OFFSET $3`,
        [r.ownerId, limit + 1, offset],
      );
      return {
        reports: rows.rows
          .slice(0, limit)
          .map((row) => ({ ...row.report, freshness: "historical_snapshot" })),
        nextOffset: rows.rows.length > limit ? offset + limit : null,
      };
    },
  );
}
