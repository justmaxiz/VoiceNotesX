export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const apiUrl = (path: string) => `${API_BASE}/api/v1${path}`
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message)
  }
}
export interface Session {
  accessToken: string
  user: { id: string; email: string }
}
let session: Session | null = null
let refreshPromise: Promise<Session> | null = null
let generation = 0
const listeners = new Set<(value: Session | null) => void>()
export const getSession = () => session
export function onSessionChange(listener: (value: Session | null) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function setSession(value: Session | null) {
  generation++
  session = value
  listeners.forEach((fn) => fn(value))
}
async function decode<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok)
    throw new ApiError(
      response.status,
      data?.error?.code || 'NETWORK_ERROR',
      data?.error?.message || 'Сервер недоступен. Повторите попытку.',
      response.headers.has('Retry-After') ? Number(response.headers.get('Retry-After')) || undefined : undefined,
    )
  return data as T
}
export async function refreshSession(): Promise<Session> {
  if (!refreshPromise) {
    const started = generation
    refreshPromise = fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(15000),
    })
      .then(decode<Session>)
      .then((value) => {
        if (started !== generation)
          throw new ApiError(401, 'SESSION_CHANGED', 'Сессия изменилась.')
        setSession(value)
        return value
      })
      .catch((error) => {
        if (started === generation) setSession(null)
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const started = session?.user.id
  const send = () =>
    fetch(apiUrl(path), {
      ...init,
      signal: init.signal || AbortSignal.timeout(65000),
      credentials: 'include',
      headers: {
        ...(init.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...init.headers,
        ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      },
    })
  const token = session?.accessToken
  let response = await send()
  if (started !== session?.user.id)
    throw new ApiError(401, 'SESSION_CHANGED', 'Сессия изменилась.')
  if (response.status === 401) {
    if (token === session?.accessToken) await refreshSession()
    if (started && started !== session?.user.id)
      throw new ApiError(401, 'SESSION_CHANGED', 'Сессия изменилась.')
    response = await send()
  }
  if (started !== session?.user.id)
    throw new ApiError(401, 'SESSION_CHANGED', 'Сессия изменилась.')
  if (response.status === 401) {
    setSession(null)
    throw new ApiError(401, 'UNAUTHORIZED', 'Сессия истекла. Войдите снова.')
  }
  return decode<T>(response)
}
export async function login(email: string, password: string, register = false) {
  const value = await decode<Session>(
    await fetch(apiUrl(`/auth/${register ? 'register' : 'login'}`), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, platform: 'web' }),
      signal: AbortSignal.timeout(20000),
    }),
  )
  setSession(value)
}
export async function logout() {
  await decode(
    await fetch(apiUrl('/auth/logout'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(15000),
    }),
  )
  setSession(null)
}
