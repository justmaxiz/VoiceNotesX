import cors from "@fastify/cors";
import Fastify from "fastify";
import type { ServerConfig } from "./config.js";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { registerDictation } from "./dictation.js";
import { createPool } from "./database.js";
import { authentication } from "./auth.js";
import { registerNotes } from "./notes.js";
import { AudioStorage } from "./storage.js";
import { AudioWorker, registerAudio, MAX_AUDIO_BYTES } from "./audio.js";
import { createProvider, validateStructure, type AIProvider } from "./ai.js";
import type pg from "pg";
import { openApi } from "./openapi.js";
import { ApiError } from "./errors.js";
import { SummaryService, registerSummaries } from "./summaries.js";
import { defaultSummaryLimits } from "./summaryFacts.js";
declare module "fastify" {
  interface FastifyRequest {
    resourceSlot: string;
  }
}

export async function buildApp(
  config: ServerConfig,
  options: { pool?: pg.Pool; provider?: AIProvider; worker?: boolean } = {},
) {
  const app = Fastify({
    logger:
      config.nodeEnv !== "test"
        ? {
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              "res.headers.set-cookie",
            ],
          }
        : false,
    trustProxy: false,
    bodyLimit: 1_000_000,
    ajv: { customOptions: { removeAdditional: false } },
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error("Request failed");
    const statusCodeValue =
      typeof error === "object" && error !== null && "statusCode" in error
        ? error.statusCode
        : undefined;
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : typeof statusCodeValue === "number" &&
            statusCodeValue >= 400 &&
            statusCodeValue < 500
          ? statusCodeValue
          : 500;
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "REQUEST_ERROR";
    const errorMessage =
      error instanceof Error ? error.message : "Request failed.";

    return reply.status(statusCode).send({
      error: {
        code:
          error instanceof ApiError || statusCode < 500
            ? errorCode
            : "INTERNAL_ERROR",
        message:
          error instanceof ApiError || statusCode < 500
            ? errorMessage
            : "Internal server error.",
      },
    });
  });

  await app.register(cookie);
  await app.register(websocket, { options: { maxPayload: 65536 } });
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(multipart, {
    limits: { fileSize: MAX_AUDIO_BYTES, files: 1, fields: 6 },
  });
  const active: Record<string, number> = {};
  app.decorateRequest("resourceSlot", "");
  app.addHook("onRequest", async (request) => {
    const route = request.url.split("?")[0];
    const limit =
      route === "/api/v1/audio/upload"
        ? 2
        : route === "/api/v1/ai/structure"
          ? 4
          : 0;
    if (!limit || request.method !== "POST") return;
    if ((active[route] || 0) >= limit)
      throw new ApiError(429, "BUSY", "Сервер занят. Повторите запрос позже.");
    active[route] = (active[route] || 0) + 1;
    request.resourceSlot = route;
  });
  const releaseSlot = (request: import("fastify").FastifyRequest) => {
    if (request.resourceSlot) {
      active[request.resourceSlot]--;
      request.resourceSlot = "";
    }
  };
  app.addHook("onResponse", async (request) => releaseSlot(request));
  app.addHook("onRequestAbort", async (request) => releaseSlot(request));
  const pool = options.pool || createPool(config);
  pool.on("error", () => app.log.error("Database connection lost"));
  const auth = authentication(pool, config);
  app.decorateRequest("ownerId", "");
  auth.register(app);
  registerDictation(app, config, auth.requireMediaUser);
  registerNotes(app, pool, auth.requireUser);
  const storage = new AudioStorage(config.audioStoragePath);
  await storage.init();
  const provider = options.provider || createProvider(config);
  const summaryLimits = { ...defaultSummaryLimits };
  for (const [key, env] of Object.entries({
    maxDays: "SUMMARY_MAX_DAYS",
    maxNotes: "SUMMARY_MAX_NOTES",
    maxChars: "SUMMARY_MAX_CHARS",
    fieldChars: "SUMMARY_FIELD_CHARS",
    maxPerHour: "SUMMARY_MAX_PER_HOUR",
    concurrency: "SUMMARY_CONCURRENCY",
  })) {
    const value = process.env[env];
    if (value !== undefined) {
      if (!/^\d+$/.test(value) || Number(value) < 1)
        throw new Error(`Invalid ${env}`);
      summaryLimits[key as keyof typeof summaryLimits] = Number(value);
    }
  }
  const summaries = new SummaryService(
    pool,
    provider,
    summaryLimits,
    () => new Date(),
    `${config.aiProvider}:${config.aiProvider === "gemini" ? config.geminiModel || "gemini-2.5-flash" : "aliceai-llm"}:v1-extractive-2`,
  );
  registerSummaries(app, summaries, auth.requireUser);
  const stopSummaries =
    options.worker !== false
      ? summaries.start(() => app.log.error("Summary maintenance failed"))
      : async () => {};
  registerAudio(app, pool, storage, auth.requireUser, auth.requireMediaUser);
  const worker = new AudioWorker(pool, storage, provider, (code) =>
    app.log.error({ code }, "Audio maintenance failed"),
  );
  if (options.worker !== false) worker.start();
  app.addHook("onClose", async () => {
    await stopSummaries();
    await worker.stop();
    if (!options.pool) await pool.end();
  });
  app.get("/api/v1/ready", async (_request, reply) => {
    try {
      await pool.query("SELECT 1");
      return { status: "ready" };
    } catch {
      return reply.status(503).send({ status: "unavailable" });
    }
  });
  app.get("/api/v1/openapi.json", async () => openApi);
  app.post(
    "/api/v1/ai/structure",
    {
      preHandler: auth.requireUser,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["text"],
          properties: {
            text: { type: "string", minLength: 1, maxLength: 100000 },
            mode: { type: "string", enum: ["fast", "deep"] },
            style: {
              type: "string",
              enum: ["concise", "detailed", "action_plan"],
            },
            currentIsoDate: { type: "string", format: "date-time" },
            timeZone: { type: "string", maxLength: 100 },
          },
        },
      },
    },
    async (request) => {
      const { text, ...context } = request.body as {
        text: string;
        mode?: "fast" | "deep";
        style?: "concise" | "detailed" | "action_plan";
        currentIsoDate?: string;
        timeZone?: string;
      };
      return {
        result: validateStructure(await provider.structure(text, context)),
      };
    },
  );

  app.get("/api/v1/health", async () => ({ status: "ok" }));

  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
      },
    });
  });

  return app;
}
