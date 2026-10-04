import React, { useState } from 'react'

interface TaskCard {
  id: string
  title: string
  column: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  tag: string
  dueTime?: string
}

const INITIAL_TASKS: TaskCard[] = [
  {
    id: 'k-1',
    title: 'Сверить архитектурные диаграммы с PR #142',
    column: 'todo',
    priority: 'high',
    tag: '#Разработка',
    dueTime: '18:30',
  },
  {
    id: 'k-2',
    title: 'Подготовить отчет по продуктовым метрикам Q3',
    column: 'in_progress',
    priority: 'high',
    tag: '#Аналитика',
    dueTime: '16:00',
  },
  {
    id: 'k-3',
    title: 'Записать идеи для дизайн-системы 2026',
    column: 'in_progress',
    priority: 'medium',
    tag: '#Дизайн',
    dueTime: 'Завтра',
  },
  {
    id: 'k-4',
    title: 'Согласовать бюджет на AI API',
    column: 'done',
    priority: 'low',
    tag: '#Финансы',
    dueTime: 'Выполнено в 14:15',
  },
  {
    id: 'k-5',
    title: 'Обновить переменные окружения на staging',
    column: 'done',
    priority: 'low',
    tag: '#DevOps',
  },
]

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskCard[]>(INITIAL_TASKS)

  const moveTask = (taskId: string, targetCol: 'todo' | 'in_progress' | 'done') => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, column: targetCol } : t))
    )
  }

  const handleCreateTask = () => {
    const newTask: TaskCard = {
      id: `k-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: 'Новая задача из канбана',
      column: 'todo',
      priority: 'medium',
      tag: '#Заметка',
      dueTime: 'Сегодня',
    }
    setTasks((prev) => [newTask, ...prev])
  }

  const columns = [
    { key: 'todo' as const, title: 'К выполнению', count: tasks.filter((t) => t.column === 'todo').length },
    { key: 'in_progress' as const, title: 'В процессе', count: tasks.filter((t) => t.column === 'in_progress').length },
    { key: 'done' as const, title: 'Завершено', count: tasks.filter((t) => t.column === 'done').length },
  ]

  return (
    <div className="flex flex-col w-full gap-space-lg pt-space-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1">
            <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
            <span className="uppercase tracking-wider">Канбан-доска задач</span>
            <span>•</span>
            <span>{tasks.length} задач активно</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Задачи
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Интерактивная доска для приоритизации и отслеживания статусов выполнения
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateTask}
          className="flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md transition-all glow-violet cursor-pointer"
        >
          <span className="material-symbols-outlined text-body-lg">add</span>
          <span>Новая задача</span>
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.column === col.key)
          return (
            <div
              key={col.key}
              className="flex flex-col gap-space-md p-space-md rounded-2xl bg-surface-container-low border border-surface-container-high/30 min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/30">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    {col.title}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                    {col.count}
                  </span>
                </div>
              </div>

              {/* Task Cards in Column */}
              <div className="flex flex-col gap-space-sm flex-1">
                {colTasks.length === 0 ? (
                  <div className="h-32 border border-dashed border-surface-container-highest/60 rounded-xl flex items-center justify-center text-outline font-label-sm text-label-sm">
                    Переместите задачи сюда
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-high/40 transition-all flex flex-col gap-space-sm shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-surface-container-highest text-tertiary font-label-sm text-label-sm">
                          {task.tag}
                        </span>
                        {task.dueTime && (
                          <span className="text-outline font-label-sm text-label-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {task.dueTime}
                          </span>
                        )}
                      </div>

                      <h4 className="font-body-md text-body-md text-on-surface font-medium leading-snug">
                        {task.title}
                      </h4>

                      {/* Quick Move Status Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-surface-container-high/20 text-xs">
                        <span className="text-outline font-label-sm">Переместить:</span>
                        <div className="flex gap-1">
                          {col.key !== 'todo' && (
                            <button
                              type="button"
                              onClick={() => moveTask(task.id, 'todo')}
                              className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer"
                            >
                              В todo
                            </button>
                          )}
                          {col.key !== 'in_progress' && (
                            <button
                              type="button"
                              onClick={() => moveTask(task.id, 'in_progress')}
                              className="px-1.5 py-0.5 rounded bg-surface-container-highest text-primary hover:bg-surface-container-high cursor-pointer"
                            >
                              В работу
                            </button>
                          )}
                          {col.key !== 'done' && (
                            <button
                              type="button"
                              onClick={() => moveTask(task.id, 'done')}
                              className="px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary hover:bg-surface-container-high cursor-pointer"
                            >
                              ✓ Готово
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
