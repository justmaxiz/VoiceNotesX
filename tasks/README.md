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
* [TASK-42: Поля и правила глобального поиска (Global Search Fields & Query Rules)](TASK-42-search-index-fields-and-query-rules.md)
* [TASK-43: Выдача результатов в командной палитре (Command Palette Search Results)](TASK-43-command-palette-search-results.md)
* [TASK-44: Доступность и проверка поиска в командной палитре (Command Palette Search Accessibility & Tests)](TASK-44-command-palette-search-accessibility-and-tests.md)

## ☁️ Блок 9. Облачный backend и ИИ-обработка пользовательского ввода

Реализация 45–59 и автоматическая приёмка 60 завершены. Результаты, инструкции и оставшийся live/staging smoke описаны в [отчёте приёмки 45–60](ACCEPTANCE-45-60.md).

Целевой стек: Node.js + PostgreSQL, авторизация через Node API, исходное аудио в закрытой папке backend. Production-база, аудио и backups размещаются в РФ. Следующий список задаёт порядок выполнения; `TASK-47` можно подготовить независимо от серверного подключения. `TASK-45A` нужен перед авторизацией, а `TASK-48A` — перед файловыми потоками клиента и аудиообработкой.

* [TASK-45: Базовый Node.js backend и API-каркас](TASK-45-node-backend-bootstrap.md)
* [TASK-45A: Подключение PostgreSQL и миграции](TASK-45A-postgresql-connection-and-migrations.md)
* [TASK-46: Аутентификация и идентичность клиента](TASK-46-node-auth-and-client-identity.md)
* [TASK-47: Единая модель заметки и API-контракт](TASK-47-unified-note-contract.md)
* [TASK-48: Схема PostgreSQL и изоляция данных](TASK-48-postgresql-schema-and-isolation.md)
* [TASK-48A: Закрытое файловое хранилище аудио](TASK-48A-private-audio-file-storage.md)
* [TASK-49: REST API для заметок и аудиометаданных](TASK-49-notes-rest-api.md)
* [TASK-50: Вход в веб-клиент и сессия пользователя](TASK-50-web-auth-session.md)
* [TASK-51: Перевод веб-клиента на backend-репозитории](TASK-51-web-remote-data-repository.md)
* [TASK-52: Однократный перенос локальных заметок в аккаунт](TASK-52-migrate-local-data.md)
* [TASK-53: Единые заметки и представления по расписанию](TASK-53-schedule-driven-note-views.md)
* [TASK-54: Серверное структурирование текста через ИИ](TASK-54-server-ai-structuring.md)
* [TASK-55: Быстрый ввод с AI-панелью и повтором обработки](TASK-55-text-ai-capture-flow.md)
* [TASK-56: Backend загрузки и анализа аудиофайлов](TASK-56-audio-upload-processing-api.md)
* [TASK-57: Удаление аудио по сроку хранения](TASK-57-audio-retention-cleanup.md)
* [TASK-58: Компактный прогресс загрузки и анализа аудио](TASK-58-audio-processing-widget.md)
* [TASK-59: Просмотр и утверждение действий из аудио](TASK-59-audio-action-review.md)
* [TASK-60: Сквозная приёмка ИИ-ввода и облачной синхронизации](TASK-60-ai-input-acceptance.md)

## 📊 Блок 10. ИИ-сводки с проверяемыми наблюдениями

Согласован вариант 2: backend рассчитывает факты, ИИ формирует компактные наблюдения со ссылками на записи. Генерация выполняется по кнопке и вечером на сервере даже при закрытом приложении; отчёты сохраняются в PostgreSQL. Модели доступны названия, описания и чек-листы, без полных транскриптов. Историю изменений задач и выводы о повторных переносах в этой версии не добавляем.

Задачи 61–71 реализованы; автоматическая приёмка 72 выполнена. Результаты и оставшийся live/staging smoke описаны в [отчёте приёмки 61–72](ACCEPTANCE-61-72.md). Контракты и расчёты задают основу, хранение и LLM сходятся в едином API, затем подключаются расписание и клиент. При реализации отдельных задач действуют ограничения тестирования и запрет автоматических коммитов из `AGENTS.md`.

* [TASK-61: Контракты ИИ-сводок и единая модель периода](TASK-61-summary-contracts-and-periods.md)
* [TASK-62: Серверные метрики и проверяемые факты сводки](TASK-62-summary-metrics-and-facts.md)
* [TASK-63: Отбор контекста и источников для ИИ-сводки](TASK-63-summary-ai-context-and-evidence.md)
* [TASK-64: PostgreSQL-хранилище отчётов, настроек и заданий](TASK-64-summary-storage-and-jobs.md)
* [TASK-65: Генерация ИИ-наблюдений и проверка достоверности](TASK-65-summary-llm-generation-and-validation.md)
* [TASK-66: API сводок, кеш, актуальность и лимиты](TASK-66-summary-api-cache-and-freshness.md)
* [TASK-67: Вечерняя генерация на сервере и настройки расписания](TASK-67-summary-evening-scheduler.md)
* [TASK-68: Клиентский репозиторий сводок и общее состояние](TASK-68-summary-client-repository-and-state.md)
* [TASK-69: Компактный интерфейс сводок и переходы к источникам](TASK-69-summary-page-and-source-links.md)
* [TASK-70: Сохранённая ИИ-сводка в карточке главной страницы](TASK-70-dashboard-shared-summary.md)
* [TASK-71: Экспорт новых сводок и сохранение старого локального архива](TASK-71-summary-export-and-legacy-archive.md)
* [TASK-72: Сквозная приёмка ИИ-сводок варианта 2](TASK-72-ai-summaries-acceptance.md)

Порядок зависимостей: `61 → 62 → 63 → 65`; `61 → 64`; `62–65 → 66`; `66 → 67, 68`; `68 → 69 → 70 → 71`; `61–71 → 72`. Удаление браузерного планировщика в TASK-67 выполняется после подключения клиентского репозитория TASK-68.
