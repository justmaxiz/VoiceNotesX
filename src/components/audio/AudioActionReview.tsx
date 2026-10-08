import { useState, useRef, useEffect } from 'react'
import { api } from '../../lib/api'
import type { AudioJob } from '../../lib/audioJobs'
import type { StructuredNote } from '../../../server/src/contracts'
export function AudioActionReview({
  job,
  onClose,
  onSaved,
}: {
  job: AudioJob
  onClose: () => void
  onSaved: () => void
}) {
  const [candidates, setCandidates] = useState(
    job.candidates.map((note, index) => ({ index, selected: true, note })),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = useRef(false)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const elements = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea:not(:disabled)',
          ) || [],
        )
        const index = elements.indexOf(document.activeElement as HTMLElement)
        if (elements.length) {
          e.preventDefault()
          elements[
            (index + (e.shiftKey ? -1 : 1) + elements.length) % elements.length
          ].focus()
        }
      }
    }
    document.addEventListener('keydown', handle)
    return () => {
      document.removeEventListener('keydown', handle)
      previous?.focus()
    }
  }, [onClose])
  const edit = (index: number, patch: Partial<StructuredNote>) =>
    setCandidates((previous) =>
      previous.map((row) =>
        row.index === index ? { ...row, note: { ...row.note, ...patch } } : row,
      ),
    )
  return (
    <div className="fixed inset-0 bg-black/60 z-[80] flex justify-end">
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Действия из аудио"
        className="w-full max-w-2xl bg-surface-container text-on-surface p-6 overflow-auto"
      >
        <button className="float-right text-primary" onClick={onClose}>
          Закрыть
        </button>
        <h2 className="text-2xl font-semibold mb-4">Действия из аудио</h2>
        <p className="mb-4 text-on-surface-variant">{job.summary}</p>
        {!candidates.length && (
          <p>Явных действий не найдено. Транскрипт сохранён в заметках.</p>
        )}
        <div className="space-y-5">
          {candidates.map(({ index, selected, note }) => (
            <section
              key={index}
              className="border-b border-outline-variant pb-5 space-y-3"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) =>
                    setCandidates((previous) =>
                      previous.map((row) =>
                        row.index === index
                          ? { ...row, selected: e.target.checked }
                          : row,
                      ),
                    )
                  }
                />
                Добавить действие {index + 1}
              </label>
              <label className="block text-sm">
                Заголовок
                <input
                  aria-label={`Заголовок действия ${index + 1}`}
                  className="mt-1 w-full bg-surface-container-high rounded p-2"
                  value={note.title}
                  onChange={(e) => edit(index, { title: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                Описание
                <textarea
                  className="mt-1 w-full bg-surface-container-high rounded p-2"
                  value={note.description}
                  onChange={(e) => edit(index, { description: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                Дата или время (ISO)
                <input
                  className="mt-1 w-full bg-surface-container-high rounded p-2"
                  placeholder="YYYY-MM-DD или ISO с часовым поясом"
                  value={note.deadline || note.due_date || ''}
                  onChange={(e) =>
                    edit(index, {
                      due_date: e.target.value || null,
                      deadline: null,
                      start_date: null,
                    })
                  }
                />
              </label>
              {!!note.checklist?.length && (
                <ul className="list-disc pl-5 text-sm">
                  {note.checklist.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <details className="my-5">
          <summary>Транскрипт</summary>
          <p className="whitespace-pre-wrap mt-3">{job.transcript}</p>
        </details>
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
        <button
          className="rounded-lg bg-primary text-on-primary p-3 disabled:opacity-50"
          disabled={busy || !!job.approvedAt}
          onClick={async () => {
            if (submit.current) return
            submit.current = true
            setBusy(true)
            setError('')
            try {
              await api(`/audio/jobs/${job.id}/approve`, {
                method: 'POST',
                body: JSON.stringify({
                  candidates: candidates
                    .filter((row) => row.selected)
                    .map(({ index, note }) => ({ index, note })),
                }),
              })
              onSaved()
            } catch (e) {
              setError((e as Error).message)
            } finally {
              submit.current = false
              setBusy(false)
            }
          }}
        >
          {busy
            ? 'Сохраняем…'
            : job.approvedAt
              ? 'Действия уже добавлены'
              : 'Добавить выбранные'}
        </button>
      </div>
    </div>
  )
}
