import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useDrawerStore } from '../../store/useDrawerStore'
import { MiniAudioPlayer } from '../audio/MiniAudioPlayer'
import { EmptyState } from '../ui/EmptyState'

export const NotesPage: React.FC = () => {
  const { items } = useAppStore()
  const { openDrawer } = useDrawerStore()

  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const noteItems = items.filter((i) => i.status !== 'archived' && (i.type === 'note' || i.transcriptText))

  // Collect distinct tags
  const tagsSet = new Set<string>()
  noteItems.forEach((n) => {
    if (n.categoryTag) tagsSet.add(n.categoryTag)
    n.tags?.forEach((tag) => tagsSet.add(tag))
  })
  const availableTags = ['all', ...Array.from(tagsSet)]

  const filteredNotes = noteItems.filter((note) => {
    const matchesTag = selectedTag === 'all' || note.categoryTag === selectedTag || note.tags?.includes(selectedTag)
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      note.title.toLowerCase().includes(q) ||
      (note.description && note.description.toLowerCase().includes(q)) ||
      (note.transcriptText && note.transcriptText.toLowerCase().includes(q))
    return matchesTag && matchesSearch
  })

  return (
    <div className="flex flex-col w-full gap-space-lg pt-space-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1">
            <span className="material-symbols-outlined text-secondary text-sm">description</span>
            <span className="uppercase tracking-wider">Хаб заметок</span>
            <span>•</span>
            <span>{noteItems.length} заметок</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-semibold">
            Заметки
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Текстовые заметки, структурированные выжимки и исходные аудиозаписи
          </p>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center p-0.5 rounded-xl bg-surface-container-low shadow-sm border border-outline-variant/20 self-start md:self-end">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Сетка карточек"
            className={`px-3 py-1.5 rounded-lg text-label-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-surface-container-high text-on-surface shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-body-md">grid_view</span>
            <span>Сетка</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="Компактный список"
            className={`px-3 py-1.5 rounded-lg text-label-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'list'
                ? 'bg-surface-container-high text-on-surface shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-body-md">view_headline</span>
            <span>Список</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        {/* Tag chips */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1 max-w-full">
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`px-space-sm py-1 rounded-lg font-label-md text-label-md transition-all shrink-0 cursor-pointer ${
                selectedTag === tag
                  ? 'bg-primary-container text-on-primary-container shadow-xs font-medium'
                  : 'text-outline hover:text-on-surface bg-surface-container-low'
              }`}
            >
              {tag === 'all' ? 'Все' : tag}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-body-md">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по заметкам..."
            aria-label="Поиск по заметкам"
            className="w-full pl-9 pr-3 py-1.5 text-body-sm rounded-xl bg-surface-container-low border border-outline-variant/20 focus:border-primary focus:outline-none text-on-surface"
          />
        </div>
      </div>

      {/* Notes Container */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon="description"
          title="Заметок не найдено"
          description="Попробуйте изменить поисковый запрос или выбрать другой тег."
          className="py-12"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
          {filteredNotes.map((note) => (
            <article
              key={note.id}
              onClick={() => openDrawer(note.id)}
              className="p-5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 hover:border-primary/40 transition-all flex flex-col justify-between gap-4 cursor-pointer group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant text-label-sm font-medium">
                    {note.categoryTag}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-outline">
                    {note.audioUrl && (
                      <MiniAudioPlayer audioUrl={note.audioUrl} ariaLabel={`Слушать ${note.title}`} />
                    )}
                    <span>{new Date(note.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>

                <h2 className="text-title-md font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                  {note.title}
                </h2>

                <p className="text-body-sm text-outline mt-2 line-clamp-3 leading-relaxed">
                  {note.description || note.transcriptText || 'Без описания'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15 text-xs text-outline">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {note.audioDuration ? `${note.audioDuration} сек` : 'Заметка'}
                </span>
                <span className="group-hover:text-primary flex items-center gap-0.5 font-medium transition-colors">
                  Читать
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => openDrawer(note.id)}
              className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 hover:border-primary/40 transition-all flex items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {note.audioUrl ? (
                  <MiniAudioPlayer audioUrl={note.audioUrl} ariaLabel={`Слушать ${note.title}`} />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-outline">
                    <span className="material-symbols-outlined text-sm">notes</span>
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-body-md font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                    {note.title}
                  </span>
                  <span className="text-label-sm text-outline truncate max-w-md">
                    {note.description || note.transcriptText || ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-xs text-outline">
                <span className="px-2 py-0.5 rounded-md bg-surface-container-highest text-on-surface-variant font-medium">
                  {note.categoryTag}
                </span>
                <span>{new Date(note.createdAt).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
