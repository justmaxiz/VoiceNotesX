import { create } from 'zustand'
import { UserSettings } from '../types/settings'

const DEFAULT_SETTINGS: UserSettings = {
  id: 'user-settings-default',
  userName: 'Александр',
  userAvatar: '',
  subscriptionStatus: 'pro',
  aiMode: 'fast',
  structuringStyle: 'concise',
  theme: 'dark',
  fontScale: 'standard',
  language: 'ru-RU',
  devices: [],
  updatedAt: new Date().toISOString(),
}

const STORAGE_KEY = 'voicenotes_user_settings'

const loadSettings = (): UserSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

const persistSettings = (settings: UserSettings) => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // ignore
    }
  }
}

export interface SettingsState extends UserSettings {
  updateSettings: (partial: Partial<UserSettings>) => void
  clearCache: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadSettings(),

  updateSettings: (partial) => {
    const current = get()
    const updated: UserSettings = {
      id: current.id,
      userName: partial.userName ?? current.userName,
      userAvatar: partial.userAvatar ?? current.userAvatar,
      subscriptionStatus: partial.subscriptionStatus ?? current.subscriptionStatus,
      aiMode: partial.aiMode ?? current.aiMode,
      structuringStyle: partial.structuringStyle ?? current.structuringStyle,
      theme: partial.theme ?? current.theme,
      fontScale: partial.fontScale ?? current.fontScale,
      language: partial.language ?? current.language,
      devices: partial.devices ?? current.devices,
      updatedAt: new Date().toISOString(),
    }
    persistSettings(updated)
    set(updated)
  },

  clearCache: async () => {
    if (typeof localStorage !== 'undefined') {
      try {
        for (const key of ['voicenotes_user_settings', 'voicenotes_task_sort', 'voicenotes_dashboard_modules', 'voicenotes_api_key']) {
          localStorage.removeItem(key)
        }
      } catch {
        // ignore
      }
    }
    set({ ...DEFAULT_SETTINGS })
  },
}))
