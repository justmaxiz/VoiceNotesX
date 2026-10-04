# TASK-08: Локальный полнотекстовый поиск (MiniSearch FTS)

- **ID:** `TASK-08`
- **Блок:** 2. Архитектура Данных и Локальное Хранилище
- **Статус:** Ожидает выполнения
- **Приоритет:** Высокий (P1)
- **Зависимости:** `TASK-05`, `TASK-06`

---

## 1. Цель задачи
Реализовать локальный полнотекстовый поиск с мгновенным откликом (< 3 мс) по всей базе заметок и задач без обращения к сторонним API и языковым моделям.

---

## 2. Техническое решение

### 2.1. Поисковый индекс (`src/lib/search.ts`)
Использование библиотеки `minisearch`:
```typescript
import MiniSearch from 'minisearch';
import { Item } from '../types';

export const searchIndex = new MiniSearch<Item>({
  fields: ['title', 'description', 'transcriptText', 'categoryTag'],
  storeFields: ['id', 'title', 'type', 'status', 'categoryTag'],
  searchOptions: {
    boost: { title: 2, categoryTag: 1.5 },
    prefix: true,
    fuzzy: 0.2
  }
});
```

### 2.2. Синхронизация индекса
- При добавлении/изменении `item` в Zustand или IndexedDB вызывается `searchIndex.add(item)` или `searchIndex.replace(item)`.
- Функция поиска `performSearch(query: string): Item[]` возвращает отранжированный список результатов за 0–2 мс.

---

## 3. Критерии приемки (Definition of Done)
1. Поиск работает по неполным словам (префиксный поиск: «релиз» находит «релизу»).
2. Поиск ищет по русским и английским терминам, тегам и цитатам расшифровок.
3. Время поиска не превышает 5 мс на базе из 500+ заметок.
