export interface Item {
  id: string;
  type: 'task' | 'note';
  title: string;
  description?: string;
  transcriptText?: string;
  audioDuration?: number;
  audioUrl?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  dueTime?: string | null;
  isAllDay?: boolean;
  estimatedMinutes?: number;
  reminderMinutesBefore?: number | null;
  tags?: string[];
  completedAt?: string;
  categoryTag: string;
  isFocus: boolean;
  isFocused?: boolean;
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export type KanbanColumnKey = 'todo' | 'in_progress' | 'completed';

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  sortOrder: number;
}

export interface AudioSession {
  id: string;
  title: string;
  duration: number;
  recordedAt: string;
  transcriptSnippet: string;
  tags: string[];
  audioUrl?: string;
  waveform?: number[];
}

export type TaskFilter = 'all' | 'urgent' | 'voice' | 'summaries';
export type ViewMode = 'list' | 'board';
export type TaskSortCriteria = 'priority' | 'time' | 'created' | 'title' | 'manual';
export type TaskSortDirection = 'asc' | 'desc';

export interface TaskItemData {
  id: string;
  title: string;
  category: string;
  categoryClass: string;
  time: string;
  isCompleted: boolean;
  hasAudio?: boolean;
  audioDuration?: string;
  isUrgent?: boolean;
  noteSubtitle?: string;
  completedTime?: string;
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
