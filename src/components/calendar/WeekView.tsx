import { useMemo } from 'react'
import { Plus, Bell, Clock } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { DraggableNote } from './CalendarCell'
import { isSameDay, formatCalendarTime } from '../../hooks/useCalendar'
import { formatDateKey, type Note } from '../../lib/db'

interface WeekViewProps {
  currentDate: Date
  notes: Note[]
  dateField: 'createdAt' | 'updatedAt'
  onSelectNote: (note: Note) => void
  onCreateNote: (date?: Date) => void
}

export function WeekView({
  currentDate,
  notes,
  dateField,
  onSelectNote,
  onCreateNote,
}: WeekViewProps) {
  // 生成一周的日期
  const weekDays = useMemo(() => {
    const days: Date[] = []
    const startOfWeek = new Date(currentDate)
    const dayOfWeek = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek)

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(date.getDate() + i)
      days.push(date)
    }

    return days
  }, [currentDate])

  // 按日期分组笔记
  const notesByDay = useMemo(() => {
    const map = new Map<string, Note[]>()

    notes.forEach((note) => {
      const date = note[dateField] as Date
      const dateKey = formatDateKey(date)
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(note)
    })

    return map
  }, [notes, dateField])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="grid grid-cols-7 gap-4 min-h-[600px]">
        {weekDays.map((date) => (
          <WeekDayColumn
            key={date.toISOString()}
            date={date}
            notes={notesByDay.get(formatDateKey(date)) || []}
            isToday={isSameDay(date, today)}
            onSelectNote={onSelectNote}
            onCreateNote={onCreateNote}
          />
        ))}
      </div>
    </div>
  )
}

interface WeekDayColumnProps {
  date: Date
  notes: Note[]
  isToday: boolean
  onSelectNote: (note: Note) => void
  onCreateNote: (date?: Date) => void
}

function WeekDayColumn({
  date,
  notes,
  isToday,
  onSelectNote,
  onCreateNote,
}: WeekDayColumnProps) {
  // 设置为可放置区域
  const { setNodeRef, isOver } = useDroppable({
    id: `week-date-${date.toISOString()}`,
    data: { date },
  })

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl border p-4 flex flex-col h-full min-h-[500px]
        ${isToday
          ? 'bg-[#5E6AD2]/5 border-[#5E6AD2]/30'
          : 'bg-white dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.06]'
        }
        ${isOver ? 'border-[#5E6AD2] border-dashed border-2 bg-[#5E6AD2]/10' : ''}
      `}
    >
      {/* 日期标题 */}
      <div className="mb-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="text-[11px] text-slate-400 mb-1">
          {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]}
        </div>
        <div className={`text-lg font-semibold ${isToday ? 'text-[#5E6AD2]' : 'text-slate-900 dark:text-slate-100'}`}>
          {date.getDate()}
        </div>
      </div>

      {/* 笔记列表 */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {notes.map((note) => (
          <DraggableNote
            key={note.id}
            note={note}
            onClick={() => onSelectNote(note)}
          />
        ))}

        {/* 空状态 */}
        {notes.length === 0 && (
          <div className="text-[13px] text-slate-400 text-center py-4">
            暂无笔记
          </div>
        )}
      </div>

      {/* 创建按钮 */}
      <button
        onClick={() => onCreateNote(date)}
        className="w-full mt-3 py-2 text-[13px] text-slate-500 hover:text-[#5E6AD2] hover:bg-[#5E6AD2]/5 rounded-lg transition-colors flex items-center justify-center gap-1"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        创建笔记
      </button>
    </div>
  )
}
