import { useEffect } from 'react'
import { useQuickCaptureStore } from '../store/useQuickCaptureStore'

export function useQuickCaptureHotkey() {
  const { openQuickCapture, isOpen } = useQuickCaptureStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is already typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      // Check for '/' or 'c' / 'C' keys without modifier keys
      if ((e.key === '/' || e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        openQuickCapture({ entityType: 'task' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openQuickCapture, isOpen])
}
