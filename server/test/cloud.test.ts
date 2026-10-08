import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SummaryService } from "../src/summaries.js";
import { presetPeriod } from "../src/summaryContracts.js";
import { factualSummary, defaultSummaryLimits } from "../src/summaryFacts.js";
import { insertNote } from "../src/notes.js";
import { createServer } from "node:net";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { buildApp } from "../src/app.js";
import { loadConfig, aiConfig } from "../src/config.js";
import { migrate } from "../src/migrate.js";
import { AudioStorage } from "../src/storage.js";
import { AudioWorker, cleanupAudio, RETENTION_MS } from "../src/audio.js";
import { hasSchedule } from "../src/contracts.js";
import { parseStructure } from "../src/ai.js";
import type { ServerConfig } from "../src/config.js";
import { SignJWT } from "jose";
import { ApiError } from "../src/errors.js";
const secret = randomBytes(32).toString("hex");
let cluster: EmbeddedPostgres,
  pool: pg.Pool,
  app: Awaited<ReturnType<typeof buildApp>>,
  root: string;
let alice: string, bob: string, refresh: string;
let testConfig: ServerConfig;
let postgresPort: number;
const structured = {
  title: "Синтетический план",
  description: "Тест",
  priority: "medium" as const,
  category_tag: "#Тест",
  transcript_summary: "Тест",
  due_date: null,
  checklist: ["Первый шаг"],
};
const provider = {
  structure: async () => structured,
  transcribe: async () => "Синтетический текст",
  analyze: async () => ({
    summary: "Синтетическая сводка",
    candidates: [
      structured,
      { ...structured, title: "Второе действие", due_date: "2026-10-10" },
    ],
  }),
};
before(
  async () => {
    root = await mkdtemp(join(tmpdir(), "voicenotes-test-"));
    const socket = createServer();
    await new Promise<void>((resolve) =>
      socket.listen(0, "127.0.0.1", resolve),
    );
    postgresPort = (socket.address() as { port: number }).port;
    await new Promise<void>((resolve) => socket.close(() => resolve()));
    cluster = new EmbeddedPostgres({
      databaseDir: join(root, "pg"),
      user: "postgres",
      password: secret,
      port: postgresPort,
      postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
      persistent: true,
      authMethod: "scram-sha-256",
      onLog: () => {},
      onError: () => {},
    });
    await cluster.initialise();
    await cluster.start();
    const bootstrap = cluster.getPgClient("postgres", "127.0.0.1");
    await bootstrap.connect();
    await bootstrap.query("CREATE DATABASE voicenotes_test");
    await bootstrap.end();
    const admin = cluster.getPgClient("voicenotes_test", "127.0.0.1");
    await admin.connect();
    await admin.query(
      `CREATE ROLE test_migrator LOGIN PASSWORD '${secret}' NOSUPERUSER NOCREATEDB NOCREATEROLE`,
    );
    await admin.query(
      `CREATE ROLE test_runtime LOGIN PASSWORD '${secret}' NOSUPERUSER NOCREATEDB NOCREATEROLE`,
    );
    await admin.query(
      "ALTER SCHEMA public OWNER TO test_migrator; REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO test_runtime",
    );
    await admin.query(
      "ALTER DEFAULT PRIVILEGES FOR ROLE test_migrator IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO test_runtime",
    );
    await admin.end();
    const url = (user: string) =>
      `postgresql://${user}:${secret}@127.0.0.1:${postgresPort}/voicenotes_test`;
    await migrate(url("test_migrator"), resolve("migrations"));
    await migrate(url("test_migrator"), resolve("migrations"));
    pool = new pg.Pool({
      connectionString: url("test_runtime"),
      connectionTimeoutMillis: 5000,
    });
    testConfig = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: url("test_runtime"),
      JWT_SECRET: secret,
      AUDIO_STORAGE_PATH: join(root, "audio"),
    });
    app = await buildApp(testConfig, { pool, provider, worker: false });
    for (const [email, set] of [
      ["alice@test.invalid", (token: string) => (alice = token)],
      ["bob@test.invalid", (token: string) => (bob = token)],
    ] as const) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        headers: { origin: "http://localhost:5173" },
        payload: { email, password: "test-password-123" },
      });
      assert.equal(response.statusCode, 200, response.body);
      set(response.json().accessToken);
      if (email.startsWith("alice")) refresh = response.cookies[0].value;
    }
  },
  { timeout: 120000 },
);
after(async () => {
  await app?.close();
  await pool?.end();
  await cluster?.stop();
});
const auth = (token: string) => ({ authorization: `Bearer ${token}` });
test("configuration rejects production Gemini and missing secrets", () => {
  assert.throws(() => aiConfig({ AI_PROVIDER: "gemini" }, "production"));
  assert.throws(() => aiConfig({ AI_PROVIDER: "alice" }, "production"));
  assert.equal(
    aiConfig(
      {
        AI_PROVIDER: "alice",
        YANDEX_API_KEY: "test",
        YANDEX_FOLDER_ID: "folder",
      },
      "production",
    ).aiProvider,
    "alice",
  );
  assert.equal(aiConfig({}, "development").aiProvider, "gemini");
  assert.throws(() => loadConfig({ PORT: "0" }));
  assert.throws(() => loadConfig({ CORS_ORIGINS: "*" }));
});
test("schedule and AI validation do not require entity_type", () => {
  assert.equal(hasSchedule({}), false);
  assert.equal(hasSchedule({ dueDate: "2026-10-10" }), true);
  assert.equal(hasSchedule({ dueTime: "12:00" }), true);
  assert.equal(hasSchedule({ deadline: null, dueDate: null }), false);
  assert.equal(
    parseStructure(JSON.stringify(structured)).title,
    structured.title,
  );
  assert.throws(() => parseStructure(""));
  assert.throws(() => parseStructure("{"));
  assert.throws(() =>
    parseStructure(JSON.stringify({ ...structured, due_date: "2026-02-30" })),
  );
});
test("database readiness and runtime role cannot change schema", async () => {
  assert.equal((await app.inject("/api/v1/health")).statusCode, 200);
  assert.equal((await app.inject("/api/v1/ready")).statusCode, 200);
  await assert.rejects(pool.query("CREATE TABLE forbidden(id int)"));
  const expected = (await readdir(resolve("migrations"))).filter((name) =>
    name.endsWith(".sql"),
  ).sort();
  const applied = (await pool.query("SELECT version FROM schema_migrations ORDER BY version"))
    .rows.map((row) => row.version);
  assert.deepEqual(applied, expected);
});
test("CRUD validates input, filters schedules and isolates two owners", async () => {
  assert.equal((await app.inject("/api/v1/notes")).statusCode, 401);
  assert.equal(
    (await app.inject({ url: "/api/v1/notes", headers: auth(alice + "x") }))
      .statusCode,
    401,
  );
  const created = await app.inject({
    method: "POST",
    url: "/api/v1/notes",
    headers: auth(alice),
    payload: {
      title: "Тестовая заметка",
      status: "todo",
      priority: "medium",
      categoryTag: "#Тест",
      isFocus: false,
    },
  });
  assert.equal(created.statusCode, 201, created.body);
  const id = created.json().note.id;
  for (const method of ["GET", "PATCH", "DELETE"] as const) {
    const response = await app.inject({
      method,
      url: `/api/v1/notes/${id}`,
      headers: auth(bob),
      ...(method === "PATCH" ? { payload: { title: "Чужая" } } : {}),
    });
    assert.equal(response.statusCode, 404);
  }
  assert.equal(
    (
      await app.inject({
        method: "PATCH",
        url: `/api/v1/notes/${id}`,
        headers: auth(alice),
        payload: { dueDate: "2026-02-30" },
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: "PATCH",
        url: `/api/v1/notes/${id}`,
        headers: auth(alice),
        payload: { ownerId: "other" },
      })
    ).statusCode,
    400,
  );
  const updated = await app.inject({
    method: "PATCH",
    url: `/api/v1/notes/${id}`,
    headers: auth(alice),
    payload: { dueDate: "2026-10-10" },
  });
  assert.equal(updated.json().note.id, id);
  assert.equal(
    (
      await app.inject({
        url: "/api/v1/notes?scheduled=true&limit=1",
        headers: auth(alice),
      })
    ).json().notes.length,
    1,
  );
  await app.inject({
    method: "PATCH",
    url: `/api/v1/notes/${id}`,
    headers: auth(alice),
    payload: { dueDate: null },
  });
  assert.equal(
    (
      await app.inject({
        url: "/api/v1/notes?scheduled=true",
        headers: auth(alice),
      })
    ).json().total,
    0,
  );
});
test("text AI is authorized, server validates output and import is idempotent", async () => {
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/ai/structure",
        payload: { text: "Тест" },
      })
    ).statusCode,
    401,
  );
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/ai/structure",
    headers: auth(alice),
    payload: { text: "Синтетический запрос" },
  });
  assert.equal(response.statusCode, 200, response.body);
  const note = {
    title: "Локальная",
    status: "todo",
    priority: "low",
    categoryTag: "#Тест",
    isFocus: false,
  };
  const send = () =>
    app.inject({
      method: "POST",
      url: "/api/v1/import/notes",
      headers: auth(alice),
      payload: { notes: [{ legacyId: "old-1", note }] },
    });
  const a = await send(),
    b = await send();
  assert.equal(a.statusCode, 200, a.body);
  assert.equal(a.json().notes[0].note.id, b.json().notes[0].note.id);
});
function wav() {
  const data = Buffer.alloc(32044);
  data.write("RIFF", 0);
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(16000, 24);
  data.writeUInt32LE(32000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(32000, 40);
  return data;
}
async function upload(
  temporary = false,
  legacyId?: string,
  processingFields = "",
) {
  const boundary = "test-audio-boundary";
  const body = Buffer.concat([
    Buffer.from(
      `${processingFields}${legacyId ? `--${boundary}\r\nContent-Disposition: form-data; name="legacyId"\r\n\r\n${legacyId}\r\n` : ""}--${boundary}\r\nContent-Disposition: form-data; name="temporary"\r\n\r\n${temporary}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
    ),
    wav(),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return app.inject({
    method: "POST",
    url: "/api/v1/audio/upload",
    headers: {
      ...auth(alice),
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload: body,
  });
}
test("audio survives restart, stages, isolation, Range, approval and exact retention", async () => {
  const processingFields = Object.entries({
    mode: "deep",
    style: "action_plan",
    currentIsoDate: "2026-10-07T15:00:00Z",
    timeZone: "Europe/Saratov",
  })
    .map(
      ([key, value]) =>
        `--test-audio-boundary\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
    )
    .join("");
  const uploaded = await upload(false, undefined, processingFields);
  assert.equal(uploaded.statusCode, 201, uploaded.body);
  const job = uploaded.json().job;
  const metadata = (
    await app.inject({
      url: `/api/v1/audio/${job.audioId}`,
      headers: auth(alice),
    })
  ).json().audio;
  assert.equal(metadata.mimeType, "audio/wav");
  assert.equal(metadata.duration, 1);
  assert.equal(metadata.expired, false);
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/audio/${job.audioId}`,
        headers: auth(bob),
      })
    ).statusCode,
    404,
  );
  const attached = await app.inject({
    method: "POST",
    url: "/api/v1/notes",
    headers: auth(alice),
    payload: {
      title: "Аудио",
      status: "todo",
      priority: "low",
      categoryTag: "#Тест",
      isFocus: false,
      audioId: job.audioId,
    },
  });
  const attachedId = attached.json().note.id;
  assert.equal(attached.json().note.audioDuration, 1);
  const edited = await app.inject({
    method: "PATCH",
    url: `/api/v1/notes/${attachedId}`,
    headers: auth(alice),
    payload: { title: "Изменённое аудио" },
  });
  assert.equal(
    edited.json().note.audioUrl,
    `/api/v1/audio/${job.audioId}/file`,
  );
  await app.close();
  await pool.end();
  pool = new pg.Pool({ connectionString: testConfig.databaseUrl });
  app = await buildApp(testConfig, { pool, provider, worker: false });
  const storage = new AudioStorage(join(root, "audio"));
  await storage.init();
  let processingContext: unknown;
  const worker = new AudioWorker(pool, storage, {
    ...provider,
    analyze: async (text, context) => {
      processingContext = context;
      return provider.analyze();
    },
  });
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/audio/jobs/${job.id}`,
        headers: auth(bob),
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/audio/${job.audioId}/file`,
        headers: { cookie: `vn_refresh=${refresh}`, range: "bytes=0-3" },
      })
    ).statusCode,
    206,
  );
  await worker.tick();
  assert.deepEqual(processingContext, {
    mode: "deep",
    style: "action_plan",
    currentIsoDate: "2026-10-07T15:00:00Z",
    timeZone: "Europe/Saratov",
  });
  const completed = (
    await app.inject({
      url: `/api/v1/audio/jobs/${job.id}`,
      headers: auth(alice),
    })
  ).json().job;
  assert.equal(completed.stage, "completed");
  assert.equal(completed.candidates.length, 2);
  assert.equal(completed.transcript, "Синтетический текст");
  const before = (
    await app.inject({ url: "/api/v1/notes", headers: auth(alice) })
  ).json().total;
  const send = () =>
    app.inject({
      method: "POST",
      url: `/api/v1/audio/jobs/${job.id}/approve`,
      headers: auth(alice),
      payload: { candidates: [{ index: 1, note: completed.candidates[1] }] },
    });
  const a = await send(),
    b = await send();
  assert.equal(a.statusCode, 200, a.body);
  assert.deepEqual(a.json(), b.json());
  assert.equal(
    (await app.inject({ url: "/api/v1/notes", headers: auth(alice) })).json()
      .total,
    before + 1,
  );
  const audio = (
    await pool.query("SELECT * FROM audio_sources WHERE id=$1", [job.audioId])
  ).rows[0];
  assert.equal(
    audio.expires_at.getTime() - audio.created_at.getTime() >=
      RETENTION_MS - 100,
    true,
  );
  assert.equal(
    await cleanupAudio(pool, storage, new Date(audio.expires_at.getTime() - 1)),
    0,
  );
  assert.equal(await cleanupAudio(pool, storage, audio.expires_at), 1);
  assert.equal(await cleanupAudio(pool, storage, audio.expires_at), 0);
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/audio/${job.audioId}`,
        headers: auth(alice),
      })
    ).json().audio.expired,
    true,
  );
  const retained = (
    await app.inject({
      url: `/api/v1/notes/${attachedId}`,
      headers: auth(alice),
    })
  ).json().note;
  assert.equal(retained.title, "Изменённое аудио");
  assert.equal(retained.audioUrl, undefined);
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/audio/${job.audioId}/file`,
        headers: auth(alice),
      })
    ).statusCode,
    410,
  );
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/audio/jobs/${job.id}`,
        headers: auth(alice),
      })
    ).json().job.transcript,
    "Синтетический текст",
  );
  const short = await upload(true);
  await worker.tick();
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/audio/${short.json().job.audioId}/file`,
        headers: auth(alice),
      })
    ).statusCode,
    410,
  );
  await assert.rejects(storage.read("../outside"));
  await assert.rejects(storage.remove("../outside"));
});
test("legacy audio import is idempotent, private and does not create an AI job", async () => {
  const before = (await pool.query("SELECT count(*) FROM audio_jobs")).rows[0]
    .count;
  const first = await upload(false, "legacy-audio");
  assert.equal(first.statusCode, 201, first.body);
  const repeated = await upload(false, "legacy-audio");
  assert.equal(repeated.json().audioId, first.json().audioId);
  assert.equal(
    (await pool.query("SELECT count(*) FROM audio_jobs")).rows[0].count,
    before,
  );
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/audio/${first.json().audioId}/file`,
        headers: auth(bob),
      })
    ).statusCode,
    404,
  );
  const id = first.json().audioId;
  const oldKey = (
    await pool.query("SELECT file_key FROM audio_sources WHERE id=$1", [id])
  ).rows[0].file_key;
  await pool.query(
    "UPDATE audio_sources SET expires_at=now()-interval '1 day' WHERE id=$1",
    [id],
  );
  const storage = new AudioStorage(testConfig.audioStoragePath);
  await storage.init();
  await cleanupAudio(pool, storage, new Date(), () => {});
  assert.equal(
    (await app.inject({ url: `/api/v1/audio/${id}/file`, headers: auth(alice) })).statusCode,
    410,
  );
  const [renewed, concurrent] = await Promise.all([
    upload(false, "legacy-audio"),
    upload(false, "legacy-audio"),
  ]);
  assert.equal(renewed.json().audioId, id);
  assert.equal(concurrent.json().audioId, id);
  const source = (
    await pool.query("SELECT file_key,expired_at,expires_at FROM audio_sources WHERE id=$1", [id])
  ).rows[0];
  assert.notEqual(source.file_key, oldKey);
  assert.equal(source.expired_at, null);
  assert.ok(new Date(source.expires_at).getTime() > Date.now());
  assert.equal(
    (await app.inject({ url: `/api/v1/audio/${id}/file`, headers: auth(alice) })).statusCode,
    200,
  );
  await assert.rejects(storage.read(oldKey));
});
test("concurrent web refreshes survive, delayed replay revokes family", async () => {
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        headers: { cookie: `vn_refresh=${refresh}` },
      })
    ).statusCode,
    403,
  );
  const refreshRequest = (cookie: string) => app.inject({
    method: "POST",
    url: "/api/v1/auth/refresh",
    headers: { origin: "http://localhost:5173", cookie: `vn_refresh=${cookie}` },
  });
  const [first, second] = await Promise.all([
    refreshRequest(refresh),
    refreshRequest(refresh),
  ]);
  assert.equal(first.statusCode, 200, first.body);
  assert.equal(second.statusCode, 200, second.body);
  const next = first.cookies[0].value;
  const concurrent = second.cookies[0].value;
  const firstContinued = await refreshRequest(next);
  const secondContinued = await refreshRequest(concurrent);
  assert.equal(firstContinued.statusCode, 200);
  assert.equal(secondContinued.statusCode, 200);
  const stillActive = secondContinued.cookies[0].value;
  await pool.query(
    "UPDATE sessions SET rotated_at=now()-interval '10 seconds' WHERE refresh_hash=$1",
    [createHash("sha256").update(refresh).digest("hex")],
  );
  assert.equal((await refreshRequest(refresh)).statusCode, 401);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh",
        headers: {
          origin: "http://localhost:5173",
          cookie: `vn_refresh=${stillActive}`,
        },
      })
    ).statusCode,
    401,
  );
});
test("expired tokens and wrong issuer or audience are rejected", async () => {
  for (const [issuer, audience, expiration] of [
    ["voicenotes", "voicenotes-clients", 1],
    ["wrong", "voicenotes-clients", Math.floor(Date.now() / 1000) + 100],
    ["voicenotes", "wrong", Math.floor(Date.now() / 1000) + 100],
  ] as const) {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject((await pool.query("SELECT id FROM users LIMIT 1")).rows[0].id)
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(expiration)
      .sign(new TextEncoder().encode(secret));
    assert.equal(
      (await app.inject({ url: "/api/v1/notes", headers: auth(token) }))
        .statusCode,
      401,
    );
  }
});
test("failed migration rolls back all DDL and history", async () => {
  const before = (await pool.query("SELECT version,checksum FROM schema_migrations ORDER BY version")).rows;
  const directory = join(root, "failed-migrations");
  await mkdir(directory);
  await writeFile(
    join(directory, "999-failing.sql"),
    "CREATE TABLE rolled_back(id int); SELECT definitely_not_a_function();",
  );
  await assert.rejects(
    migrate(
      testConfig.databaseUrl.replace("test_runtime:", "test_migrator:"),
      directory,
    ),
  );
  assert.equal(
    (await pool.query("SELECT to_regclass('public.rolled_back') AS name"))
      .rows[0].name,
    null,
  );
  assert.deepEqual(
    (await pool.query("SELECT version,checksum FROM schema_migrations ORDER BY version")).rows,
    before,
  );
});
test("provider endpoint failures retain stable public codes without secrets", async () => {
  const original = provider.structure;
  try {
    provider.structure = async () => {
      throw new ApiError(504, "AI_TIMEOUT", "Сервис ИИ не ответил вовремя.");
    };
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/ai/structure",
      headers: auth(alice),
      payload: { text: "Синтетический запрос" },
    });
    assert.equal(response.statusCode, 504);
    assert.equal(response.json().error.code, "AI_TIMEOUT");
    assert.ok(!response.body.includes(secret));
    provider.structure = async () => ({ ...structured, title: "" });
    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/ai/structure",
      headers: auth(alice),
      payload: { text: "Синтетический запрос" },
    });
    assert.equal(invalid.statusCode, 502);
    assert.equal(invalid.json().error.code, "AI_INVALID_RESPONSE");
  } finally {
    provider.structure = original;
  }
});
test("analysis failure retains transcript and retry does not transcribe again", async () => {
  const uploaded = await upload();
  assert.equal(uploaded.statusCode, 201, uploaded.body);
  const job = uploaded.json().job;
  const storage = new AudioStorage(join(root, "audio"));
  await storage.init();
  let transcriptions = 0;
  const failed = new AudioWorker(pool, storage, {
    ...provider,
    transcribe: async () => {
      transcriptions++;
      return "Сохранённый транскрипт";
    },
    analyze: async () => {
      throw new ApiError(503, "AI_UNAVAILABLE", "Provider unavailable");
    },
  });
  await failed.tick();
  const state = (
    await app.inject({
      url: `/api/v1/audio/jobs/${job.id}`,
      headers: auth(alice),
    })
  ).json().job;
  assert.equal(state.stage, "error");
  assert.equal(state.transcript, "Сохранённый транскрипт");
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: `/api/v1/audio/jobs/${job.id}/retry`,
        headers: auth(alice),
      })
    ).statusCode,
    200,
  );
  await new AudioWorker(pool, storage, {
    ...provider,
    transcribe: async () => {
      transcriptions++;
      throw new Error("Must not re-transcribe");
    },
  }).tick();
  assert.equal(transcriptions, 1);
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/audio/jobs/${job.id}`,
        headers: auth(alice),
      })
    ).json().job.stage,
    "completed",
  );
  await pool.query("UPDATE audio_sources SET expires_at=$1 WHERE id=$2", [
    new Date(0),
    job.audioId,
  ]);
  const original = storage.remove.bind(storage);
  let attempts = 0;
  storage.remove = async (key) => {
    if (attempts++ === 0) throw new Error("Synthetic disk error");
    await original(key);
  };
  assert.equal(await cleanupAudio(pool, storage), 0);
  assert.equal(await cleanupAudio(pool, storage), 1);
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/audio/jobs/${job.id}`,
        headers: auth(alice),
      })
    ).json().job.transcript,
    "Сохранённый транскрипт",
  );
});
test("expired audio worker cannot change a job reclaimed by another worker", async () => {
  const uploaded = await upload();
  assert.equal(uploaded.statusCode, 201, uploaded.body);
  const job = uploaded.json().job;
  const storage = new AudioStorage(join(root, "audio"));
  await storage.init();
  let started!: () => void;
  let resume!: (text: string) => void;
  const firstStarted = new Promise<void>((resolve) => { started = resolve; });
  const firstTranscript = new Promise<string>((resolve) => { resume = resolve; });
  const first = new AudioWorker(pool, storage, {
    ...provider,
    transcribe: async () => {
      started();
      return firstTranscript;
    },
    analyze: async () => ({ summary: "Stale analysis", candidates: [] }),
  });
  const pendingFirst = first.tick();
  await firstStarted;
  await pool.query(
    "UPDATE audio_jobs SET lease_until=now()-interval '1 minute' WHERE id=$1",
    [job.id],
  );
  await new AudioWorker(pool, storage, {
    ...provider,
    transcribe: async () => "Current transcript",
    analyze: async () => ({ summary: "Current analysis", candidates: [] }),
  }).tick();
  resume("Stale transcript");
  await pendingFirst;
  const state = (await pool.query(
    "SELECT stage,transcript,summary,error FROM audio_jobs WHERE id=$1",
    [job.id],
  )).rows[0];
  assert.deepEqual(state, {
    stage: "completed", transcript: "Current transcript",
    summary: "Current analysis", error: null,
  });
  const notes = await pool.query(
    "SELECT data FROM notes WHERE legacy_id=$1 AND owner_id=(SELECT owner_id FROM audio_jobs WHERE id=$2)",
    [`audio-result:${job.id}`, job.id],
  );
  assert.equal(notes.rows.length, 1);
  assert.equal(notes.rows[0].data.transcriptText, "Current transcript");
});
test("readiness reports 503 while health remains independent of database", async () => {
  const unavailable = new pg.Pool({
    connectionString: "postgresql://test:test@127.0.0.1:1/voicenotes_test",
    connectionTimeoutMillis: 100,
  });
  const isolated = await buildApp(testConfig, {
    pool: unavailable,
    provider,
    worker: false,
  });
  try {
    assert.equal((await isolated.inject("/api/v1/ready")).statusCode, 503);
    assert.equal((await isolated.inject("/api/v1/health")).statusCode, 200);
  } finally {
    await isolated.close();
    await unavailable.end();
  }
});

test("summary integration: complete snapshot, two owners, concurrent workers, cache, versions and provider failure", async () => {
  const owner = randomUUID(),
    other = randomUUID();
  await pool.query(
    `INSERT INTO users(id,email,password_hash) VALUES($1,$2,'synthetic'),($3,$4,'synthetic')`,
    [owner, `${owner}@test.invalid`, other, `${other}@test.invalid`],
  );
  const now = new Date("2026-10-07T17:00:00Z"),
    period = presetPeriod("day", "Europe/Saratov", now);
  let calls = 0,
    fail = false,
    changeDuring = false;
  const limits = { ...defaultSummaryLimits, maxPerHour: 20 };
  const service = new SummaryService(
    pool,
    {
      ...provider,
      summarize: async (c) => {
        calls++;
        assert.ok(!JSON.stringify(c).includes("SECRET-TRANSCRIPT"));
        if (changeDuring)
          await pool.query(
            `UPDATE notes SET data=jsonb_set(data,'{title}','"Изменение во время генерации"') WHERE owner_id=$1 AND id=$2`,
            [owner, c.notes[0].id],
          );
        if (fail) throw new ApiError(503, "AI_UNAVAILABLE", "Synthetic outage");
        return {
          ...factualSummary(c),
          overview: {
            text: c.facts[0].text,
            noteIds: [],
            factIds: [c.facts[0].id],
          },
          highlights: c.notes
            .filter((n) => n.status === "completed")
            .slice(0, 3)
            .map((n) => ({ text: n.title, noteIds: [n.id], factIds: [] })),
        };
      },
    },
    limits,
    () => now,
  );
  const start = performance.now();
  for (let i = 0; i < 205; i++)
    await insertNote(pool, owner, {
      title: `Синтетический результат ${i}`,
      status: "completed",
      priority: "medium",
      categoryTag: "#Тест",
      isFocus: false,
      completedAt: "2026-10-07T16:00:00Z",
      createdAt: "2026-10-07T09:00:00Z",
      transcriptText: "SECRET-TRANSCRIPT",
    });
  await insertNote(pool, other, {
    title: "Чужая запись",
    status: "completed",
    priority: "high",
    categoryTag: "#Тест",
    isFocus: false,
    completedAt: "2026-10-07T16:00:00Z",
  });
  const facts = await service.facts(owner, period);
  assert.equal(facts.metrics.completed, 205);
  assert.equal(facts.coverage.selected, 60);
  assert.equal(calls, 0);
  const [a, b] = await Promise.all([
    service.enqueue(owner, period),
    service.enqueue(owner, period, "scheduled"),
  ]);
  assert.equal(a.job.id, b.job.id);
  const worker2 = new SummaryService(pool, service.provider, limits, () => now);
  await Promise.all([service.workOne(), worker2.workOne()]);
  assert.equal(calls, 1);
  const report = (await service.facts(owner, period)).report!;
  assert.equal(report.metrics.completed, 205);
  assert.equal(report.generationMode, "ai");
  assert.equal(report.version, 1);
  assert.equal((await service.enqueue(owner, period)).report?.id, report.id);
  assert.equal(calls, 1);
  await assert.rejects(service.report(other, report.id));
  const inputBytes = JSON.stringify(
    (
      await pool.query("SELECT report FROM summary_reports WHERE id=$1", [
        report.id,
      ])
    ).rows[0].report,
  ).length;
  // Cached reads from another service/device do not generate.
  assert.equal((await worker2.facts(owner, period)).report?.id, report.id);
  const source = report.sources[0].id;
  await pool.query(
    `UPDATE notes SET data=jsonb_set(data,'{description}','"Новое описание"') WHERE id=$1 AND owner_id=$2`,
    [source, owner],
  );
  assert.equal((await service.facts(owner, period)).report?.freshness, "stale");
  assert.equal(calls, 1);
  changeDuring = true;
  await service.enqueue(owner, period);
  await service.workOne();
  changeDuring = false;
  const updated = (await service.facts(owner, period)).report!;
  assert.equal(updated.version, 2);
  assert.equal(updated.freshness, "stale");
  fail = true;
  const failure = await service.enqueue(owner, period);
  await service.workOne();
  assert.equal((await service.facts(owner, period)).report?.id, updated.id);
  const failed = (
    await pool.query("SELECT * FROM summary_jobs WHERE id=$1", [failure.job.id])
  ).rows[0];
  assert.equal(failed.stage, "error");
  assert.equal(failed.error, "AI_UNAVAILABLE");
  assert.equal(
    (await service.report(owner, failed.report_id)).generationMode,
    "facts",
  );
  assert.equal((await service.enqueue(owner, period)).job.id, failure.job.id);
  assert.equal(calls, 3);
  fail = false;
  await service.workOne();
  assert.equal(calls, 4);
  assert.equal(
    (await service.facts(owner, period)).report?.generationMode,
    "ai",
  );
  assert.equal((await service.enqueue(owner, period)).job.stage, "completed");
  assert.equal(calls, 4);
  await pool.query("DELETE FROM notes WHERE id=$1 AND owner_id=$2", [
    source,
    owner,
  ]);
  assert.equal(
    (await service.report(owner, report.id)).sources.find(
      (s) => s.id === source,
    )?.available,
    false,
  );
  const history = await pool.query(
    "SELECT version FROM summary_reports WHERE owner_id=$1 ORDER BY version",
    [owner],
  );
  assert.equal(history.rows.length, 4);
  console.log(
    `Summary synthetic benchmark: 205 records; input ${report.generationInfo?.inputChars} chars; output ${report.generationInfo?.outputChars} chars; saved report ${inputBytes} chars; LLM calls ${calls}; total ${Math.round(performance.now() - start)} ms`,
  );
  await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [
    [owner, other],
  ]);
});

test("manual summary generation recovers after terminal failure and cooldown", async () => {
  const owner = randomUUID();
  await pool.query(
    "INSERT INTO users(id,email,password_hash) VALUES($1,$2,'synthetic')",
    [owner, `${owner}@test.invalid`],
  );
  const now = new Date("2026-10-07T17:00:00Z");
  const period = presetPeriod("day", "Europe/Saratov", now);
  await insertNote(pool, owner, {
    title: "Заметка для повтора",
    status: "completed",
    priority: "medium",
    categoryTag: "#Тест",
    isFocus: false,
    completedAt: "2026-10-07T16:00:00Z",
    createdAt: "2026-10-07T16:00:00Z",
  });
  let available = false;
  let calls = 0;
  const service = new SummaryService(
    pool,
    {
      ...provider,
      summarize: async (context) => {
        calls++;
        if (!available) throw new ApiError(503, "AI_UNAVAILABLE", "Synthetic outage");
        return {
          ...factualSummary(context),
          overview: {
            text: context.facts[0].text,
            noteIds: [],
            factIds: [context.facts[0].id],
          },
        };
      },
    },
    { ...defaultSummaryLimits, maxPerHour: 2 },
    () => now,
  );
  const first = await service.enqueue(owner, period);
  await service.workOne();
  await service.enqueue(owner, period);
  await service.workOne();
  assert.equal(calls, 2);
  assert.equal((await service.enqueue(owner, period)).job.stage, "error");
  available = true;
  await pool.query(
    "UPDATE summary_jobs SET created_at=now()-interval '2 hours' WHERE id=$1",
    [first.job.id],
  );
  const retry = await service.enqueue(owner, period);
  assert.equal(retry.job.id, first.job.id);
  assert.equal(retry.job.stage, "queued");
  assert.equal(retry.job.attempts, 0);
  await service.workOne();
  assert.equal(calls, 3);
  const result = await service.facts(owner, period);
  assert.equal(result.report?.generationMode, "ai");
  assert.equal(result.report?.overview.text, result.facts[0].text);
  const completed = await pool.query(
    "SELECT stage,attempts,error FROM summary_jobs WHERE id=$1",
    [first.job.id],
  );
  assert.deepEqual(completed.rows[0], {
    stage: "completed",
    attempts: 1,
    error: null,
  });
  assert.equal(
    (await service.enqueue(owner, presetPeriod("week", "Europe/Saratov", now))).job.stage,
    "queued",
  );
  await assert.rejects(
    service.enqueue(owner, presetPeriod("month", "Europe/Saratov", now)),
    (error: unknown) => error instanceof ApiError && error.code === "SUMMARY_RATE_LIMIT",
  );
  await pool.query("DELETE FROM users WHERE id=$1", [owner]);
});

test("summary scheduler runs with no client, catches up once, persists settings and resumes expired leases", async () => {
  const owner = randomUUID();
  await pool.query(
    `INSERT INTO users(id,email,password_hash) VALUES($1,$2,'synthetic')`,
    [owner, `${owner}@test.invalid`],
  );
  let now = new Date("2026-10-01T12:00:00Z"),
    calls = 0;
  const service = new SummaryService(
    pool,
    {
      ...provider,
      summarize: async (c) => {
        calls++;
        return {
          ...factualSummary(c),
          overview: {
            text: c.facts[0].text,
            noteIds: [],
            factIds: [c.facts[0].id],
          },
        };
      },
    },
    defaultSummaryLimits,
    () => now,
  );
  const settings = await service.saveSettings(owner, {
    enabled: true,
    timeZone: "Europe/Saratov",
    localTime: "21:00",
  });
  assert.equal(settings.nextRun, "2026-10-01T17:00:00.000Z");
  assert.equal(
    (await service.saveSettings(owner, { timeZone: "UTC", initialize: true }))
      .timeZone,
    "Europe/Saratov",
  );
  now = new Date("2026-10-07T18:00:00Z");
  await insertNote(pool, owner, {
    title: "Вечерняя синтетическая запись",
    status: "todo",
    priority: "medium",
    categoryTag: "#Тест",
    isFocus: false,
    createdAt: "2026-10-07T10:00:00Z",
  });
  await Promise.all([service.scheduled(), service.scheduled()]);
  const jobs = await pool.query(
    "SELECT * FROM summary_jobs WHERE owner_id=$1",
    [owner],
  );
  assert.equal(jobs.rows.length, 1);
  assert.equal(jobs.rows[0].period.startDate, "2026-10-07");
  const oldLease = randomUUID();
  await pool.query(
    `UPDATE summary_jobs SET stage='running',attempts=1,lease_token=$2,lease_until=now()-interval '1 minute' WHERE id=$1`,
    [jobs.rows[0].id, oldLease],
  );
  const restarted = new SummaryService(
    pool,
    service.provider,
    defaultSummaryLimits,
    () => now,
  );
  await Promise.all([restarted.workOne(), service.workOne()]);
  assert.equal(calls, 1);
  const r = (
    await restarted.facts(owner, presetPeriod("day", "Europe/Saratov", now))
  ).report!;
  assert.equal(r.asOf, now.toISOString());
  assert.equal(
    (
      await pool.query("SELECT lease_token FROM summary_jobs WHERE id=$1", [
        jobs.rows[0].id,
      ])
    ).rows[0].lease_token,
    null,
  );
  await service.scheduled();
  assert.equal(
    (
      await pool.query("SELECT count(*) FROM summary_jobs WHERE owner_id=$1", [
        owner,
      ])
    ).rows[0].count,
    "1",
  );
  await restarted.saveSettings(owner, {
    enabled: false,
    timeZone: "America/New_York",
    localTime: "20:30",
  });
  now = new Date("2026-10-10T18:00:00Z");
  await restarted.scheduled();
  assert.equal(calls, 1);
  await pool.query("DELETE FROM users WHERE id=$1", [owner]);
});

test("summary API authenticates, rejects owner/metrics injection, exposes settings and paginates slots", async () => {
  const period = presetPeriod("day", "UTC");
  const query = `/api/v1/summaries/facts?period=${encodeURIComponent(JSON.stringify(period))}`;
  assert.equal((await app.inject(query)).statusCode, 401);
  assert.equal(
    (await app.inject({ url: query, headers: auth(alice) })).statusCode,
    200,
  );
  const rejected = await app.inject({
    method: "POST",
    url: "/api/v1/summaries/generate",
    headers: auth(alice),
    payload: { ...period, ownerId: "other", metrics: { completed: 999 } },
  });
  assert.equal(rejected.statusCode, 400);
  const settings = await app.inject({
    method: "PATCH",
    url: "/api/v1/summaries/settings",
    headers: auth(alice),
    payload: { enabled: false, timeZone: "UTC", localTime: "21:00" },
  });
  assert.equal(settings.statusCode, 200, settings.body);
  assert.equal(
    (
      await app.inject({
        url: "/api/v1/summaries/settings",
        headers: auth(bob),
      })
    ).json().timeZone,
    null,
  );
  const generated = await app.inject({
    method: "POST",
    url: "/api/v1/summaries/generate",
    headers: auth(alice),
    payload: period,
  });
  assert.equal(generated.statusCode, 202, generated.body);
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/summaries/jobs/${generated.json().job.id}`,
        headers: auth(bob),
      })
    ).statusCode,
    404,
  );
  const worker = new SummaryService(pool, provider);
  await worker.workOne();
  const archive = await app.inject({
    url: "/api/v1/summaries/archive?limit=1",
    headers: auth(alice),
  });
  assert.equal(archive.statusCode, 200);
  assert.equal(archive.json().reports.length, 1);
  const report = archive.json().reports[0];
  assert.equal(
    (
      await app.inject({
        url: `/api/v1/summaries/reports/${report.id}`,
        headers: auth(bob),
      })
    ).statusCode,
    404,
  );
});

test("summary empty periods never invoke provider; limits are persisted per owner and DB failure stays an error", async () => {
  const owner = randomUUID();
  await pool.query(
    `INSERT INTO users(id,email,password_hash) VALUES($1,$2,'synthetic')`,
    [owner, `${owner}@test.invalid`],
  );
  let calls = 0;
  const service = new SummaryService(
    pool,
    {
      ...provider,
      summarize: async () => {
        calls++;
        throw new Error("must not call");
      },
    },
    { ...defaultSummaryLimits, maxPerHour: 1 },
  );
  const p = presetPeriod("day", "UTC");
  await service.enqueue(owner, p);
  await service.workOne();
  assert.equal(calls, 0);
  assert.equal((await service.facts(owner, p)).report?.generationMode, "empty");
  const cached = await service.enqueue(owner, p);
  assert.ok(cached.report);
  assert.equal(calls, 0);
  await assert.rejects(
    service.enqueue(owner, { ...p, tags: ["other"] }),
    (e) => e instanceof ApiError && e.statusCode === 429,
  );
  const unavailable = new pg.Pool({
    connectionString: "postgresql://test:test@127.0.0.1:1/summary_test",
    connectionTimeoutMillis: 100,
  });
  try {
    await assert.rejects(
      new SummaryService(unavailable, provider).facts(owner, p),
    );
  } finally {
    await unavailable.end();
  }
  await pool.query("DELETE FROM users WHERE id=$1", [owner]);
});

test("expired summary worker cannot publish over recovered lease", async () => {
  const owner = randomUUID();
  await pool.query(
    `INSERT INTO users(id,email,password_hash) VALUES($1,$2,'synthetic')`,
    [owner, `${owner}@test.invalid`],
  );
  const now = new Date("2026-10-07T17:00:00Z"),
    p = presetPeriod("day", "UTC", now);
  await insertNote(pool, owner, {
    title: "Синтетический источник",
    status: "todo",
    priority: "medium",
    categoryTag: "#Тест",
    isFocus: false,
    createdAt: "2026-10-07T09:00:00Z",
  });
  let start!: (value?: unknown) => void,
    finish!: (value?: unknown) => void,
    calls = 0;
  const started = new Promise((r) => {
      start = r;
    }),
    blocked = new Promise((r) => {
      finish = r;
    });
  const adapter = {
    ...provider,
    summarize: async (c: any) => {
      calls++;
      if (calls === 1) {
        start();
        await blocked;
      }
      return {
        ...factualSummary(c),
        overview: {
          text: c.facts[0].text,
          noteIds: [],
          factIds: [c.facts[0].id],
        },
      };
    },
  };
  const first = new SummaryService(
      pool,
      adapter,
      defaultSummaryLimits,
      () => now,
    ),
    second = new SummaryService(pool, adapter, defaultSummaryLimits, () => now);
  const queued = await first.enqueue(owner, p),
    running = first.workOne();
  await started;
  await pool.query(
    `UPDATE summary_jobs SET lease_until=now()-interval '1 minute' WHERE id=$1`,
    [queued.job.id],
  );
  await second.workOne();
  const report = (await second.facts(owner, p)).report!;
  finish();
  await running;
  assert.equal((await first.facts(owner, p)).report?.id, report.id);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*) FROM summary_reports WHERE owner_id=$1",
        [owner],
      )
    ).rows[0].count,
    "1",
  );
  await pool.query("DELETE FROM users WHERE id=$1", [owner]);
});
