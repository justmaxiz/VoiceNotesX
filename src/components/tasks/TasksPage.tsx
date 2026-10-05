import React, { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'
import { useDrawerStore } from '../../store/useDrawerStore'
import { AddTaskMenu } from './AddTaskMenu'
import { ImportFromExistingModal } from './ImportFromExistingModal'
import { Item, KanbanColumnKey } from '../../types/item'

interface ColumnDef {
  key: KanbanColumnKey
  title: string
  colorClass: string
}

const COLUMNS: ColumnDef[] = [
  { key: 'todo', title: 'К выполнению', colorClass: 'border-outline-variant/50 text-outline' },
  { key: 'in_progress', title: 'В процессе', colorClass: 'border-primary/60 text-primary' },
  { key: 'completed', title: 'Выполнено', colorClass: 'border-secondary text-secondary' },
]

export const TasksPage: React.FC = () => {
  const { items, updateItem, setFocusedTask } = useAppStore()
  const { openQuickCapture } = useQuickCaptureStore()
  const { openDrawer } = useDrawerStore()

  const [importTargetCol, setImportTargetCol] = useState<KanbanColumnKey | null>(null)

  const taskItems = items.filter((i) => i.type === 'task')

  const getTasksForColumn = (col: KanbanColumnKey): Item[] => {
    switch (col) {
      case 'todo':
        return taskItems.filter((t) => t.status === 'todo')
      case 'in_progress': {
        const inProgress = taskItems.filter(
          (t) => t.status === 'in_progress' || (t as any).status === 'focus'
        )
        // Sort: focused task strictly at the top
        return inProgress.sort((a, b) => {
          const aFocus = Boolean(a.isFocus || a.isFocused)
          const bFocus = Boolean(b.isFocus || b.isFocused)
          if (aFocus && !bFocus) return -1
          if (!aFocus && bFocus) return 1
          return 0
        })
      }
      case 'completed':
        return taskItems.filter((t) => t.status === 'completed')
      default:
        return []
    }
  }

  const handleMoveTask = (task: Item, targetCol: KanbanColumnKey) => {
    updateItem(task.id, {
      status: targetCol,
      // If moving to completed or todo, clear focus if it was focused
      isFocus: targetCol === 'completed' ? false : task.isFocus,
      isFocused: targetCol === 'completed' ? false : task.isFocused,
    })
  }

  const handleImportExisting = (item: Item, targetCol: KanbanColumnKey) => {
    if (item.type === 'note') {
      updateItem(item.id, {
        type: 'task',
        status: targetCol,
      })
    } else {
      handleMoveTask(item, targetCol)
    }
  }

  return (
    <div className="flex flex-col w-full gap-space-lg pt-space-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm mb-1">
            <span className="material-symbols-outlined text-secondary text-sm">check_circle</span>
            <span className="uppercase tracking-wider">Канбан-доска задач</span>
            <span>•</span>
            <span>{taskItems.length} задач всего</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-semibold">
            Задачи
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Интерактивная доска для приоритизации, фокуса и отслеживания статусов выполнения
          </p>
        </div>

        {/* Global create button */}
        <button
          type="button"
          onClick={() => openQuickCapture({ entityType: 'task', targetColumn: 'todo' })}
          className="flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-label-md text-label-md font-medium transition-all shadow-md glow-violet cursor-pointer self-start md:self-end"
        >
          <span className="material-symbols-outlined text-body-lg">add</span>
          <span>Новая задача</span>
        </button>
      </div>

      {/* Kanban Board Grid: 3 Clean Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md items-start">
        {COLUMNS.map((col) => {
          const colTasks = getTasksForColumn(col.key)

          return (
            <div
              key={col.key}
              data-testid={`kanban-column-${col.key}`}
              className="flex flex-col rounded-2xl bg-surface-container-low/80 border border-outline-variant/20 p-3 min-h-[460px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-variant/15 px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full border-2 ${col.colorClass} bg-current`} />
                  <h2 className="text-body-md font-semibold text-on-surface">{col.title}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs text-outline font-medium">
                    {colTasks.length}
                  </span>
                </div>

                {/* Add Task Menu Popover */}
                <AddTaskMenu
                  onSelectCreateNew={() =>
                    openQuickCapture({ targetColumn: col.key, entityType: 'task' })
                  }
                  onSelectImportExisting={() => setImportTargetCol(col.key)}
                />
              </div>

              {/* Tasks List */}
              <div className="flex flex-col gap-2.5 flex-1">
                {colTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-outline-variant/30 text-outline text-xs text-center min-h-[140px]">
                    <span className="material-symbols-outlined text-xl mb-1 opacity-60">
                      drag_indicator
                    </span>
                    <span>Нет задач в этой колонке</span>
                    <span className="text-[11px] opacity-75 mt-0.5">нажмите «+» для создания</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const completedSubtasks =
                      task.checklist?.filter((c) => c.isCompleted).length || 0
                    const totalSubtasks = task.checklist?.length || 0
                    const isFocus = Boolean(task.isFocus || task.isFocused)

                    return (
                      <article
                        key={task.id}
                        onClick={() => openDrawer(task.id)}
                        className={`p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border transition-all flex flex-col gap-2.5 cursor-pointer group shadow-xs ${
                          isFocus
                            ? 'border-primary/60 ring-1 ring-primary/40 bg-surface-container-high/60 shadow-md'
                            : 'border-outline-variant/20 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-body-sm font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug">
                            {task.title}
                          </span>

                          {/* Focus Target Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFocusedTask(task.id)
                            }}
                            title={isFocus ? 'В фокусе дня' : 'Сделать главной задачей дня (В фокус)'}
                            aria-label={isFocus ? 'В фокусе дня' : 'Сделать главной задачей дня'}
                            className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                              isFocus
                                ? 'text-primary bg-primary/20'
                                : 'text-outline hover:text-primary hover:bg-surface-container-highest'
                            }`}
                          >
                            <span className="material-symbols-outlined text-base">target</span>
                          </button>
                        </div>

                        {task.description && (
                          <p className="text-xs text-outline line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Progress, Focus Badge and Tags */}
                        <div className="flex items-center justify-between gap-2 text-xs flex-wrap pt-1 border-t border-outline-variant/15">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isFocus && (
                              <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[10px] font-semibold flex items-center gap-0.5">
                                🎯 В фокусе
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-medium">
                              {task.categoryTag}
                            </span>
                            {task.priority === 'high' && (
                              <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-medium text-[11px]">
                                Срочно
                              </span>
                            )}
                            {(task.dueTime || task.dueDate) && (
                              <span className="text-[11px] text-outline flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-xs">schedule</span>
                                {task.dueTime || task.dueDate}
                              </span>
                            )}
                          </div>

                          {totalSubtasks > 0 && (
                            <span className="flex items-center gap-1 text-outline text-xs">
                              <span className="material-symbols-outlined text-xs">check_box</span>
                              {completedSubtasks}/{totalSubtasks}
                            </span>
                          )}
                        </div>

                        {/* Quick Column Transfer Actions */}
                        <div
                          className="flex items-center justify-end gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {col.key !== 'todo' && (
                            <button
                              type="button"
                              onClick={() => handleMoveTask(task, 'todo')}
                              title="В 'К выполнению'"
                              className="px-2 py-0.5 rounded text-[11px] bg-surface-container-high hover:bg-surface-container-highest text-outline hover:text-on-surface cursor-pointer"
                            >
                              Todo
                            </button>
                          )}
                          {col.key !== 'in_progress' && (
                            <button
                              type="button"
                              onClick={() => handleMoveTask(task, 'in_progress')}
                              title="В 'В процессе'"
                              className="px-2 py-0.5 rounded text-[11px] bg-primary-container text-on-primary-container hover:opacity-90 cursor-pointer"
                            >
                              В работе
                            </button>
                          )}
                          {col.key !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleMoveTask(task, 'completed')}
                              title="Завершить"
                              className="px-2 py-0.5 rounded text-[11px] bg-secondary text-on-secondary hover:opacity-90 cursor-pointer"
                            >
                              ✓ Выполнено
                            </button>
                          )}
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal for importing unassigned notes/tasks */}
      {importTargetCol && (
        <ImportFromExistingModal
          isOpen={Boolean(importTargetCol)}
          targetColumnTitle={COLUMNS.find((c) => c.key === importTargetCol)?.title || ''}
          items={items}
          onSelect={(item) => handleImportExisting(item, importTargetCol)}
          onClose={() => setImportTargetCol(null)}
        />
      )}
    </div>
  )
}
