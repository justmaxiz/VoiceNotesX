/** Shared v1 wire contract. Dates are local calendar dates; end is exclusive. */
export interface SummaryPeriod {
  startDate: string;
  endDateExclusive: string;
  timeZone: string;
  tags: string[];
  category?: string;
  comparison?: boolean;
}
export type SummaryPreset = "day" | "rolling7" | "week" | "month";
export interface SummaryMetrics {
  completed: number;
  createdScheduled: number;
  createdUnscheduled: number;
  openScheduled: number;
  overdue: number;
  upcoming: number;
  plannedMinutes: number;
  estimatedCount: number;
  scheduledCount: number;
  checklistCompleted: number;
  checklistTotal: number;
  overlaps: number;
  byDate: Record<string, number>;
  byPriority: Record<string, number>;
  byTag: Record<string, number>;
  comparison: {
    completed: number;
    delta: number;
    startDate: string;
    endDateExclusive: string;
    asOf: string;
  } | null;
}
export interface SummaryFact {
  id: string;
  kind: string;
  value: number;
  text: string;
  noteIds: string[];
  timeBasis: "period" | "current";
  asOf: string;
}
export interface SummarySource {
  id: string;
  title: string;
  status: string;
  available: boolean;
  /** Schedule at generation time; absent in older saved reports. */
  schedule?: {
    startDate?: string | null;
    deadline?: string | null;
    dueDate?: string | null;
    dueTime?: string | null;
    isAllDay?: boolean;
    timeZone?: string;
  };
}
export interface SummaryEntry {
  text: string;
  noteIds: string[];
  factIds: string[];
}
export interface SummaryLLM {
  schemaVersion: 1;
  overview: SummaryEntry;
  highlights: SummaryEntry[];
  observations: (SummaryEntry & { kind: "overdue" | "schedule" | "context" })[];
  themes: SummaryEntry[];
  suggestions: SummaryEntry[];
}
export interface SummaryCoverage {
  total: number;
  selected: number;
  truncatedTexts: number;
  limitations: string[];
}
export interface SummaryFactsResponse {
  period: SummaryPeriod;
  asOf: string;
  metrics: SummaryMetrics;
  facts: SummaryFact[];
  coverage: SummaryCoverage;
  sourceFingerprint: string;
  report: SummaryReport | null;
}
export interface SummaryReport extends SummaryLLM {
  id: string;
  slotKey: string;
  version: number;
  period: SummaryPeriod;
  asOf: string;
  generatedAt: string;
  metrics: SummaryMetrics;
  facts: SummaryFact[];
  sources: SummarySource[];
  coverage: SummaryCoverage;
  sourceFingerprint: string;
  generationMode: "ai" | "facts" | "empty";
  freshness: "current" | "stale" | "historical_snapshot";
  generationInfo?: {
    generatorVersion: string;
    modelVersion: string;
    inputChars: number;
    outputChars: number;
    durationMs: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}
export interface SummaryJob {
  id: string;
  stage: "queued" | "running" | "completed" | "error";
  attempts: number;
  error?: string;
  reportId?: string;
}
export interface SummarySettings {
  enabled: boolean;
  timeZone: string | null;
  localTime: string;
  version: number;
  nextRun: string | null;
}
const str = (maxLength: number) => ({
  type: "string",
  minLength: 1,
  maxLength,
});
const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
export const summaryPeriodSchema = {
  type: "object",
  additionalProperties: false,
  required: ["startDate", "endDateExclusive", "timeZone"],
  properties: {
    startDate: date,
    endDateExclusive: date,
    timeZone: str(100),
    tags: { type: "array", maxItems: 20, items: str(100) },
    category: str(100),
    comparison: { type: "boolean" },
  },
};
const entryProperties = {
  text: str(240),
  noteIds: { type: "array", maxItems: 50, uniqueItems: true, items: str(100) },
  factIds: { type: "array", maxItems: 30, uniqueItems: true, items: str(100) },
};
const entry = (extra = {}) => ({
  type: "object",
  additionalProperties: false,
  required: ["text", "noteIds", "factIds", ...Object.keys(extra)],
  properties: { ...entryProperties, ...extra },
  anyOf: [
    { properties: { noteIds: { minItems: 1 } } },
    { properties: { factIds: { minItems: 1 } } },
  ],
});
export const summaryLLMSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "overview",
    "highlights",
    "observations",
    "themes",
    "suggestions",
  ],
  properties: {
    schemaVersion: { const: 1 },
    overview: {
      ...entry(),
      properties: { ...entryProperties, text: str(300) },
    },
    highlights: { type: "array", maxItems: 3, items: entry() },
    observations: {
      type: "array",
      maxItems: 2,
      items: entry({ kind: { enum: ["overdue", "schedule", "context"] } }),
    },
    themes: { type: "array", maxItems: 3, items: entry() },
    suggestions: { type: "array", maxItems: 2, items: entry() },
  },
};
export const summarySettingsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean" },
    timeZone: str(100),
    localTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
    initialize: { type: "boolean" },
  },
};

export const addDays = (dateKey: string, days: number) =>
  new Date(Date.parse(dateKey + "T00:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
const formatters = new Map<string, Intl.DateTimeFormat>();
export function localParts(now: Date, timeZone: string) {
  if (!formatters.has(timeZone)) {
    if (formatters.size > 100) formatters.clear();
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }),
    );
  }
  const parts = formatters.get(timeZone)!.formatToParts(now);
  const get = (key: string) => parts.find((p) => p.type === key)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
  };
}
/** First occurrence for folds; first available minute after a gap. No host timezone. */
export function localInstant(
  dateKey: string,
  time: string,
  timeZone: string,
): number {
  const target = Date.parse(
    `${dateKey}T${time.length === 5 ? time + ":00" : time}Z`,
  );
  let candidate = target;
  for (let i = 0; i < 6; i++) {
    const p = localParts(new Date(candidate), timeZone);
    const offset = Date.parse(`${p.date}T${p.time}Z`) - candidate;
    const next = target - offset;
    if (next === candidate) break;
    candidate = next;
  }
  // Search nearby offsets for folds/gaps (30-minute and two-hour DST included).
  const wanted = `${dateKey}T${time.length === 5 ? time + ":00" : time}`;
  let gap: number | undefined;
  for (
    let t = candidate - 3 * 3600000;
    t <= candidate + 3 * 3600000;
    t += 60000
  ) {
    const p = localParts(new Date(t), timeZone);
    const key = `${p.date}T${p.time}`;
    if (key === wanted) return t;
    if (
      key > wanted &&
      (gap === undefined ||
        key <
          (() => {
            const g = localParts(new Date(gap!), timeZone);
            return `${g.date}T${g.time}`;
          })())
    )
      gap = t;
  }
  if (gap !== undefined) return gap;
  throw new Error("Invalid local instant");
}
export const normalizeTag = (s: string) =>
  s
    .normalize("NFKC")
    .trim()
    .replace(/^#/, "")
    .trim()
    .toLocaleLowerCase("ru-RU");
export function normalizePeriod(
  p: SummaryPeriod,
  maxDays = 366,
): SummaryPeriod {
  if (
    !p ||
    Object.keys(p).some(
      (k) =>
        ![
          "startDate",
          "endDateExclusive",
          "timeZone",
          "tags",
          "category",
          "comparison",
        ].includes(k),
    )
  )
    throw new Error("Неизвестные поля периода.");
  if (
    (p.comparison !== undefined && typeof p.comparison !== "boolean") ||
    (p.category !== undefined &&
      (typeof p.category !== "string" || p.category.length > 100))
  )
    throw new Error("Некорректные фильтры.");
  for (const d of [p.startDate, p.endDateExclusive])
    if (
      typeof d !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
      !Number.isFinite(Date.parse(d)) ||
      new Date(d).toISOString().slice(0, 10) !== d
    )
      throw new Error("Некорректная дата.");
  new Intl.DateTimeFormat("en", { timeZone: p.timeZone });
  const days =
    (Date.parse(p.endDateExclusive) - Date.parse(p.startDate)) / 86400000;
  if (
    days <= 0 ||
    days > maxDays ||
    typeof p.timeZone !== "string" ||
    !p.timeZone
  )
    throw new Error("Недопустимый диапазон периода.");
  if (
    p.tags &&
    (!Array.isArray(p.tags) ||
      p.tags.length > 20 ||
      p.tags.some((t) => typeof t !== "string" || t.length > 100))
  )
    throw new Error("Некорректные теги.");
  return {
    startDate: p.startDate,
    endDateExclusive: p.endDateExclusive,
    timeZone: p.timeZone,
    tags: [...new Set((p.tags || []).map(normalizeTag).filter(Boolean))].sort(),
    ...(p.category ? { category: normalizeTag(p.category) } : {}),
    ...(p.comparison ? { comparison: true } : {}),
  };
}
export function presetPeriod(
  preset: SummaryPreset,
  timeZone: string,
  now = new Date(),
): SummaryPeriod {
  const today = localParts(now, timeZone).date;
  let startDate = today,
    endDateExclusive = addDays(today, 1);
  if (preset === "rolling7") startDate = addDays(today, -6);
  if (preset === "week") {
    startDate = addDays(today, -((new Date(today).getUTCDay() + 6) % 7));
    endDateExclusive = addDays(startDate, 7);
  }
  if (preset === "month") {
    startDate = today.slice(0, 7) + "-01";
    endDateExclusive = new Date(
      Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 1),
    )
      .toISOString()
      .slice(0, 10);
  }
  return { startDate, endDateExclusive, timeZone, tags: [] };
}

/** Guard persisted offline JSON before it enters rendering state. Server remains authoritative. */
export function isSummaryReport(value: unknown): value is SummaryReport {
  if (!value || typeof value !== "object") return false;
  const r = value as SummaryReport;
  try {
    normalizePeriod(r.period);
    if (!Array.isArray(r.period.tags)) return false;
  } catch {
    return false;
  }
  const entry = (e: SummaryEntry) =>
    !!e &&
    typeof e.text === "string" &&
    e.text.length <= 300 &&
    Array.isArray(e.noteIds) &&
    e.noteIds.every((id) => typeof id === "string") &&
    Array.isArray(e.factIds) &&
    e.factIds.every((id) => typeof id === "string");
  const numeric = [
    "completed",
    "createdScheduled",
    "createdUnscheduled",
    "openScheduled",
    "overdue",
    "upcoming",
    "plannedMinutes",
    "estimatedCount",
    "scheduledCount",
    "checklistCompleted",
    "checklistTotal",
    "overlaps",
  ] as const;
  return (
    r.schemaVersion === 1 &&
    typeof r.id === "string" &&
    typeof r.slotKey === "string" &&
    Number.isInteger(r.version) &&
    Number.isFinite(Date.parse(r.asOf)) &&
    Number.isFinite(Date.parse(r.generatedAt)) &&
    ["ai", "facts", "empty"].includes(r.generationMode) &&
    ["current", "stale", "historical_snapshot"].includes(r.freshness) &&
    entry(r.overview) &&
    [r.highlights, r.observations, r.themes, r.suggestions].every(
      (list) => Array.isArray(list) && list.every(entry),
    ) &&
    !!r.metrics &&
    numeric.every(
      (k) => typeof r.metrics[k] === "number" && Number.isFinite(r.metrics[k]),
    ) &&
    Array.isArray(r.facts) &&
    r.facts.every(
      (f) =>
        f &&
        typeof f.id === "string" &&
        typeof f.text === "string" &&
        typeof f.kind === "string" &&
        Array.isArray(f.noteIds) &&
        f.noteIds.every((id) => typeof id === "string"),
    ) &&
    Array.isArray(r.sources) &&
    r.sources.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.title === "string" &&
        typeof s.available === "boolean",
    ) &&
    !!r.coverage &&
    typeof r.coverage.total === "number" &&
    typeof r.coverage.selected === "number" &&
    typeof r.coverage.truncatedTexts === "number" &&
    Array.isArray(r.coverage.limitations) &&
    r.coverage.limitations.every((l) => typeof l === "string")
  );
}
