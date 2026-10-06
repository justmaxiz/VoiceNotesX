# Тестовая инфраструктура VoiceNotes

Vitest, JSDOM, Testing Library и fake-indexeddb проверяют настоящие функции, store и транзакции Dexie. Устройства MediaRecorder и HTTP-границы заменены контролируемыми внешними адаптерами; результат сохраняется через настоящий код приложения. Это не браузерные E2E.

## Покрытие

- `src/tests/e2e/r1_storage_e2e.test.ts`: 18 проверок хранения, миграции и CRUD.
- `src/tests/e2e/r2_focus_e2e.test.ts`: 10 проверок `focusLogic.ts`, ручного приоритета, просрочки и текущего интервала.
- `src/tests/e2e/r3_calendar_e2e.test.ts`: 9 проверок `calendarLayout.ts`, пропорций, пересечений, многодневных и all-day задач.
- `src/tests/product_regressions.test.tsx`: 11 интеграционных проверок календаря, фокуса, drawer и тегов.
- `src/tests/local_data_regressions.test.ts`: 9 проверок audio Blob, ZIP/Markdown, отчетов, очистки и независимого TZ.
- `src/components/layout/__tests__/QuickCaptureWidget.test.tsx`: 7 проверок capture, повторного сохранения, отказов, audio и AI-настроек.
- Остальные существующие тесты продолжают проверять функции проекта; итоговые числа приведены в TEST_READY.md.

Нет catch-and-skip для отсутствующих модулей. Спекулятивные имена файлов, FocusResult и минимальная высота, нарушающая пропорции, не являются требованиями.

## Запуск

Полный `npm test` разрешен правилами AGENTS только при изменении ключевых типов, store/БД, AppLayout, аудио или API. Для локального UI используйте `npx vitest run <файл>` и `npm run build`. Не повторяйте полный набор после изменения только документации.

Требования: PRD и tasks/task-1..3, исходник `.agents/teamwork/ORIGINAL_REQUEST.md`. PROJECT содержит актуальную карту реализации. fake-indexeddb не доказывает поддержку реальных устройств, браузерных квот и сетевого сервиса. Последний полный результат: 237 passed, 0 failed, 0 skipped; build passed.

После последнего calendar-only исправления мгновенных интервалов: affected suites **20 passed, 0 failed, 0 skipped** (R3 9, product 11), build passed. Последний полный 237/237 выполнен непосредственно до этого исправления и переиспользован по AGENTS; это не утверждение о повторном полном запуске текущего состояния.
