import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

type Props = {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  datesWithEvents?: Set<number> // day of month
}

export function WeekCalendar({ selectedDate, onSelectDate, datesWithEvents = new Set() }: Props) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - d.getDay())
    return d
  })

  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentWeekStart])

  const monthYear = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const goPrevWeek = () => {
    const d = new Date(currentWeekStart)
    d.setDate(d.getDate() - 7)
    setCurrentWeekStart(d)
  }

  const goNextWeek = () => {
    const d = new Date(currentWeekStart)
    d.setDate(d.getDate() + 7)
    setCurrentWeekStart(d)
  }

  const handleSelectDate = (date: Date) => {
    onSelectDate(new Date(date))
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  return (
    <div className="bg-surface-card rounded-card p-4 mb-4">
      {/* Month/Year header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-white text-rt-15 font-bold capitalize">{monthYear}</div>
        <div className="flex gap-1">
          <button
            onClick={goPrevWeek}
            className="w-8 h-8 rounded-md bg-surface-input flex items-center justify-center active:scale-95 transition"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          <button
            onClick={goNextWeek}
            className="w-8 h-8 rounded-md bg-surface-input flex items-center justify-center active:scale-95 transition"
            aria-label="Próxima semana"
          >
            <ChevronRight size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Week days abbreviations */}
      <div className="flex justify-between mb-3 text-white/60 text-rt-12 font-semibold">
        {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((day) => (
          <div key={day} className="w-8 text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex justify-between gap-1">
        {weekDays.map((date) => {
          const dayOfMonth = date.getDate()
          const selected = isSelected(date)
          const today = isToday(date)
          const hasEvent = datesWithEvents.has(dayOfMonth)

          return (
            <button
              key={date.toDateString()}
              onClick={() => handleSelectDate(date)}
              className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-md transition active:scale-95 ${
                selected
                  ? 'bg-brand'
                  : today
                    ? 'border-2 border-brand'
                    : 'hover:bg-surface-input'
              }`}
            >
              <div
                className={`text-rt-14 font-bold ${selected ? 'text-white' : today ? 'text-brand' : 'text-white'}`}
              >
                {dayOfMonth}
              </div>
              {hasEvent && (
                <div className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : 'bg-brand'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
