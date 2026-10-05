# Реестр Задач: VoiceNotes AI

В этой директории содержатся подробные технические спецификации на каждую задачу проекта.  
Каждая задача оформлена в отдельном Markdown-документе с описанием архитектуры, компонентов, интерфейсов и критериев приемки (DoD).

---

## 🏗️ Блок 1. Фундамент и Дизайн-система
* [TASK-01: Инициализация проекта, базовая структура и зависимости](TASK-01-project-init.md)
* [TASK-02: Дизайн-система Obsidian Lumina (Tailwind CSS v4 & Токены)](TASK-02-design-system.md)
* [TASK-03: 3-колоночный каркас приложения (Sidebar, Header, Main Canvas)](TASK-03-app-layout-shell.md)
* [TASK-04: Клиентский роутинг и переключение разделов](TASK-04-client-routing.md)

## 💾 Блок 2. Архитектура Данных и Локальное Хранилище
* [TASK-05: Локальное хранилище данных (IndexedDB + Dexie.js)](TASK-05-local-database.md)
* [TASK-06: Реактивный стейт-менеджмент (Zustand Store)](TASK-06-state-management.md)
* [TASK-07: Инициализация демо-данными (Seed Data из макета)](TASK-07-seed-data.md)
* [TASK-08: Локальный полнотекстовый поиск (MiniSearch FTS)](TASK-08-full-text-search.md)

## 🎙️ Блок 3. Аудио-движок и Нативный Голосовой Ввод
* [TASK-09: Захват звука с микрофона (MediaRecorder API)](TASK-09-audio-recording.md)
* [TASK-10: Визуализатор живого аудиопотока (Live Waveform в Quick Capture)](TASK-10-live-waveform.md)
* [TASK-11: Нативное распознавание речи (Web Speech API)](TASK-11-web-speech-stt.md)
* [TASK-12: Компактный мини-аудиоплеер (Mini Play Button)](TASK-12-audio-player.md)
* [TASK-13: Хоткей быстрой записи пробелом (`Space` shortcut)](TASK-13-space-hotkey.md)

## 🧠 Блок 4. ИИ-модуль (Google AI Studio Gemini Flash)
* [TASK-14: Сервис Google AI Studio (Gemini 2.0/2.5 Flash API Client)](TASK-14-gemini-client.md)
* [TASK-15: ИИ-структурирование заметок (Structured Outputs Parser)](TASK-15-ai-structuring.md)
* [TASK-16: Цикл итеративной доработки промпта (Refinement Loop)](TASK-16-ai-refinement.md)

## 🖥️ Блок 5. Главная Страница (Дашборд / Обзор)
* [TASK-17: Шапка дашборда и динамическое приветствие](TASK-17-dashboard-header.md)
* [TASK-18: Динамический виджет «Текущая активная задача» (Focus Hero Widget)](TASK-18-focus-hero-card.md)
* [TASK-19: Интерактивный список задач дня и фильтрация](TASK-19-task-list-filters.md)
* [TASK-20: Единый плавающий Quick Capture Widget](TASK-20-quick-input-bar.md)
* [TASK-21: Bento-блок продуктивности (Метрики дня)](TASK-21-bento-metrics.md)
* [TASK-22: Модульный виджет «Недавние аудиозаписи»](TASK-22-recent-audio-widget.md)
* [TASK-23: Виджет «AI Сводка дня» и генерация отчета](TASK-23-ai-daily-summary.md)

## 📑 Блок 6. Дополнительные Страницы Приложения
* [TASK-24: Страница «Заметки» (Notes Hub)](TASK-24-notes-hub-page.md)
* [TASK-25: Страница «Задачи» с Канбан-доской и меню создания](TASK-25-tasks-kanban-page.md)
* [TASK-26: Страница «Календарь» с контрастной цветовой схемой](TASK-26-calendar-timeline-page.md)
* [TASK-27: Страница «AI Сводки» с аналитическими дайджестами](TASK-27-ai-summaries-page.md)
* [TASK-28: Страница «Настройки» (Профиль, Внешний вид, Язык, Устройства, AI и Данные)](TASK-28-settings-page.md)

## ⚡ Блок 7. Глобальный UX, Хоткеи и Экспорт
* [TASK-29: Глобальная командная палитра поиска (`⌘K` Command Palette)](TASK-29-command-palette-cmdk.md)
* [TASK-30: Экспорт заметки в Markdown (.md) и горячие клавиши](TASK-30-markdown-export.md)
* [TASK-31: Микро-взаимодействия и анимации интерфейса (React Bits)](TASK-31-react-bits-microinteractions.md)
* [TASK-32: Правая Панель Детального Просмотра (Slide-over Drawer)](TASK-32-slide-over-drawer.md)
* [TASK-33: Модульный Дашборд и Пользовательская Настройка Блоков](TASK-33-modular-dashboard-customization.md)

## 🚀 Блок 8. Улучшения интерфейса, логики и UX
* [TASK-34: Интерактивная сортировка задач и списков (Interactive Task Sorting)](TASK-34-interactive-task-sorting.md)
* [TASK-35: Очистка терминологии и метрики продуктивности дня (Metrics & Terminology Cleanup)](TASK-35-metrics-and-terminology-cleanup.md)
* [TASK-36: Упрощение Канбан-доски и концепция единого фокуса дня (Focus Task & Kanban Streamline)](TASK-36-focus-task-and-kanban-streamline.md)
* [TASK-37: Детализация задачи: дата, время, теги и таймеры напоминаний (Task Details, Tags & Reminders)](TASK-37-task-details-date-time-tags-reminders.md)
* [TASK-38: Календарь: реальные даты дедлайнов, бэклог без даты и почасовая сетка (Calendar Real Due Dates & Backlog)](TASK-38-calendar-real-due-dates-and-backlog.md)
* [TASK-39: AI Сводки: разделение действий и архива, лимиты и вечерний автодайджест (AI Summaries UX & Limits)](TASK-39-ai-summaries-ux-and-rate-limiting.md)
* [TASK-40: Главный экран: устранение дублирования инпута и единый Quick Capture (Single Unified Quick Capture)](TASK-40-dashboard-single-quick-capture.md)
* [TASK-41: Современные чекбоксы Linear/Things 3, тактильный отклик и мультиселект (Modern Checkboxes & Multiselect)](TASK-41-modern-checkboxes-and-multiselect.md)

