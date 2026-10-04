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
