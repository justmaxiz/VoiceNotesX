import { api, apiUrl, getSession, refreshSession } from './api'
import { useSettingsStore } from '../store/useSettingsStore'
import type { AudioJob } from '../../server/src/contracts'
export type { AudioJob } from '../../server/src/contracts'
export async function uploadAudio(
  file: Blob,
  filename: string,
  progress: (percent: number) => void,
  temporary = false,
): Promise<AudioJob> {
  if (file.size > 100 * 1024 * 1024)
    throw new Error('Максимальный размер — 100 МБ')
  const owner = getSession()?.user.id
  const { aiMode, structuringStyle } = useSettingsStore.getState()
  const currentIsoDate = new Date().toISOString()
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  async function send(retry: boolean): Promise<AudioJob> {
    const form = new FormData()
    form.append('temporary', String(temporary))
    form.append('mode', aiMode)
    form.append('style', structuringStyle)
    form.append('currentIsoDate', currentIsoDate)
    form.append('timeZone', timeZone)
    form.append('file', file, filename)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', apiUrl('/audio/upload'))
      xhr.withCredentials = true
      xhr.timeout = 180000
      const token = getSession()?.accessToken
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable)
          progress(Math.round((event.loaded / event.total) * 100))
      }
      xhr.onerror = () =>
        reject(new Error('Загрузка прервана. Проверьте соединение.'))
      xhr.ontimeout = () =>
        reject(new Error('Время загрузки истекло. Повторите попытку.'))
      xhr.onload = () => {
        if (xhr.status === 401 && retry) {
          void refreshSession()
            .then(() => {
              if (owner !== getSession()?.user.id)
                throw new Error('Сессия изменилась')
              return send(false)
            })
            .then(resolve, reject)
          return
        }
        try {
          const data = JSON.parse(xhr.responseText)
          if (xhr.status < 200 || xhr.status >= 300)
            throw new Error(data.error?.message || 'Не удалось загрузить аудио')
          resolve(data.job)
        } catch (error) {
          reject(error)
        }
      }
      xhr.send(form)
    })
  }
  return send(true)
}
export const listAudioJobs = () => api<{ jobs: AudioJob[] }>('/audio/jobs')
export const retryAudioJob = (id: string) =>
  api<{ job: AudioJob }>(`/audio/jobs/${id}/retry`, {
    method: 'POST',
    body: '{}',
  })
