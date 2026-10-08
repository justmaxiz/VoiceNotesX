import { zipSync, strToU8 } from 'fflate'
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
category: ${JSON.stringify(item.categoryTag)}
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
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportNoteAsMarkdown(item: Item): void {
  const markdown = generateNoteMarkdown(item)
  const filename = `${slugify(item.title)}.md`
  triggerDownload(markdown, filename)
}

export function exportAllNotesAsMarkdown(items: Item[]): void {
  triggerDownload(items.map(generateNoteMarkdown).join('\n\n---\n\n'), `voicenotes-all-notes-${Date.now()}.md`)
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

export async function createNotesZip(items: Item[]): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = Object.create(null)
  const names = new Set<string>()
  for (const item of items) {
    const base = slugify(item.title)
    let filename = base
    let suffix = 2
    while (names.has(filename)) filename = `${base}-${suffix++}`
    names.add(filename)
    files[`${filename}.md`] = strToU8(generateNoteMarkdown(item))
    if (item.audioUrl) {
      const response = await fetch(item.audioUrl, { credentials: 'include' })
      if (!response.ok) throw new Error('Аудио недоступно для экспорта')
      const mime = response.headers.get('Content-Type') || ''
      const extension = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : mime.includes('wav') ? 'wav' : mime.includes('mpeg') ? 'mp3' : 'webm'
      files[`audio/${filename}.${extension}`] = new Uint8Array(await response.arrayBuffer())
    }
  }
  return zipSync(files)
}

export async function exportNotesAsZip(items: Item[]): Promise<void> {
  const data = await createNotesZip(items)
  const blob = new Blob([new Uint8Array(data)], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `voicenotes-archive-${Date.now()}.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
