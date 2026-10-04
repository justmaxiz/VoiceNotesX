# TASK-02: Дизайн-система Obsidian Lumina (Tailwind CSS v4 & Токены)

- **ID:** `TASK-02`
- **Блок:** 1. Фундамент и Дизайн-система
- **Статус:** Выполнено
- **Приоритет:** Критический (P0)
- **Зависимости:** `TASK-01`

---

## 1. Цель
Настроить цветовую схему, переменные темы, строгую системную типографику (Inter / Geist), доступную палитру компонентов календаря с контрастностью уровня WCAG AAA и библиотеку современных микроанимаций в стиле React Bits (smooth transitions, border glow, linear-style checkbox strikes) в соответствии с дизайн-системой Obsidian Lumina.

---

## 2. Требования

### 2.1. Типографика и шрифтовой стек
- Для бокового меню (сайдбара), навигации и базового интерфейса использовать чистый, плотный системный шрифт **Inter** или **Geist** (`font-sans`).
- Категорически исключить растянутый шрифт Space Grotesk из навигации и базовых элементов UI.
- Заголовки экранов и виджетов оформлять строгим плотным гротеском (Inter / Geist) с выверенным межбуквенным интервалом (`tracking-tight`).
- Для моноширинных данных (таймкоды, технические счетчики, хоткеи) использовать **JetBrains Mono** (`font-mono`).
- Иконки интерфейса: Google Material Symbols Outlined и Lucide Icons.

### 2.2. Цветовая схема и доступность (включая Календарь)
- Стандарт доступности: строгое соблюдение уровня **WCAG AAA** по контрастности текста и подложек (коэффициент контрастности не менее 7:1 для основного контента).
- Полностью исключить нечитаемые сочетания (в частности, темно-фиолетовый текст на фиолетовом фоне).
- В интерфейсе календаря и расписания:
  - Основной текст ячеек, дат и событий — контрастный светлый (`text-on-surface`, `#e3e2e8`).
  - Подложки ячеек и карточек событий — читаемые темные и нейтральные контейнеры (`bg-surface-container`, `bg-surface-container-high`, `#1f1f24` / `#292a2e`).
  - Категории и теги событий маркируются **цветными акцентными маркерами слева** (полоса 2–3px слева `border-l-[3px]` или цветной маркер-точка), без перекрашивания текста в темные оттенки.
- Темная тема Obsidian Lumina установлена по умолчанию (базовый фон `#121317`).

### 2.3. Интеграция анимаций в стиле React Bits
- **Smooth transitions**: плавные аппаратные переходы для всех интерактивных элементов (150–250ms `cubic-bezier(0.16, 1, 0.3, 1)` или `ease-out`).
- **Border glow**: эффект динамического неонового свечения границы при фокусе, наведении и для активных карточек (плавный градиентный border highlight или `box-shadow` ореол).
- **Linear-style checkbox strikes**: анимация вычеркивания выполненной задачи в стиле Linear (плавное горизонтальное вычеркивание текста линии через `scaleX`, приглушение цвета текста до `text-outline` и масштабирование чекбокса).

---

## 3. Архитектура и техническое решение

### 3.1. Конфигурация темы и палитра токенов (`src/index.css`)
- **Поверхности (Surfaces):**
  - `bg-surface` (`#121317`) — базовый фон приложения
  - `bg-surface-container-lowest` (`#0d0e12`) — контрастные подложки списков
  - `bg-surface-container-low` (`#1a1b20`) — карточки первого уровня
  - `bg-surface-container` (`#1f1f24`) — стандартные блоки и контейнеры
  - `bg-surface-container-high` (`#292a2e`) — всплывающие меню, hover-состояния
  - `bg-surface-container-highest` (`#343439`) — разделители и выделенные слоты
- **Акценты:**
  - `primary` (`#8b5cf6` / `#a078ff` — Electric Violet)
  - `primary-container` (`#340080`)
  - `secondary` (`#10b981` / `#4edea3` — Cyber Emerald)
  - `secondary-container` (`#00a572`)
  - `tertiary` (`#cebdff`)
  - `error` (`#ffb4ab`)
- **Текстовые токены (WCAG AAA):**
  - `text-on-surface` (`#e3e2e8`) — высококонтрастный светлый текст
  - `text-on-surface-variant` (`#cbc3d7`) — читаемый вторичный текст
  - `text-outline` (`#958ea0`) — приглушенный текст и плейсхолдеры

### 3.2. Типографика в `index.html` и Tailwind
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
```
Определение шрифтового стека в Tailwind v4:
```css
--font-sans: 'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### 3.3. Утилитарные классы и эффекты React Bits
- `.glass-panel`: полупрозрачный фон `rgba(26, 31, 44, 0.65)` с `backdrop-filter: blur(20px)` и тонкой границей `border-white/10`.
- `.border-glow`: эффект свечения границы с неоновым градиентом для активных карточек и полей ввода.
- `.glow-violet`: `box-shadow: 0 0 25px -5px rgba(160, 120, 255, 0.4)`.
- `.glow-emerald`: `box-shadow: 0 0 15px -3px rgba(0, 165, 114, 0.4)`.
- `.strike-linear`: CSS-анимация зачеркивания задачи (псевдоэлемент `::after` с плавной интерполяцией `scaleX` от 0 до 1).

### 3.4. Стили календаря (WCAG AAA)
- Контейнеры событий: `bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface`.
- Акцентные маркеры категорий: `border-l-[3px]` с цветами категорий (Emerald для личного, Violet для работы, Amber для срочного). Текст событий всегда остается светлым и читаемым (`text-on-surface`).

---

## 4. Критерии приёмки (DoD)
- [ ] В боковом меню, навигации и базовом интерфейсе применен плотный системный шрифт Inter / Geist (`font-sans`); растянутый Space Grotesk полностью исключен.
- [ ] В календаре текст контрастный и светлый (`text-on-surface`), подложки читаемые темные контейнеры, категории маркируются цветными индикаторами слева (`border-l-[3px]`) в строгом соответствии с WCAG AAA (без темно-фиолетового текста на темном фоне).
- [ ] Интегрированы микроанимации в стиле React Bits (smooth transitions 150–250ms, border glow, linear-style checkbox strikes).
- [ ] Темная тема Obsidian Lumina установлена по умолчанию с базовым фоном `#121317` и полной токенизацией поверхностей.
