# TASK-05: Локальное хранилище данных (IndexedDB + Dexie.js)

- **ID:** `TASK-05`
- **Блок:** 2. Архитектура Данных и Локальное Хранилище
- **Статус:** Ожидает выполнения
- **Приоритет:** Критический (P0)
- **Зависимости:** `TASK-01`

---

## 1. Цель задачи
Реализовать надежное, масштабируемое локальное хранилище данных в браузере с использованием IndexedDB через библиотеку Dexie.js для поддержки парадигмы Local-First.

---

## 2. Техническое решение

### 2.1. Определение схемы БД (`src/lib/db.ts`)
```typescript
import Dexie, { Table } from 'dexie';
import { Item, AudioSession, UserSettings } from '../types';

export class VoiceNotesDB extends Dexie {
  items!: Table<Item, string>;
  audioSessions!: Table<AudioSession, string>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super('VoiceNotesDB');
    this.version(1).stores({
      items: 'id, type, status, priority, categoryTag, isFocus, createdAt, dueDate',
      audioSessions: 'id, recordedAt',
      settings: 'id'
    });
  }
}

export const db = new VoiceNotesDB();
```

### 2.2. Операции CRUD
- `createItem(item: Item): Promise<string>`
- `updateItem(id: string, patch: Partial<Item>): Promise<void>`
- `deleteItem(id: string): Promise<void>`
- `toggleTaskComplete(id: string): Promise<void>`
- `setFocusTask(id: string): Promise<void>`

---

## 3. Критерии приемки (Definition of Done)
1. База данных корректно инициализируется в IndexedDB браузера.
2. Поддерживаются операции создания, обновления, удаления и фильтрации задач и заметок.
3. Данные сохраняются между перезагрузками страницы и закрытием вкладки.
