import { useEffect, useRef } from 'react'
import { useCaptureAIStore } from '../../store/useCaptureAIStore'
import { useDrawerStore } from '../../store/useDrawerStore'

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded bg-surface-container-highest motion-safe:animate-pulse ${className}`}
    />
  )
}

function FieldSkeleton({
  label,
  className = 'h-10 w-full',
}: {
  label: string
  className?: string
}) {
  return (
    <div>
      <span className="text-label-sm text-outline uppercase tracking-wider block mb-1">
        {label}
      </span>
      <Skeleton className={className} />
    </div>
  )
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-outline-variant/25 bg-surface-container-low p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
        <span
          className="material-symbols-outlined text-base text-primary"
          aria-hidden="true"
        >
          calendar_clock
        </span>
        <span>Дата и время дедлайна</span>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-28" />
      </div>
      <div>
        <span className="mb-1.5 block text-xs font-medium text-on-surface-variant">
          Начало
        </span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldSkeleton label="Дата" />
        <FieldSkeleton label="Время" />
      </div>
      <div className="border-t border-outline-variant/20 pt-3">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="border-t border-outline-variant/20 pt-3">
        <span className="mb-2 block text-xs font-medium text-on-surface-variant">
          Длительность задачи
        </span>
        <div className="flex flex-wrap gap-2">
          {['w-12', 'w-14', 'w-12', 'w-12', 'w-14'].map((width, index) => (
            <Skeleton key={index} className={`h-7 ${width}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
export function CaptureDraftDrawer() {
  const { draft, status, error, retry } = useCaptureAIStore()
  const { closeDrawer } = useDrawerStore()
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer()
      if (e.key === 'Tab') {
        const targets = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled)',
          ) || [],
        )
        if (!targets.length) {
          e.preventDefault()
          return
        }
        const index = targets.indexOf(document.activeElement as HTMLElement)
        e.preventDefault()
        const nextIndex =
          index < 0
            ? e.shiftKey
              ? targets.length - 1
              : 0
            : (index + (e.shiftKey ? -1 : 1) + targets.length) % targets.length
        targets[nextIndex].focus()
      }
    }
    document.addEventListener('keydown', handle)
    return () => {
      document.removeEventListener('keydown', handle)
      previous?.focus()
    }
  }, [closeDrawer])
  if (!draft) return null
  return (
    <div className="fixed inset-0 z-[70] overflow-hidden">
      <div
        className="drawer-backdrop fixed inset-0 bg-black/60 backdrop-blur-xs"
        style={{ animation: 'drawer-backdrop-in 180ms ease-out both' }}
        onClick={closeDrawer}
      />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Обработка заметки"
        className="drawer-panel fixed inset-y-0 right-0 w-full sm:w-[560px] max-w-full bg-surface-container border-l border-outline-variant/30 shadow-2xl flex flex-col z-10 overscroll-contain text-on-surface outline-none"
        style={{
          animation:
            'drawer-panel-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
        aria-busy={status === 'pending'}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-high/40">
          <div className="flex items-center gap-2 flex-wrap">
            {status === 'pending' ? (
              <>
                <Skeleton className="h-5 w-16 rounded-full" />
                {draft.type === 'task' && (
                  <Skeleton className="h-5 w-32 rounded-full" />
                )}
              </>
            ) : (
              <span className="text-label-sm text-outline">
                Заметка ожидает сохранения
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Закрыть панель"
            onClick={closeDrawer}
            className="p-1.5 rounded-lg hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span className="material-symbols-outlined text-body-lg">
              close
            </span>
          </button>
        </div>
        <h2
          role={status === 'pending' ? 'status' : undefined}
          aria-label={
            status === 'pending' ? 'ИИ обрабатывает текст' : undefined
          }
          className="sr-only"
        >
          {status === 'pending'
            ? 'Структурируем мысль'
            : 'Заметка ожидает сохранения'}
        </h2>
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-5">
          {status === 'pending' && (
            <>
              <FieldSkeleton label="Заголовок" className="h-10 w-3/4" />
              <div className="space-y-2">
                <span className="text-xs text-outline">
                  Дополнить / Изменить
                </span>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-40" />
              </div>
              <ScheduleSkeleton />
              <div className="space-y-2">
                <span className="text-label-sm text-outline uppercase tracking-wider block">
                  Теги
                </span>
                <div className="flex gap-1.5">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
              {draft.type === 'task' && (
                <FieldSkeleton
                  label="Напоминание"
                  className="h-11 w-full rounded-xl"
                />
              )}
              <FieldSkeleton
                label="Содержимое и описание"
                className="h-[182px] w-full rounded-xl"
              />
            </>
          )}
          {error && (
            <>
              <p role="alert" className="text-error my-4">
                {error}
              </p>
              <div className="flex gap-4">
                <button
                  className="text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  onClick={() => void retry().catch(() => {})}
                >
                  Повторить
                </button>
                <button
                  className="text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  onClick={() => void retry(true).catch(() => {})}
                >
                  Сохранить исходный текст
                </button>
              </div>
            </>
          )}
          <div className="p-3.5 rounded-xl bg-surface-container-high/30 border border-secondary/20">
            <div className="flex items-center gap-1.5 text-label-sm text-secondary font-medium mb-1.5">
              <span className="material-symbols-outlined text-sm">
                record_voice_over
              </span>
              <h3>Исходный транскрипт речи</h3>
            </div>
            <p className="text-body-sm text-on-surface-variant italic leading-relaxed whitespace-pre-wrap">
              {draft.transcriptText}
            </p>
          </div>
          {status === 'pending' && (
            <div className="space-y-3">
              <span className="text-label-sm text-outline uppercase tracking-wider">
                Чек-лист и шаги
              </span>
              <div className="space-y-1.5">
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-container-low/60"
                  >
                    <Skeleton className="h-4 w-4 shrink-0" />
                    <Skeleton className={`h-5 ${index ? 'w-1/2' : 'w-3/4'}`} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3.5 border-t border-outline-variant/20 bg-surface-container-high/40 flex items-center justify-between text-xs text-outline">
          <span>
            Создано: {new Date(draft.createdAt).toLocaleDateString('ru-RU')}
          </span>
          <button
            type="button"
            onClick={closeDrawer}
            className="px-4 py-1.5 rounded-xl bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
