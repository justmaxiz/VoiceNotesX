/** Version 1 JSON contract shared by web and Expo clients. All instants carry an offset. */
export interface Note {
  id: string;
  title: string;
  description?: string;
  transcriptText?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  categoryTag: string;
  dueDate?: string | null;
  dueTime?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  timeZone?: string;
  isAllDay?: boolean;
  estimatedMinutes?: number;
  reminderMinutesBefore?: number | null;
  tags?: string[];
  isFocus: boolean;
  isFocused?: boolean;
  completedAt?: string;
  checklist?: {
    id: string;
    text: string;
    isCompleted: boolean;
    sortOrder: number;
  }[];
  audioId?: string;
  audioDuration?: number;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}
export interface StructuredNote {
  title: string;
  description: string;
  due_date?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  estimated_minutes?: number;
  priority: Note['priority'];
  category_tag: string;
  transcript_summary: string;
  checklist?: string[];
}
export type AudioStage =
  'queued' | 'transcribing' | 'analyzing' | 'completed' | 'error';
export interface AudioMetadata {
  id: string;
  filename: string;
  mimeType: string;
  duration: number;
  expiresAt: string;
  expired: boolean;
}
export interface AudioJob {
  id: string;
  filename: string;
  stage: AudioStage;
  transcript: string;
  summary: string;
  candidates: StructuredNote[];
  error?: string;
  audioId: string;
  approvedAt?: string;
  createdAt: string;
}
export function hasSchedule(
  note: Pick<Note, 'dueDate' | 'dueTime' | 'startDate' | 'deadline'>,
): boolean {
  return Boolean(
    note.dueDate || note.dueTime || note.startDate || note.deadline,
  );
}
export const instantPattern =
  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$';
const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
export const noteFields = {
  title: { type: 'string', minLength: 1, maxLength: 500 },
  description: { type: 'string', maxLength: 100000 },
  transcriptText: { type: 'string', maxLength: 500000 },
  status: {
    type: 'string',
    enum: ['todo', 'in_progress', 'completed', 'archived'],
  },
  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
  categoryTag: { type: 'string', maxLength: 100 },
  dueDate: nullable({ type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  dueTime: nullable({ type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }),
  startDate: nullable({ type: 'string', pattern: instantPattern }),
  deadline: nullable({ type: 'string', pattern: instantPattern }),
  timeZone: { type: 'string', maxLength: 100 },
  isAllDay: { type: 'boolean' },
  estimatedMinutes: { type: 'number', exclusiveMinimum: 0, maximum: 525600 },
  reminderMinutesBefore: nullable({
    type: 'integer',
    minimum: 0,
    maximum: 525600,
  }),
  tags: {
    type: 'array',
    maxItems: 100,
    items: { type: 'string', maxLength: 100 },
  },
  isFocus: { type: 'boolean' },
  isFocused: { type: 'boolean' },
  checklist: {
    type: 'array',
    maxItems: 500,
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'text', 'isCompleted', 'sortOrder'],
      properties: {
        id: { type: 'string', maxLength: 100 },
        text: { type: 'string', maxLength: 5000 },
        isCompleted: { type: 'boolean' },
        sortOrder: { type: 'integer' },
      },
    },
  },
  audioId: { type: 'string', format: 'uuid' },
};
export const noteInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'status', 'priority', 'categoryTag', 'isFocus'],
  properties: noteFields,
};
export const structuredSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'description',
    'priority',
    'category_tag',
    'transcript_summary',
  ],
  properties: {
    title: noteFields.title,
    description: noteFields.description,
    priority: noteFields.priority,
    category_tag: noteFields.categoryTag,
    transcript_summary: { type: 'string', maxLength: 100000 },
    due_date: nullable({ type: 'string' }),
    start_date: noteFields.startDate,
    deadline: noteFields.deadline,
    estimated_minutes: noteFields.estimatedMinutes,
    checklist: {
      type: 'array',
      maxItems: 500,
      items: { type: 'string', maxLength: 5000 },
    },
  },
};
