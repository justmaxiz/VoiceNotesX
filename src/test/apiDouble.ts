/** In-memory HTTP double for UI tests. Production uses the real API repository. */
import type { Item } from '../types/item'
import { useAppStore } from '../store/useAppStore'
import { setSession } from '../lib/api'
import { buildSummaryContext, factualSummary } from '../../server/src/summaryFacts'
import { normalizePeriod, type SummaryReport, type SummarySettings } from '../../server/src/summaryContracts'
export function installApiDouble(items: Item[] = []) {
  const notes = new Map(items.map((item) => [item.id, { ...item }]))
  const reports = new Map<string, SummaryReport>()
  let settings: SummarySettings = { enabled:false,timeZone:null,localTime:'21:00',version:0,nextRun:null }
  setSession({
    accessToken: 'test-access',
    user: { id: 'test-user', email: 'test@example.invalid' },
  })
  const fetchDouble = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const path = new URL(
      String(input),
      'http://localhost:5173',
    ).pathname.replace('/api/v1', '')
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
    const method = init?.method || 'GET'
    const response = (value: unknown, status = 200) =>
      new Response(status === 204 ? null : JSON.stringify(value), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    if (path === '/summaries/settings') {
      if (method === 'PATCH' && !(body.initialize && settings.version)) settings = { ...settings,...body,version:settings.version+1 }
      return response(settings)
    }
    if (path === '/summaries/archive') return response({ reports:[...reports.values()],nextOffset:null })
    if (path.startsWith('/summaries/reports/')) return response([...reports.values()].find(r=>r.id===path.split('/').pop()))
    if (path === '/summaries/facts' || path === '/summaries/generate') {
      const parsedUrl = new URL(String(input),'http://localhost:5173')
      const period = normalizePeriod(method==='POST'?body:JSON.parse(parsedUrl.searchParams.get('period')!))
      const context = buildSummaryContext([...notes.values()],period,new Date())
      const key = JSON.stringify(period)
      if (method==='POST') {
        const report: SummaryReport = { ...factualSummary(context),id:crypto.randomUUID(),slotKey:key,version:1,period,asOf:context.asOf,generatedAt:context.asOf,metrics:context.metrics,facts:context.facts,sources:[],coverage:context.coverage,sourceFingerprint:context.sourceFingerprint,generationMode:context.coverage.total?'facts':'empty',freshness:'current' }
        reports.set(key,report)
        return response({job:{id:'summary-job',stage:'completed',attempts:1,reportId:report.id},report})
      }
      return response({...context,report:reports.get(key)||null})
    }
    if (path === '/audio/jobs') return response({ jobs: [] })
    if (path === '/auth/refresh')
      return response({
        accessToken: 'new-access',
        user: { id: 'test-user', email: 'test@example.invalid' },
      })
    if (path === '/auth/logout') return response({ status: 'ok' })
    if (path === '/ai/structure') {
      let title = body.text.split('\n')[0]
      if (body.text.includes('Текущая заметка:')) {
        const current = JSON.parse(
          body.text.split('Текущая заметка: ')[1].split('\nИнструкция:')[0],
        )
        title =
          /(?:переименуй в|заголовок:)\s*(.+)/i.exec(body.text)?.[1] ||
          current.title
        return response({ result: { ...current, title } })
      }
      return response({
        result: {
          title,
          description: body.text,
          priority: 'medium',
          category_tag: '#Тест',
          transcript_summary: body.text,
          due_date: null,
        },
      })
    }
    if (path === '/notes' && method === 'GET')
      return response({ notes: [...notes.values()], total: notes.size })
    if (path === '/notes' && method === 'POST') {
      const note = {
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      notes.set(body.id, note)
      return response({ note }, 201)
    }
    const id = path.split('/')[2]
    if (path.startsWith('/notes/')) {
      const old =
        notes.get(id) ||
        useAppStore.getState().items.find((item) => item.id === id)
      if (!old)
        return response(
          { error: { code: 'NOT_FOUND', message: 'Запись не найдена' } },
          404,
        )
      if (method === 'DELETE') {
        notes.delete(id)
        return response(undefined, 204)
      }
      const note = { ...old, ...body, updatedAt: new Date().toISOString() }
      if ('status' in body)
        note.completedAt =
          body.status === 'completed'
            ? note.completedAt || new Date().toISOString()
            : undefined
      notes.set(id, note)
      return response({ note })
    }
    return response({ error: { message: 'Unknown test route' } }, 404)
  }
  return { fetch: fetchDouble, notes }
}
