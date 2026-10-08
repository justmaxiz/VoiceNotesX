import type { SummaryReport } from '../../server/src/summaryContracts'
export const escapeMarkdown = (text: string) =>
  text.replace(/[\\`*_{}\[\]<>#|]/g, '\\$&').replace(/\r?\n/g, ' ')
export function formatSummary(report: SummaryReport) {
  const lines = [
    `# Сводка ${report.period.startDate} — ${report.period.endDateExclusive} (конец не включён)`,
    `Часовой пояс: ${report.period.timeZone}. Срез: ${report.asOf}. Создано: ${report.generatedAt}.`,
    `Режим: ${report.generationMode}. Актуальность: ${report.freshness}. Версия: ${report.version}.`,
    ...(report.period.tags.length
      ? [`Теги (любой): ${report.period.tags.map(escapeMarkdown).join(', ')}`]
      : []),
    ...(report.period.category
      ? [`Категория: ${escapeMarkdown(report.period.category)}`]
      : []),
    '',
    '## Факты',
    ...report.facts.map(
      (f) => `- ${escapeMarkdown(f.text)} [${f.id}; ${f.timeBasis}]`,
    ),
    '',
    '## Итог',
    escapeMarkdown(report.overview.text),
  ]
  const source = (e: { noteIds: string[]; factIds: string[] }) =>
    [...e.noteIds.map((id) => `note:${id}`), ...e.factIds].join(', ')
  lines.push(`Источники: ${source(report.overview)}`)
  for (const [title, entries] of [
    ['Результаты', report.highlights],
    ['Требует внимания', report.observations],
    ['Направления', report.themes],
    ['Возможные следующие шаги', report.suggestions],
  ] as const) {
    if (entries.length)
      lines.push(
        '',
        `## ${title}`,
        ...entries.map((e) => `- ${escapeMarkdown(e.text)} (${source(e)})`),
      )
  }
  if (report.sources.length)
    lines.push(
      '',
      '## Записи снимка',
      ...report.sources.map(
        (s) =>
          `- ${escapeMarkdown(s.title)} (note:${s.id}${s.available ? '' : '; недоступна'})${s.schedule ? ` — ${escapeMarkdown([s.schedule.startDate && `Начало: ${s.schedule.startDate}`, s.schedule.deadline && `Срок: ${s.schedule.deadline}`, s.schedule.dueDate && `Дата: ${s.schedule.dueDate}`, s.schedule.dueTime && `Время: ${s.schedule.dueTime}`, s.schedule.isAllDay && 'Без времени', s.schedule.timeZone].filter(Boolean).join('; ') || 'Без срока')}` : ' — дата не сохранена'}`,
      ),
    )
  lines.push(
    '',
    '## Покрытие',
    `Учтено ${report.coverage.total}; выбрано ${report.coverage.selected}; пропущенных длинных полей ${report.coverage.truncatedTexts}.`,
    ...report.coverage.limitations.map((l) => `- ${escapeMarkdown(l)}`),
  )
  return lines.join('\n')
}
export const summaryFilename = (r: SummaryReport) =>
  `summary-${r.period.startDate}-${r.slotKey.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12)}-v${r.version}.md`
