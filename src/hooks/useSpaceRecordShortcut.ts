import { useEffect } from 'react'

export interface UseSpaceRecordShortcutOptions {
  onToggle: () => void
  enabled?: boolean
}

export function useSpaceRecordShortcut({
  onToggle,
  enabled = true,
}: UseSpaceRecordShortcutOptions): void {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return

      const target = event.target as HTMLElement | null
      const isElement = target && target.nodeType === 1

      const isInteractive =
        isElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          (typeof target.closest === 'function' &&
            Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'))))

      if (!isInteractive) {
        event.preventDefault()
        onToggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onToggle, enabled])
}
