import { describe, it, expect, beforeEach } from 'vitest'
import { useNavigationStore, normalizeTab } from '../navigationStore'

describe('navigationStore', () => {
  beforeEach(() => {
    useNavigationStore.setState({
      activeTab: 'overview',
      searchQuery: '',
      isRecordingModalOpen: false,
    })
    window.location.hash = ''
  })

  it('initializes with default activeTab as overview', () => {
    const { activeTab } = useNavigationStore.getState()
    expect(activeTab).toBe('overview')
  })

  it('updates activeTab and updates window.location.hash', () => {
    const { setActiveTab } = useNavigationStore.getState()
    setActiveTab('tasks')

    expect(useNavigationStore.getState().activeTab).toBe('tasks')
    expect(window.location.hash).toBe('#tasks')
  })

  it('updates searchQuery correctly', () => {
    const { setSearchQuery } = useNavigationStore.getState()
    setSearchQuery('test query')

    expect(useNavigationStore.getState().searchQuery).toBe('test query')
  })

  it('toggles recording modal open state', () => {
    const { setRecordingModalOpen } = useNavigationStore.getState()
    setRecordingModalOpen(true)
    expect(useNavigationStore.getState().isRecordingModalOpen).toBe(true)

    setRecordingModalOpen(false)
    expect(useNavigationStore.getState().isRecordingModalOpen).toBe(false)
  })

  it('normalizes various hash patterns correctly', () => {
    expect(normalizeTab('#notes')).toBe('notes-and-audio')
    expect(normalizeTab('#notes-and-audio')).toBe('notes-and-audio')
    expect(normalizeTab('#tasks')).toBe('tasks')
    expect(normalizeTab('#calendar')).toBe('calendar')
    expect(normalizeTab('#ai-summaries')).toBe('ai-summaries')
    expect(normalizeTab('#summaries')).toBe('ai-summaries')
    expect(normalizeTab('#settings')).toBe('settings')
    expect(normalizeTab('#overview')).toBe('overview')
    expect(normalizeTab('#home')).toBe('overview')
    expect(normalizeTab('')).toBe('overview')
    expect(normalizeTab('#unknown-slug')).toBeNull()
  })
})
