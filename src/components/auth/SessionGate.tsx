import { useEffect, useState, type ReactNode } from 'react'
import {
  getSession,
  login,
  onSessionChange,
  refreshSession,
} from '../../lib/api'
import { useAppStore } from '../../store/useAppStore'
import { useDrawerStore } from '../../store/useDrawerStore'
import { useQuickCaptureStore } from '../../store/useQuickCaptureStore'
import { useCaptureAIStore } from '../../store/useCaptureAIStore'
import { useAudioStore } from '../../store/useAudioStore'
export function SessionGate({ children }: { children: ReactNode }) {
  const [session, setCurrent] = useState(getSession)
  const [restoring, setRestoring] = useState(true)
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let owner = getSession()?.user.id
    const stop = onSessionChange((value) => {
      if (owner !== value?.user.id) {
        useAppStore.getState().setItems([])
        useAppStore.setState({
          selectedTaskIds: [],
          isSelectMode: false,
          isLoading: false,
          error: null,
        })
        useDrawerStore.getState().closeDrawer()
        useQuickCaptureStore.getState().setText('')
        useCaptureAIStore.getState().reset()
        useAudioStore.getState().stopAudio()
      }
      owner = value?.user.id
      setCurrent(value)
    })
    void refreshSession()
      .catch(() => {})
      .finally(() => setRestoring(false))
    return stop
  }, [])
  if (restoring)
    return (
      <main
        className="min-h-screen bg-surface text-on-surface grid place-items-center"
        role="status"
      >
        Восстанавливаем сессию…
      </main>
    )
  if (session) return <>{children}</>
  return (
    <main className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-12">
          <span className="material-symbols-outlined text-primary text-4xl">
            graphic_eq
          </span>
          <span className="text-xl font-semibold">VoiceNotes AI</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          {register ? 'Ваше пространство мыслей' : 'Вернуться к своим мыслям'}
        </h1>
        <p className="text-on-surface-variant mb-8">
          Заметки, голос и планы — в одном аккаунте.
        </p>
        <form
          className="flex flex-col gap-5"
          onSubmit={async (e) => {
            e.preventDefault()
            if (busy) return
            setBusy(true)
            setError(null)
            try {
              await login(email, password, register)
              setPassword('')
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <label className="flex flex-col gap-2">
            Email
            <input
              className="rounded-lg bg-surface-container p-3 border border-outline-variant focus:outline-primary"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2">
            Пароль
            <input
              className="rounded-lg bg-surface-container p-3 border border-outline-variant focus:outline-primary"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={10}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-error">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="rounded-lg bg-primary text-on-primary p-3 font-semibold disabled:opacity-50"
          >
            {busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}
          </button>
        </form>
        <button
          className="mt-6 text-sm text-primary underline"
          onClick={() => {
            setRegister(!register)
            setError(null)
          }}
        >
          {register ? 'Уже есть аккаунт? Войти' : 'Создать аккаунт'}
        </button>
      </div>
    </main>
  )
}
