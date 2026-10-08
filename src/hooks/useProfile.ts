import { useSyncExternalStore } from 'react'
import { getSession, onSessionChange } from '../lib/api'

const eventName = 'voicenotes:profile-updated'
const profileKey = () => `voicenotes_profile:${getSession()?.user.id || 'anonymous'}`
function subscribe(listener: () => void) {
  const stop = onSessionChange(listener)
  window.addEventListener(eventName, listener)
  window.addEventListener('storage', listener)
  return () => {
    stop()
    window.removeEventListener(eventName, listener)
    window.removeEventListener('storage', listener)
  }
}
function snapshot() {
  let stored = ''
  try { stored = localStorage.getItem(profileKey()) || '' } catch {}
  return JSON.stringify([getSession()?.user.email || '', stored])
}
export function useProfile() {
  const [email, stored] = JSON.parse(useSyncExternalStore(subscribe, snapshot)) as [string, string]
  let profile: { name?: string; avatar?: string } = {}
  try { profile = JSON.parse(stored) || {} } catch {}
  const name = typeof profile.name === 'string' && profile.name.trim()
    ? profile.name : email.split('@')[0] || 'Пользователь'
  const avatar = typeof profile.avatar === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(profile.avatar)
    ? profile.avatar : ''
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase()
  return { name, avatar, initials, email }
}
export function saveProfile(name: string, avatar: string) {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 80) throw new Error('Введите имя длиной от 1 до 80 символов.')
  try {
    localStorage.setItem(profileKey(), JSON.stringify({ name: trimmed, avatar }))
  } catch {
    throw new Error('Не удалось сохранить профиль. Попробуйте фотографию меньшего размера.')
  }
  window.dispatchEvent(new Event(eventName))
}
