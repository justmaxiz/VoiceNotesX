import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { Header } from '../Header'
import { useNavigationStore } from '../../../store/navigationStore'

describe('Header Component', () => {
  beforeEach(() => {
    useNavigationStore.setState({
      searchQuery: '',
      isRecordingModalOpen: false,
    })
  })

  it('renders search input and updates query in store', () => {
    render(<Header />)
    const input = screen.getByRole('searchbox')
    expect(input).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'новые мысли' } })
    expect(useNavigationStore.getState().searchQuery).toBe('новые мысли')
  })

  it('renders date badge and quick record button', () => {
    render(<Header />)
    expect(screen.getByText('Сегодня, 24 Окт')).toBeInTheDocument()
    expect(screen.getByText('Запись')).toBeInTheDocument()
  })

  it('clicking quick record button updates store state', () => {
    render(<Header />)
    const recordBtn = screen.getByText('Запись').closest('button')!
    fireEvent.click(recordBtn)

    expect(useNavigationStore.getState().isRecordingModalOpen).toBe(true)
  })

  it('focuses search input on Cmd+K / Ctrl+K shortcut', () => {
    render(<Header />)
    const input = screen.getByRole('searchbox')
    expect(document.activeElement).not.toBe(input)

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(document.activeElement).toBe(input)
  })
})

