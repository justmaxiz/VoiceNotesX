# TASK-02: Дизайн-система Obsidian Lumina (Tailwind CSS v4 & Токены)

- **ID:** `TASK-02`
- **Блок:** 1. Фундамент и Дизайн-система
- **Статус:** Выполнено
- **Приоритет:** Критический (P0)
- **Зависимости:** `TASK-01`

---

## 1. Цель задачи
Настроить точную цветовую схему, переменные темы, шрифты и переиспользуемые UI-классы в соответствии со сгенерированным макетом Stitch (`design/desktop_overview.html`).

---

## 2. Техническое решение

### 2.1. Конфигурация темы и палитра
Внедрить переменные цветов в `src/index.css` и `tailwind.config.ts`:
- **Поверхности:**
  - `bg-surface` (`#121317`)
  - `bg-surface-container-low` (`#1a1b20`)
  - `bg-surface-container` (`#1f1f24`)
  - `bg-surface-container-high` (`#292a2e`)
  - `bg-surface-container-highest` (`#343439`)
  - `bg-surface-container-lowest` (`#0d0e12`)
- **Акценты:**
  - `primary` (`#a078ff` / `#8b5cf6` — Electric Violet)
  - `primary-container` (`#340080`)
  - `secondary` (`#4edea3` / `#10b981` — Cyber Emerald)
  - `secondary-container` (`#00a572`)
  - `tertiary` (`#cebdff`)
  - `error` (`#ffb4ab`)
- **Текстовые токены:**
  - `text-on-surface` (`#e3e2e8`)
  - `text-on-surface-variant` (`#cbc3d7`)
  - `text-outline` (`#958ea0`)

### 2.2. Типографика и шрифты
В `index.html` подключить Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
```

### 2.3. Glassmorphism и неоновые стили
Определить утилитарные классы:
- `.glass-panel`: полупрозрачный фон `rgba(26, 31, 44, 0.65)` с `backdrop-filter: blur(20px)` и тонкой 1px каймой `border-white/10`.
- `.glow-violet`: эффект рассеянного неонового ореола `box-shadow: 0 0 25px -5px rgba(160, 120, 255, 0.4)`.
- `.glow-emerald`: эффект `box-shadow: 0 0 15px -3px rgba(0, 165, 114, 0.4)`.

---

## 3. Критерии приемки (Definition of Done)
1. Все цвета и шрифты совпадают с эталонным скриншотом `design/desktop_overview.png`.
2. Подключены и корректно рендерятся иконки Material Symbols и шрифт Plus Jakarta Sans.
3. Темная тема установлена как дефолтная, фон страницы `#121317`.
