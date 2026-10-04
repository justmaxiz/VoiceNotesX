# TASK-11: Нативное распознавание речи (Web Speech API)

- **ID:** `TASK-11`
- **Блок:** 3. Аудио-движок и Нативный Голосовой Ввод
- **Статус:** Ожидает выполнения
- **Приоритет:** Критический (P0)
- **Зависимости:** `TASK-09`

---

## 1. Цель задачи
Реализовать потоковое нативное распознавание речи в текст прямо в браузере с помощью Web Speech API (`webkitSpeechRecognition`) с нулевой задержкой, нулевой стоимостью и поддержкой русского языка.

---

## 2. Техническое решение

### 2.1. Хук `useSpeechRecognition` (`src/hooks/useSpeechRecognition.ts`)
```typescript
export interface SpeechRecognitionHook {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}
```

### 2.2. Конфигурация распознавателя
- Инициализация `const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;`
- Параметры:
  - `continuous = true` (не прерывать распознавание при паузах пользователя).
  - `interimResults = true` (мгновенный вывод промежуточных слов).
  - `lang = 'ru-RU'` (русский язык по умолчанию с авто-поддержкой латиницы).
- События:
  - `onresult`: склеивание финального и промежуточного распознанного текста.
  - `onerror`: корректная обработка сетевых сбоев и отсутствия микрофона.
  - `onend`: автоматический перезапуск при активном флаге записи.

---

## 3. Критерии приемки (Definition of Done)
1. Текст отображается в реальном времени прямо по ходу речи пользователя.
2. Поддерживаются русские слова, знаки препинания и технические термины.
3. При отсутствии поддержки Web Speech API в браузере выводится понятное предупреждение.
