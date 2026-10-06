# BRIEFING — 2026-10-06T10:37:30Z

## Mission
Investigate existing and needed task focus / active task selection logic in VoiceNotes AI (R2 requirements, priority hierarchy, UI reactivity, tie-breaking, state persistence, acceptance criteria mapping).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: d:\relax\projects\voicenotes\.agents\teamwork\explorer_survey_focus
- Original parent: 79fda0ca-b0f8-4146-9ddf-8e9ef10a9f85
- Milestone: Modernization R2 - Focus Logic Engine Survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Strictly adhere to AGENTS.md and PROJECT.md guidelines
- Write only to .agents/teamwork/explorer_survey_focus/
- All findings backed by concrete file paths, line numbers, and evidence chains

## Current Parent
- Conversation ID: 79fda0ca-b0f8-4146-9ddf-8e9ef10a9f85
- Updated: 2026-10-06T10:37:30Z

## Investigation State
- **Explored paths**:
  - `src/types/item.ts` (Item, TaskItemData, status, priority, dueDate, dueTime, isFocus)
  - `src/lib/db.ts` (IndexedDB schema, setFocusTask, single focus transaction)
  - `src/store/useAppStore.ts` (setFocusTask, setFocusedTask, filter/sort logic)
  - `src/components/dashboard/components/FocusHeroCard.tsx` (current ad-hoc useMemo focus selection)
  - `src/components/dashboard/components/DashboardTaskItem.tsx` (focus target button, overdue styling)
  - `src/components/dashboard/components/DashboardTaskList.tsx` (task list focus wiring)
  - `src/components/dashboard/DashboardOverview.tsx` (TaskItemData mapping, isFocused)
  - `src/components/layout/SlideOverDrawer.tsx` (toggle focus action)
  - `src/components/tasks/TasksPage.tsx` (Kanban column focus sorting and button)
  - `src/components/calendar/CalendarPage.tsx` & `WeekTimelineView.tsx` (time grid rendering)
  - `src/lib/remindersService.ts` (date parsing and interval polling patterns)
  - `src/store/__tests__/useAppStore.test.ts` (existing focus tests passing)
  - `src/lib/__tests__/db.test.ts` (noted missing closing describe bracket at line 297)
- **Key findings**:
  - Current focus is purely manual boolean flag `isFocus: true`, without automatic time awareness.
  - Priority hierarchy R2 (Manual > Overdue [oldest deadline first] > Current window [startDate <= now <= deadline] > Fallback) fully designed.
  - Reactivity should be decoupled into pure engine (`src/lib/focusEngine.ts`) + custom reactive hook with timer (`src/hooks/useFocusedTask.ts`) + store actions (`clearFocusTask`, `toggleFocusTask`).
- **Unexplored areas**: None for R2 focus logic.

## Key Decisions Made
- Priority engine must be a pure, deterministic function `calculateFocusedTask(items, now)` to enable rock-solid Vitest testing without mocking system clocks unless desired.
- Overdue tie-breaking: `min(deadline)` -> higher priority -> earlier `createdAt` -> id.
- Current task tie-breaking: higher priority -> earliest `deadline` -> latest `startDate` -> earlier `createdAt` -> id.
- Fallback returns `{ task, reason: 'fallback' }` prioritizing next upcoming task, then high priority, then first active, or `null`.

## Artifact Index
- DISPATCH.md — Initial dispatch message
- progress.md — Liveness heartbeat and milestone tracking
- BRIEFING.md — Situational awareness and working memory
- report.md — Comprehensive Focus Logic Engine analysis
- handoff.md — 5-component handoff report
