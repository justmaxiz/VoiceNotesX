import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, getSession, logout, refreshSession, setSession } from '../api'
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status })
beforeEach(() =>
  setSession({
    accessToken: 'expired',
    user: { id: 'owner', email: 'owner@test.invalid' },
  }),
)
describe('Session API client', () => {
  it('synchronizes parallel 401 refresh and retries each request once', async () => {
    let refreshes = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input, init) => {
        if (String(input).endsWith('/auth/refresh')) {
          refreshes++
          await new Promise((resolve) => setTimeout(resolve, 10))
          return response({
            accessToken: 'fresh',
            user: { id: 'owner', email: 'owner@test.invalid' },
          })
        }
        return init.headers.Authorization === 'Bearer fresh'
          ? response({ notes: [] })
          : response({ error: { message: 'Expired' } }, 401)
      }),
    )
    await Promise.all([api('/notes'), api('/notes')])
    expect(refreshes).toBe(1)
    expect(globalThis.fetch).toHaveBeenCalledTimes(5)
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
  it('clears the session when refresh is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response({ error: { code: 'UNAUTHORIZED', message: 'Expired' } }, 401),
      ),
    )
    await expect(api('/notes')).rejects.toThrow('Expired')
    expect(getSession()).toBeNull()
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
  it('rejects an old owner response after an account change', async () => {
    let finish!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      ),
    )
    const pending = api('/notes')
    setSession({
      accessToken: 'other',
      user: { id: 'other', email: 'other@test.invalid' },
    })
    finish(response({ notes: [{ title: 'Private' }] }))
    await expect(pending).rejects.toThrow('Сессия изменилась')
  })
  it('keeps the session when logout fails, then revokes it on retry', async () => {
    let logoutCalls = 0
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      if (String(input).endsWith('/auth/logout')) {
        logoutCalls++
        if (logoutCalls === 1) throw new Error('Offline')
        return response({ status: 'ok' })
      }
      return response({ error: { code: 'UNAUTHORIZED', message: 'Revoked' } }, 401)
    }))
    await expect(logout()).rejects.toThrow('Offline')
    expect(getSession()?.user.id).toBe('owner')
    await logout()
    expect(getSession()).toBeNull()
    await expect(refreshSession()).rejects.toThrow('Revoked')
    expect(logoutCalls).toBe(2)
  })
})
