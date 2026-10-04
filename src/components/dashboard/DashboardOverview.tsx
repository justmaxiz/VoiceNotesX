import React, { useState, useEffect } from 'react'

interface TaskItemData {
  id: string
  title: string
  category: string
  categoryClass: string
  time: string
  isCompleted: boolean
  hasAudio?: boolean
  audioDuration?: string
  isUrgent?: boolean
  noteSubtitle?: string
  completedTime?: string
}

const INITIAL_TASKS: TaskItemData[] = [
  {
    id: 't-1',
    title: 'Подготовить отчет по продуктовым метрикам Q3',
    category: '#Аналитика',
    categoryClass: 'text-tertiary',
    time: '16:00',
    isCompleted: false,
    hasAudio: true,
    audioDuration: '1:15',
    noteSubtitle: 'Встреча с инвесторами',
  },
  {
    id: 't-2',
    title: 'Провести ревью архитектуры микросервисов',
    category: '#Разработка',
    categoryClass: 'text-primary',
    time: '18:30',
    isCompleted: false,
    isUrgent: true,
    noteSubtitle: 'PR #142 • Саммари готово',
  },
  {
    id: 't-3',
    title: 'Записать идеи для дизайн-системы 2026',
    category: '#Дизайн',
    categoryClass: 'text-secondary',
    time: 'Завтра',
    isCompleted: false,
    hasAudio: true,
    audioDuration: '3 заметки',
  },
  {
    id: 't-4',
    title: 'Согласовать бюджет на AI API',
    category: '#Финансы',
    categoryClass: 'text-outline',
    time: '14:15',
    isCompleted: true,
    completedTime: 'Выполнено в 14:15',
  },
]

export const DashboardOverview: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItemData[]>(INITIAL_TASKS)
  const [isPlaying, setIsPlaying] = useState(false)
  const [filter, setFilter] = useState<'all' | 'urgent' | 'voice' | 'summaries'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [quickInput, setQuickInput] = useState('')
  const [isRecordingHeld, setIsRecordingHeld] = useState(false)

  // Toggle task completion
  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    )
  }

  // Quick task submit
  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickInput.trim()) return

    const newTask: TaskItemData = {
      id: `t-${Date.now()}`,
      title: quickInput.trim(),
      category: '#Заметка',
      categoryClass: 'text-secondary',
      time: 'Сегодня',
      isCompleted: false,
    }
    setTasks((prev) => [newTask, ...prev])
    setQuickInput('')
  }

  // Spacebar hotkey listener for voice recording feedback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase()
      if (e.code === 'Space' && activeTag !== 'input' && activeTag !== 'textarea') {
        e.preventDefault()
        setIsRecordingHeld(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsRecordingHeld(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'urgent') return t.isUrgent
    if (filter === 'voice') return t.hasAudio
    if (filter === 'summaries') return t.category === '#Аналитика' || t.isUrgent
    return true
  })

  const completedCount = tasks.filter((t) => t.isCompleted).length
  const totalCount = tasks.length
  const plannedCount = totalCount - completedCount

  return (
    <div className="flex flex-col w-full">
      {/* Content Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-md mb-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm">
            <span className="inline-flex w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.6)]" />
            <span className="uppercase tracking-wider">Готово к синхронизации</span>
            <span className="text-surface-container-highest">•</span>
            <span className="text-on-surface-variant">Облако активно</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Добрый вечер, Александр
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-outline text-body-md">calendar_today</span>
            <span>Пятница, 4 октября</span>
            <span className="text-surface-container-highest">•</span>
            <span className="text-secondary font-label-md text-label-md">3 сессии обработаны AI</span>
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center flex-wrap gap-space-sm">
          {/* View switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-surface-container-low shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-space-sm py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-surface-container-high text-on-surface shadow-sm'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-body-md">view_agenda</span>
              <span>Список</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-space-sm py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-surface-container-high text-on-surface shadow-sm'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-body-md">dashboard</span>
              <span>Доска</span>
            </button>
          </div>

          <button
            type="button"
            className="flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-primary text-body-md">add</span>
            <span>Новая заметка</span>
          </button>

          <button
            type="button"
            id="record-trigger-btn"
            className={`flex items-center gap-space-xs px-space-md py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all shadow-[0_0_25px_-5px_rgba(160,120,255,0.4)] cursor-pointer ${
              isRecordingHeld ? 'scale-95 ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''
            }`}
          >
            <span className="material-symbols-outlined text-body-md animate-pulse">mic</span>
            <span>{isRecordingHeld ? 'Идет запись...' : 'Начать запись'}</span>
            <span className="px-1.5 py-0.5 rounded bg-on-primary/20 text-on-primary font-label-sm text-label-sm ml-1">
              Space
            </span>
          </button>
        </div>
      </div>

      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT MAIN COLUMN (approx 62%) */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          {/* HERO: Primary Focus Task & Live Voice Audio Card */}
          <section className="relative rounded-2xl bg-surface-container-low p-space-lg shadow-xl overflow-hidden group border border-surface-container-high/30">
            {/* Visual Accent Glow */}
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 w-56 h-56 bg-primary-container/15 rounded-full blur-2xl pointer-events-none"
            />

            {/* Meta Header */}
            <div className="flex items-center justify-between gap-space-sm flex-wrap mb-space-md">
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="flex items-center gap-1 px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm font-semibold shadow-[0_0_15px_-3px_rgba(0,165,114,0.4)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-secondary animate-pulse" />
                  В фокусе
                </span>
                <span className="px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                  Работа
                </span>
                <span className="flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-high text-error font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-label-sm text-error">
                    priority_high
                  </span>
                  Высокий приоритет
                </span>
              </div>
              <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-label-lg text-outline">
                  schedule
                </span>
                <span>
                  Дедлайн: <strong className="text-on-surface font-semibold">21:00</strong>
                </span>
              </div>
            </div>

            {/* Main Task Title */}
            <div className="mb-space-lg">
              <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-snug">
                Добавить новую фичу в VoiceNotes
              </h2>
              <p className="font-body-md text-body-md text-outline mt-1">
                Контекстное связывание голосовых заметок с календарем и автогенерация задач
              </p>
            </div>

            {/* Embedded Audio Player & Transcription Module */}
            <div className="rounded-xl bg-surface-container p-space-md shadow-inner flex flex-col gap-space-md border border-surface-container-high/40">
              {/* Player Telemetry Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-body-md">
                    graphic_eq
                  </span>
                  <span className="font-label-md text-label-md text-on-surface">
                    Голосовой исходник
                  </span>
                  <span className="text-outline text-label-sm font-label-sm">• 0:42 мин</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-tertiary font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-label-sm">auto_awesome</span>
                  <span>Whisper AI Транскрипция</span>
                </div>
              </div>

              {/* Live Interactive Waveform Visualization */}
              <div className="flex items-center gap-space-md py-1">
                <button
                  type="button"
                  id="playback-btn"
                  onClick={() => setIsPlaying(!isPlaying)}
                  aria-label={isPlaying ? 'Приостановить' : 'Воспроизвести'}
                  className="w-11 h-11 shrink-0 rounded-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container flex items-center justify-center transition-all shadow-[0_0_20px_-3px_rgba(208,188,255,0.4)] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-body-lg">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>

                {/* Waveform Bars */}
                <div
                  className="flex-1 flex items-center gap-1 h-10 px-space-xs cursor-pointer overflow-hidden"
                  title="Кликните для перехода по аудио"
                >
                  <span className="w-1 h-3 rounded-full bg-secondary" />
                  <span className="w-1 h-5 rounded-full bg-secondary" />
                  <span className="w-1 h-8 rounded-full bg-secondary" />
                  <span className="w-1 h-6 rounded-full bg-secondary" />
                  <span className="w-1 h-9 rounded-full bg-primary" />
                  <span className="w-1 h-7 rounded-full bg-primary" />
                  <span
                    className={`w-1 h-10 rounded-full bg-primary ${
                      isPlaying ? 'animate-pulse' : ''
                    }`}
                  />
                  <span className="w-1 h-6 rounded-full bg-primary" />
                  <span className="w-1 h-4 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-7 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-5 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-8 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-3 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-6 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-9 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-5 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-7 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-4 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-6 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-8 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-3 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-5 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-4 rounded-full bg-surface-container-highest" />
                  <span className="w-1 h-2 rounded-full bg-surface-container-highest" />
                </div>

                <div className="text-right shrink-0">
                  <span className="font-label-md text-label-md text-on-surface">
                    {isPlaying ? '0:24' : '0:18'}
                  </span>
                  <span className="text-outline text-label-sm font-label-sm"> / 0:42</span>
                </div>
              </div>

              {/* Verbatim Transcription Snippet */}
              <div className="p-space-sm rounded-lg bg-surface-container-low text-on-surface-variant font-body-md text-body-md leading-relaxed italic border border-surface-container-high/30">
                «Синхронизировать транскрипцию в реальном времени с векторной базой и контекстом
                пользователя для точных AI-ответов. Проверить задержку вебсокета на мобильных
                устройствах...»
              </div>

              {/* Audio Action Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-space-sm pt-space-xs">
                <div className="flex items-center gap-space-xs">
                  <button
                    type="button"
                    className="flex items-center gap-1 px-space-sm py-1.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-fixed font-label-md text-label-md transition-all shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-body-md">check</span>
                    <span>Завершить</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-space-sm py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-tertiary font-label-md text-label-md transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-body-md">auto_awesome</span>
                    <span>AI Сводка</span>
                  </button>
                </div>
                <div className="flex items-center gap-space-xs">
                  <button
                    type="button"
                    className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                    title="Копировать транскрипцию"
                  >
                    <span className="material-symbols-outlined text-body-md">content_copy</span>
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                    title="Экспорт в Notion/Markdown"
                  >
                    <span className="material-symbols-outlined text-body-md">ios_share</span>
                  </button>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                    title="Параметры"
                  >
                    <span className="material-symbols-outlined text-body-md">more_horiz</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* TASKS MATRIX & LIST SECTION */}
          <section className="flex flex-col gap-space-md">
            {/* Sub-navigation Tabs */}
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-space-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
                    filter === 'all'
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  Все <span className="text-xs opacity-75">{tasks.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('urgent')}
                  className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
                    filter === 'urgent'
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  Срочные{' '}
                  <span className="text-xs text-error">
                    {tasks.filter((t) => t.isUrgent).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('voice')}
                  className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1 cursor-pointer ${
                    filter === 'voice'
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span>Голосовые</span>
                  <span className="text-xs opacity-75">
                    {tasks.filter((t) => t.hasAudio).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('summaries')}
                  className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
                    filter === 'summaries'
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  Сводки <span className="text-xs opacity-75">1</span>
                </button>
              </div>

              <div className="flex items-center gap-1 text-outline font-label-sm text-label-sm">
                <span>Сортировка:</span>
                <button
                  type="button"
                  className="text-on-surface hover:text-primary flex items-center gap-0.5 cursor-pointer"
                >
                  <span>По приоритету</span>
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </button>
              </div>
            </div>

            {/* Task Items Stack */}
            <div className="flex flex-col gap-space-sm" id="tasks-container">
              {filteredTasks.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-space-md rounded-xl transition-all group shadow-sm border border-surface-container-high/20 ${
                    t.isCompleted
                      ? 'bg-surface-container-lowest/60 hover:bg-surface-container-low opacity-60'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-space-md min-w-0">
                    <input
                      type="checkbox"
                      checked={t.isCompleted}
                      onChange={() => toggleTask(t.id)}
                      aria-label={`Отметить задачу: ${t.title}`}
                      className="w-5 h-5 rounded bg-surface-container-highest checked:bg-secondary checked:text-on-secondary accent-secondary cursor-pointer shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`font-headline-sm text-headline-sm truncate transition-colors ${
                          t.isCompleted
                            ? 'text-outline line-through'
                            : 'text-on-surface group-hover:text-primary'
                        }`}
                      >
                        {t.title}
                      </span>
                      <div className="flex items-center gap-space-xs mt-1 flex-wrap font-label-sm text-label-sm">
                        <span
                          className={`px-space-xs py-0.5 rounded bg-surface-container-highest ${t.categoryClass}`}
                        >
                          {t.category}
                        </span>

                        {t.hasAudio && (
                          <span className="flex items-center gap-1 text-secondary px-space-xs py-0.5 rounded bg-surface-container">
                            <span className="material-symbols-outlined text-label-sm">mic</span>
                            {t.audioDuration}
                          </span>
                        )}

                        {t.noteSubtitle && (
                          <span className="text-outline">{t.noteSubtitle}</span>
                        )}

                        {t.completedTime && (
                          <span className="text-secondary font-label-sm text-label-sm flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-label-sm">
                              check_circle
                            </span>
                            {t.completedTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-md shrink-0">
                    {!t.isCompleted && (
                      <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-label-md">
                        <span className="material-symbols-outlined text-body-md text-outline">
                          alarm
                        </span>
                        <span>{t.time}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label="Опции задачи"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-body-md">more_vert</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom Quick Input Command Bar */}
          <form
            onSubmit={handleAddQuickTask}
            className="relative rounded-2xl bg-surface-container-high/90 backdrop-blur-xl p-space-sm shadow-xl flex items-center gap-space-sm border border-surface-container-highest/50"
          >
            <div className="pl-space-sm flex items-center text-primary">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Быстрая мысль или задача... (Enter — сохранить, зажмите Пробел для аудио)"
              className="flex-1 bg-transparent py-2 px-space-xs font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
            />
            <div className="flex items-center gap-space-xs pr-space-xs">
              <button
                type="button"
                className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-highest text-secondary transition-all cursor-pointer"
                title="Записать мысль"
              >
                <span className="material-symbols-outlined text-body-lg">mic</span>
              </button>
              <button
                type="submit"
                className="px-space-md py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all shadow-sm cursor-pointer"
              >
                <span>Добавить</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN (approx 38%) */}
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          {/* STATS & DAILY PROGRESS BENTO CARDS */}
          <div className="grid grid-cols-2 gap-space-md">
            {/* Progress Card */}
            <div className="p-space-md rounded-2xl bg-surface-container-low shadow-sm flex flex-col justify-between gap-space-md border border-surface-container-high/30">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-outline uppercase tracking-wider">
                  Выполнено
                </span>
                <span className="material-symbols-outlined text-secondary text-body-lg">
                  task_alt
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-lg text-headline-lg text-on-surface">
                    {completedCount}
                  </span>
                  <span className="font-body-md text-body-md text-outline">
                    из {totalCount} задач
                  </span>
                </div>
                {/* Segment Progress Bar */}
                <div className="flex gap-1 mt-space-sm">
                  {Array.from({ length: totalCount }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < completedCount ? 'bg-secondary' : 'bg-surface-container-highest'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                Продуктивность <strong className="text-secondary">+14%</strong> к среде
              </div>
            </div>

            {/* Planned Tasks Card */}
            <div className="p-space-md rounded-2xl bg-surface-container-low shadow-sm flex flex-col justify-between gap-space-md border border-surface-container-high/30">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-outline uppercase tracking-wider">
                  В плане
                </span>
                <span className="material-symbols-outlined text-primary text-body-lg">
                  pending_actions
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-lg text-headline-lg text-on-surface">
                    {plannedCount}
                  </span>
                  <span className="font-body-md text-body-md text-outline">задачи</span>
                </div>
                <div className="flex items-center gap-space-xs mt-space-xs">
                  <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                    1 высокий фокус
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm text-outline">
                <span>Оценка времени</span>
                <span className="text-on-surface font-semibold">~2.5 ч</span>
              </div>
            </div>
          </div>

          {/* RECENT VOICE MEMOS & AUDIO SNIPPETS WIDGET */}
          <section className="rounded-2xl bg-surface-container-low p-space-md shadow-sm flex flex-col gap-space-md border border-surface-container-high/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-body-md">
                  graphic_eq
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Недавние аудиозаписи
                </h3>
              </div>
              <button
                type="button"
                className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer"
              >
                Смотреть все
              </button>
            </div>
            <div className="flex flex-col gap-space-xs">
              {/* Audio Memo 1 */}
              <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group cursor-pointer">
                <div className="flex items-center gap-space-sm min-w-0">
                  <button
                    type="button"
                    aria-label="Воспроизвести запись"
                    className="w-8 h-8 rounded-lg bg-surface-container-highest group-hover:bg-primary group-hover:text-on-primary text-primary flex items-center justify-center transition-all shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-body-md">play_arrow</span>
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface truncate">
                      План редизайна мобильного экрана
                    </span>
                    <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-outline">
                      <span>0:42 мин</span>
                      <span>•</span>
                      <span>14:30</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 h-4 shrink-0 px-2 opacity-60 group-hover:opacity-100">
                  <span className="w-0.5 h-2 rounded bg-secondary" />
                  <span className="w-0.5 h-3 rounded bg-secondary" />
                  <span className="w-0.5 h-4 rounded bg-primary" />
                  <span className="w-0.5 h-1.5 rounded bg-primary" />
                  <span className="w-0.5 h-3 rounded bg-secondary" />
                </div>
              </div>

              {/* Audio Memo 2 */}
              <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group cursor-pointer">
                <div className="flex items-center gap-space-sm min-w-0">
                  <button
                    type="button"
                    aria-label="Воспроизвести запись"
                    className="w-8 h-8 rounded-lg bg-surface-container-highest group-hover:bg-primary group-hover:text-on-primary text-primary flex items-center justify-center transition-all shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-body-md">play_arrow</span>
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface truncate">
                      Брейншторм фичи Voice-to-SQL
                    </span>
                    <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-outline">
                      <span>2:18 мин</span>
                      <span>•</span>
                      <span>12:10</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 h-4 shrink-0 px-2 opacity-60 group-hover:opacity-100">
                  <span className="w-0.5 h-3 rounded bg-secondary" />
                  <span className="w-0.5 h-2 rounded bg-secondary" />
                  <span className="w-0.5 h-4 rounded bg-primary" />
                  <span className="w-0.5 h-2.5 rounded bg-secondary" />
                  <span className="w-0.5 h-1 rounded bg-outline" />
                </div>
              </div>

              {/* Audio Memo 3 */}
              <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-all group cursor-pointer">
                <div className="flex items-center gap-space-sm min-w-0">
                  <button
                    type="button"
                    aria-label="Воспроизвести запись"
                    className="w-8 h-8 rounded-lg bg-surface-container-highest group-hover:bg-primary group-hover:text-on-primary text-primary flex items-center justify-center transition-all shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-body-md">play_arrow</span>
                  </button>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface truncate">
                      Заметки к встрече 1-на-1 с тимлидом
                    </span>
                    <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-outline">
                      <span>1:05 мин</span>
                      <span>•</span>
                      <span>10:45</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 h-4 shrink-0 px-2 opacity-60 group-hover:opacity-100">
                  <span className="w-0.5 h-1 rounded bg-outline" />
                  <span className="w-0.5 h-3.5 rounded bg-secondary" />
                  <span className="w-0.5 h-4 rounded bg-primary" />
                  <span className="w-0.5 h-2 rounded bg-secondary" />
                  <span className="w-0.5 h-3 rounded bg-secondary" />
                </div>
              </div>
            </div>
          </section>

          {/* AI DAILY INSIGHTS / СВОДКА ДНЯ CARD */}
          <section className="rounded-2xl bg-surface-container-low p-space-md shadow-sm relative overflow-hidden flex flex-col gap-space-md border border-surface-container-high/30">
            {/* Diffused Subtle Violet Light */}
            <div
              aria-hidden="true"
              className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-tertiary text-body-md">
                  psychology
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  AI Сводка дня
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-tertiary font-label-sm text-label-sm">
                Анализ 6 заметок
              </span>
            </div>

            {/* Takeaways Block */}
            <div className="p-space-sm rounded-xl bg-surface-container flex flex-col gap-space-sm border border-surface-container-high/20">
              <div className="font-label-md text-label-md text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-secondary text-label-lg">
                  hub
                </span>
                <span>Ключевые темы и паттерны</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                  #Микросервисы
                </span>
                <span className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                  #Q3 Метрики
                </span>
                <span className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                  #Дизайн-система
                </span>
                <span className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                  #Бюджет
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Основной упор сегодня сделан на архитектурную стабильность и подготовку к запуску
                версии 2.5. Рекомендуется согласовать таймлайн до конца недели.
              </p>
            </div>

            <button
              type="button"
              className="w-full py-2.5 px-space-md rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-tertiary font-label-md text-label-md transition-all flex items-center justify-center gap-space-xs shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-body-md">auto_awesome</span>
              <span>Сгенерировать полный отчет за день</span>
            </button>
          </section>

          {/* CONTEXT VISUAL WORKSPACE MODULE */}
          <section className="rounded-2xl bg-surface-container-low p-space-md shadow-sm overflow-hidden flex flex-col gap-space-sm border border-surface-container-high/30">
            <div className="flex items-center justify-between text-outline font-label-sm text-label-sm">
              <span>Синхронизированное рабочее пространство</span>
              <span className="material-symbols-outlined text-label-lg">devices</span>
            </div>
            <div className="relative h-28 w-full rounded-xl overflow-hidden bg-surface-container-highest flex items-center justify-center border border-surface-container-high/30">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-container/20 to-secondary-container/20" />
              <div className="z-10 flex items-center gap-3 text-on-surface-variant font-label-sm">
                <span className="material-symbols-outlined text-2xl text-secondary">laptop_mac</span>
                <span>+</span>
                <span className="material-symbols-outlined text-2xl text-primary">smartphone</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent flex items-end p-space-sm">
                <span className="font-label-sm text-label-sm text-on-surface bg-surface-container-lowest/80 backdrop-blur-md px-2 py-0.5 rounded border border-white/5">
                  MacBook Pro + iPhone 16 Pro Connected
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
