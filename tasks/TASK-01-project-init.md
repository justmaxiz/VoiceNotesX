# TASK-01: Инициализация проекта, базовая структура и зависимости

- **ID:** `TASK-01`
- **Блок:** 1. Фундамент и Дизайн-система
- **Статус:** Выполнено
- **Приоритет:** Критический (P0)
- **Зависимости:** Отсутствуют

---

## 1. Цель задачи
Развернуть чистую, современную структуру веб-проекта на стеке React 19 + TypeScript + Vite с поддержкой Tailwind CSS, настроить конфигурационные файлы, сборщик и базовые зависимости.

---

## 2. Техническое решение

### 2.1. Используемый стек
- **Runtime & Bundler:** Vite (Rolldown/esbuild)
- **Фреймворк:** React 19 (Strict Mode, Concurrent Features)
- **Язык:** TypeScript 5.6+ (strict: true)
- **Стилизация:** Tailwind CSS v4 / PostCSS
- **Иконки:** `lucide-react` + Google Material Symbols Outlined

### 2.2. Структура проекта
```
d:\relax\projects\voicenotes\
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src\
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── assets\
│   ├── components\
│   │   ├── layout\
│   │   ├── dashboard\
│   │   ├── notes\
│   │   ├── tasks\
│   │   ├── ui\
│   │   └── audio\
│   ├── hooks\
│   ├── lib\
│   ├── store\
│   └── types\
```

### 2.3. Основные зависимости (`package.json`)
- `react`, `react-dom`
- `zustand` (стейт-менеджмент)
- `dexie`, `dexie-react-hooks` (IndexedDB)
- `minisearch` (локальный FTS)
- `lucide-react`
- `canvas-confetti` (микро-анимация выполнения задач)

---

## 3. Критерии приемки (Definition of Done)
1. Команда `npm run dev` запускает локальный сервер разработки без ошибок и предупреждений.
2. Подключен TypeScript в строгом режиме (`strict: true`), сборка `npm run build` проходит успешно.
3. Проверена поддержка горячей перезагрузки (HMR).
