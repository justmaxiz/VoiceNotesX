/** Disposable synthetic preview. No live AI credentials and no application database. */
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer as createSocket } from "node:net";
import { randomBytes } from "node:crypto";
import { createServer as createVite } from "vite";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { migrate } from "../src/migrate.js";
import { insertNote } from "../src/notes.js";
import { factualSummary } from "../src/summaryFacts.js";
import { SummaryService } from "../src/summaries.js";
import { presetPeriod } from "../src/summaryContracts.js";
const root = await mkdtemp(join(tmpdir(), "voicenotes-summary-preview-"));
const socket = createSocket();
await new Promise<void>((r) => socket.listen(0, "127.0.0.1", r));
const port = (socket.address() as { port: number }).port;
await new Promise<void>((r) => socket.close(() => r()));
const secret = randomBytes(32).toString("hex");
const cluster = new EmbeddedPostgres({
  databaseDir: join(root, "pg"),
  user: "postgres",
  password: secret,
  port,
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
await bootstrap.query("CREATE DATABASE summary_preview");
await bootstrap.end();
const databaseUrl = `postgresql://postgres:${secret}@127.0.0.1:${port}/summary_preview`;
await migrate(databaseUrl, resolve("migrations"));
const pool = new pg.Pool({ connectionString: databaseUrl });
const provider = {
  structure: async () => {
    throw new Error("Preview only");
  },
  transcribe: async () => "",
  analyze: async () => ({ summary: "", candidates: [] }),
  summarize: async (c: any) => ({
    ...factualSummary(c),
    overview: { text: c.facts[0].text, noteIds: [], factIds: [c.facts[0].id] },
    highlights: c.notes
      .filter((n: any) => n.status === "completed")
      .slice(0, 3)
      .map((n: any) => ({ text: n.title, noteIds: [n.id], factIds: [] })),
    themes: c.notes
      .slice(0, 2)
      .map((n: any) => ({ text: n.title, noteIds: [n.id], factIds: [] })),
  }),
};
const config = loadConfig({
  NODE_ENV: "test",
  PORT: "3101",
  DATABASE_URL: databaseUrl,
  JWT_SECRET: secret,
  AUDIO_STORAGE_PATH: join(root, "audio"),
  CORS_ORIGINS: "http://127.0.0.1:5178",
});
const app = await buildApp(config, { pool, provider, worker: false });
const registered = await app.inject({
  method: "POST",
  url: "/api/v1/auth/register",
  headers: { origin: "http://127.0.0.1:5178" },
  payload: {
    email: "summary-preview@test.invalid",
    password: "synthetic-preview-password",
  },
});
const owner = registered.json().user.id;
const now = new Date(),
  earlier = new Date(+now - 3600000).toISOString();
for (const [title, status, priority] of [
  ["Отправить макет страницы сводок", "completed", "high"],
  ["Подготовить синтетический набор приёмки", "completed", "medium"],
  ["Проверить источники отчёта", "todo", "high"],
] as const)
  await insertNote(pool, owner, {
    title,
    status,
    priority,
    categoryTag: "#Разработка",
    isFocus: false,
    createdAt: earlier,
    completedAt: status === "completed" ? earlier : undefined,
    dueDate: status === "todo" ? "2026-01-01" : undefined,
  });
const service = new SummaryService(
  pool,
  provider,
  undefined,
  () => now,
  `${config.aiProvider}:gemini-2.5-flash:v1-extractive-1`,
);
await service.enqueue(owner, presetPeriod("day", "Europe/Saratov", now));
await service.workOne();
await service.saveSettings(owner, {
  timeZone: "Europe/Saratov",
  enabled: true,
});
await app.listen({ host: "127.0.0.1", port: 3101 });
const vite = await createVite({
  root: resolve(".."),
  server: { host: "127.0.0.1", port: 5178, strictPort: true },
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:3101"),
  },
});
await vite.listen();
console.log(
  "Synthetic preview ready at http://127.0.0.1:5178; summary-preview@test.invalid / synthetic-preview-password",
);
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  await vite.close();
  await app.close();
  await pool.end();
  await cluster.stop();
  process.exit(0);
};
process.on("SIGINT", () => void close());
process.on("SIGTERM", () => void close());
