import { useEffect, useRef, useState } from 'react'
import {
  listAudioJobs,
  retryAudioJob,
  uploadAudio,
  type AudioJob,
} from '../../lib/audioJobs'
import { AudioActionReview } from './AudioActionReview'
import { useAppStore } from '../../store/useAppStore'
const stages = {
  queued: 'Ожидает обработки',
  transcribing: 'Распознаём речь',
  analyzing: 'Анализируем текст',
  completed: 'Аудио проанализировано',
  error: 'Обработка не завершена',
}
const processingErrors: Record<string, string> = {
  AI_TIMEOUT: 'ИИ не успел ответить. Повторите обработку.',
  AI_UNAVAILABLE: 'Сервис ИИ временно недоступен.',
  AI_INVALID_RESPONSE: 'ИИ вернул некорректный ответ. Исходный текст сохранён.',
  AI_EMPTY_RESPONSE: 'ИИ вернул пустой ответ. Повторите обработку.',
  AUDIO_EXPIRED: 'Срок хранения аудио истёк. Загрузите файл повторно.',
  TRANSCRIPT_EMPTY: 'Не удалось распознать речь в записи.',
}
export function AudioProcessingWidget() {
  const [jobs, setJobs] = useState<AudioJob[]>([])
  const [upload, setUpload] = useState<{
    filename: string
    percent: number
  } | null>(null)
  const [error, setError] = useState('')
  const [review, setReview] = useState<AudioJob | null>(null)
  const [visible, setVisible] = useState(true)
  const fileRef = useRef<File | null>(null)
  const uploading = useRef(false)
  const previousJobs = useRef<AudioJob[]>([])
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const data = await listAudioJobs()
        if (alive) {
          const completed = data.jobs.some(
            (job) =>
              job.stage === 'completed' &&
              previousJobs.current.some(
                (old) => old.id === job.id && old.stage !== 'completed',
              ),
          )
          if (completed) {
            setVisible(true)
            void useAppStore
              .getState()
              .loadItems()
              .catch(() => {})
          }
          previousJobs.current = data.jobs
          setJobs(data.jobs)
        }
      } catch (e) {
        if (alive) setError((e as Error).message)
      }
    }
    void load()
    const timer = setInterval(() => void load(), 3000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])
  const send = async (file: File) => {
    if (uploading.current) return
    uploading.current = true
    fileRef.current = file
    setVisible(true)
    setError('')
    setUpload({ filename: file.name, percent: 0 })
    try {
      const job = await uploadAudio(file, file.name, (percent) =>
        setUpload({ filename: file.name, percent }),
      )
      setJobs((previous) => [job, ...previous])
      fileRef.current = null
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUpload(null)
      uploading.current = false
    }
  }
  const job =
    jobs.find((j) =>
      ['queued', 'transcribing', 'analyzing', 'error'].includes(j.stage),
    ) || jobs.find((j) => j.stage === 'completed' && !j.approvedAt)
  return (
    <>
      <label className="fixed bottom-24 left-4 z-40 rounded-lg bg-surface-container-high text-primary px-3 py-2 text-sm cursor-pointer">
        Импорт аудио
        <input
          className="sr-only"
          aria-label="Выбрать аудиофайл"
          type="file"
          accept=".mp3,.m4a,.wav,.webm,.ogg"
          disabled={!!upload}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void send(file)
            e.target.value = ''
          }}
        />
      </label>
      {visible && (job || upload || error) && (
        <section
          aria-label="Обработка аудио"
          className="fixed bottom-24 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-xl bg-surface-container-high border border-outline-variant p-4 shadow-xl text-on-surface"
        >
          <button
            className="float-right text-outline"
            aria-label="Свернуть обработку аудио"
            onClick={() => setVisible(false)}
          >
            ×
          </button>
          <p className="truncate font-semibold pr-6">
            {upload?.filename || job?.filename}
          </p>
          <p role="status" className="text-sm mt-2">
            {upload
              ? `Загрузка: ${upload.percent}%`
              : job
                ? stages[job.stage]
                : ''}
          </p>
          {upload && (
            <progress
              max={100}
              value={upload.percent}
              className="w-full"
              aria-label="Прогресс загрузки"
            />
          )}
          {job?.transcript && (
            <p className="mt-2 text-sm text-on-surface-variant max-h-24 overflow-auto">
              {job.transcript}
            </p>
          )}
          {job?.stage === 'completed' && (
            <button
              className="mt-3 text-primary underline"
              onClick={() => setReview(job)}
            >
              Просмотреть действия
            </button>
          )}
          {job?.stage === 'error' && (
            <>
              <p role="alert" className="text-error text-sm">
                {processingErrors[job.error || ''] ||
                  'Не удалось обработать запись. Повторите попытку.'}
              </p>
              <button
                className="text-primary underline"
                onClick={() =>
                  void retryAudioJob(job.id)
                    .then(({ job }) =>
                      setJobs((previous) =>
                        previous.map((old) => (old.id === job.id ? job : old)),
                      ),
                    )
                    .catch((e) => setError(e.message))
                }
              >
                Повторить обработку
              </button>
            </>
          )}
          {error && (
            <p role="alert" className="text-error text-sm mt-2">
              {error}
            </p>
          )}
          {fileRef.current && (
            <button
              className="text-primary underline"
              onClick={() => {
                if (fileRef.current) void send(fileRef.current)
              }}
            >
              Повторить загрузку
            </button>
          )}
        </section>
      )}
      {!visible && job && (
        <button
          className="fixed bottom-24 right-4 z-40 text-primary bg-surface-container p-2 rounded"
          onClick={() => setVisible(true)}
        >
          Обработка аудио
        </button>
      )}
      {review && (
        <AudioActionReview
          job={review}
          onClose={() => setReview(null)}
          onSaved={() => {
            setJobs((previous) =>
              previous.map((job) =>
                job.id === review.id
                  ? { ...job, approvedAt: new Date().toISOString() }
                  : job,
              ),
            )
            setReview(null)
            void useAppStore
              .getState()
              .loadItems()
              .catch(() => {})
          }}
        />
      )}
    </>
  )
}
