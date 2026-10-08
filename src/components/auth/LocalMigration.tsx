import { useEffect, useState } from 'react'
import { localMigrationCount, migrateLocalData } from '../../lib/migration'
import { useAppStore } from '../../store/useAppStore'
export function LocalMigration() {
  const [count, setCount] = useState(0)
  const [done, setDone] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    void localMigrationCount()
      .then((value) => {
        if (alive) setCount(value)
      })
      .catch((e) => {
        if (alive) setError(e.message)
      })
    return () => {
      alive = false
    }
  }, [])
  if (!count && !error) return null
  return (
    <section
      className="my-4 rounded-xl p-4 bg-surface-container border border-outline-variant"
      aria-label="Перенос локальных заметок"
    >
      <p>
        На этом устройстве есть {count} заметок. Перенесите их в аккаунт, чтобы
        открыть на других устройствах.
      </p>
      {busy && (
        <p role="status">
          Перенесено {done} из {count}
        </p>
      )}
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      <button
        className="text-primary mt-2 underline"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            await migrateLocalData(setDone)
            setCount(0)
            await useAppStore.getState().loadItems()
          } catch (e) {
            setError((e as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        {error ? 'Продолжить перенос' : 'Перенести заметки'}
      </button>
    </section>
  )
}
