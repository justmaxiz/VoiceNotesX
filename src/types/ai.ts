export type AIMode = 'fast' | 'deep'

export interface StructuredResult {
  entity_type: 'task' | 'note'
  title: string
  description: string
  due_date?: string | null
  start_date?: string | null
  deadline?: string | null
  priority: 'low' | 'medium' | 'high'
  category_tag: string
  transcript_summary: string
  checklist?: string[]
}

export interface ProcessNoteOptions {
  style?: 'concise' | 'detailed' | 'action_plan'
  mode?: AIMode
  isProUser?: boolean
  currentIsoDate?: string
}
