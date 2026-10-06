# Отчет исследования архитектуры данных и хранилища (VoiceNotes AI Task Modernization)

**Дата:** 2026-10-06  
**Исследователь:** Storage Architecture Explorer  
**Целевой проект:** VoiceNotes AI (`d:\relax\projects\voicenotes`)  
**Оригинальный запрос:** Модернизация системы задач — добавление `startDate`, использование `deadline`, визуализация длительности в календаре (R3) и умный фокус (R2).

---

## 1. Исполнительное резюме (Executive Summary)

В ходе детального исследования кодовой базы VoiceNotes AI выявлено:
1. **Текущее представление задач (`src/types/item.ts`):** 
   - Задачи описываются интерфейсом `Item` (с дискриминатором `type: 'task'`).
   - На данный момент поля `startDate` и явного поля `deadline` **не существует**. Для сроков выполнения использовались поля `dueDate?: string | null` (дата в формате `YYYY-MM-DD` или строка) и `dueTime?: string | null` (`HH:mm`), которые в UI назывались «дедлайном» (`FocusHeroCard.tsx:67`, `CalendarPage.tsx:360`, `DateTimePicker.tsx:55`).
   - Для статуса выполнения используются `status: 'todo' | 'in_progress' | 'completed' | 'archived'` и `completedAt?: string`.
   - Для фокуса используется флаг `isFocus: boolean` (в некоторых компонентах и старом коде также присутствует `isFocused`).

2. **Слой БД (Dexie.js / IndexedDB, `src/lib/db.ts`):**
   - База данных `VoiceNotesDB` находится на `version(1)` с таблицей `items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate'`.
   - Dexie сохраняет все свойства объекта (не только индексы), поэтому новые поля сохраняются автоматически, однако для эффективных запросов и правильной архитектуры необходимо ввести `version(2)` с добавлением индексов `startDate` и `deadline`.
   - Миграция данных без потери пользовательской информации реализуется через стандартный механизм `version(2).stores(...).upgrade(async tx => { ... })` с обратной совместимостью (`dueDate` + `dueTime` -> `deadline`, вычисление `startDate` на основе `estimatedMinutes` или дефолтных интервалов).

3. **Стейт-менеджмент и сервисы (`src/store/useAppStore.ts`):**
   - Zustand-хранилище `useAppStore` реализует оптимистичные обновления (`addItem`, `updateItem`, `deleteItem`, `toggleTask`, `setFocusTask`) с синхронизацией в IndexedDB и откатом при ошибках.
   - Сервисы AI-структурирования (`src/lib/geminiStructuring.ts`, `src/lib/gemini.ts`), быстрый ввод (`QuickCaptureWidget.tsx`), генерация сидов (`seedData.ts`) и экспорт/бэкап (`export.ts`) легко расширяются новыми полями без нарушения существующих контрактов.

4. **Критическая находка по тестам и типам в репозитории:**
   - В коммите `e8be178` файл `src/lib/__tests__/db.test.ts` получил синтаксическую ошибку (TS1128: строка 277 преждевременно закрыла блок `describe`, оставив строки 278–296 висящими без открывающего `it(...)`).
   - В `src/types/item.ts` был случайно удален интерфейс `AudioSession`, хотя он импортируется в `db.ts`, `seedData.ts` и `db.test.ts`.
   - Устранение этих двух моментов необходимо для успешного прохождения проверки типов `tsc --noEmit` и запуска `db.test.ts`.

---

## 2. Анализ типов (`src/types/`)

### 2.1. Текущий интерфейс `Item` (`src/types/item.ts`, строки 1–23)
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
  dueDate?: string | null;
  dueTime?: string | null;
  isAllDay?: boolean;
  estimatedMinutes?: number;
  reminderMinutesBefore?: number | null;
  tags?: string[];
  completedAt?: string;
  categoryTag: string;
  isFocus: boolean;
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}
```

### 2.2. Анализ сопутствующих интерфейсов
1. `TaskItemData` (`src/types/item.ts:40-56`):
   - Представление задачи для виджетов дашборда (`DashboardOverview.tsx`, `DashboardTaskItem.tsx`).
   - Содержит `dueDate?: string | null`, `dueTime?: string | null`, `estimatedMinutes?: number`.
   - В `DashboardOverview.tsx:54` передается `isFocused: Boolean(item.isFocus || (item as any).isFocused)`.
2. `StructuredResult` (`src/types/ai.ts:3-12`):
   - Результат Gemini AI парсинга: содержит `due_date?: string | null`.
   - Требуется расширить полями `start_date?: string | null` и `deadline?: string | null`.

### 2.3. Рекомендуемое расширение типов для R1
В `src/types/item.ts`:
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
  
  // Временные поля R1:
  startDate?: string | null;  // ISO 8601 строка начала задачи (напр. '2026-10-06T14:00:00.000Z')
  deadline?: string | null;   // ISO 8601 строка окончания задачи (напр. '2026-10-06T15:30:00.000Z')
  
  // Сохраняем для обратной совместимости существующих экранов и фильтров:
  dueDate?: string | null;
  dueTime?: string | null;
  isAllDay?: boolean;
  estimatedMinutes?: number;
  reminderMinutesBefore?: number | null;
  tags?: string[];
  completedAt?: string;
  categoryTag: string;
  isFocus: boolean;
  isFocused?: boolean;        // Для унификации обращений в компонентах
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}
```

В `TaskItemData` (`src/types/item.ts`):
- Добавить `startDate?: string | null;`
- Добавить `deadline?: string | null;`
- Добавить `isFocused?: boolean;`

В `src/types/item.ts` восстановить интерфейс `AudioSession`:
```typescript
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
```

---

## 3. Архитектура хранилища Dexie.js и миграция схемы

### 3.1. Текущее состояние базы (`src/lib/db.ts`)
- Экземпляр Dexie: `new VoiceNotesDB('VoiceNotesDB')`
- Текущая версия: `1`
- Текущие индексы:
  ```typescript
  this.version(1).stores({
    items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate',
  })
  ```
- Механизм хранения: Dexie сохраняет документ целиком в IndexedDB Object Store `items`. Любые поля (`description`, `checklist`, `startDate`, `deadline`) сохраняются даже без указания в строке индексов `stores(...)`.
- Однако индексирование полей `startDate` и `deadline` необходимо для:
  1. Выборки задач по интервалу дат/времени в календаре (`where('startDate').between(...)` или `where('deadline')`).
  2. Сортировки просроченных задач по дедлайну (`where('deadline').below(now)`).
  3. Чистой миграции существующих данных пользователя через Dexie `.upgrade()`.

### 3.2. Стратегия миграции на `version(2)` без потери данных
Для бесшовного перехода существующих пользователей добавляется вызов `version(2)` с блоком `.upgrade()`:

```typescript
export class VoiceNotesDB extends Dexie {
  items!: Table<Item, string>
  audioSessions!: Table<AudioSession, string>
  settings!: Table<UserSettings, string>

  constructor(databaseName = 'VoiceNotesDB') {
    super(databaseName)

    // Исходная схема (v1)
    this.version(1).stores({
      items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate',
    })

    // Модернизированная схема (v2) с поддержкой startDate и deadline
    this.version(2).stores({
      items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate, startDate, deadline',
    }).upgrade(async (tx) => {
      // Пакетная трансформация старых записей
      await tx.table('items').toCollection().modify((item: Item) => {
        if (item.type !== 'task') return

        // 1. Формирование deadline из существующих dueDate и dueTime
        if (!item.deadline) {
          if (item.dueDate) {
            if (item.dueDate.includes('T')) {
              item.deadline = item.dueDate
            } else if (item.dueTime && !item.dueDate.includes(':')) {
              item.deadline = `${item.dueDate}T${item.dueTime}:00`
            } else if (item.dueDate.includes(':') && !item.dueDate.includes('-')) {
              // Случай, когда dueDate содержал просто время (из seed данных)
              const today = new Date().toISOString().split('T')[0]
              item.deadline = `${today}T${item.dueDate}:00`
            } else {
              item.deadline = `${item.dueDate}T23:59:59`
            }
          } else {
            // Если дедлайна не было, дедлайн не форсируется (остается null/undefined для бэклога)
            item.deadline = null
          }
        }

        // 2. Формирование startDate
        if (!item.startDate) {
          if (item.deadline) {
            // Если есть дедлайн и оценка длительности (estimatedMinutes),
            // вычисляем startDate = deadline - estimatedMinutes
            const durationMinutes = item.estimatedMinutes && item.estimatedMinutes > 0 ? item.estimatedMinutes : 60
            const deadlineTime = new Date(item.deadline).getTime()
            if (!isNaN(deadlineTime)) {
              item.startDate = new Date(deadlineTime - durationMinutes * 60 * 1000).toISOString()
            } else {
              item.startDate = item.deadline
            }
          } else {
            // Если дедлайн не задан, startDate = null (бэклог)
            item.startDate = null
          }
        }
      })
    })
  }
```

### 3.3. Гарантии безопасности данных
1. **Транзакционность:** Вызов `.upgrade()` выполняется внутри атомарной транзакции IndexedDB `versionchange`. Если происходит ошибка, IndexedDB автоматически откатывает изменения к предыдущей версии схемы.
2. **Идемпотентность:** Проверки `if (!item.deadline)` и `if (!item.startDate)` гарантируют, что повторные прогоны не затирают существующие данные.
3. **Обратная совместимость:** Старые поля `dueDate` и `dueTime` не удаляются из документов, что защищает сторонние компоненты и тесты.

---

## 4. Zustand Store и интеграция CRUD-операций

### 4.1. Анализ `useAppStore` (`src/store/useAppStore.ts`)
Хранилище управляет:
- Массивом `items: Item[]`.
- Действиями `addItem`, `updateItem`, `deleteItem`, `toggleTask`, `setFocusTask`.
- Пакетным переносом задач: `batchRescheduleTasks(dueDate: string | null)`.

### 4.2. Адаптация операций в `useAppStore.ts`
1. **`addItem` (строки 129–166):**
   При добавлении задачи:
   - Если `deadline` передан, а `startDate` отсутствует:
     `startDate = computeStartDate(item.deadline, item.estimatedMinutes)`
   - Синхронизировать `dueDate = item.deadline ? item.deadline.split('T')[0] : null`
   - Синхронизировать `dueTime = item.deadline && item.deadline.includes('T') ? item.deadline.split('T')[1].slice(0, 5) : null`
2. **`updateItem` (строки 168–208):**
   При обновлении `deadline` или `startDate`:
   - Если обновляется `deadline`, синхронизировать `dueDate` и `dueTime`.
   - Если обновляется `dueDate` (например, через DnD в календаре: `CalendarPage.tsx:83`), обновлять дату в `deadline` и `startDate`, сохраняя время.
3. **`batchRescheduleTasks` (строки 356–363):**
   Обновить метод для поддержки новой сигнатуры или адаптации:
   ```typescript
   batchRescheduleTasks: async (dueDate: string | null) => {
     const selected = get().selectedTaskIds
     if (selected.length === 0) return
     for (const id of selected) {
       const item = get().items.find((i) => i.id === id)
       if (!item) continue
       let newDeadline: string | null = null
       let newStartDate: string | null = null
       if (dueDate) {
         const time = item.dueTime || '18:00'
         newDeadline = `${dueDate}T${time}:00`
         const duration = (item.estimatedMinutes || 60) * 60 * 1000
         newStartDate = new Date(new Date(newDeadline).getTime() - duration).toISOString()
       }
       await get().updateItem(id, { dueDate, deadline: newDeadline, startDate: newStartDate })
     }
     set({ selectedTaskIds: [], isSelectMode: false })
   }
   ```

---

## 5. Взаимосвязь `startDate` и `deadline`: правила, валидация и форматы

### 5.1. Формат сериализации
- **Единый стандарт:** **ISO 8601 строка** (`YYYY-MM-DDTHH:mm:ss.sssZ` или `YYYY-MM-DDTHH:mm`).
- **Обоснование:**
  - В JavaScript и JSON строки ISO естественным образом поддерживают лексикографическое сравнение: `'2026-10-06T10:00' < '2026-10-06T12:00'`.
  - Все существующие даты в проекте (`createdAt`, `updatedAt`, `completedAt`) — ISO-строки.
  - Легко парсятся в `new Date(item.startDate)` и форматируются для HTML-инпутов (`input type="datetime-local"`, `input type="date"`).

### 5.2. Обязательность и значения по умолчанию
- **Опциональность:** `startDate?: string | null` и `deadline?: string | null`.
  - Задачи в бэклоге (unscheduled tasks) могут не иметь времени начала и дедлайна (`null` / `undefined`).
  - Заметки (`type: 'note'`) не имеют `startDate` и `deadline`.
- **Значения по умолчанию при создании задачи со временем:**
  - Если пользователь указывает дедлайн (например, 16:00), а длительность не указана: по умолчанию задача длится 1 час (`startDate = deadline - 60 минут`).
  - Если пользователь указывает длительность (например, `estimatedMinutes = 30`), то `duration = 30 минут`.
  - Если создается задача «на сегодня» без конкретного времени: `startDate = today + 09:00`, `deadline = today + 10:00`.

### 5.3. Валидация (`startDate <= deadline`)
- **Инвариант:** Время начала задачи не может быть позже времени дедлайна.
- **Поведение валидатора (`validateTaskDates(startDate, deadline)`):**
  1. Если оба поля заданы, и `new Date(startDate).getTime() > new Date(deadline).getTime()`:
     - При редактировании в UI: автоматическая корректировка `startDate = deadline` (или сдвиг дедлайна вперед на величину длительности).
     - При отображении в календаре: защитный fallback `Math.max(0, duration)`, предотвращающий отрицательную высоту/ширину блока.

---

## 6. Влияние на требования R2 (Фокус) и R3 (Календарь)

### 6.1. Подготовка данных для R2 (Логика фокуса)
В `src/components/dashboard/components/FocusHeroCard.tsx` (строки 44–56) сейчас используется примитивная логика:
```typescript
const explicitlyFocused = items.find((i) => i.type === 'task' && (i.isFocus || i.isFocused) && i.status !== 'completed')
if (explicitlyFocused) return explicitlyFocused
const highPriority = items.find((i) => i.type === 'task' && i.priority === 'high' && i.status !== 'completed')
if (highPriority) return highPriority
return items.find((i) => i.type === 'task' && i.status !== 'completed')
```

Благодаря наличию `startDate` и `deadline`, реализуется иерархия приоритетов R2:
1. **Ручной фокус (высший приоритет):** Задачи с `item.isFocus === true && item.status !== 'completed'`. Удерживает фокус до завершения или ручного снятия.
2. **Просроченные задачи (2-й приоритет):** `status !== 'completed'` и `deadline && new Date(deadline).getTime() < now`. При нескольких просроченных выбирается самая старая (с минимальным `deadline`).
3. **Текущая задача (3-й приоритет):** `status !== 'completed'` и `startDate && deadline && new Date(startDate).getTime() <= now && now <= new Date(deadline).getTime()`.
4. **Фоллбек:** Задачи с наивысшим приоритетом (`priority === 'high'`) или ближайшие предстоящие задачи.

### 6.2. Подготовка данных для R3 (Визуализация в календаре)
В `src/components/calendar/WeekTimelineView.tsx` (строки 104–142) и `CalendarPage.tsx` (строки 327–364):
- Сейчас задача привязывается к одной часовой ячейке по `dueTime`.
- С полями `startDate` и `deadline`:
  - `startMinutes = getMinutesFromMidnight(task.startDate)`
  - `endMinutes = getMinutesFromMidnight(task.deadline)`
  - `durationMinutes = Math.max(15, endMinutes - startMinutes)`
  - Позиционирование: `top = (startMinutes - 8 * 60) * pxPerMinute`
  - Высота: `height = durationMinutes * pxPerMinute`
  - Это точно удовлетворяет критерий: «высота или ширина блока задачи в календаре пропорциональна разнице между `deadline` и `startDate`».

---

## 7. Сервисы импорта/экспорта, парсинга и сидов

1. **`src/lib/seedData.ts`:**
   В массиве `SEED_ITEMS` обновить существующие задачи:
   - `focus-1`: `startDate: '2026-10-06T19:00:00.000Z'`, `deadline: '2026-10-06T21:00:00.000Z'`
   - `t-1`: `startDate: '2026-10-06T14:30:00.000Z'`, `deadline: '2026-10-06T16:00:00.000Z'`
   - `t-2`: `startDate: '2026-10-06T17:00:00.000Z'`, `deadline: '2026-10-06T18:30:00.000Z'`
   - `t-3`: бэклог или день без точного времени
   - `t-4`: завершенная задача (`completedAt`) с `startDate: '2026-10-06T13:00:00.000Z'`, `deadline: '2026-10-06T14:15:00.000Z'`
2. **`src/lib/export.ts`:**
   - В `exportDatabaseAsJson`: сериализация `startDate` и `deadline` происходит автоматически (`JSON.stringify(items)`).
   - В `generateNoteMarkdown`: добавить в frontmatter строчки `startDate` и `deadline`.
3. **`src/lib/geminiStructuring.ts` & `src/lib/gemini.ts`:**
   - В схему ответа `RESPONSE_SCHEMA` добавить `start_date?: string` и `deadline?: string`.
   - В эвристический парсер `mockLocalStructuring` добавить извлечение начала и конца интервалов (например, «с 14 до 16» -> `startDate` 14:00, `deadline` 16:00).
4. **`src/components/layout/QuickCaptureWidget.tsx`:**
   - При создании задачи проставлять `startDate` и `deadline` из разобранного AI-результата.

---

## 8. Тестовое покрытие и рекомендации по верификации

### 8.1. Текущие паттерны тестов
- `src/store/__tests__/useAppStore.test.ts` (13 тестов, Vitest): демонстрирует изоляцию с `clearDatabase()`, проверку инварианта одиночного фокуса и оптимистичных откатов при ошибках БД через `vi.spyOn(db, 'createItem')`.
- `src/components/calendar/__tests__/CalendarPage.test.tsx` (3 теста): тестирует корректный рендеринг задач по датам, бэклог и переключение режимов День/Неделя/Месяц.

### 8.2. Необходимый фикс в `src/lib/__tests__/db.test.ts`
Для восстановления работоспособности сьюта `db.test.ts` требуется исправить строки 274–297:
```typescript
  it('enforces single focus invariant when updating an item with isFocus: true', async () => {
    await createItem({
      id: 'focus-t1',
      type: 'task',
      title: 'Задача 1',
      categoryTag: '#Фокус',
      status: 'todo',
      priority: 'medium',
      isFocus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    await createItem({
      id: 'focus-t2',
      type: 'task',
      title: 'Задача 2',
      categoryTag: '#Фокус',
      status: 'todo',
      priority: 'high',
      isFocus: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    await updateItem('focus-t2', { isFocus: true })

    const t1 = await getItem('focus-t1')
    const t2 = await getItem('focus-t2')
    expect(t1?.isFocus).toBe(false)
    expect(t2?.isFocus).toBe(true)
  })
})
```

### 8.3. Новые тесты для проверки R1
Следует добавить тесты:
1. `VoiceNotesDB - version 2 upgrade and migrations`:
   - Создание базы со старой записью без `startDate` и `deadline`.
   - Прогон миграции.
   - Проверка: `item.deadline` и `item.startDate` корректно сформированы, данные не утеряны.
2. `useAppStore - task time intervals`:
   - Создание задачи с `startDate` и `deadline`.
   - Проверка валидации `startDate <= deadline`.
   - Проверка корректной синхронизации с `dueDate` и `dueTime`.
