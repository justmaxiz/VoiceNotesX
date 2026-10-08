import { useAppStore } from '../store/useAppStore'

const playbackUrls = new Map<string, string>()

export function releaseAudioUrl(id: string): void {
  const url = playbackUrls.get(id)
  if (url) URL.revokeObjectURL(url)
  playbackUrls.delete(id)
}

export async function audioPlaybackUrl(id: string): Promise<string | undefined> {
  return useAppStore.getState().items.find(item => item.id === id)?.audioUrl
}
