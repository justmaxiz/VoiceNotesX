import { create } from 'zustand'

export interface AudioStoreState {
  currentAudioUrl: string | null
  isPlaying: boolean
  playAudio: (url: string) => void
  pauseAudio: () => void
  stopAudio: () => void
}

let activeAudioElement: HTMLAudioElement | null = null

export const useAudioStore = create<AudioStoreState>((set, get) => ({
  currentAudioUrl: null,
  isPlaying: false,

  playAudio: (url: string) => {
    const current = get().currentAudioUrl
    const isCurrentlyPlaying = get().isPlaying

    if (current === url && isCurrentlyPlaying) {
      if (activeAudioElement) {
        try {
          activeAudioElement.pause()
        } catch {
          // ignore
        }
      }
      set({ isPlaying: false })
      return
    }

    if (activeAudioElement) {
      try {
        activeAudioElement.pause()
        activeAudioElement.currentTime = 0
      } catch {
        // ignore
      }
    }

    set({ currentAudioUrl: url, isPlaying: true })

    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(url)
        audio.crossOrigin = 'use-credentials'
        activeAudioElement = audio

        audio.onended = () => {
          set({ isPlaying: false, currentAudioUrl: null })
        }

        audio.onerror = () => {
          set({ isPlaying: false, currentAudioUrl: null })
        }

        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // If play fails (e.g. autoplay blocked), revert
            if (get().currentAudioUrl === url) {
              set({ isPlaying: false })
            }
          })
        }
      } catch {
        // Audio constructor failure
        set({ isPlaying: false })
      }
    }
  },

  pauseAudio: () => {
    if (activeAudioElement) {
      try {
        activeAudioElement.pause()
      } catch {
        // ignore
      }
    }
    set({ isPlaying: false })
  },

  stopAudio: () => {
    if (activeAudioElement) {
      try {
        activeAudioElement.pause()
        activeAudioElement.currentTime = 0
      } catch {
        // ignore
      }
      activeAudioElement = null
    }
    set({ currentAudioUrl: null, isPlaying: false })
  },
}))
