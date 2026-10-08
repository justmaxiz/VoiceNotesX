import { useEffect, useState } from 'react'
import type { SummarySettings } from '../../../server/src/summaryContracts'
import { summaryRepository } from '../../lib/summaryRepository'
import { getSession, onSessionChange } from '../../lib/api'
export function SummaryScheduleSettings() {
  const [settings, setSettings] = useState<SummarySettings | null>(null),
    [zone, setZone] = useState(''),
    [time, setTime] = useState('21:00'),
    [enabled, setEnabled] = useState(true)
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false)
  const [reload,setReload]=useState(0)
  useEffect(() => {
    let generation = 0
    const load = async () => {
      const started = ++generation
      setSettings(null)
      setBusy(false)
      setError('')
      setSaved(false)
      if (!getSession()) return
      try {
        const r = await summaryRepository.settings()
        if (started === generation) {
          setSettings(r)
          setZone(
            r.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          )
          setTime(r.localTime)
          setEnabled(r.version ? r.enabled : true)
        }
      } catch (e) {
        if (started === generation) setError((e as Error).message)
      }
    }
    void load()
    const off = onSessionChange(() => void load())
    return () => {
      generation++
      off()
    }
  }, [reload])
  const save = async () => {
    const owner = getSession()?.user.id
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const r = await summaryRepository.saveSettings({
        enabled,
        timeZone: zone,
        localTime: time,
      })
      if (owner === getSession()?.user.id) {
        setSettings(r)
        setSaved(true)
      }
    } catch (e) {
      if (owner === getSession()?.user.id) setError((e as Error).message)
    } finally {
      if (owner === getSession()?.user.id) setBusy(false)
    }
  }
  return (
    <section className="bg-surface-container-low rounded-2xl p-5 space-y-4 border border-outline-variant/20">
      <h2 className="text-title-md font-semibold text-on-surface">
        Вечерняя сводка
      </h2>
      <p className="text-sm text-on-surface-variant">
        Отчёт появится в аккаунте, даже если приложение закрыто.
      </p>
      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
      {!settings ? (
        error ? <button className="text-primary text-sm" onClick={()=>setReload(n=>n+1)}>Повторить загрузку</button> : <p className="text-xs text-outline">Загрузка настроек…</p>
      ) : (
        <>
          <label className="flex gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked)
                setSaved(false)
              }}
            />
            Создавать вечернюю сводку
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="grid gap-1 text-xs text-outline">
              Часовой пояс (IANA)
              <input
                className="bg-surface-container-high rounded-lg px-3 py-2 text-on-surface"
                value={zone}
                onChange={(e) => {
                  setZone(e.target.value)
                  setSaved(false)
                }}
                placeholder="Europe/Saratov"
              />
            </label>
            <label className="grid gap-1 text-xs text-outline">
              Локальное время
              <input
                type="time"
                className="bg-surface-container-high rounded-lg px-3 py-2 text-on-surface"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value)
                  setSaved(false)
                }}
              />
            </label>
          </div>
          {!settings.timeZone && (
            <p className="text-xs text-outline">
              Сохраните часовой пояс, чтобы включить автоматическую генерацию.
            </p>
          )}
          <button
            className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? 'Сохранение…' : 'Сохранить расписание'}
          </button>
          {saved && (
            <p role="status" className="text-xs text-secondary">
              Расписание сохранено.
            </p>
          )}
        </>
      )}
    </section>
  )
}
