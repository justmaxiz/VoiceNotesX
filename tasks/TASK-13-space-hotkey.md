# TASK-13: Хоткей быстрой записи пробелом (`Space` shortcut)

- **ID:** `TASK-13`
- **Блок:** 3. Аудио-движок и Нативный Голосовой Ввод
- **Статус:** Выполнено
- **Приоритет:** Средний (P2)
- **Зависимости:** `TASK-09`, `TASK-11`

---

## 1. Цель задачи
Реализовать поддержку глобальной горячей клавиши `Space` (Пробел) для мгновенного старта и остановки диктовки с любой страницы приложения (при условии, что фокус не находится в текстовом поле).

---

## 2. Техническое решение

### 2.1. Хук `useSpaceRecordShortcut` (`src/hooks/useSpaceRecordShortcut.ts`)
- Слушатель `window.addEventListener('keydown', handleKeyDown)`.
- Фильтрация активного элемента:
  ```typescript
  const target = event.target as HTMLElement;
  const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  if (event.code === 'Space' && !isInputFocused) {
    event.preventDefault();
    toggleRecording();
  }
  ```
- Визуальная индикация: в кнопке хедера «Начать запись» отображается бейдж `Space`.

---

## 3. Критерии приемки (Definition of Done)
1. Нажатие `Space` на главном экране стартует запись микрофона.
2. Повторное нажатие `Space` останавливает запись.
3. При вводе текста в строке поиска или инпуте пробел ставит обычный пробел и не триггерит запись.
