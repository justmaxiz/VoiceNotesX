import { create } from 'zustand'

export interface DashboardModules {
  focusTask: boolean
  taskList: boolean
  metrics: boolean
  dailySummary: boolean
  recentAudio: boolean // Hidden by default on overview per TASK-22 & TASK-33 DoD
}

const DEFAULT_MODULES: DashboardModules = {
  focusTask: true,
  taskList: true,
  metrics: true,
  dailySummary: true,
  recentAudio: false,
}

const STORAGE_KEY = 'voicenotes_dashboard_modules'

const loadStoredModules = (): DashboardModules => {
  if (typeof localStorage === 'undefined') return DEFAULT_MODULES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_MODULES
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_MODULES, ...parsed }
  } catch {
    return DEFAULT_MODULES
  }
}

const persistModules = (modules: DashboardModules) => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(modules))
    } catch {
      // ignore
    }
  }
}

export interface DashboardConfigState {
  modules: DashboardModules
  isCustomizerOpen: boolean
  toggleModule: (moduleKey: keyof DashboardModules) => void
  setModule: (moduleKey: keyof DashboardModules, enabled: boolean) => void
  setCustomizerOpen: (open: boolean) => void
  resetToDefaults: () => void
}

export const useDashboardConfigStore = create<DashboardConfigState>((set, get) => ({
  modules: loadStoredModules(),
  isCustomizerOpen: false,

  toggleModule: (moduleKey) => {
    const current = get().modules
    const updated = { ...current, [moduleKey]: !current[moduleKey] }
    persistModules(updated)
    set({ modules: updated })
  },

  setModule: (moduleKey, enabled) => {
    const current = get().modules
    const updated = { ...current, [moduleKey]: enabled }
    persistModules(updated)
    set({ modules: updated })
  },

  setCustomizerOpen: (open) => set({ isCustomizerOpen: open }),

  resetToDefaults: () => {
    persistModules(DEFAULT_MODULES)
    set({ modules: { ...DEFAULT_MODULES } })
  },
}))
