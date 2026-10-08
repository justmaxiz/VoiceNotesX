import type { Note } from '../../server/src/contracts'
export type { Note } from '../../server/src/contracts'
/** A view of the shared note; type is derived from its schedule by the repository. */
export interface Item extends Note { type: 'task' | 'note' }

export interface AudioSession {
  id: string;
  title: string;
  duration: number;
  createdAt?: string;
  recordedAt?: string;
  transcriptSnippet?: string;
  transcript?: string;
  summary?: string;
  actionItems?: string[];
  tags?: string[];
  audioUrl?: string;
  audioBlob?: Blob;
  waveform?: number[];
}

export type KanbanColumnKey = 'todo' | 'in_progress' | 'completed';

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  sortOrder: number;
}


export type TaskFilter = 'all' | 'overdue' | 'voice' | 'summaries';
export type ViewMode = 'list' | 'board';
export type TaskSortCriteria = 'priority' | 'time' | 'created' | 'title' | 'manual';
export type TaskSortDirection = 'asc' | 'desc';

export interface TaskItemData {
  id: string;
  title: string;
  category: string;
  categoryClass: string;
  time: string;
  priority?: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  hasAudio?: boolean;
  audioDuration?: string;
  noteSubtitle?: string;
  completedTime?: string;
  startDate?: string | null;
  deadline?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  tags?: string[];
  isFocused?: boolean;
  estimatedMinutes?: number;
}

export interface AudioMemoData {
  id: string;
  title: string;
  duration: string;
  time: string;
  waveform?: number[];
  audioUrl?: string;
}
