import {
  summaryLLMSchema,
  summaryPeriodSchema,
  summarySettingsSchema,
} from "./summaryContracts.js";
const text = { type: "string" },
  number = { type: "number" },
  bool = { type: "boolean" };
const object = (
  properties: Record<string, unknown>,
  required = Object.keys(properties),
) => ({ type: "object", additionalProperties: false, properties, required });
const list = (items: unknown) => ({ type: "array", items });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const counts = {
  type: "object",
  additionalProperties: { type: "integer", minimum: 0 },
};
const reportFields = {
  ...summaryLLMSchema.properties,
  id: text,
  slotKey: text,
  version: number,
  period: ref("SummaryPeriod"),
  asOf: text,
  generatedAt: text,
  metrics: ref("SummaryMetrics"),
  facts: list(ref("SummaryFact")),
  sources: list(ref("SummarySource")),
  coverage: ref("SummaryCoverage"),
  sourceFingerprint: text,
  generationMode: { enum: ["ai", "facts", "empty"] },
  freshness: { enum: ["current", "stale", "historical_snapshot"] },
};
export const summarySchemas = {
  SummaryPeriod: summaryPeriodSchema,
  SummaryLLM: summaryLLMSchema,
  SummaryMetrics: object({
    completed: number,
    createdScheduled: number,
    createdUnscheduled: number,
    openScheduled: number,
    overdue: number,
    upcoming: number,
    plannedMinutes: number,
    estimatedCount: number,
    scheduledCount: number,
    checklistCompleted: number,
    checklistTotal: number,
    overlaps: number,
    byDate: counts,
    byPriority: counts,
    byTag: counts,
    comparison: {
      anyOf: [
        { type: "null" },
        object({
          completed: number,
          delta: number,
          startDate: text,
          endDateExclusive: text,
          asOf: text,
        }),
      ],
    },
  }),
  SummaryFact: object({
    id: text,
    kind: text,
    value: number,
    text,
    noteIds: list(text),
    timeBasis: { enum: ["period", "current"] },
    asOf: text,
  }),
  SummarySource: object(
    {
      id: text,
      title: text,
      status: text,
      available: bool,
      schedule: object(
        {
          startDate: { anyOf: [text, { type: "null" }] },
          deadline: { anyOf: [text, { type: "null" }] },
          dueDate: { anyOf: [text, { type: "null" }] },
          dueTime: { anyOf: [text, { type: "null" }] },
          isAllDay: bool,
          timeZone: text,
        },
        [],
      ),
    },
    ["id", "title", "status", "available"],
  ),
  SummaryCoverage: object({
    total: number,
    selected: number,
    truncatedTexts: number,
    limitations: list(text),
  }),
  SummaryReport: object(
    {
      ...reportFields,
      generationInfo: object(
        {
          generatorVersion: text,
          modelVersion: text,
          inputChars: number,
          outputChars: number,
          durationMs: number,
          inputTokens: number,
          outputTokens: number,
        },
        [
          "generatorVersion",
          "modelVersion",
          "inputChars",
          "outputChars",
          "durationMs",
        ],
      ),
    },
    Object.keys(reportFields),
  ),
  SummaryJob: object(
    {
      id: text,
      stage: { enum: ["queued", "running", "completed", "error"] },
      attempts: number,
      error: text,
      reportId: text,
    },
    ["id", "stage", "attempts"],
  ),
  SummarySettings: object({
    enabled: bool,
    timeZone: { anyOf: [text, { type: "null" }] },
    localTime: text,
    version: number,
    nextRun: { anyOf: [text, { type: "null" }] },
  }),
  SummarySettingsInput: summarySettingsSchema,
  SummaryFactsResponse: object({
    period: ref("SummaryPeriod"),
    asOf: text,
    metrics: ref("SummaryMetrics"),
    facts: list(ref("SummaryFact")),
    coverage: ref("SummaryCoverage"),
    sourceFingerprint: text,
    report: { anyOf: [ref("SummaryReport"), { type: "null" }] },
  }),
  SummaryGenerationResponse: object({
    job: ref("SummaryJob"),
    report: { anyOf: [ref("SummaryReport"), { type: "null" }] },
  }),
  SummaryJobResponse: object({ job: ref("SummaryJob") }),
  SummaryArchive: object({
    reports: list(ref("SummaryReport")),
    nextOffset: { anyOf: [number, { type: "null" }] },
  }),
};
