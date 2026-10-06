# Survey & Architecture Report: Focus Logic Engine (R2)

**Explorer**: Focus Logic Engine Explorer  
**Target Project**: VoiceNotes AI (`d:\relax\projects\voicenotes`)  
**Mission**: Investigate existing and needed task focus / active task selection logic for Modernization R2  
**Date**: 2026-10-06  

---

## Executive Summary

This report establishes the complete architectural and algorithmic specification for **Requirement R2 (Smart Focus Logic)** in VoiceNotes AI.

Currently, task focus in the application exists only as a static boolean flag (`isFocus: boolean`) on the `Item` entity, paired with an ad-hoc local `useMemo` heuristic in `FocusHeroCard.tsx`. There is no automated awareness of deadlines, time intervals, overdue states, or time passage.

To fulfill R2 and satisfy all Acceptance Criteria (AC1, AC2, AC3), we design a **deterministic 3-tier Priority Focus Engine** (Manual > Overdue > Current Window > Fallback), decouple it into a pure calculation core (`src/lib/focusEngine.ts`), expose it through a reactive timer-driven React hook (`src/hooks/useFocusedTask.ts`), and equip the Zustand store (`src/store/useAppStore.ts`) with toggle/clear capabilities.

---

## 1. Existing Focus Concepts in Codebase

A systematic scan of `src/` for `"focus"`, `"currentTask"`, `"activeTask"`, `"urgent"`, and `"pinned"` reveals the following landscape:

### 1.1 Data Model (`src/types/item.ts`)
- **`Item` (lines 1-23)**:
  - `isFocus: boolean;` (line 19) — Boolean flag indicating whether the task was designated as focus.
  - `status: 'todo' | 'in_progress' | 'completed' | 'archived';` (line 9).
  - `priority: 'low' | 'medium' | 'high';` (line 10).
  - `dueDate?: string | null;` (line 11) & `dueTime?: string | null;` (line 12).
  - *Absence*: Neither `startDate` nor explicit `deadline` fields currently exist in `Item`.
- **`TaskItemData` (lines 40-56)**:
  - View model used by `DashboardTaskList` and `DashboardTaskItem`.
  - Has `isUrgent?: boolean` (line 49) — mapped from `item.priority === 'high'` in `DashboardOverview.tsx:51`.
  - In `DashboardOverview.tsx:54`: maps `isFocused: Boolean(item.isFocus || (item as any).isFocused)`.

### 1.2 Storage Layer (`src/lib/db.ts`)
- **Dexie schema (line 19)**:
  ```typescript
  items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate'
  ```
- **Single focus invariant in `createItem` (lines 32-42)**:
  When a new item is created with `isFocus: true`, all other focused items in Dexie are updated to `isFocus: false`.
- **`setFocusTask(id: string)` (lines 93-116)**:
  Finds target task; within a Dexie transaction, unsets `isFocus: false, isFocused: false` on all other tasks, then sets `isFocus: true, isFocused: true, status: 'in_progress'` on the target.
- *Limitation*: There is **no method to clear manual focus** (`clearFocusTask`) in `db.ts`. Only `updateItem(id, { isFocus: false })` can unset it directly.

### 1.3 State Management (`src/store/useAppStore.ts`)
- **Store Actions**:
  - `setFocusTask: (id: string) => Promise<void>` (lines 264-306):
    Performs optimistic updates on `items`, sets target `isFocus: true, isFocused: true, status: 'in_progress'`, resets all other items to `isFocus: false`, updates search index, and persists to `db.setFocusTask(id)`.
  - `setFocusedTask: (id: string) => Promise<void>` (lines 308-310):
    Direct alias to `setFocusTask(id)`.
- *Limitation*:
  - No `clearFocusTask` or `toggleFocusTask` action exists in the store.
  - No selector or computed property exists for evaluating focus dynamically.

### 1.4 Consumer Components
1. **`src/components/dashboard/components/FocusHeroCard.tsx` (lines 44-56)**:
   ```typescript
   const focusedTask = useMemo(() => {
     const explicitlyFocused = items.find(
       (i) => i.type === 'task' && (i.isFocus || i.isFocused) && i.status !== 'completed'
     )
     if (explicitlyFocused) return explicitlyFocused

     const highPriority = items.find(
       (i) => i.type === 'task' && i.priority === 'high' && i.status !== 'completed'
     )
     if (highPriority) return highPriority

     return items.find((i) => i.type === 'task' && i.status !== 'completed')
   }, [items])
   ```
   *Analysis*: This logic is hardcoded inside this component, completely isolated from other components, has no concept of dates, deadlines, or overdue status, and cannot respond to time passage.
2. **`src/components/dashboard/components/DashboardTaskItem.tsx` (lines 165-178)**:
   Provides a "target" button calling `onSetFocus(task.id)`. When clicked, it unconditionally turns focus on.
3. **`src/components/dashboard/components/DashboardTaskList.tsx` (lines 44, 261)**:
   Filters tasks by `urgent` (`isUrgent`) and `overdue` (`dueDate < todayStr && !isCompleted`).
4. **`src/components/layout/SlideOverDrawer.tsx` (lines 101-107)**:
   Contains a custom toggle:
   ```typescript
   const handleToggleFocus = () => {
     if (isFocused) {
       updateItem(currentItem.id, { isFocus: false, isFocused: false })
     } else {
       setFocusedTask(currentItem.id)
     }
   }
   ```
5. **`src/components/tasks/TasksPage.tsx` (lines 40-42, 168-180)**:
   Sorts focused tasks to top of Kanban column and renders focus outline.
6. **`activeTask`, `currentTask`, `pinned`**:
   Zero occurrences in codebase.

---

## 2. R2 Requirements Analysis & Priority Hierarchy

The original request mandates a strict priority hierarchy:
1. **Priority 1: Urgent task (Manual Focus)**
2. **Priority 2: Overdue tasks**
3. **Priority 3: Current task (Time Window)**
4. **Fallback: Default when none match**

### 2.1 Priority 1: Urgent task (Manual Focus)
- **Definition**: A task where the user explicitly activated focus (`task.isFocus === true`).
- **Behavior**:
  - The task holds focus **until completed (`status === 'completed'`) or manually cleared**.
  - **Critical Rule (AC1)**: If a future task is manually focused (`startDate > now`), its focus is **NOT preempted** when another task's scheduled time arrives (`now in [startDate, deadline]`).
  - **Precedence**: Priority 1 overrides Priority 2 (overdue) and Priority 3 (current).
- **Manual Focus Lifecycle**:
  - *Set*: User clicks target icon on a task -> `setFocusTask(id)` marks `isFocus: true` and unsets other tasks.
  - *Toggle Off / Clear*: User clicks target icon again or unchecks in drawer -> `clearFocusTask(id)` marks `isFocus: false`.
  - *Complete*: User marks task complete -> `toggleTask(id)` sets `status: 'completed'` and clears `isFocus: false`.
  - *Persistence*: Persisted directly in `Item.isFocus` via Dexie IndexedDB.

### 2.2 Priority 2: Overdue Tasks
- **Definition**: An uncompleted task (`status !== 'completed' && status !== 'archived'`) whose deadline has passed:
  $$\text{deadline} < \text{now}$$
- **Multi-task Rule (AC2)**:
  "При наличии нескольких просроченных, в фокус берется самая старая из них (по `deadline`)."
  - *Oldest overdue task* = task with the **earliest / minimum deadline timestamp** (`min(deadline)`).
  - *Example*: Yesterday's deadline (`2026-10-04T18:00`) is smaller than today's earlier deadline (`2026-10-05T09:00`). Therefore, yesterday's task is older, has passed for longer, and **wins focus**.
- **Tie-Breaking for Overdue Tasks**:
  If multiple overdue tasks have identical deadlines:
  1. Priority level (`high` > `medium` > `low`)
  2. Earlier creation timestamp (`createdAt` ascending)
  3. ID string ascending (deterministic)

### 2.3 Priority 3: Current Task (Time Window)
- **Definition**: An uncompleted task where current time falls within its active execution window:
  $$\text{startDate} \le \text{now} \le \text{deadline}$$
- **Multi-task Tie-Breaking for Current Tasks**:
  If multiple tasks overlap the current timestamp:
  1. Priority level (`high` > `medium` > `low`) — high priority task takes precedence during overlapping slots.
  2. Earliest deadline (`deadline` ascending) — finish the task ending soonest first.
  3. Latest start date (`startDate` descending) — more specific / newly begun sub-interval.
  4. Earlier creation timestamp (`createdAt` ascending).
  5. ID string ascending.

### 2.4 Priority 4: Default / Fallback Selection
If:
- No task is manually focused (Priority 1 = ∅),
- No task is overdue (Priority 2 = ∅),
- No task has `now` within `[startDate, deadline]` (Priority 3 = ∅).

What should be focused?
1. **Next Upcoming Task**: Filter active tasks with `startDate > now`, pick the one starting soonest (`min(startDate)`). This gives the user situational awareness of what is coming next.
2. **Backlog High-Priority Task**: If no future tasks have start dates, pick uncompleted task with `priority === 'high'`.
3. **Oldest Uncompleted Task**: First non-completed task by `createdAt`.
4. **Empty State (`null`)**: If all tasks are completed or list is empty, return `null`. `FocusHeroCard` renders `"Нет задач в фокусе"`.

---

## 3. Date & Time Parsing and Normalization

In VoiceNotes AI, dates can exist in multiple formats:
1. ISO 8601 strings: `'2026-10-06T15:30:00.000Z'`
2. Date-only strings: `'2026-10-06'`
3. Time-only strings: `'15:30'` (used in seed data with `dueTime` or `dueDate`)
4. New fields from R1: `startDate` and `deadline`.

To guarantee that the Focus Engine is completely resilient and future-proof across R1 and legacy data, we implement robust normalizers:

```typescript
export function parseTaskDeadline(task: Item, now: Date = new Date()): Date | null {
  // 1. Explicit deadline field (R1)
  const raw = (task as any).deadline || task.dueDate
  if (!raw) return null

  // If full ISO or datetime string
  if (raw.includes('T')) {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }

  // If date string YYYY-MM-DD
  if (raw.includes('-')) {
    const time = task.dueTime || (task as any).deadlineTime
    if (time && time.includes(':')) {
      const d = new Date(`${raw}T${time}:00`)
      return isNaN(d.getTime()) ? null : d
    }
    // Date only: end of that calendar day
    const d = new Date(`${raw}T23:59:59.999`)
    return isNaN(d.getTime()) ? null : d
  }

  // If time only HH:mm (relative to current date)
  if (raw.includes(':')) {
    const todayStr = now.toISOString().split('T')[0]
    const d = new Date(`${todayStr}T${raw}:00`)
    return isNaN(d.getTime()) ? null : d
  }

  return null
}

export function parseTaskStartDate(task: Item, now: Date = new Date()): Date | null {
  const raw = (task as any).startDate || (task as any).startTime
  if (!raw) return null

  if (raw.includes('T')) {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }

  if (raw.includes('-')) {
    const time = (task as any).startTime
    if (time && time.includes(':')) {
      const d = new Date(`${raw}T${time}:00`)
      return isNaN(d.getTime()) ? null : d
    }
    const d = new Date(`${raw}T00:00:00.000`)
    return isNaN(d.getTime()) ? null : d
  }

  if (raw.includes(':')) {
    const todayStr = now.toISOString().split('T')[0]
    const d = new Date(`${todayStr}T${raw}:00`)
    return isNaN(d.getTime()) ? null : d
  }

  return null
}
```

---

## 4. Focus Logic Engine Algorithm Design

### 4.1 Interface Specification
```typescript
export type FocusReason = 'manual' | 'overdue' | 'current' | 'fallback' | 'none'

export interface FocusResult {
  focusedTask: Item | null
  reason: FocusReason
  overdueTasks: Item[]
  currentTasks: Item[]
}
```

### 4.2 Algorithm Implementation (`calculateFocusedTask`)

```typescript
export function calculateFocusedTask(
  items: Item[],
  now: Date = new Date()
): FocusResult {
  const activeTasks = items.filter(
    (i) => i.type === 'task' && i.status !== 'completed' && i.status !== 'archived'
  )

  if (activeTasks.length === 0) {
    return { focusedTask: null, reason: 'none', overdueTasks: [], currentTasks: [] }
  }

  const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 }

  // -------------------------------------------------------------
  // Priority 1: Urgent task (Manual Focus)
  // -------------------------------------------------------------
  const manualTask = activeTasks.find((i) => Boolean(i.isFocus || (i as any).isFocused))
  if (manualTask) {
    return {
      focusedTask: manualTask,
      reason: 'manual',
      overdueTasks: [],
      currentTasks: [],
    }
  }

  const nowMs = now.getTime()

  // -------------------------------------------------------------
  // Priority 2: Overdue tasks (deadline passed, not completed)
  // -------------------------------------------------------------
  const overdueList: Array<{ task: Item; deadlineMs: number }> = []
  const currentList: Array<{ task: Item; startMs: number; deadlineMs: number }> = []
  const upcomingList: Array<{ task: Item; startMs: number }> = []

  for (const task of activeTasks) {
    const deadline = parseTaskDeadline(task, now)
    const start = parseTaskStartDate(task, now)

    const deadlineMs = deadline ? deadline.getTime() : null
    const startMs = start ? start.getTime() : null

    // Overdue check
    if (deadlineMs !== null && deadlineMs < nowMs) {
      overdueList.push({ task, deadlineMs })
      continue
    }

    // Current window check: [startDate, deadline]
    if (startMs !== null && deadlineMs !== null) {
      if (startMs <= nowMs && nowMs <= deadlineMs) {
        currentList.push({ task, startMs, deadlineMs })
        continue
      }
      if (startMs > nowMs) {
        upcomingList.push({ task, startMs })
        continue
      }
    } else if (startMs !== null && startMs > nowMs) {
      upcomingList.push({ task, startMs })
    }
  }

  if (overdueList.length > 0) {
    // Oldest overdue task wins (min deadlineMs)
    overdueList.sort((a, b) => {
      if (a.deadlineMs !== b.deadlineMs) {
        return a.deadlineMs - b.deadlineMs // Ascending: earlier deadline first
      }
      const pDiff = (priorityWeight[b.task.priority] || 1) - (priorityWeight[a.task.priority] || 1)
      if (pDiff !== 0) return pDiff
      const cA = a.task.createdAt ? new Date(a.task.createdAt).getTime() : 0
      const cB = b.task.createdAt ? new Date(b.task.createdAt).getTime() : 0
      if (cA !== cB) return cA - cB
      return a.task.id.localeCompare(b.task.id)
    })

    return {
      focusedTask: overdueList[0].task,
      reason: 'overdue',
      overdueTasks: overdueList.map((x) => x.task),
      currentTasks: currentList.map((x) => x.task),
    }
  }

  // -------------------------------------------------------------
  // Priority 3: Current task (current time in [startDate, deadline])
  // -------------------------------------------------------------
  if (currentList.length > 0) {
    currentList.sort((a, b) => {
      // 1. Higher priority first
      const pDiff = (priorityWeight[b.task.priority] || 1) - (priorityWeight[a.task.priority] || 1)
      if (pDiff !== 0) return pDiff

      // 2. Earliest deadline first (finish soonest task first)
      if (a.deadlineMs !== b.deadlineMs) return a.deadlineMs - b.deadlineMs

      // 3. Latest start date (most recent interval started)
      if (a.startMs !== b.startMs) return b.startMs - a.startMs

      // 4. Earlier createdAt
      const cA = a.task.createdAt ? new Date(a.task.createdAt).getTime() : 0
      const cB = b.task.createdAt ? new Date(b.task.createdAt).getTime() : 0
      if (cA !== cB) return cA - cB

      return a.task.id.localeCompare(b.task.id)
    })

    return {
      focusedTask: currentList[0].task,
      reason: 'current',
      overdueTasks: [],
      currentTasks: currentList.map((x) => x.task),
    }
  }

  // -------------------------------------------------------------
  // Priority 4: Default / Fallback
  // -------------------------------------------------------------
  // 4a. Next upcoming task
  if (upcomingList.length > 0) {
    upcomingList.sort((a, b) => a.startMs - b.startMs)
    return {
      focusedTask: upcomingList[0].task,
      reason: 'fallback',
      overdueTasks: [],
      currentTasks: [],
    }
  }

  // 4b. High priority backlog task
  const highPriority = activeTasks.find((i) => i.priority === 'high')
  if (highPriority) {
    return {
      focusedTask: highPriority,
      reason: 'fallback',
      overdueTasks: [],
      currentTasks: [],
    }
  }

  // 4c. First active task
  return {
    focusedTask: activeTasks[0],
    reason: 'fallback',
    overdueTasks: [],
    currentTasks: [],
  }
}
```

---

## 5. UI Exposure & Reactivity Architecture

### 5.1 Architecture Diagram
```
                     +----------------------------------+
                     |         IndexedDB (Dexie)        |
                     +----------------------------------+
                                      |
                                      v
                     +----------------------------------+
                     |       Zustand: useAppStore       |
                     |  - items: Item[]                 |
                     |  - setFocusTask(id)              |
                     |  - clearFocusTask(id)            |
                     |  - toggleFocusTask(id)           |
                     +----------------------------------+
                                      |
                     +----------------------------------+
                     |    Core: calculateFocusedTask    |
                     |   (Pure, deterministic engine)   |
                     +----------------------------------+
                                      |
                                      v
                     +----------------------------------+
                     |     React Hook: useFocusedTask   |
                     |  - subscribes to items           |
                     |  - 10-30s tick for time updates  |
                     |  - returns { focusedTask, ... }  |
                     +----------------------------------+
                                      |
          +---------------------------+---------------------------+
          |                           |                           |
          v                           v                           v
+-------------------+       +--------------------+      +--------------------+
|   FocusHeroCard   |       | DashboardTaskItem  |      |     TasksPage      |
| (Hero badge +     |       | (Target button +   |      | (Kanban highlight  |
|  subtasks)        |       |  active outline)   |      |  and sorting)      |
+-------------------+       +--------------------+      +--------------------+
```

### 5.2 Hook Design: `src/hooks/useFocusedTask.ts`
```typescript
import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { calculateFocusedTask, FocusResult } from '../lib/focusEngine'

export function useFocusedTask(tickIntervalMs = 15000): FocusResult {
  const items = useAppStore((state) => state.items)
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, tickIntervalMs)
    return () => clearInterval(timer)
  }, [tickIntervalMs])

  return useMemo(() => {
    return calculateFocusedTask(items, now)
  }, [items, now])
}
```
*Benefits*:
- **Automatic time transitions**: When time reaches a new task interval or crosses a deadline, the hook automatically recalculates without requiring user interaction.
- **Configurable interval / fake timer support**: Tests can pass custom intervals or use `vi.useFakeTimers()`.
- **Zero store pollution**: No timers or intervals polling inside the global store.

### 5.3 Store Actions in `src/store/useAppStore.ts`
Add the following methods to `AppState`:
```typescript
// Clears manual focus from all items
clearFocusTask: async () => {
  const previousItems = get().items
  const now = new Date().toISOString()
  const nextItems = previousItems.map((item) =>
    item.isFocus || (item as any).isFocused
      ? { ...item, isFocus: false, isFocused: false, updatedAt: now }
      : item
  )
  set({ items: nextItems })
  // Persist in DB
  const previouslyFocused = previousItems.filter((i) => i.isFocus || (i as any).isFocused)
  for (const item of previouslyFocused) {
    await db.updateItem(item.id, { isFocus: false, isFocused: false })
  }
},

// Toggles focus on/off for a specific item
toggleFocusTask: async (id: string) => {
  const target = get().items.find((i) => i.id === id)
  if (!target) return
  if (target.isFocus || (target as any).isFocused) {
    await get().clearFocusTask()
  } else {
    await get().setFocusTask(id)
  }
}
```

### 5.4 UI Badge & Reason Indicator in `FocusHeroCard.tsx`
`FocusHeroCard` should visually explain **why** the task is in focus:
- `reason === 'manual'`: Badge "В ручном фокусе" (Purple/Primary)
- `reason === 'overdue'`: Badge "Просрочена!" (Error red)
- `reason === 'current'`: Badge "Текущая по графику" (Cyan/Secondary)
- `reason === 'fallback'`: Badge "Следующая в плане" (Outline)

---

## 6. Acceptance Criteria Mapping & Verification Strategy

| AC # | Acceptance Criterion Text | Condition Under Test | Expected Engine Output | Verification Test Method |
|---|---|---|---|---|
| **AC1** | *Агент-судья подтверждает: ручной фокус на будущую задачу не сбрасывается при наступлении времени другой задачи.* | - Task A: Future (`startDate`: $T+2h$), `isFocus: true`.<br>- Task B: Current interval ($[T-1h, T+1h]$).<br>- Evaluated at time $T$. | `focusedTask.id === 'task-a'` and `reason === 'manual'`. | Unit test: `calculateFocusedTask([taskA, taskB], nowT)` returns Task A. |
| **AC2** | *Агент-судья подтверждает: если есть задача с deadline вчера и задача с deadline сегодня, фокус автоматически устанавливается на вчерашнюю.* | - No manual focus.<br>- Task Yesterday: `deadline` = $T - 24h$.<br>- Task Today: `deadline` = $T - 2h$.<br>- Evaluated at time $T$. | `focusedTask.id === 'task-yesterday'` and `reason === 'overdue'`. | Unit test: `calculateFocusedTask([taskYesterday, taskToday], nowT)` returns Task Yesterday. |
| **AC3** | *Агент-судья подтверждает: если текущее время находится внутри интервала некой задачи, и нет просроченных или вручную сфокусированных задач, эта задача получает фокус.* | - No manual focus.<br>- No overdue tasks.<br>- Task C: `startDate`: $T - 30m$, `deadline`: $T + 30m$.<br>- Task D: `startDate`: $T + 1h$, `deadline`: $T + 2h$. | `focusedTask.id === 'task-c'` and `reason === 'current'`. | Unit test: `calculateFocusedTask([taskC, taskD], nowT)` returns Task C. |

---

## 7. Concrete Vitest Test Suite Blueprint

A dedicated test file `src/lib/__tests__/focusEngine.test.ts` should be created containing the following test cases:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateFocusedTask } from '../focusEngine'
import { Item } from '../../types/item'

const makeTask = (id: string, overrides: Partial<Item> = {}): Item => ({
  id,
  type: 'task',
  title: `Task ${id}`,
  categoryTag: '#Test',
  status: 'todo',
  priority: 'medium',
  isFocus: false,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
  ...overrides,
})

describe('Focus Logic Engine (calculateFocusedTask)', () => {
  const baseTime = new Date('2026-10-06T12:00:00Z')

  describe('Priority 1: Urgent task (manual focus)', () => {
    it('AC1: manual focus on future task is not overridden when another task becomes current', () => {
      const futureManualTask = makeTask('future-manual', {
        isFocus: true,
        startDate: '2026-10-06T14:00:00Z' as any,
        deadline: '2026-10-06T16:00:00Z' as any,
      })
      const currentTask = makeTask('current', {
        startDate: '2026-10-06T11:00:00Z' as any,
        deadline: '2026-10-06T13:00:00Z' as any,
      })

      const res = calculateFocusedTask([futureManualTask, currentTask], baseTime)
      expect(res.focusedTask?.id).toBe('future-manual')
      expect(res.reason).toBe('manual')
    })

    it('manual focus holds over overdue tasks', () => {
      const manualTask = makeTask('manual', { isFocus: true })
      const overdueTask = makeTask('overdue', { deadline: '2026-10-05T12:00:00Z' as any })

      const res = calculateFocusedTask([manualTask, overdueTask], baseTime)
      expect(res.focusedTask?.id).toBe('manual')
      expect(res.reason).toBe('manual')
    })

    it('completed manually focused task does not hold focus', () => {
      const completedManual = makeTask('manual', { isFocus: true, status: 'completed' })
      const overdueTask = makeTask('overdue', { deadline: '2026-10-05T12:00:00Z' as any })

      const res = calculateFocusedTask([completedManual, overdueTask], baseTime)
      expect(res.focusedTask?.id).toBe('overdue')
      expect(res.reason).toBe('overdue')
    })
  })

  describe('Priority 2: Overdue tasks', () => {
    it('AC2: oldest overdue task by deadline wins (yesterday vs today)', () => {
      const taskYesterday = makeTask('yesterday', { deadline: '2026-10-05T18:00:00Z' as any })
      const taskToday = makeTask('today-earlier', { deadline: '2026-10-06T09:00:00Z' as any })

      const res = calculateFocusedTask([taskToday, taskYesterday], baseTime)
      expect(res.focusedTask?.id).toBe('yesterday')
      expect(res.reason).toBe('overdue')
    })

    it('breaks ties between equal overdue deadlines by priority weight', () => {
      const mediumOverdue = makeTask('med', { deadline: '2026-10-05T10:00:00Z' as any, priority: 'medium' })
      const highOverdue = makeTask('high', { deadline: '2026-10-05T10:00:00Z' as any, priority: 'high' })

      const res = calculateFocusedTask([mediumOverdue, highOverdue], baseTime)
      expect(res.focusedTask?.id).toBe('high')
      expect(res.reason).toBe('overdue')
    })
  })

  describe('Priority 3: Current task', () => {
    it('AC3: selects current task inside [startDate, deadline] when no manual or overdue tasks exist', () => {
      const currentTask = makeTask('current', {
        startDate: '2026-10-06T11:00:00Z' as any,
        deadline: '2026-10-06T13:00:00Z' as any,
      })
      const futureTask = makeTask('future', {
        startDate: '2026-10-06T15:00:00Z' as any,
        deadline: '2026-10-06T17:00:00Z' as any,
      })

      const res = calculateFocusedTask([futureTask, currentTask], baseTime)
      expect(res.focusedTask?.id).toBe('current')
      expect(res.reason).toBe('current')
    })

    it('breaks ties between overlapping current tasks by priority and deadline', () => {
      const taskA = makeTask('a', {
        startDate: '2026-10-06T10:00:00Z' as any,
        deadline: '2026-10-06T14:00:00Z' as any,
        priority: 'high',
      })
      const taskB = makeTask('b', {
        startDate: '2026-10-06T11:00:00Z' as any,
        deadline: '2026-10-06T13:00:00Z' as any,
        priority: 'medium',
      })

      const res = calculateFocusedTask([taskA, taskB], baseTime)
      expect(res.focusedTask?.id).toBe('a')
    })
  })

  describe('Priority 4: Fallback and Empty State', () => {
    it('returns null and none reason when no tasks are active', () => {
      const res = calculateFocusedTask([], baseTime)
      expect(res.focusedTask).toBeNull()
      expect(res.reason).toBe('none')
    })

    it('picks next upcoming task if no overdue or current tasks exist', () => {
      const nextTask = makeTask('next', {
        startDate: '2026-10-06T13:00:00Z' as any,
        deadline: '2026-10-06T14:00:00Z' as any,
      })
      const laterTask = makeTask('later', {
        startDate: '2026-10-06T16:00:00Z' as any,
        deadline: '2026-10-06T17:00:00Z' as any,
      })

      const res = calculateFocusedTask([laterTask, nextTask], baseTime)
      expect(res.focusedTask?.id).toBe('next')
      expect(res.reason).toBe('fallback')
    })
  })
})
```

---

## 8. Implementation Checklist & Dependency Coordination

### Storage Track Coordination (R1)
- Storage Explorer is defining `startDate` and `deadline` on `Item` (`src/types/item.ts`).
- Focus Engine is designed to accept `startDate`, `deadline`, and gracefully fall back to `dueDate` / `dueTime`.
- Schema upgrade in Dexie: `startDate` and `deadline` may be indexed or unindexed; for the focus engine, filtering occurs in-memory in Zustand store, so no complex Dexie compound index is strictly needed.

### Pre-Existing Codebase Defect Note
- During TypeScript syntax inspection (`npx tsc --noEmit`), an existing syntax error was observed in `src/lib/__tests__/db.test.ts:296`: a closing `})` is missing for the final `describe` block. The test file was truncated or unclosed. Implementers should ensure this closing brace is restored during Phase 1/2.
