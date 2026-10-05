import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSpaceRecordShortcut } from '../useSpaceRecordShortcut'

describe('useSpaceRecordShortcut', () => {
  it('triggers onToggle when Space is pressed outside inputs', () => {
    const onToggle = vi.fn()
    renderHook(() => useSpaceRecordShortcut({ onToggle }))

    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    window.dispatchEvent(event)

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('does NOT trigger when focus is in an input field', () => {
    const onToggle = vi.fn()
    renderHook(() => useSpaceRecordShortcut({ onToggle }))

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = new KeyboardEvent('keydown', {
      code: 'Space',
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(event)

    expect(onToggle).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('does NOT trigger when disabled is set to false', () => {
    const onToggle = vi.fn()
    renderHook(() => useSpaceRecordShortcut({ onToggle, enabled: false }))

    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true })
    window.dispatchEvent(event)

    expect(onToggle).not.toHaveBeenCalled()
  })
})
