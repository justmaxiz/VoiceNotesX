# Handoff Report: Calendar & Schedule UI Survey (R3)

## 1. Observation
1. **Week Timeline Grid Implementation**:
   - In `d:\relax\projects\voicenotes\src\components\calendar\WeekTimelineView.tsx` (lines 90–149):
     ```tsx
     {hours.map((hour) => {
       const hourStr = `${hour.toString().padStart(2, '0')}:00`
       return (
         <div key={hour} className="grid grid-cols-8 min-h-[56px] group">
           <div className="p-2 text-xs font-mono text-outline ...">{hourStr}</div>
           {weekDays.map((col) => {
             const dayTasks = getTasksForDay(col.dateKey).filter((t) => {
               if (t.isAllDay) return false
               const time = t.dueTime || (t.dueDate?.includes(':') ? t.dueDate : null)
               if (!time) return false
               const taskHour = parseInt(time.split(':')[0], 10)
               return taskHour === hour
             })
             return (
               <div key={`${col.dateKey}-${hour}`} ...>
                 {dayTasks.map((task) => (
                   <div key={task.id} className="p-1.5 rounded-lg text-[11px] truncate ...">
                     <div className="truncate">{task.title}</div>
                     <div className="text-[10px] text-outline mt-0.5">{task.dueTime || task.dueDate}</div>
                   </div>
                 ))}
               </div>
             )
           })}
         </div>
       )
     })}
     ```
   - Each hour is an isolated DOM container (`<div className="grid grid-cols-8 min-h-[56px]">`).
   - Tasks are filtered strictly by `taskHour === hour`, representing single-point events.
   - Tasks do not stretch across hours and possess no duration-based height styles.

2. **Day View Implementation**:
   - In `d:\relax\projects\voicenotes\src\components\calendar\CalendarPage.tsx` (lines 324–383):
     ```tsx
     {hours.map((hour) => {
       const hourStr = `${hour.toString().padStart(2, '0')}:00`
       const tasksForHour = items.filter((item) => {
         if (item.type !== 'task' || item.status === 'archived') return false
         const time = item.dueTime || (item.dueDate?.includes(':') ? item.dueDate : null)
         if (!time) return false
         return parseInt(time.split(':')[0], 10) === hour
       })
       return (
         <div key={hour} className="flex items-start gap-4 py-3 group ...">
           <span className="text-xs font-mono text-outline w-12 shrink-0 pt-1">{hourStr}</span>
           <div className="flex-1 flex flex-col gap-1.5">
             {tasksForHour.map((task) => (
               <div key={task.id} className="p-3 rounded-xl border-l-4 ...">
                 <div className="font-medium text-body-md text-on-surface">{task.title}</div>
                 <div className="text-xs text-on-surface-variant mt-1">Дедлайн: {task.dueTime || task.dueDate}</div>
               </div>
             ))}
           </div>
         </div>
       )
     })}
     ```
   - Identical row-slice structure: tasks are constrained to the single-hour row matching `taskHour === hour`.

3. **Field Availability in Existing Data Model**:
   - In `d:\relax\projects\voicenotes\src\types\item.ts` (lines 11–15):
     ```ts
     dueDate?: string | null;
     dueTime?: string | null;
     isAllDay?: boolean;
     estimatedMinutes?: number;
     reminderMinutesBefore?: number | null;
     ```
   - `estimatedMinutes` exists in the data model and `DateTimePicker.tsx`, but is completely unused by `CalendarPage.tsx` and `WeekTimelineView.tsx`.
   - `startDate` does not yet exist in `src/types/item.ts`.

4. **Existing Test Execution**:
   - Command: `npx vitest run src/components/calendar/__tests__/CalendarPage.test.tsx`
   - Result: 3 passed (175ms). Tests currently only assert month date rendering, backlog presence, and mode tab switching. No tests verify height or duration.

---

## 2. Logic Chain
1. **Observation 1 & 2** show that both Week and Day schedule views are constructed as a series of 15 independent horizontal row elements (`hours.map(...)`).
2. Because each row is a separate DOM container with its own bounding box, any child element inside one row cannot visually stretch across multiple hours into neighboring rows without breaking layout flow.
3. Therefore, implementing R3 (*"Tasks must visually stretch across their time duration from `startDate` to `deadline`"*) requires restructuring the grid container: instead of row-sliced rows, each day must be a **continuous column container** (`relative` container spanning the total grid height).
4. In a continuous column container:
   - Start time maps to vertical offset: `top = (startMinutes - 480) * (hourHeight / 60)`.
   - Time span maps to block height: `height = (endMinutes - startMinutes) * (hourHeight / 60)`.
   - This formula mathematically guarantees that element height is directly proportional to $(\text{deadline} - \text{startDate})$, which satisfies the R3 acceptance criteria:
     > *"Агент-судья подтверждает по коду верстки: высота или ширина блока задачи в календаре пропорциональна разнице между `deadline` и `startDate`."*
5. **Observation 3** shows that tasks may lack `startDate`. A fallback resolution must be established:
   - If `estimatedMinutes` is present: calculate `startDate = deadline - estimatedMinutes`.
   - If `estimatedMinutes` is missing: default to a 30-minute block ending at deadline with dashed border styling.
6. When multiple tasks overlap in time within the same day, absolute positioning with full width would cause cards to occlude each other. An interval partitioning algorithm ($O(N \log N)$) partitioning concurrent tasks into sub-columns (`width = (100 / totalCols)%`, `left = (col * width)%`) solves collisions cleanly.

---

## 3. Caveats
1. **Date/Time Parsing Standardization**: Currently `dueDate` may contain `'2026-10-06'` or `'15:00'` (legacy seed). The new parsing utility (`parseTaskInterval`) must normalize ISO timestamps, separate date/time strings, and legacy formats.
2. **Horizontal Grid Extent**: The grid currently covers 08:00 to 22:00 (14 hours / 15 markers). Tasks scheduled before 08:00 or after 22:00 must be clamped to the visible boundaries with visual continuation indicators (`arrow_upward` / `arrow_downward`).
3. **Multi-Day Events**: Tasks spanning longer than 24 hours or across midnight must be routed to the top "Весь день" (All-Day) section as horizontal bars to prevent distorted vertical columns.
4. **Read-Only Scope**: This report contains investigation, layout formulas, and architecture specifications. Source code implementation must be carried out by the builder/implementer phase.

---

## 4. Conclusion
The calendar UI requires a focused refactoring of `src/components/calendar/WeekTimelineView.tsx` and `src/components/calendar/CalendarPage.tsx` (Day View):
1. Create a pure layout helper `src/lib/timelineLayout.ts` implementing `parseTaskInterval` and `layoutDayTasks`.
2. Transition Week and Day schedule grids from row-based divs to a Continuous Column layout with absolute positioning for tasks and background guide lines for hours.
3. Implement the sub-column partitioning algorithm for collision resolution.
4. Add `startDate` and `startTime` fields to `src/components/ui/DateTimePicker.tsx`.
5. Add unit tests asserting exact height proportionality and overlap column division.

Detailed specifications, code snippets, and layout diagrams are documented in `d:\relax\projects\voicenotes\.agents\teamwork\explorer_survey_calendar\report.md`.

---

## 5. Verification Method
1. **Source Inspection**:
   - Inspect `d:\relax\projects\voicenotes\src\components\calendar\WeekTimelineView.tsx` (lines 90–149) and `CalendarPage.tsx` (lines 324–383) to verify current point-item row slicing.
   - Inspect `d:\relax\projects\voicenotes\src\types\item.ts` (lines 11–15) to verify presence of `estimatedMinutes` and lack of `startDate`.
2. **Test Command Verification**:
   - Run existing calendar tests:
     ```powershell
     npx vitest run src/components/calendar/__tests__/CalendarPage.test.tsx
     ```
   - Verify all 3 tests pass.
3. **Invalidation Conditions**:
   - If `startDate` is implemented as an epoch timestamp (number) rather than an ISO string or time string, the parsing function must adapt its type guards accordingly.
   - If the team decides to expand the schedule grid to 24 hours (00:00–24:00) instead of 08:00–22:00, `H_start = 0` and total height should adjust accordingly.
