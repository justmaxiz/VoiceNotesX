import { noteInputSchema, noteFields, structuredSchema } from "./contracts.js";
import { summarySchemas } from "./summarySchemas.js";
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const response = (name: string) => ({
  description: "Successful response",
  content: { "application/json": { schema: ref(name) } },
});
const jsonBody = (schema: object) => ({
  required: true,
  content: { "application/json": { schema } },
});
const secure = { security: [{ bearerAuth: [] }] };
const id = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};
const operation = (summary: string, name: string, extra: object = {}) => ({
  summary,
  ...secure,
  responses: {
    200: response(name),
    400: { description: "Invalid input" },
    401: { description: "Authentication required" },
    404: { description: "Not found" },
  },
  ...extra,
});
export const openApi = {
  openapi: "3.1.0",
  info: {
    title: "VoiceNotes API",
    version: "1.0.0",
    description:
      "Dates: YYYY-MM-DD; local clock: HH:mm; instants: ISO8601 with offset; timeZone: IANA. Schedule changes preserve note ID. Refresh cookie uses HttpOnly, SameSite=Strict and requires an allowed Origin. Expo refresh tokens belong in secure platform storage.",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ...summarySchemas,
      Note: {
        type: "object",
        required: [
          "id",
          "title",
          "status",
          "priority",
          "categoryTag",
          "isFocus",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          ...noteFields,
          id: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time" },
          audioUrl: { type: "string" },
          audioDuration: { type: "number" },
        },
      },
      NoteInput: noteInputSchema,
      StructuredNote: structuredSchema,
      AudioMetadataResponse: {
        type: "object",
        required: ["audio"],
        properties: {
          audio: {
            type: "object",
            required: [
              "id",
              "filename",
              "mimeType",
              "duration",
              "expiresAt",
              "expired",
            ],
            properties: {
              id: { type: "string", format: "uuid" },
              filename: { type: "string" },
              mimeType: { type: "string" },
              duration: { type: "number" },
              expiresAt: { type: "string", format: "date-time" },
              expired: { type: "boolean" },
            },
          },
        },
      },
      UploadResponse: {
        oneOf: [
          ref("JobResponse"),
          {
            type: "object",
            required: ["audioId"],
            properties: { audioId: { type: "string", format: "uuid" } },
          },
        ],
      },
      AIResponse: {
        type: "object",
        required: ["result"],
        properties: { result: ref("StructuredNote") },
      },
      JobResponse: { type: "object", properties: { job: ref("Job") } },
      JobList: {
        type: "object",
        properties: { jobs: { type: "array", items: ref("Job") } },
      },
      ApprovalResponse: {
        type: "object",
        properties: {
          ids: { type: "array", items: { type: "string", format: "uuid" } },
        },
      },
      ImportResponse: {
        type: "object",
        properties: {
          count: { type: "integer" },
          notes: {
            type: "array",
            items: {
              type: "object",
              properties: { legacyId: { type: "string" }, note: ref("Note") },
            },
          },
        },
      },
      ImportNote: {
        ...noteInputSchema,
        properties: {
          ...noteFields,
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time" },
        },
      },
      NoteResponse: { type: "object", properties: { note: ref("Note") } },
      NoteList: {
        type: "object",
        properties: {
          notes: { type: "array", items: ref("Note") },
          total: { type: "integer" },
          limit: { type: "integer" },
          offset: { type: "integer" },
        },
      },
      Session: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string", description: "Expo only" },
          user: {
            type: "object",
            properties: { id: { type: "string" }, email: { type: "string" } },
          },
        },
      },
      Job: {
        type: "object",
        properties: {
          id: { type: "string" },
          audioId: { type: "string" },
          filename: { type: "string" },
          stage: {
            enum: ["queued", "transcribing", "analyzing", "completed", "error"],
          },
          transcript: { type: "string" },
          summary: { type: "string" },
          candidates: { type: "array", items: ref("StructuredNote") },
          error: { type: ["string", "null"] },
          approvedAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/summaries/facts": {
      get: operation(
        "Read facts and last report without generation",
        "SummaryFactsResponse",
        {
          parameters: [
            {
              name: "period",
              in: "query",
              required: true,
              schema: { type: "string" },
              description:
                "JSON SummaryPeriod. Server normalizes dates, IANA timezone and any-match tags.",
            },
          ],
        },
      ),
    },
    "/summaries/generate": {
      post: operation(
        "Generate or reuse same input",
        "SummaryGenerationResponse",
        {
          requestBody: jsonBody(ref("SummaryPeriod")),
          responses: {
            200: response("SummaryGenerationResponse"),
            202: response("SummaryGenerationResponse"),
            429: {
              description: "Owner hourly limit",
              headers: { "Retry-After": { schema: { type: "integer" } } },
            },
          },
        },
      ),
    },
    "/summaries/jobs/{id}": {
      get: operation("Read persistent generation job", "SummaryJobResponse", {
        parameters: [id],
      }),
    },
    "/summaries/reports/{id}": {
      get: operation(
        "Read saved version and source availability",
        "SummaryReport",
        { parameters: [id] },
      ),
    },
    "/summaries/archive": {
      get: operation("Latest saved version per slot", "SummaryArchive", {
        parameters: [
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", minimum: 0 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 50 },
          },
        ],
      }),
    },
    "/summaries/settings": {
      get: operation("Read evening generation settings", "SummarySettings"),
      patch: operation(
        "Set IANA timezone and local evening time",
        "SummarySettings",
        { requestBody: jsonBody(ref("SummarySettingsInput")) },
      ),
    },
    "/notes": {
      get: operation("List own notes", "NoteList", {
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", maximum: 200 },
          },
          { name: "offset", in: "query", schema: { type: "integer" } },
          {
            name: "scheduled",
            in: "query",
            schema: { enum: ["true", "false"] },
          },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: noteFields.status },
          {
            name: "sort",
            in: "query",
            schema: { enum: ["updated", "title", "priority", "schedule"] },
          },
        ],
      }),
      post: operation("Create note", "NoteResponse", {
        requestBody: jsonBody({
          ...noteInputSchema,
          properties: { ...noteFields, id: { type: "string", format: "uuid" } },
        }),
        responses: { 201: response("NoteResponse") },
      }),
    },
    "/notes/{id}": {
      parameters: [id],
      get: operation("Read own note", "NoteResponse"),
      patch: operation(
        "Update fields or remove schedule using null",
        "NoteResponse",
        { requestBody: jsonBody({ type: "object", properties: noteFields }) },
      ),
      delete: { ...secure, responses: { 204: { description: "Deleted" } } },
    },
    "/auth/register": {
      post: {
        summary: "Register",
        requestBody: jsonBody({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string" },
            password: { type: "string", minLength: 10 },
            platform: { enum: ["web", "expo"] },
          },
        }),
        responses: { 200: response("Session") },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login",
        requestBody: jsonBody({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string" },
            password: { type: "string" },
            platform: { enum: ["web", "expo"] },
          },
        }),
        responses: { 200: response("Session") },
      },
    },
    "/auth/refresh": {
      post: {
        summary:
          "Rotate session; web requires Origin and cookie; Expo sends refreshToken",
        responses: { 200: response("Session") },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Revoke session family",
        responses: { 200: { description: "Signed out" } },
      },
    },
    "/auth/me": { get: operation("Current user", "Session") },
    "/ai/structure": {
      post: operation("Structure original text", "AIResponse", {
        requestBody: jsonBody({
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string" },
            mode: { enum: ["fast", "deep"] },
            style: { enum: ["concise", "detailed", "action_plan"] },
            currentIsoDate: { type: "string", format: "date-time" },
            timeZone: { type: "string" },
          },
        }),
      }),
    },
    "/audio/upload": {
      post: operation(
        "Upload private audio, maximum 100 MiB / 2 hours",
        "JobResponse",
        {
          responses: {
            201: response("UploadResponse"),
            413: { description: "Too large" },
            415: { description: "Unsupported format" },
            422: { description: "Invalid duration" },
          },
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    file: { type: "string", format: "binary" },
                    temporary: { type: "boolean" },
                    mode: {
                      type: "string",
                      enum: ["fast", "deep"],
                      default: "fast",
                    },
                    style: {
                      type: "string",
                      enum: ["concise", "detailed", "action_plan"],
                      default: "concise",
                    },
                    currentIsoDate: { type: "string", format: "date-time" },
                    timeZone: { type: "string", maxLength: 100 },
                    legacyId: {
                      type: "string",
                      description: "Import without AI analysis",
                    },
                  },
                },
              },
            },
          },
        },
      ),
    },
    "/audio/jobs": {
      get: operation(
        "List jobs, including pending jobs after restart",
        "JobList",
      ),
    },
    "/audio/jobs/{id}": {
      parameters: [id],
      get: operation("Poll processing stage", "JobResponse"),
    },
    "/audio/jobs/{id}/retry": {
      parameters: [id],
      post: operation("Retry failed processing", "JobResponse"),
    },
    "/audio/jobs/{id}/approve": {
      parameters: [id],
      post: operation(
        "Idempotently approve selected candidates",
        "ApprovalResponse",
        {
          requestBody: jsonBody({
            type: "object",
            properties: {
              candidates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer" },
                    note: ref("StructuredNote"),
                  },
                },
              },
            },
          }),
        },
      ),
    },
    "/audio/{id}": {
      parameters: [id],
      get: operation("Read private audio metadata", "AudioMetadataResponse"),
    },
    "/audio/{id}/file": {
      parameters: [id],
      get: {
        summary:
          "Private file; web refresh cookie or Expo bearer; supports single HTTP byte Range",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Audio stream" },
          206: { description: "Byte range" },
          410: { description: "Expired" },
          416: { description: "Invalid range" },
        },
      },
    },
    "/import/notes": {
      post: operation(
        "Idempotent batches by (owner, legacyId)",
        "ImportResponse",
        {
          requestBody: jsonBody({
            type: "object",
            properties: {
              notes: {
                type: "array",
                maxItems: 100,
                items: {
                  type: "object",
                  properties: {
                    legacyId: { type: "string" },
                    note: ref("ImportNote"),
                  },
                },
              },
            },
          }),
        },
      ),
    },
  },
};
