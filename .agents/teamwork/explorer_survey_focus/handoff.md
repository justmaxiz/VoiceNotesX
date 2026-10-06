# Handoff Report: Focus Logic Engine Explorer (R2)

**From**: Focus Logic Engine Explorer (`explorer_survey_focus`)  
**To**: Orchestrator (`orchestrator_1`)  
**Task**: Investigation and Design for Requirement R2 (Smart Focus Logic)  
**Date**: 2026-10-06  

---

## 1. Observation

1. **Current Data Model for Focus**:
   - In `src/types/item.ts:19`: `isFocus: boolean;` is the only focus-related field in the `Item` interface.
   - In `src/types/item.ts:11-12`: Existing date fields are `dueDate?: string | null;` and `dueTime?: string | null;`. Neither `startDate` nor explicit `deadline` exist on `Item` yet.
   - In `src/types/item.ts:49`: `TaskItemData` view model has `isUrgent?: boolean;`.
   - In `src/components/dashboard/DashboardOverview.tsx:51,54`:
     ```typescript
     isUrgent: item.priority === 'high',
     isFocused: Boolean(item.isFocus || item.isFocused),
     ```

2. **Storage and Store Focus Handling**:
   - In `src/lib/db.ts:19`: Dexie index `items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate'`.
   - In `src/lib/db.ts:93-116`: `setFocusTask(id: string)` resets `isFocus: false` on all other items and sets `isFocus: true, isFocused: true, status: newStatus` on the target.
   - In `src/store/useAppStore.ts:264-306`: `setFocusTask(id)` and `setFocusedTask(id)` exist, but **no** `clearFocusTask` or `toggleFocusTask` exists.

3. **Current In-Component Focus Derivation**:
   - In `src/components/dashboard/components/FocusHeroCard.tsx:44-56`:
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
     Focus selection is completely hardcoded inside this component, ignores dates/deadlines/overdue states entirely, and does not react to time passage.

4. **UI Wire-up for Focus**:
   - In `src/components/dashboard/components/DashboardTaskItem.tsx:165-178`: Focus target button triggers `onSetFocus(task.id)` without toggle capability.
   - In `src/components/layout/SlideOverDrawer.tsx:101-107`: Custom toggle calls `updateItem(currentItem.id, { isFocus: false, isFocused: false })` if already focused.
   - In `src/components/tasks/TasksPage.tsx:40-42,168-180`: Kanban column sorts focused tasks to the top.

5. **Test Status and Pre-existing Syntax Error**:
   - `npx vitest run src/store/__tests__/useAppStore.test.ts` passed (13/13 tests passed in 69ms).
   - `npx tsc --noEmit` failed with:
     ```
     src/lib/__tests__/db.test.ts(296,3): error TS1128: Declaration or statement expected.
     src/lib/__tests__/db.test.ts(296,4): error TS1128: Declaration or statement expected.
     ```
     Inspecting `src/lib/__tests__/db.test.ts:290-297` confirms a missing closing `})` for the `describe` block.

---

## 2. Logic Chain

1. **Decoupling Focus Engine from UI Components**:
   - From Observation 3, `FocusHeroCard.tsx` currently performs local ad-hoc task selection. If any other component (e.g. `DashboardTaskItem`, `TasksPage`, drawer, or notifications) needs to know the active focused task, logic is duplicated or inconsistent.
   - Therefore, task focus calculation must be extracted into a pure, standalone utility function: `calculateFocusedTask(items: Item[], now: Date = new Date()): FocusResult` in `src/lib/focusEngine.ts`.

2. **Priority 1 (Manual Focus / Urgent Task)**:
   - From Requirement R2: "Срочная задача (ручной фокус): Пользователь вручную выделил задачу, время которой еще не наступило. Она удерживает фокус до завершения или ручного снятия."
   - From AC1: "ручной фокус на будущую задачу не сбрасывается при наступлении времени другой задачи."
   - From Observation 1, manual focus is designated by `task.isFocus === true`.
   - By checking `task.isFocus === true` as the **very first step** in `calculateFocusedTask` before any date/time comparisons, a manually focused future task will always be chosen over any current or overdue tasks.
   - To allow manual release as required ("до завершения или ручного снятия"), `useAppStore` must provide `clearFocusTask()` and `toggleFocusTask(id: string)`.

3. **Priority 2 (Overdue Tasks)**:
   - From Requirement R2: "Просроченные задачи: Время deadline прошло, а задача не завершена. При наличии нескольких просроченных, в фокус берется самая старая из них (по deadline)."
   - From AC2: "если есть задача с deadline вчера и задача с deadline сегодня, фокус автоматически устанавливается на вчерашнюю."
   - An overdue task satisfies $\text{deadline} < \text{now}$ and `status !== 'completed'`.
   - "Oldest overdue task by deadline" mathematically means the task with the smallest timestamp $\min(\text{deadline})$.
   - Yesterday's timestamp is smaller than today's timestamp ($T_{\text{yesterday}} < T_{\text{today}}$), so ascending sort by deadline (`deadlineMsAsc`) guarantees that yesterday's task wins over today's task, fulfilling AC2.
   - In case of equal deadlines, secondary tie-breakers: `priority` weight (`high` > `medium` > `low`), then `createdAt` ascending, then `id`.

4. **Priority 3 (Current Task)**:
   - From Requirement R2: "Текущая задача: Текущее системное время попадает в интервал между startDate и deadline."
   - From AC3: "если текущее время находится внутри интервала некой задачи, и нет просроченных или вручную сфокусированных задач, эта задача получает фокус."
   - Evaluated only when Priority 1 and Priority 2 return no matches.
   - Criteria: $\text{startDate} \le \text{now} \le \text{deadline}$ and `status !== 'completed'`.
   - If multiple tasks match: tie-breaking by `priority` weight (`high` > `medium` > `low`), then earliest deadline ($\min(\text{deadline})$ to finish soonest task), then latest start date, then `createdAt`.

5. **Priority 4 (Fallback / Default)**:
   - When no tasks match Priorities 1, 2, or 3, fallback selects:
     1. Next upcoming task ($\min(\text{startDate})$ where $\text{startDate} > \text{now}$)
     2. High-priority backlog task
     3. Oldest active task
     4. `null` if all tasks completed or list empty.

6. **Time-based Reactivity**:
   - Because focus transitions depend on time (e.g. crossing a start time or deadline), static store selectors alone will not trigger re-renders without state changes.
   - A dedicated React hook `useFocusedTask(tickIntervalMs = 15000)` sets up a lightweight tick timer that updates `now` and recomputes `calculateFocusedTask(items, now)`.

---

## 3. Caveats

1. **Storage Explorer Coordination (R1)**:
   - R1 is concurrently investigated by `explorer_survey_storage`. Our focus engine design supports both the new `startDate`/`deadline` fields and legacy `dueDate`/`dueTime` seamlessly.
2. **Calendar Explorer Coordination (R3)**:
   - Calendar stretching does not affect focus engine logic, but calendar components can consume `useFocusedTask()` to highlight the currently focused event.
3. **Pre-existing Syntax Error**:
   - `src/lib/__tests__/db.test.ts:296` has a pre-existing missing closing `})` for its `describe` block. This was NOT introduced by this explorer (we performed zero code modifications), but must be fixed when editing db tests in Phase 1/2.

---

## 4. Conclusion

1. Requirement R2 is fully designed and ready for implementation.
2. Proposed architecture consists of:
   - `src/lib/focusEngine.ts`: pure functions `calculateFocusedTask`, `parseTaskDeadline`, `parseTaskStartDate`.
   - `src/hooks/useFocusedTask.ts`: reactive hook with periodic timer for live transitions.
   - `src/store/useAppStore.ts`: add `clearFocusTask` and `toggleFocusTask`.
   - `src/components/dashboard/components/FocusHeroCard.tsx`: replace inline `useMemo` with `useFocusedTask()` and render focus reason badges.
3. Acceptance Criteria AC1, AC2, and AC3 are 100% satisfied by the proposed Priority 1-2-3 algorithm.
4. Comprehensive test blueprint is documented in `report.md` for `src/lib/__tests__/focusEngine.test.ts`.

---

## 5. Verification Method

To independently verify this investigation:
1. **Inspect Reports**:
   - View `d:\relax\projects\voicenotes\.agents\teamwork\explorer_survey_focus\report.md`
   - View `d:\relax\projects\voicenotes\.agents\teamwork\explorer_survey_focus\handoff.md`
2. **Verify Existing Tests**:
   - Run: `npx vitest run src/store/__tests__/useAppStore.test.ts` (confirms store focus baseline passes).
3. **Verify Pre-existing Defect in db.test.ts**:
   - Run: `npx tsc --noEmit` (confirms syntax error at line 296 of `db.test.ts`).
4. **Invalidation Conditions**:
   - If user rules change to allow automated overdue task preemption of manual focus, Priority 1 precedence would need inversion. (Currently forbidden by AC1).
