export type AIMode = 'fast' | 'deep'

export interface StructuredResult {
  entity_type: 'task' | 'note'
  title: string
  description: string
  due_date?: string | null
  priority: 'low' | 'medium' | 'high'
  category_tag: string
  transcript_summary: string
  checklist?: string[]
}

export interface ProcessNoteOptions {
  mode?: AIMode
  isProUser?: boolean
  currentIsoDate?: string
}
