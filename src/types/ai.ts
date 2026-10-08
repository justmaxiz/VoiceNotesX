export type AIMode = 'fast' | 'deep'

export type { StructuredNote as StructuredResult } from '../../server/src/contracts'

export interface ProcessNoteOptions {
  style?: 'concise' | 'detailed' | 'action_plan'
  mode?: AIMode
  isProUser?: boolean
  currentIsoDate?: string
}
