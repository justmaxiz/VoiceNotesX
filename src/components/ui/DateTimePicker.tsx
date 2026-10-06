import React, { useEffect, useRef, useState } from 'react'
import { CalendarDays, CalendarClock, Clock3, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Checkbox } from './Checkbox'
import { localDateKey, localDeadline, localTime, parseInstant } from '../../lib/taskDates'

export interface DateTimePickerProps {
  startDate?: string | null
  deadline?: string | null
  dueDate?: string | null
  dueTime?: string | null
  isAllDay?: boolean
  estimatedMinutes?: number
  onChange: (updates: {
    startDate?: string | null
  dueDate?: string | null
    dueTime?: string | null
    isAllDay?: boolean
    estimatedMinutes?: number
  }) => void
}

const DURATION_PRESETS = [
  { label: '15м', value: 15 },
  { label: '30м', value: 30 },
  { label: '45м', value: 45 },
  { label: '1ч', value: 60 },
  { label: '2ч', value: 120 },
]

const fieldClassName = 'w-full min-w-0 rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-2 text-sm text-on-surface accent-primary transition-colors hover:border-outline-variant focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50'
const popupActionClassName = 'cursor-pointer rounded-lg px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
const clearActionClassName = `${popupActionClassName} text-outline hover:bg-error-container hover:text-on-error-container`
const primaryActionClassName = `${popupActionClassName} font-medium text-primary hover:bg-primary hover:text-on-primary`

const popupClassName = 'absolute top-full z-50 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-outline-variant/40 bg-surface-container p-3 text-on-surface shadow-xl'
const todayKey = () => localDateKey()
const parseDateKey = (key?: string | null) => {
  if (!key) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return localDateKey(date) === key ? date : null
}
const formatDate = (key?: string | null) => {
  const date = parseDateKey(key)
  return date ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date) : ''
}
const monthTitle = (date: Date) => {
  const title = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date)
  return title.charAt(0).toLocaleUpperCase('ru-RU') + title.slice(1)
}

function usePopoverDismiss(open: boolean, onClose: () => void, containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, containerRef])
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const DatePicker: React.FC<{ value?: string | null; onChange: (value: string | null) => void; label: string }> = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false)
  const selected = parseDateKey(value)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = selected || new Date()
    return new Date(initial.getFullYear(), initial.getMonth(), 1)
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const close = React.useCallback(() => setOpen(false), [])
  usePopoverDismiss(open, close, containerRef)

  useEffect(() => {
    if (open) {
      const initial = parseDateKey(value) || new Date()
      setVisibleMonth(new Date(initial.getFullYear(), initial.getMonth(), 1))
    }
  }, [open, value])

  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const offset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7
  const days = Array.from({ length: cellCount }, (_, index) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index - offset + 1))

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`${fieldClassName} flex items-center justify-between gap-2 text-left`}>
        <span className={value ? '' : 'text-outline'}>{formatDate(value) || 'Выбрать дату'}</span>
        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-outline" />
      </button>
      {open && (
        <div role="dialog" aria-label="Выбор даты" className={`${popupClassName} left-0`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-on-surface">{monthTitle(visibleMonth)}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Предыдущий месяц" onClick={() => setVisibleMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))} className="rounded-md p-1.5 text-outline hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" aria-label="Следующий месяц" onClick={() => setVisibleMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))} className="rounded-md p-1.5 text-outline hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day) => <span key={day} className="py-1 text-[11px] font-medium text-outline">{day}</span>)}
            {days.map((day) => {
              const key = localDateKey(day)
              const isSelected = key === value
              const isToday = key === todayKey()
              const inMonth = day.getMonth() === visibleMonth.getMonth()
              return <button key={key} type="button" aria-pressed={isSelected} aria-current={isToday ? 'date' : undefined} onClick={() => { onChange(key); setOpen(false) }} className={`aspect-square rounded-lg text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${isSelected ? 'bg-primary font-semibold text-on-primary' : isToday ? 'bg-primary/15 font-semibold text-primary' : inMonth ? 'text-on-surface hover:bg-surface-container-high' : 'text-outline/60 hover:bg-surface-container-high'}`}>{day.getDate()}</button>
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-2">
            <button type="button" onClick={() => { onChange(null); setOpen(false) }} className={clearActionClassName}>Очистить</button>
            <button type="button" onClick={() => { onChange(todayKey()); setVisibleMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setOpen(false) }} className={primaryActionClassName}>Сегодня</button>
          </div>
        </div>
      )}
    </div>
  )
}

const TimeWheelColumn: React.FC<{
  options: number[]
  value: number
  label: string
  onChange: (value: number) => void
}> = ({ options, value, label, onChange }) => {
  const cycleLength = options.length
  const middleOffset = cycleLength * 2
  const initialIndex = Math.max(0, options.indexOf(value))
  const wheelOptions = Array.from({ length: cycleLength * 5 }, (_, index) => options[index % cycleLength])
  const [activeIndex, setActiveIndex] = useState(middleOffset + initialIndex)
  const [isDragging, setIsDragging] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const activeIndexRef = useRef(middleOffset + initialIndex)
  const wheelRemainderRef = useRef(0)
  const scrollCommitRef = useRef<number | null>(null)
  const dragRef = useRef<{ pointerId: number; y: number; scrollTop: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = (middleOffset + initialIndex) * 48
  }, [])

  useEffect(() => () => {
    if (scrollCommitRef.current !== null) window.clearTimeout(scrollCommitRef.current)
  }, [])

  const selectIndex = (index: number) => {
    const nextValueIndex = ((index % cycleLength) + cycleLength) % cycleLength
    const physicalIndex = index < cycleLength || index >= cycleLength * 4
      ? middleOffset + nextValueIndex
      : index
    activeIndexRef.current = physicalIndex
    setActiveIndex(physicalIndex)
    onChange(options[nextValueIndex])
    scrollerRef.current?.scrollTo({ top: physicalIndex * 48, behavior: 'auto' })
  }

  const handleScroll = () => {
    const element = scrollerRef.current
    if (!element) return
    let nextIndex = Math.min(wheelOptions.length - 1, Math.max(0, Math.round(element.scrollTop / 48)))
    if (nextIndex < cycleLength || nextIndex >= cycleLength * 4) {
      nextIndex = middleOffset + (((nextIndex % cycleLength) + cycleLength) % cycleLength)
      element.scrollTop = nextIndex * 48
    }
    activeIndexRef.current = nextIndex
    setActiveIndex(nextIndex)
    if (scrollCommitRef.current !== null) window.clearTimeout(scrollCommitRef.current)
    const selectedValue = options[nextIndex % cycleLength]
    scrollCommitRef.current = window.setTimeout(() => {
      onChange(selectedValue)
      scrollCommitRef.current = null
    }, 120)
  }

  return (
    <div className="relative h-36 overflow-hidden rounded-lg" aria-label={label}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/3 z-10 h-12 border-y border-outline-variant/25 bg-surface-container-high/35" />
      <div
        ref={scrollerRef}
        role="listbox"
        aria-label={label}
        onScroll={handleScroll}
        onWheel={(event) => {
          event.preventDefault()
          if (event.deltaY === 0) return
          const delta = event.deltaY * (event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? event.currentTarget.clientHeight : 1)
          let steps = 0
          if (Math.abs(delta) >= 40) {
            steps = Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta) / 100))
            wheelRemainderRef.current = 0
          } else {
            wheelRemainderRef.current += delta
            steps = Math.trunc(wheelRemainderRef.current / 100)
            wheelRemainderRef.current -= steps * 100
          }
          if (steps) selectIndex(activeIndexRef.current + steps)
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' || event.button !== 0) return
          dragRef.current = { pointerId: event.pointerId, y: event.clientY, scrollTop: event.currentTarget.scrollTop, moved: false }
          setIsDragging(true)
        }}
        onPointerMove={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) {
            if (Math.abs(dragRef.current.y - event.clientY) > 4 && !dragRef.current.moved) {
              dragRef.current.moved = true
              event.currentTarget.setPointerCapture(event.pointerId)
            }
            event.currentTarget.scrollTop = dragRef.current.scrollTop + dragRef.current.y - event.clientY
          }
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) {
            const wasDragged = dragRef.current.moved
            suppressClickRef.current = wasDragged
            if (wasDragged) {
              const index = Math.min(wheelOptions.length - 1, Math.max(0, Math.round(event.currentTarget.scrollTop / 48)))
              selectIndex(index)
            }
            dragRef.current = null
            setIsDragging(false)
            if (suppressClickRef.current) setTimeout(() => { suppressClickRef.current = false }, 0)
          }
        }}
        onPointerCancel={() => { dragRef.current = null; setIsDragging(false) }}
        className={`h-full snap-y snap-mandatory overflow-hidden overscroll-contain py-12 text-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ touchAction: 'pan-y', maskImage: 'linear-gradient(to bottom, transparent, black 24%, black 76%, transparent)' }}
      >
        {wheelOptions.map((option, index) => (
          <button
            key={`${index}-${option}`}
            type="button"
            role="option"
            aria-selected={activeIndex === index}
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false
                return
              }
              selectIndex(index)
            }}
            className={`block h-12 w-full snap-center cursor-pointer text-2xl tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60 ${
              activeIndex === index ? 'font-semibold text-on-surface' : Math.abs(activeIndex - index) === 1 ? 'text-outline/60' : 'text-outline/30'
            }`}
          >
            {String(option).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  )
}

const TimePicker: React.FC<{ value?: string | null; onChange: (value: string | null) => void; label: string; disabled?: boolean }> = ({ value, onChange, label, disabled }) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const close = React.useCallback(() => setOpen(false), [])
  usePopoverDismiss(open, close, containerRef)
  const [hour, minute] = value?.split(':').map(Number) || []
  const update = (nextHour: number, nextMinute: number) => onChange(`${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`)
  const hours = Array.from({ length: 24 }, (_, item) => item)
  const minutes = Array.from(new Set([
    ...Array.from({ length: 12 }, (_, item) => item * 5),
    ...(Number.isInteger(minute) ? [minute!] : []),
  ])).sort((a, b) => a - b)

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={() => setOpen((current) => !current)} className={`${fieldClassName} flex items-center justify-between gap-2 text-left`}>
        <span className={value ? 'tabular-nums' : 'text-outline'}>{value || 'Выбрать время'}</span>
        <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-outline" />
      </button>
      {open && (
        <div role="dialog" aria-label="Выбор времени" className={`${popupClassName} right-0 w-[min(15rem,calc(100vw-3rem))] p-3`}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <TimeWheelColumn options={hours} value={Number.isInteger(hour) ? hour! : 9} label="Часы" onChange={(nextHour) => update(nextHour, minute ?? 0)} />
            <span aria-hidden="true" className="text-xl font-medium text-outline">:</span>
            <TimeWheelColumn key={minutes.join('-')} options={minutes} value={Number.isInteger(minute) ? minute! : 0} label="Минуты" onChange={(nextMinute) => update(hour ?? 9, nextMinute)} />
          </div>
          <p className="mt-2 text-center text-[11px] text-outline">Прокрутите или перетащите</p>
          <div className="mt-2 flex items-center justify-between border-t border-outline-variant/20 pt-2">
            <button type="button" onClick={() => { onChange(null); setOpen(false) }} className={clearActionClassName}>Очистить</button>
            <button type="button" onClick={() => { onChange(value || '09:00'); setOpen(false) }} className={primaryActionClassName}>Готово</button>
          </div>
        </div>
      )}
    </div>
  )
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  startDate,
  deadline,
  dueDate,
  dueTime,
  isAllDay = false,
  estimatedMinutes,
  onChange,
}) => {
  const getTodayStr = () => localDateKey()
  const getTomorrowStr = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return localDateKey(d)
  }
  const getEndOfWeekStr = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = (7 - day) % 7 || 7 // Next Sunday
    d.setDate(d.getDate() + diff)
    return localDateKey(d)
  }

  const startInstant = parseInstant(startDate)
  const deadlineInstant = parseInstant(deadline) || (dueDate ? localDeadline(dueDate, dueTime) : null)
  const effectiveDueTime = dueTime || (!isAllDay && deadlineInstant ? localTime(deadlineInstant) : null)
  const actualDuration = startInstant && deadlineInstant
    ? Math.round((deadlineInstant.getTime() - startInstant.getTime()) / 60000)
    : estimatedMinutes
  const hasCustomDuration = actualDuration !== undefined && actualDuration > 0 && actualDuration <= 525600 && !DURATION_PRESETS.some((preset) => preset.value === actualDuration)

  const handlePresetDate = (dateVal: string | null) => {
    onChange({ dueDate: dateVal })
  }

  return (
    <section aria-label="Дата и время дедлайна" className="space-y-4 rounded-xl border border-outline-variant/25 bg-surface-container-low p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          <CalendarClock aria-hidden="true" className="h-4 w-4 text-primary" />
          <span>Дата и время дедлайна</span>
        </h3>

        {dueDate && (
          <button
            type="button"
            onClick={() => handlePresetDate(null)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-outline transition-colors hover:bg-error-container/20 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <RotateCcw aria-hidden="true" className="h-3 w-3" />
            Сбросить
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2" aria-label="Быстрый выбор даты">
        <button
          type="button"
          aria-pressed={dueDate === getTodayStr()}
          onClick={() => handlePresetDate(getTodayStr())}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
            dueDate === getTodayStr()
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          Сегодня
        </button>
        <button
          type="button"
          aria-pressed={dueDate === getTomorrowStr()}
          onClick={() => handlePresetDate(getTomorrowStr())}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
            dueDate === getTomorrowStr()
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          Завтра
        </button>
        <button
          type="button"
          aria-pressed={dueDate === getEndOfWeekStr()}
          onClick={() => handlePresetDate(getEndOfWeekStr())}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
            dueDate === getEndOfWeekStr()
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          Конец недели
        </button>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-on-surface-variant">Начало</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DatePicker
            label="Дата начала"
            value={parseInstant(startDate) ? localDateKey(parseInstant(startDate)!) : null}
            onChange={(date) => {
              if (!date) return onChange({ startDate: null })
              const current = parseInstant(startDate)
              const time = current ? localTime(current) : '09:00'
              const [year, month, day] = date.split('-').map(Number)
              const [hour, minute] = time.split(':').map(Number)
              onChange({ startDate: new Date(year, month - 1, day, hour, minute).toISOString() })
            }}
          />
          <TimePicker
            label="Время начала"
            value={parseInstant(startDate) ? localTime(parseInstant(startDate)!) : null}
            onChange={(time) => {
              if (!time) return onChange({ startDate: null })
              const date = parseInstant(startDate) || new Date()
              const [hour, minute] = time.split(':').map(Number)
              onChange({ startDate: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute).toISOString() })
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-outline" />
            Дата
          </label>
          <DatePicker
            label="Дата дедлайна"
            value={dueDate || ''}
            onChange={(date) => onChange({ dueDate: date })}
          />
        </div>

        <div className="min-w-0">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-outline" />
            Время
          </label>
          <TimePicker
            label="Время дедлайна"
            disabled={isAllDay}
            value={effectiveDueTime}
            onChange={(time) => onChange({ dueTime: time })}
          />
        </div>
      </div>

      <div className="border-t border-outline-variant/20 pt-3">
        <label
          onClick={() => onChange({ isAllDay: !isAllDay })}
          className="flex w-fit cursor-pointer select-none items-center gap-2 rounded-lg pr-2 text-sm text-on-surface transition-colors hover:text-primary"
        >
          <Checkbox
            checked={isAllDay}
            onChange={(checked) => onChange({ isAllDay: checked })}
            size="sm"
            ariaLabel="Событие на весь день"
          />
          <span>Весь день</span>
        </label>
      </div>

      {!isAllDay && <div className="border-t border-outline-variant/20 pt-3">
        <p className="mb-2 text-xs font-medium text-on-surface-variant">
          Длительность
          <span className="ml-1 font-normal text-outline">задачи</span>
        </p>
        <div className="flex flex-wrap items-center gap-2" aria-label="Длительность задачи">
          {DURATION_PRESETS.map((d) => (
            <button
              key={d.value}
              type="button"
              aria-pressed={actualDuration === d.value}
              onClick={() => onChange({ estimatedMinutes: d.value })}
              className={`rounded-lg px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 ${
                actualDuration === d.value
                  ? 'bg-secondary text-on-secondary font-semibold shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
              }`}
            >
              {d.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={hasCustomDuration}
            disabled={!actualDuration || actualDuration <= 0 || actualDuration > 525600}
            onClick={() => {
              if (actualDuration && actualDuration > 0 && actualDuration <= 525600) {
                onChange({ estimatedMinutes: actualDuration })
              }
            }}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 ${
              hasCustomDuration
                ? 'bg-secondary text-on-secondary font-semibold shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
            }`}
          >
            Своя
          </button>
        </div>
      </div>}
    </section>
  )
}
