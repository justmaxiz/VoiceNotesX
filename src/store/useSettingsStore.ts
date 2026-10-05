import { create } from 'zustand'
import { UserSettings, DeviceItem } from '../types/settings'

const DEFAULT_DEVICES: DeviceItem[] = [
  {
    id: 'd-1',
    name: 'MacBook Pro 16"',
    type: 'laptop',
    lastSyncAt: 'Только что',
    isCurrent: true,
  },
  {
    id: 'd-2',
    name: 'iPhone 16 Pro',
    type: 'mobile',
    lastSyncAt: '12 минут назад',
  },
]

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
  devices: DEFAULT_DEVICES,
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
  isSyncing: boolean
  updateSettings: (partial: Partial<UserSettings>) => void
  syncDevices: () => Promise<void>
  clearCache: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadSettings(),
  isSyncing: false,

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

  syncDevices: async () => {
    set({ isSyncing: true })
    await new Promise((r) => setTimeout(r, 600))
    const now = 'Только что'
    const updatedDevices = get().devices.map((d) => ({
      ...d,
      lastSyncAt: now,
    }))
    get().updateSettings({ devices: updatedDevices })
    set({ isSyncing: false })
  },

  clearCache: async () => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear()
      } catch {
        // ignore
      }
    }
    set({ ...DEFAULT_SETTINGS })
  },
}))
