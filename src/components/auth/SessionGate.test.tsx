import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionGate } from './SessionGate'
import { getSession, setSession } from '../../lib/api'
import { useAppStore } from '../../store/useAppStore'
import { SettingsPage } from '../settings/SettingsPage'
describe('Account gate', () => {
  it('does not mount workspace before restoration and shows login after expired refresh', async () => {
    setSession(null)
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: 'Expired' } }), {
            status: 401,
          }),
      ),
    )
    render(
      <SessionGate>
        <div>Private workspace</div>
      </SessionGate>,
    )
    expect(screen.queryByText('Private workspace')).not.toBeInTheDocument()
    await screen.findByRole('button', { name: 'Войти' })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@test.invalid' },
    })
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'wrong-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))
    await screen.findByRole('alert')
    expect(screen.queryByText('Private workspace')).not.toBeInTheDocument()
  })
  it('restores the workspace and clears account state on logout', async () => {
    render(
      <SessionGate>
        <div>Private workspace</div>
        <SettingsPage />
      </SessionGate>,
    )
    await screen.findByText('Private workspace')
    act(() => useAppStore.setState({ selectedTaskIds: ['private'] }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Выйти' }))
    })
    await waitFor(() => expect(getSession()).toBeNull())
    expect(useAppStore.getState().selectedTaskIds).toEqual([])
    expect(screen.queryByText('Private workspace')).not.toBeInTheDocument()
  })
})
