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
  dueDate?: string;
  completedAt?: string;
  categoryTag: string;
  isFocus: boolean;
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

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
}

export type TaskFilter = 'all' | 'urgent' | 'voice' | 'summaries';
export type ViewMode = 'list' | 'board';

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
}

export interface AudioMemoData {
  id: string;
  title: string;
  duration: string;
  time: string;
  waveform?: number[];
  audioUrl?: string;
}
