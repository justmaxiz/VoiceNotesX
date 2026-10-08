import { describe, expect, it, vi } from 'vitest'
import { uploadAudio } from '../audioJobs'
import { useSettingsStore } from '../../store/useSettingsStore'
describe('Measured audio upload', () => {
  it('uses XHR upload byte progress and session credentials', async () => {
    let instance!: FakeXHR
    class FakeXHR {
      upload = { onprogress: null as null | ((event: ProgressEvent) => void) }
      onload: (() => void) | null = null
      onerror = null
      ontimeout = null
      status = 201
      responseText = JSON.stringify({ job: { id: 'job' } })
      withCredentials = false
      timeout = 0
      headers: Record<string, string> = {}
      constructor() {
        instance = this
      }
      open() {}
      setRequestHeader(name: string, value: string) {
        this.headers[name] = value
      }
      form!: FormData
      send(form: FormData) { this.form = form }
    }
    vi.stubGlobal('XMLHttpRequest', FakeXHR)
    const progress = vi.fn()
    useSettingsStore.setState({ aiMode: 'deep', structuringStyle: 'action_plan' })
    const request = uploadAudio(new Blob(['audio']), 'synthetic.wav', progress)
    instance.upload.onprogress!({
      lengthComputable: true,
      loaded: 25,
      total: 100,
    } as ProgressEvent)
    expect(progress).toHaveBeenCalledWith(25)
    expect(instance.withCredentials).toBe(true)
    expect(instance.headers.Authorization).toMatch(/^Bearer /)
    expect(instance.form.get('mode')).toBe('deep')
    expect(instance.form.get('style')).toBe('action_plan')
    expect(instance.form.get('currentIsoDate')).toEqual(expect.any(String))
    expect(instance.form.get('timeZone')).toEqual(expect.any(String))
    instance.onload!()
    expect(await request).toMatchObject({ id: 'job' })
  })
})
