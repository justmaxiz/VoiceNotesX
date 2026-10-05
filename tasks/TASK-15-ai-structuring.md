# TASK-15: ИИ-структурирование заметок (Structured Outputs Parser)

- **ID:** `TASK-15`
- **Блок:** 4. ИИ-модуль (Google AI Studio Gemini Flash)
- **Статус:** Выполнено
- **Приоритет:** Критический (P0)
- **Зависимости:** `TASK-14`

---

## 1. Цель задачи
Реализовать вызов модели в режиме **Structured Outputs (JSON Schema)**, обеспечивающем 100% гарантию структуры ответа и трансформацию сумбурной речи в готовую задачу или заметку.

---

## 2. Техническое решение

### 2.1. Конфигурация вызова Gemini API
```typescript
const generationConfig = {
  responseMimeType: "application/json",
  responseSchema: {
    type: "OBJECT",
    properties: {
      entity_type: { type: "STRING", enum: ["task", "note"] },
      title: { type: "STRING" },
      description: { type: "STRING" },
      due_date: { type: "STRING", nullable: true },
      priority: { type: "STRING", enum: ["low", "medium", "high"] },
      category_tag: { type: "STRING" },
      transcript_summary: { type: "STRING" },
      checklist: {
        type: "ARRAY",
        items: { type: "STRING" }
      }
    },
    required: ["entity_type", "title", "priority", "category_tag"]
  }
};
```

### 2.2. Сервисная функция `structureVoiceNote`
- Принимает: `rawTranscript: string`, `currentIsoDate: string`.
- Возвращает: строго типизированный объект `StructuredResult`.
- Парсинг относительного времени в точный штамп ISO («завтра в 14:00» → дата с таймзоной).

---

## 3. Критерии приемки (Definition of Done)
1. Вызов возвращает валидный JSON без синтаксических ошибок.
2. Фразы с задачами («напомни позвонить врачу завтра») получают `entity_type: "task"` и точный дедлайн.
3. Размышления («думаю переписать авторизацию на magic links») получают `entity_type: "note"`.
