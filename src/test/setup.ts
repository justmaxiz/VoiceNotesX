import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { beforeEach, vi } from 'vitest'
import { installApiDouble } from './apiDouble'
beforeEach(() => { vi.stubGlobal('fetch', installApiDouble().fetch) })

if (typeof window !== 'undefined') {
  window.HTMLMediaElement.prototype.play = () => Promise.resolve()
  window.HTMLMediaElement.prototype.pause = () => {}
}
