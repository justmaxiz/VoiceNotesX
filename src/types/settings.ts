export interface DeviceItem {
  id: string
  name: string
  type: 'laptop' | 'mobile' | 'tablet' | 'desktop'
  lastSyncAt: string
  isCurrent?: boolean
}

export interface UserSettings {
  id: string
  userName: string
  userAvatar?: string
  subscriptionStatus: 'pro' | 'free' | 'active'
  aiMode: 'fast' | 'deep'
  structuringStyle: 'concise' | 'detailed' | 'action_plan'
  theme: 'dark' | 'system'
  fontScale: 'standard' | 'compact'
  language: 'ru-RU' | 'en-US' | 'auto'
  devices: DeviceItem[]
  updatedAt: string
}
