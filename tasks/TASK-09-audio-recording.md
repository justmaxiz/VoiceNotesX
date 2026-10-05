# TASK-09: Захват звука с микрофона (MediaRecorder API)

- **ID:** `TASK-09`
- **Блок:** 3. Аудио-движок и Нативный Голосовой Ввод
- **Статус:** Выполнено
- **Приоритет:** Критический (P0)
- **Зависимости:** `TASK-06`

---

## 1. Цель задачи
Реализовать хук захвата звука с микрофона браузера через стандартный `MediaRecorder API` для записи голосовых заметок и получения локального аудиопотока.

---

## 2. Техническое решение

### 2.1. Хук `useAudioRecorder` (`src/hooks/useAudioRecorder.ts`)
```typescript
export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number; // В секундах
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
}
```

### 2.2. Поток и кодирование
- Запрос доступа к микрофону: `navigator.mediaDevices.getUserMedia({ audio: true })`.
- Кодирование: MIME-тип `audio/webm;codecs=opus` (с фоллбэком на `audio/ogg` или `audio/mp4`).
- Таймер длительности с тиком 100 мс.
- Корректная очистка аудио-треков при остановке (`track.stop()`) для отключения системного индикатора микрофона в браузере.

---

## 3. Критерии приемки (Definition of Done)
1. Браузер запрашивает разрешение на микрофон при первом клике.
2. При активной записи корректно считается таймер.
3. По завершении записи формируется валидный аудио-blob и локальный Object URL для воспроизведения.
