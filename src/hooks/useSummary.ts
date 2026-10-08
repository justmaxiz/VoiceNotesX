import { useEffect, useState, useRef } from 'react'
import { getSession, onSessionChange } from '../lib/api'
import {
  useSummaryStore,
  summaryStateKey,
  watchSummary,
} from '../store/useSummaryStore'
import { useAppStore } from '../store/useAppStore'
import {
  presetPeriod,
  type SummaryPeriod,
} from '../../server/src/summaryContracts'
import { summaryRepository } from '../lib/summaryRepository'
let zonePending: { owner: string; promise: Promise<string> } | undefined
function readSummaryTimeZone(owner: string, browserZone: string) {
  if (zonePending?.owner === owner) return zonePending.promise
  const promise = (async () => {
    let settings = await summaryRepository.settings()
    if (!settings.timeZone) settings = await summaryRepository.saveSettings({ timeZone: browserZone, initialize: true })
    return settings.timeZone || browserZone
  })().finally(() => { if (zonePending?.promise === promise) zonePending = undefined })
  zonePending = { owner, promise }
  return promise
}
export function useSummary(period: SummaryPeriod, enabled = true) {
  const key = summaryStateKey(period)
  const [owner, setOwner] = useState(getSession()?.user.id)
  const items = useAppStore((s) => s.items)
  const signature = JSON.stringify(
    items
      .map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        status: n.status,
        completedAt: n.completedAt,
        createdAt: n.createdAt,
        checklist: n.checklist,
        tags: n.tags,
        categoryTag: n.categoryTag,
        priority: n.priority,
        dueDate: n.dueDate,
        dueTime: n.dueTime,
        startDate: n.startDate,
        deadline: n.deadline,
        isFocus: n.isFocus,
        isFocused: n.isFocused,
        estimatedMinutes: n.estimatedMinutes,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  )
  const previous = useRef(signature)
  const entry = useSummaryStore((s) => s.entries[key])
  useEffect(() => onSessionChange((s) => setOwner(s?.user.id)), [])
  useEffect(() => {
    if (!enabled || !owner) return
    const unwatch = watchSummary(key)
    const refresh = () => {
      if (document.visibilityState !== 'hidden')
        void useSummaryStore.getState().load(period)
    }
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      unwatch()
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [key, owner, enabled])
  useEffect(() => {
    if (previous.current === signature) return
    previous.current = signature
    if (!enabled || !owner) return
    useSummaryStore.getState().invalidate()
    const timer = setTimeout(
      () => void useSummaryStore.getState().load(period),
      300,
    )
    return () => clearTimeout(timer)
  }, [signature, key, owner, enabled])
  return {
    ...entry,
    load: () => useSummaryStore.getState().load(period),
    generate: () => useSummaryStore.getState().generate(period),
  }
}
export function useSummaryTimeZone() {
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const [zone, setZone] = useState(browserZone)
  useEffect(() => {
    let generation = 0
    const load = async () => {
      const current = ++generation
      setZone(browserZone)
      const owner = getSession()?.user.id
      if (!owner) return
      try {
        const timeZone = await readSummaryTimeZone(owner, browserZone)
        if (current === generation) setZone(timeZone)
      } catch {}
    }
    void load()
    const off = onSessionChange(() => void load())
    return () => {
      generation++
      off()
    }
  }, [])
  return zone
}
export function useTodayPeriod() {
  const zone = useSummaryTimeZone()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(timer)
  }, [])
  void tick
  return presetPeriod('day', zone)
}
