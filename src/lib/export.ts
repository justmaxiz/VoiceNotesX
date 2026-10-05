import { Item } from '../types/item'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u0400-\u04FF\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 50) || 'note'
}

export function generateNoteMarkdown(item: Item): string {
  const checklistMarkdown =
    item.checklist && item.checklist.length > 0
      ? `\n## Чек-лист\n` +
        item.checklist
          .map((c) => `- [${c.isCompleted ? 'x' : ' '}] ${c.text}`)
          .join('\n') +
        '\n'
      : ''

  const transcriptSection = item.transcriptText
    ? `\n> **Голосовая расшифровка:**\n> ${item.transcriptText.replace(/\n/g, '\n> ')}\n`
    : ''

  return `---
title: "${item.title.replace(/"/g, '\\"')}"
date: "${item.createdAt}"
category: "${item.categoryTag}"
priority: "${item.priority}"
type: "${item.type}"
status: "${item.status}"
---

# ${item.title}

${item.description || ''}
${transcriptSection}${checklistMarkdown}`
}

export function triggerDownload(content: string, filename: string, mimeType = 'text/markdown;charset=utf-8') {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportNoteAsMarkdown(item: Item): void {
  const markdown = generateNoteMarkdown(item)
  const filename = `${slugify(item.title)}.md`
  triggerDownload(markdown, filename)
}

export function exportAllNotesAsMarkdown(items: Item[]): void {
  const combined = items
    .map((item) => `====================\nFILE: ${item.title}.md\n====================\n${generateNoteMarkdown(item)}`)
    .join('\n\n')
  triggerDownload(combined, `voicenotes-all-notes-${Date.now()}.txt`)
}

export function exportDatabaseAsJson(items: Item[]): void {
  const data = {
    app: 'VoiceNotes AI',
    version: '2.5.0',
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    items,
  }
  const json = JSON.stringify(data, null, 2)
  triggerDownload(json, `voicenotes-backup-${Date.now()}.json`, 'application/json')
}

export async function exportNotesAsZip(items: Item[]): Promise<void> {
  // Bundled archive download
  const bundled = items
    .map((item) => `--- ${item.title}.md ---\n${generateNoteMarkdown(item)}`)
    .join('\n\n')
  triggerDownload(bundled, `voicenotes-archive-${Date.now()}.txt`)
}
