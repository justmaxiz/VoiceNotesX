import { getSession } from './api'
export interface LegacyDigest {
  id: string
  title: string
  date: string
  period: string
  dateKey: string
  updatedAtTime: string
  rawText: string
  tags: string[]
  achievements: string[]
  bottlenecks: string[]
  recommendations: string[]
}
/** Read only: never adopt anonymous or old unscoped data into an account. */
export function getLegacySummaries(): LegacyDigest[] {
  const owner = getSession()?.user.id
  if (!owner) return []
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(`voicenotes_ai_summaries:${owner}`) || 'null',
    )
    if (!Array.isArray(value)) return []
    return value.filter(
      (r): r is LegacyDigest =>
        !!r &&
        typeof r === 'object' &&
        [
          'id',
          'title',
          'date',
          'period',
          'dateKey',
          'updatedAtTime',
          'rawText',
        ].every((k) => typeof r[k] === 'string') &&
        ['tags', 'achievements', 'bottlenecks', 'recommendations'].every(
          (k) =>
            Array.isArray(r[k]) &&
            r[k].every((s: unknown) => typeof s === 'string'),
        ),
    )
  } catch {
    return []
  }
}
export function formatLegacySummary(r: LegacyDigest) {
  return [
    `# ${r.title}`,
    `Локальный отчёт прежней версии. ${r.period}; ${r.date}`,
    r.rawText,
    ...[
      ['Результаты', r.achievements],
      ['Требует внимания', r.bottlenecks],
      ['Рекомендации', r.recommendations],
    ].flatMap(([title, values]) =>
      (values as string[]).length
        ? [`\n## ${title}`, ...(values as string[]).map((v) => `- ${v}`)]
        : [],
    ),
  ].join('\n\n')
}
