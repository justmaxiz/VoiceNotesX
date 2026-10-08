import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAppStore } from '../useAppStore'
import { installApiDouble } from '../../test/apiDouble'
import { db } from '../../lib/db'
import { notesRepository } from '../../lib/repository'
import { setSession } from '../../lib/api'
import type { Item } from '../../types/item'
const item = (id: string, patch: Partial<Item> = {}): Item => ({ id, type: 'note', title: id, description: '', categoryTag: '#Тест', status: 'todo', priority: 'medium', isFocus: false, createdAt: '2026-10-07T12:00:00Z', updatedAt: '2026-10-07T12:00:00Z', ...patch })
beforeEach(async () => { await db.clearDatabase(); useAppStore.getState().setItems([]); useAppStore.setState({ isLoading: false, error: null }); vi.restoreAllMocks(); vi.stubGlobal('fetch', installApiDouble().fetch) })
describe('Remote backed app store', () => {
  it('creates remotely and never writes IndexedDB', async () => { await useAppStore.getState().addItem(item('new')); expect(useAppStore.getState().items[0].title).toBe('new'); expect(await db.items.count()).toBe(0); expect((await notesRepository.getAllItems())[0].title).toBe('new') })
  it('moves one ID between note and task views when adding and clearing schedule', async () => { await useAppStore.getState().addItem(item('schedule')); await useAppStore.getState().updateItem('schedule', { dueDate: '2026-10-10' }); expect(useAppStore.getState().items[0]).toMatchObject({ id: 'schedule', type: 'task', dueTime: null }); await useAppStore.getState().updateItem('schedule', { dueDate: null, deadline: null, startDate: null, dueTime: null }); expect(useAppStore.getState().items).toHaveLength(1); expect(useAppStore.getState().items[0]).toMatchObject({ id: 'schedule', type: 'note', title: 'schedule' }) })
  it('rolls back creation, updates and deletion when the network fails', async () => { await useAppStore.getState().addItem(item('existing')); vi.spyOn(notesRepository, 'createItem').mockRejectedValueOnce(new Error('Offline')); await expect(useAppStore.getState().addItem(item('failed'))).rejects.toThrow('Offline'); expect(useAppStore.getState().items).toHaveLength(1); vi.spyOn(notesRepository, 'updateItem').mockRejectedValueOnce(new Error('Offline')); await expect(useAppStore.getState().updateItem('existing', { title: 'Changed' })).rejects.toThrow(); expect(useAppStore.getState().items[0].title).toBe('existing'); vi.spyOn(notesRepository, 'deleteItem').mockRejectedValueOnce(new Error('Offline')); await expect(useAppStore.getState().deleteItem('existing')).rejects.toThrow(); expect(useAppStore.getState().items).toHaveLength(1) })
  it('loads the server list without seeding the account', async () => { await useAppStore.getState().loadItems(); expect(useAppStore.getState().items).toEqual([]); expect(await db.items.count()).toBe(0) })
  it('does not install a previous owner list after account changes', async () => { let resolve!: (items: Item[]) => void; vi.spyOn(notesRepository, 'getAllItems').mockImplementationOnce(() => new Promise(r => { resolve = r })); const pending = useAppStore.getState().loadItems(); await vi.waitFor(() => expect(resolve).toBeTypeOf('function')); setSession({ accessToken: 'other', user: { id: 'other', email: 'other@test.invalid' } }); resolve([item('private')]); await pending; expect(useAppStore.getState().items).toEqual([]) })
  it('does not overwrite a queued edit with an earlier list response', async () => {
    await useAppStore.getState().addItem(item('edit'))
    let resolve!: (items: Item[]) => void
    vi.spyOn(notesRepository, 'getAllItems').mockImplementationOnce(() => new Promise(r => { resolve = r }))
    const loading = useAppStore.getState().loadItems()
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    const editing = useAppStore.getState().updateItem('edit', { title: 'Latest edit' })
    resolve([item('edit')])
    await Promise.all([loading, editing])
    expect(useAppStore.getState().items[0].title).toBe('Latest edit')
  })
})
