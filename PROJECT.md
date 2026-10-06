# VoiceNotes — актуальная реализация, 2026-10-06

Продуктовые требования остаются в PRD.md и tasks/TASK-01..TASK-41, требования интервалов/фокуса/календаря — tasks/task-1..3 и `.agents/teamwork/ORIGINAL_REQUEST.md`. Названия модулей и типы из прежнего плана ниже не являются контрактом продукта.

- `taskDates.ts` — единые локальные dueDate/dueTime и канонические ISO-интервалы; `db.ts` — недеструктивная v1→v2 миграция и атомарное сохранение заметки с audio Blob. Уже сохраненные неоднозначные v2 timestamps не переинтерпретируются.
- `focusLogic.ts` возвращает выбранный Item/null; ручной фокус сохраняется при автоматическом capture. Таймер находится в FocusHeroCard; отдельный useFocusedTask и FocusResult не нужны.
- `calendarLayout.ts` используется общей дневной/недельной сеткой: пропорциональная высота, локальные границы, колонки пересечений и all-day. Искусственный minHeight и дублирующий timelineLayout отсутствуют.
- Аудио хранится в существующей audioSessions; objectURL создаются для playback и отзываются. Старые таблицы settings/audioSessions сохраняются для совместимости; настройки имеют один действующий источник — localStorage.
- Режим и стиль AI передаются capture/refinement. Без endpoint работает ограниченная локальная эвристика; отчеты считают реальные записи и не объявляются семантическими AI-сводками.
- Опциональный `VITE_AI_PROXY_URL`: HTTPS или HTTP localhost/127.0.0.1, POST JSON `{systemInstruction,userPrompt,mode,style,responseSchema}`, ответ `{text:string}`; text содержит JSON структурирования/refinement. Тайм-аут 30 секунд, ошибки видимы, draft сохраняется. Ключ Gemini в браузер не передается. CORS, ключ, ограничения запросов и реализация AI остаются обязанностью внешнего сервера; сервер не создан и интеграция не проверена. При настроенном, но отказавшем endpoint нет молчаливой подмены результата локальной эвристикой.
- Экспорт: настоящий Markdown, JSON метаданных и ZIP через fflate с оригинальным audio Blob и уникальными именами. JSON не является резервной копией аудио.

Проверено: build exit 0; полный Vitest 237 passed / 0 failed / 0 skipped. Это модульные/интеграционные проверки, не browser E2E. Оценка и пробелы — `reviews/refactoring-2026-10-06.md`.

## Исторический план (не действующие интерфейсы и не подтверждение приемки)

Весь следующий текст сохранен как история пользовательского плана. Его PLANNED/IN_PROGRESS, названия focusEngine/timelineLayout/useFocusedTask, FocusResult, примеры сигнатур и заявления про E2E устарели; действующие файлы и результаты перечислены выше. Список продуктовых намерений сохранен, но не означает реализацию всех пунктов PRD.

# Project: VoiceNotes AI — Task System Modernization

## Architecture
VoiceNotes AI modernizes its task management system by adding explicit temporal interval support (`startDate` to `deadline`), smart automated focus selection with persistent manual urgent override, and continuous duration-proportional visualization on calendar schedule grids.

### Data Flow
1. **Creation / Ingestion**: Tasks created via QuickCapture (voice/text), manual forms, or calendar clicks receive both `startDate` and `deadline` (ISO 8601 strings).
2. **Persistence**: Dexie.js (IndexedDB) `VoiceNotesDB` stores tasks under table `items`. Version 2 schema indexes `startDate` and `deadline`, running non-destructive migration on legacy records.
3. **Store State**: `useAppStore` provides reactive state, optimistic updates, and CRUD operations, synchronizing legacy `dueDate`/`dueTime` with modern `deadline`.
4. **Focus Engine**: Standalone pure module `src/lib/focusEngine.ts` evaluates tasks against the priority hierarchy (P1 Manual Urgent > P2 Overdue by oldest deadline > P3 Current in [startDate, deadline] > P4 Fallback). Reactive updates handled via `useFocusedTask` timer hook.
5. **Calendar UI**: `src/lib/timelineLayout.ts` calculates pixel coordinates and interval column partitioning. `WeekTimelineView.tsx` and `CalendarPage.tsx` (Day view) render tasks as continuous duration blocks with height strictly proportional to `(deadline - startDate)`.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | `startDate` & `deadline` Data Model | Add optional `startDate?: string \| null` and `deadline?: string \| null` to `Item`, `TaskItemData`, `StructuredResult`. Restore `AudioSession` interface and `isFocused?: boolean`. | M1 | ORIGINAL_REQUEST §R1 & Storage Survey |
| 2 | Dexie v2 Schema & Zero-loss Migration | Upgrade `VoiceNotesDB` to version 2 indexing `startDate` and `deadline`. Migration handler sets `deadline = dueDate` and computes `startDate = deadline - estimatedMinutes` for legacy records. | M1 | ORIGINAL_REQUEST §R1 & Storage Survey |
| 3 | Store Synchronization & CRUD | Update `useAppStore` (`addItem`, `updateItem`, `batchRescheduleTasks`) to maintain `startDate` and `deadline` while synchronizing legacy `dueDate`/`dueTime`. | M1 | ORIGINAL_REQUEST §R1 & Storage Survey |
| 4 | Fix Pre-existing db.test.ts syntax | Resolve unclosed `describe` block in `src/lib/__tests__/db.test.ts:277-296` so tests and `tsc` pass cleanly. | M1 | Storage & Focus Survey |
| 5 | Focus Engine Pure Logic | Implement `calculateFocusedTask(items, now)` in `src/lib/focusEngine.ts` with strict priority: P1 (manual `isFocus: true` future task) > P2 (overdue `deadline < now`, oldest deadline wins) > P3 (current `startDate <= now <= deadline`). | M2 | ORIGINAL_REQUEST §R2 & Focus Survey |
| 6 | Manual Focus Toggle & Clear | Add `clearFocusTask()` and `toggleFocusTask(id)` to `useAppStore` so manual focus holds until user explicitly clears or completes task. | M2 | ORIGINAL_REQUEST §R2 & Focus Survey |
| 7 | Reactive Focus Hook & UI Integration | Create `useFocusedTask(tickIntervalMs)` hook and integrate with `FocusHeroCard.tsx` (showing focus badge and reason) and `DashboardTaskItem.tsx`. | M2 | ORIGINAL_REQUEST §R2 & Focus Survey |
| 8 | Continuous Column Timeline Layout | Create `src/lib/timelineLayout.ts` with interval parsing, duration height formula `height = (end - start) * (hourHeight / 60)`, and sub-column partitioning for overlapping tasks. | M3 | ORIGINAL_REQUEST §R3 & Calendar Survey |
| 9 | Week Timeline View Duration Stretching | Refactor `WeekTimelineView.tsx` from row-sliced divs to continuous column grid rendering stretched task cards with proportional height. | M3 | ORIGINAL_REQUEST §R3 & Calendar Survey |
| 10 | Day Schedule View Duration Stretching | Refactor `CalendarPage.tsx` (Day View) to use continuous timeline layout with duration stretching. | M3 | ORIGINAL_REQUEST §R3 & Calendar Survey |
| 11 | DateTimePicker Support for Start/End | Enhance `DateTimePicker.tsx` and `SlideOverDrawer.tsx` to view and edit both `startDate` and `deadline`. | M3 | ORIGINAL_REQUEST §R3 & Calendar Survey |
| 12 | E2E Requirement-driven Test Suite | Independent opaque-box test suite covering Tiers 1-4 for all requirements, with `TEST_READY.md` verification signal. | M_TEST | Dual Track Protocol |
| 13 | Final Integration & Adversarial Hardening | Pass 100% of E2E test suite (Tiers 1-4) and harden via Tier 5 adversarial testing. | M4 | Dual Track Protocol |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M_TEST | E2E Testing Track | Independent requirement-driven test suite (Tiers 1-4) covering R1, R2, R3 and publishing `TEST_READY.md`. | none | IN_PROGRESS |
| M1 | Data Structure & Storage | Item types, Dexie v2 schema upgrade with zero-data-loss migration, store CRUD sync, and DB tests fix. | none | IN_PROGRESS |
| M2 | Smart Focus Logic Engine | Pure focus selection engine (`src/lib/focusEngine.ts`), reactive hook (`useFocusedTask.ts`), store actions, and `FocusHeroCard.tsx` integration. | M1 | PLANNED |
| M3 | Calendar Schedule UI Stretching | Continuous timeline layout engine (`src/lib/timelineLayout.ts`), `WeekTimelineView.tsx`, `CalendarPage.tsx` Day view duration rendering, and `DateTimePicker.tsx`. | M1 | PLANNED |
| M4 | Final Integration & Acceptance | Verify 100% passing E2E tests (Tiers 1-4), adversarial coverage hardening (Tier 5), and Forensic Integrity Audit. | M_TEST, M2, M3 | PLANNED |

---

## Interface Contracts

### 1. Data Layer (`src/types/item.ts` & `src/lib/db.ts`)
```typescript
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
  // Temporal fields:
  startDate?: string | null;       // ISO 8601 string or null
  deadline?: string | null;        // ISO 8601 string or null
  dueDate?: string | null;         // Legacy backward-compat (YYYY-MM-DD or ISO)
  dueTime?: string | null;         // Legacy backward-compat (HH:mm)
  isAllDay?: boolean;
  estimatedMinutes?: number;
  reminderMinutesBefore?: number | null;
  tags?: string[];
  completedAt?: string;
  categoryTag: string;
  isFocus: boolean;
  isFocused?: boolean;             // Compat view model
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AudioSession {
  id: string;
  title: string;
  createdAt: string;
  duration: number;
  audioBlob?: Blob;
  transcript?: string;
  summary?: string;
  actionItems?: string[];
}
```

### 2. Focus Engine (`src/lib/focusEngine.ts`)
```typescript
export type FocusReason = 'manual_urgent' | 'overdue' | 'current' | 'fallback' | 'none';

export interface FocusResult {
  task: Item | null;
  reason: FocusReason;
  overdueCount: number;
}

export function calculateFocusedTask(
  items: Item[],
  now?: Date
): FocusResult;

export function parseTaskDeadline(task: Item): Date | null;
export function parseTaskStartDate(task: Item): Date | null;
```

### 3. Timeline Layout Engine (`src/lib/timelineLayout.ts`)
```typescript
export interface PositionedTask {
  task: Item;
  topPx: number;
  heightPx: number;
  colIndex: number;
  totalCols: number;
  leftPercent: number;
  widthPercent: number;
  isFallback: boolean;
}

export function layoutDayTasks(
  tasks: Item[],
  options?: {
    startHour?: number;   // default 8
    endHour?: number;     // default 22
    hourHeight?: number;  // default 56
    minHeight?: number;   // default 28
  }
): {
  positionedTasks: PositionedTask[];
  allDayTasks: Item[];
};
```

---

## Code Layout
- `src/types/item.ts`: Canonical item and task type definitions
- `src/types/ai.ts`: Structured AI extraction types
- `src/lib/db.ts`: Dexie database class and migrations
- `src/lib/focusEngine.ts`: Pure focus calculation logic (R2)
- `src/lib/timelineLayout.ts`: Pure calendar positioning and collision math (R3)
- `src/hooks/useFocusedTask.ts`: Live focus state hook with interval tick (R2)
- `src/store/useAppStore.ts`: Zustand store managing items, sync, focus toggle
- `src/components/calendar/WeekTimelineView.tsx`: Week schedule view (R3)
- `src/components/calendar/CalendarPage.tsx`: Calendar container and Day view (R3)
- `src/components/ui/DateTimePicker.tsx`: Date & time picker component (R3)
- `src/components/dashboard/components/FocusHeroCard.tsx`: Dashboard hero card (R2)
- `src/tests/e2e/`: E2E requirement-driven test suite (Tiers 1-4)

После последнего calendar-only исправления мгновенных интервалов: affected suites **20 passed, 0 failed, 0 skipped** (R3 9, product 11), build passed. Последний полный 237/237 выполнен непосредственно до этого исправления и переиспользован по AGENTS; это не утверждение о повторном полном запуске текущего состояния.
