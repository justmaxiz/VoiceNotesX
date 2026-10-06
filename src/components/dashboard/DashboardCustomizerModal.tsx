import React from 'react'
import { useDashboardConfigStore, DashboardModules } from '../../store/dashboardConfigStore'

const MODULE_LABELS: Record<keyof DashboardModules, { title: string; desc: string }> = {
  focusTask: {
    title: 'Текущая активная задача',
    desc: 'Фокус-карточка с приоритетным делом дня и подзадачами',
  },
  taskList: {
    title: 'Список задач дня',
    desc: 'Интерактивный список с фильтрами («Все», «Срочные», «Голосовые»)',
  },
  metrics: {
    title: 'Метрики продуктивности',
    desc: 'Карточка продуктивности «Выполнено»',
  },
  dailySummary: {
    title: 'Сводка дня',
    desc: 'Аналитический дайджест ключевых тем и паттернов',
  },
  recentAudio: {
    title: 'Недавние аудиозаписи',
    desc: 'Список последних записанных голосовых заметок с мини-плеером',
  },
}

export const DashboardCustomizerModal: React.FC = () => {
  const { modules, isCustomizerOpen, setCustomizerOpen, toggleModule, resetToDefaults } =
    useDashboardConfigStore()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Настройка виджетов дашборда"
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300 ${
        isCustomizerOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
      onClick={() => setCustomizerOpen(false)}
    >
      <div
        className={`w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant/40 shadow-2xl p-6 flex flex-col gap-5 text-on-surface transition-all duration-300 ${
          isCustomizerOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">tune</span>
            <h2 className="text-title-lg font-semibold">Настройка дашборда</h2>
          </div>
          <button
            type="button"
            onClick={() => setCustomizerOpen(false)}
            aria-label="Закрыть настройки"
            className="p-1 rounded-lg hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-body-lg">close</span>
          </button>
        </div>

        <p className="text-body-sm text-on-surface-variant">
          Включайте и отключайте блоки для формирования чистого рабочего пространства под ваши задачи.
        </p>

        <div className="flex flex-col gap-3">
          {(Object.keys(MODULE_LABELS) as Array<keyof DashboardModules>).map((key) => {
            const isChecked = modules[key]
            const info = MODULE_LABELS[key]

            return (
              <label
                key={key}
                className="flex items-start justify-between gap-3 p-3 rounded-xl bg-surface-container-high/40 hover:bg-surface-container-high border border-outline-variant/20 cursor-pointer transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-body-md font-medium text-on-surface">{info.title}</span>
                  <span className="text-label-sm text-on-surface-variant">{info.desc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleModule(key)}
                  className="mt-1 w-4 h-4 rounded border-outline-variant text-primary focus:ring-0 cursor-pointer accent-primary"
                />
              </label>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={resetToDefaults}
            className="text-label-md text-on-surface-variant hover:text-on-surface underline transition-colors cursor-pointer"
          >
            Сбросить по умолчанию
          </button>

          <button
            type="button"
            onClick={() => setCustomizerOpen(false)}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}
