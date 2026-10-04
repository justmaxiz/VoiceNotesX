# TASK-10: Анимированный визуализатор звуковой волны (Canvas Waveform)

- **ID:** `TASK-10`
- **Блок:** 3. Аудио-движок и Нативный Голосовой Ввод
- **Статус:** Ожидает выполнения
- **Приоритет:** Высокий (P1)
- **Зависимости:** `TASK-09`

---

## 1. Цель задачи
Создать высокопроизводительный Canvas-компонент живой визуализации частотного спектра звука в реальном времени с неоновым свечением в стилистике 2026 года.

---

## 2. Техническое решение

### 2.1. Компонент `WaveformVisualizer.tsx` (`src/components/audio/WaveformVisualizer.tsx`)
- Подключение `AudioContext` и `AnalyserNode`:
  ```typescript
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 64;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  ```
- Отрисовка в `requestAnimationFrame`:
  - 24–32 вертикальных столбика со скругленными краями (`round caps`).
  - Градиентная заливка: от Cyber Emerald (`#10b981`) к Electric Violet (`#8b5cf6`).
  - Плавная интерполяция высоты столбиков для предотвращения дергания.
- Режим воспроизведения (Playback Mode):
  - При проигрывании сохраненной заметки анимируется статическая волна со скраббером позиции.

---

## 3. Критерии приемки (Definition of Done)
1. При разговоре в микрофон столбики волны динамически реагируют на громкость и тембр голоса.
2. Частота кадров не проседает (стабильные 60 FPS).
3. Градиент и пропорции соответствуют Hero-карточке макета `design/desktop_overview.html`.
