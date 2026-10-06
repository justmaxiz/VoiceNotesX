import { db } from './db'

const playbackUrls = new Map<string, string>()

export function releaseAudioUrl(id: string): void {
  const url = playbackUrls.get(id)
  if (url) URL.revokeObjectURL(url)
  playbackUrls.delete(id)
}

export async function audioPlaybackUrl(id: string): Promise<string | undefined> {
  const audio = await db.getAudioSession(id)
  if (!audio?.audioBlob) return undefined
  releaseAudioUrl(id)
  const url = URL.createObjectURL(audio.audioBlob)
  playbackUrls.set(id, url)
  return url
}
