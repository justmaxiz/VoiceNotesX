import { createHash } from "node:crypto";
import type { Note } from "./contracts.js";
import { hasSchedule } from "./contracts.js";
import {
  addDays,
  localInstant,
  localParts,
  normalizeTag,
  type SummaryPeriod,
  type SummaryMetrics,
  type SummaryFact,
  type SummaryCoverage,
  type SummaryLLM,
  type SummarySource,
} from "./summaryContracts.js";

export const SUMMARY_VERSION = "v1-extractive-3";
export interface SummaryLimits {
  maxDays: number;
  maxNotes: number;
  maxChars: number;
  fieldChars: number;
  maxPerHour: number;
  concurrency: number;
}
export const defaultSummaryLimits: SummaryLimits = {
  maxDays: 366,
  maxNotes: 60,
  maxChars: 48000,
  fieldChars: 1200,
  maxPerHour: 6,
  concurrency: 2,
};
export interface SummaryContext {
  period: SummaryPeriod;
  asOf: string;
  metrics: SummaryMetrics;
  facts: SummaryFact[];
  coverage: SummaryCoverage;
  notes: Pick<
    Note,
    | "id"
    | "title"
    | "description"
    | "checklist"
    | "status"
    | "priority"
    | "categoryTag"
    | "tags"
    | "dueDate"
    | "startDate"
    | "deadline"
    | "isFocus"
  >[];
  sourceFingerprint: string;
  sources: SummarySource[];
}
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const periodKey = (p: SummaryPeriod) => hash(p);
const limitations = [
  "Истории изменений и фактического времени работы нет. Чек-листы отражают текущее состояние.",
  "Архивные, удалённые и повторно открытые записи не восстанавливают прежние завершения. Импортированные даты не подтверждают историю.",
  "Плановые оценки имеют неизвестное происхождение и не означают фактические часы работы.",
];
export function buildSummaryContext(
  all: Note[],
  period: SummaryPeriod,
  now: Date,
  limits = defaultSummaryLimits,
): SummaryContext {
  const asOf = now.toISOString();
  const start = localInstant(period.startDate, "00:00", period.timeZone);
  const end = localInstant(period.endDateExclusive, "00:00", period.timeZone);
  const cutoff = Math.min(+now, end);
  const inPeriod = (v?: string | null) =>
    !!v && Date.parse(v) >= start && Date.parse(v) < cutoff;
  const dates = new Map<string, number>();
  const instant = (date: string, time: string, zone: string) => {
    const key = `${date}/${time}/${zone}`;
    if (!dates.has(key)) dates.set(key, localInstant(date, time, zone));
    return dates.get(key)!;
  };
  const schedule = (n: Note) =>
    n.deadline
      ? Date.parse(n.deadline)
      : n.dueDate
        ? instant(
            n.dueDate,
            n.dueTime || "00:00",
            n.timeZone || period.timeZone,
          )
        : n.startDate
          ? Date.parse(n.startDate)
          : NaN;
  const due = (n: Note) =>
    n.deadline
      ? Date.parse(n.deadline)
      : n.dueDate
        ? n.dueTime
          ? schedule(n)
          : instant(
              addDays(n.dueDate, 1),
              "00:00",
              n.timeZone || period.timeZone,
            )
        : n.startDate
          ? Date.parse(n.startDate)
          : NaN;
  const matches = (n: Note) => {
    const tags = new Set([n.categoryTag, ...(n.tags || [])].map(normalizeTag));
    return (
      (!period.category || normalizeTag(n.categoryTag) === period.category) &&
      (!period.tags.length || period.tags.some((t) => tags.has(t)))
    );
  };
  const scope = all
    .filter((n) => n.status !== "archived" && matches(n))
    .sort((a, b) => a.id.localeCompare(b.id));
  const completed = scope.filter(
    (n) => n.status === "completed" && inPeriod(n.completedAt),
  );
  const created = scope.filter((n) => inPeriod(n.createdAt));
  const open = scope.filter((n) => n.status !== "completed");
  const planned = open.filter((n) => {
    const s = schedule(n);
    return (
      (s >= start && s < end) ||
      !!(
        n.startDate &&
        n.deadline &&
        Date.parse(n.startDate) < end &&
        Date.parse(n.deadline) > start
      )
    );
  });
  const overdue = open.filter((n) => due(n) < +now);
  const upcoming = open.filter(
    (n) => due(n) >= +now && due(n) < +now + 7 * 86400000,
  );
  const relevant = scope.filter(
    (n) =>
      completed.includes(n) ||
      created.includes(n) ||
      planned.includes(n) ||
      overdue.includes(n) ||
      upcoming.includes(n),
  );
  const metrics: SummaryMetrics = {
    completed: completed.length,
    createdScheduled: created.filter(hasSchedule).length,
    createdUnscheduled: created.filter((n) => !hasSchedule(n)).length,
    openScheduled: planned.length,
    overdue: overdue.length,
    upcoming: upcoming.length,
    plannedMinutes: planned.reduce((s, n) => s + (n.estimatedMinutes || 0), 0),
    estimatedCount: planned.filter((n) => n.estimatedMinutes != null).length,
    scheduledCount: planned.length,
    checklistTotal: relevant.reduce(
      (s, n) => s + (n.checklist?.length || 0),
      0,
    ),
    checklistCompleted: relevant.reduce(
      (s, n) => s + (n.checklist?.filter((c) => c.isCompleted).length || 0),
      0,
    ),
    overlaps: 0,
    byDate: Object.create(null),
    byPriority: Object.create(null),
    byTag: Object.create(null),
    comparison: null,
  };
  for (const n of completed) {
    const d = localParts(new Date(n.completedAt!), period.timeZone).date;
    metrics.byDate[d] = (metrics.byDate[d] || 0) + 1;
  }
  for (const n of relevant) {
    metrics.byPriority[n.priority] = (metrics.byPriority[n.priority] || 0) + 1;
    for (const t of new Set(
      [n.categoryTag, ...(n.tags || [])].map(normalizeTag).filter(Boolean),
    ))
      metrics.byTag[t] = (metrics.byTag[t] || 0) + 1;
  }
  // Only explicit timed intervals; date-only/all-day records do not imply working hours.
  const intervals = planned
    .filter((n) => !n.isAllDay && n.startDate && n.deadline)
    .map((n) => ({
      n,
      start: Date.parse(n.startDate!),
      end: Date.parse(n.deadline!),
    }));
  const overlapIds = new Set<string>();
  for (let i = 0; i < intervals.length; i++)
    for (let j = i + 1; j < intervals.length; j++)
      if (
        intervals[i].start < intervals[j].end &&
        intervals[j].start < intervals[i].end
      ) {
        metrics.overlaps++;
        overlapIds.add(intervals[i].n.id);
        overlapIds.add(intervals[j].n.id);
      }
  let comparisonSources: Note[] = [];
  if (period.comparison && cutoff > start) {
    const days = Math.round(
      (Date.parse(period.endDateExclusive) - Date.parse(period.startDate)) /
        86400000,
    );
    const month =
      period.startDate.endsWith("-01") &&
      addDays(period.endDateExclusive, -1).slice(0, 7) ===
        period.startDate.slice(0, 7) &&
      period.endDateExclusive.endsWith("-01");
    const prevStart = month
      ? new Date(
          Date.UTC(
            Number(period.startDate.slice(0, 4)),
            Number(period.startDate.slice(5, 7)) - 2,
            1,
          ),
        )
          .toISOString()
          .slice(0, 10)
      : addDays(period.startDate, -days);
    const prevDays = Math.round(
      (Date.parse(period.startDate) - Date.parse(prevStart)) / 86400000,
    );
    const elapsed = localParts(new Date(cutoff), period.timeZone);
    const elapsedDays = Math.round(
      (Date.parse(elapsed.date) - Date.parse(period.startDate)) / 86400000,
    );
    // Different full-month lengths cannot be presented as comparable counts.
    if (elapsedDays <= prevDays && !(cutoff === end && prevDays !== days)) {
      const previousCutoff = localInstant(
        addDays(prevStart, elapsedDays),
        elapsed.time,
        period.timeZone,
      );
      const previousStart = localInstant(prevStart, "00:00", period.timeZone);
      comparisonSources = scope.filter(
        (n) =>
          n.status === "completed" &&
          n.completedAt &&
          Date.parse(n.completedAt) >= previousStart &&
          Date.parse(n.completedAt) < previousCutoff,
      );
      const count = comparisonSources.length;
      metrics.comparison = {
        completed: count,
        delta: completed.length - count,
        startDate: prevStart,
        endDateExclusive: period.startDate,
        asOf: new Date(previousCutoff).toISOString(),
      };
    }
  }
  const facts: SummaryFact[] = [];
  const fact = (
    kind: string,
    value: number,
    text: string,
    notes: Note[],
    timeBasis: "period" | "current" = "period",
  ) =>
    facts.push({
      id: `fact:${kind}`,
      kind,
      value,
      text,
      noteIds: notes.map((n) => n.id),
      timeBasis,
      asOf,
    });
  fact(
    "completed",
    completed.length,
    `Завершено записей: ${completed.length}.`,
    completed,
  );
  fact(
    "createdScheduled",
    metrics.createdScheduled,
    `Новых записей с расписанием: ${metrics.createdScheduled}.`,
    created.filter(hasSchedule),
  );
  fact(
    "createdUnscheduled",
    metrics.createdUnscheduled,
    `Новых записей без расписания: ${metrics.createdUnscheduled}.`,
    created.filter((n) => !hasSchedule(n)),
  );
  fact(
    "openScheduled",
    planned.length,
    `Открытых сроков периода: ${planned.length}.`,
    planned,
  );
  fact(
    "overdue",
    overdue.length,
    `Текущих просрочек: ${overdue.length}.`,
    overdue,
    "current",
  );
  fact(
    "upcoming",
    upcoming.length,
    `Сроков в ближайшие семь дней: ${upcoming.length}.`,
    upcoming,
    "current",
  );
  fact(
    "overlaps",
    metrics.overlaps,
    `Пересечений заданных интервалов: ${metrics.overlaps}.`,
    planned.filter((n) => overlapIds.has(n.id)),
    "current",
  );
  fact(
    "estimates",
    metrics.plannedMinutes,
    `Плановые минуты: ${metrics.plannedMinutes}; оценки есть у ${metrics.estimatedCount} из ${metrics.scheduledCount} записей.`,
    planned,
  );
  if (metrics.comparison)
    fact(
      "comparison",
      metrics.comparison.delta,
      `Изменение числа закрытий в сопоставимом срезе: ${metrics.comparison.delta}. Это не оценка продуктивности.`,
      completed,
    );
  const rank = (n: Note) =>
    (overdue.includes(n) ? 100 : 0) +
    (n.isFocus || n.isFocused ? 80 : 0) +
    { high: 30, medium: 20, low: 10 }[n.priority] +
    (completed.includes(n) ? 40 : 0) +
    (upcoming.includes(n) ? 20 : 0);
  const selected: SummaryContext["notes"] = [];
  let truncatedTexts = 0;
  for (const n of [...relevant].sort(
    (a, b) =>
      rank(b) - rank(a) ||
      (schedule(a) || Infinity) - (schedule(b) || Infinity) ||
      a.id.localeCompare(b.id),
  )) {
    if (selected.length >= limits.maxNotes) break;
    // Omit overly long fields as a whole, rather than dropping conditions midway.
    const safe = (text: string | undefined) => {
      if (text && text.length > limits.fieldChars) {
        truncatedTexts++;
        return undefined;
      }
      return text;
    };
    const record = {
      id: n.id,
      title: n.title,
      description: safe(n.description),
      status: n.status,
      priority: n.priority,
      categoryTag: n.categoryTag,
      tags: [...new Set(n.tags || [])].sort(),
      dueDate: n.dueDate,
      startDate: n.startDate,
      deadline: n.deadline,
      isFocus: n.isFocus,
      checklist: n.checklist
        ?.slice(0, 20)
        .filter((c) => safe(c.text) !== undefined)
        .map((c) => ({
          id: c.id,
          text: c.text,
          isCompleted: c.isCompleted,
          sortOrder: c.sortOrder,
        })),
    };
    if ((n.checklist?.length || 0) > 20) truncatedTexts++;
    if (JSON.stringify([...selected, record]).length > limits.maxChars / 2)
      break;
    selected.push(record);
  }
  const coverage = {
    total: relevant.length,
    selected: selected.length,
    truncatedTexts,
    limitations: [
      ...limitations,
      ...(selected.length < relevant.length || truncatedTexts
        ? [
            "ИИ видит выбранные записи; длинные поля пропущены целиком, чтобы не потерять условия.",
          ]
        : []),
    ],
  };
  // Hash permitted full fields and time-dependent facts, not second-by-second asOf or transcript/audio.
  const relevantIds = new Set(
    [...relevant, ...comparisonSources].map((n) => n.id),
  );
  const full = scope
    .filter((n) => relevantIds.has(n.id))
    .map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      checklist: n.checklist,
      status: n.status,
      completedAt: n.completedAt,
      createdAt: n.createdAt,
      priority: n.priority,
      tags: n.tags,
      categoryTag: n.categoryTag,
      dueDate: n.dueDate,
      dueTime: n.dueTime,
      startDate: n.startDate,
      deadline: n.deadline,
      timeZone: n.timeZone,
      isAllDay: n.isAllDay,
      estimatedMinutes: n.estimatedMinutes,
      isFocus: n.isFocus,
      isFocused: n.isFocused,
    }));
  const sourceFingerprint = hash({
    version: SUMMARY_VERSION,
    limits,
    period,
    full,
    metrics: {
      ...metrics,
      comparison: metrics.comparison
        ? {
            ...metrics.comparison,
            asOf: localParts(new Date(metrics.comparison.asOf), period.timeZone)
              .date,
          }
        : null,
    },
  });
  return {
    period,
    asOf,
    metrics,
    facts,
    coverage,
    notes: selected,
    sourceFingerprint,
    sources: scope
      .filter((n) => relevantIds.has(n.id))
      .map((n) => ({
        id: n.id,
        title: n.title,
        status: n.status,
        available: true,
        schedule: {
          startDate: n.startDate,
          deadline: n.deadline,
          dueDate: n.dueDate,
          dueTime: n.dueTime,
          isAllDay: n.isAllDay,
          timeZone: n.timeZone,
        },
      })),
  };
}
export function factualSummary(c: SummaryContext): SummaryLLM {
  return {
    schemaVersion: 1,
    overview: {
      text: c.coverage.total
        ? `Завершено записей: ${c.metrics.completed}. Открытых сроков периода: ${c.metrics.openScheduled}.`
        : "В выбранном периоде нет записей; текущих сроков для внимания нет.",
      noteIds: [],
      factIds: ["fact:completed", "fact:openScheduled"],
    },
    highlights: [],
    observations: c.metrics.overdue
      ? [
          {
            kind: "overdue",
            text: c.facts.find((f) => f.kind === "overdue")!.text,
            noteIds: [],
            factIds: ["fact:overdue"],
          },
        ]
      : [],
    themes: [],
    suggestions: [],
  };
}
