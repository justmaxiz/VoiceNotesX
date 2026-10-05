# TASK-06: Реактивный стейт-менеджмент (Zustand Store)

- **ID:** `TASK-06`
- **Блок:** 2. Архитектура Данных и Локальное Хранилище
- **Статус:** Выполнено
- **Приоритет:** Критический (P0)
- **Зависимости:** `TASK-05`

---

## 1. Цель задачи
Создать глобальный реактивный стор приложения на базе Zustand с синхронизацией в IndexedDB и оптимистичными обновлениями для достижения 0 мс задержки отклика интерфейса.

---

## 2. Техническое решение

### 2.1. Структура стора (`src/store/useAppStore.ts`)
```typescript
interface AppState {
  items: Item[];
  activeTab: string;
  searchQuery: string;
  isRecording: boolean;
  activeFilter: 'all' | 'urgent' | 'voice' | 'summaries';
  sortOrder: 'priority' | 'date' | 'alphabetical';
  apiKey: string;
  
  // Экшены
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: 'all' | 'urgent' | 'voice' | 'summaries') => void;
  setSortOrder: (order: 'priority' | 'date' | 'alphabetical') => void;
  addItem: (item: Item) => Promise<void>;
  updateItem: (id: string, patch: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  setFocusTask: (id: string) => Promise<void>;
  setApiKey: (key: string) => void;
  loadItems: () => Promise<void>;
}
```

### 2.2. Оптимистичные обновления
При вызове `toggleTask(id)`:
1. Немедленно инвертируется статус в локальном массиве Zustand `items`.
2. Запускается фоновая запись `db.items.update(...)`.
3. При ошибке БД состояние автоматически откатывается.

---

## 3. Критерии приемки (Definition of Done)
1. Все компоненты мгновенно реагируют на изменение стейта без задержек и лагов.
2. Состояние синхронизировано с базой IndexedDB.
