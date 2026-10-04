import React, { useState } from 'react'
import { useNavigationStore } from '../../store/navigationStore'
import { EmptyState } from '../ui/EmptyState'

interface NoteCard {
  id: string
  title: string
  snippet: string
  duration?: string
  date: string
  tags: string[]
}

const SAMPLE_NOTES: NoteCard[] = [
  {
    id: 'n-1',
    title: 'План редизайна мобильного экрана',
    snippet: 'Обсудили переход на карточки с жестовым управлением и вынос записи в плавающую кнопку...',
    duration: '0:42 мин',
    date: 'Сегодня, 14:30',
    tags: ['#Дизайн', '#UX', '#Мобильные'],
  },
  {
    id: 'n-2',
    title: 'Брейншторм фичи Voice-to-SQL',
    snippet: 'Генерация аналитических запросов через естественный голос. Схема базы данных передается в контекст...',
    duration: '2:18 мин',
    date: 'Сегодня, 12:10',
    tags: ['#Разработка', '#ИИ', '#SQL'],
  },
  {
    id: 'n-3',
    title: 'Заметки к встрече 1-на-1 с тимлидом',
    snippet: 'Обсудили карьерный рост, задачи на следующий квартал и переход на новую систему онбординга...',
    duration: '1:05 мин',
    date: 'Сегодня, 10:45',
    tags: ['#Встречи', '#Карьера'],
  },
  {
    id: 'n-4',
    title: 'Идеи для оптимизации локального FTS индекса',
    snippet: 'Использовать MiniSearch с кастомным токенизатором для поддержки смешанных русско-английских терминов...',
    date: 'Вчера, 19:20',
    tags: ['#Архитектура', '#Поиск'],
  },
]

export const NotesPage: React.FC = () => {
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { setRecordingModalOpen } = useNavigationStore()

  const allTags = ['all', '#Дизайн', '#Разработка', '#ИИ', '#Встречи', '#Архитектура']

  const filteredNotes = SAMPLE_NOTES.filter((note) => {
    const matchesTag = selectedTag === 'all' || note.tags.includes(selectedTag)
    const matchesSearch =
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      note.snippet.toLowerCase().includes(search.toLowerCase())
    return matchesTag && matchesSearch
  })

  return (
    <div className="flex flex-col w-full gap-space-lg pt-space-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1">
            <span className="material-symbols-outlined text-secondary text-sm">mic</span>
            <span className="uppercase tracking-wider">Библиотека записей</span>
            <span>•</span>
            <span>42 записи</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Заметки и аудио
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Полный архив голосовых записей с расшифровками Whisper AI и быстрыми тегами
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setRecordingModalOpen(true)}
          className="flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all glow-violet cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">mic</span>
          <span>Новая голосовая запись</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`px-space-sm py-1.5 rounded-lg font-label-md text-label-md transition-all cursor-pointer whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-space-xs">
          <input
            type="text"
            placeholder="Фильтр заметок..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 px-space-md py-1.5 rounded-xl bg-surface-container text-on-surface placeholder:text-outline border border-surface-container-high/40 focus:border-primary/50 outline-none text-body-sm font-body-sm"
          />
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon="mic_off"
          title="Заметки не найдены"
          description="Попробуйте изменить поисковый запрос или выбрать другой тег."
          className="py-space-xl"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="p-space-lg rounded-2xl bg-surface-container-low hover:bg-surface-container border border-surface-container-high/30 transition-all flex flex-col justify-between gap-space-md shadow-sm group cursor-pointer"
            >
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between text-outline font-label-sm text-label-sm">
                  <span>{note.date}</span>
                  {note.duration && (
                    <span className="flex items-center gap-1 text-secondary bg-surface-container px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-sm">mic</span>
                      {note.duration}
                    </span>
                  )}
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">
                  {note.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed line-clamp-3">
                  {note.snippet}
                </p>
              </div>

              <div className="flex items-center justify-between pt-space-xs border-t border-surface-container-high/30">
                <div className="flex flex-wrap gap-1">
                  {note.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-surface-container-highest text-tertiary font-label-sm text-label-sm"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Параметры заметки"
                  className="opacity-0 group-hover:opacity-100 p-1 text-outline hover:text-on-surface transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-body-md">more_horiz</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
