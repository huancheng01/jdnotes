import { useMemo } from 'react'
import { Bell } from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { getHeatmapColor } from '../../hooks/useCalendar'
import type { Note } from '../../lib/db'

interface CalendarCellProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  noteCount: number
  showHeatmap: boolean
  notes?: Note[]
  onClick: () => void
}

export function CalendarCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  noteCount,
  showHeatmap,
  notes = [],
  onClick,
}: CalendarCellProps) {
  // 设置为可放置区域
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `date-${date.toISOString()}`,
    data: { date },
  })

  // 检查是否有提醒
  const hasReminder = useMemo(() => {
    return notes.some((note) => note.reminderEnabled === 1 && note.reminderDate)
  }, [notes])

  // 获取热力图背景色
  const heatmapBg = useMemo(() => {
    if (!showHeatmap) return ''
    return getHeatmapColor(noteCount)
  }, [showHeatmap, noteCount])

  return (
    <div
      ref={setDroppableRef}
      className={`
        group relative aspect-square rounded-xl border-2 transition-all cursor-pointer
        ${showHeatmap && noteCount > 0
          ? heatmapBg
          : isCurrentMonth
            ? 'bg-white dark:bg-white/[0.03]'
            : 'bg-slate-50 dark:bg-white/[0.01]'
        }
        ${isToday
          ? 'ring-2 ring-[#5E6AD2] ring-offset-2 dark:ring-offset-[#0B0D11]'
          : ''
        }
        ${isSelected && !isToday
          ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/20'
          : isSelected && isToday
            ? 'border-emerald-500 bg-emerald-500/10'
            : isOver
              ? 'border-[#5E6AD2] border-dashed bg-[#5E6AD2]/10'
              : 'border-black/[0.06] dark:border-white/[0.06]'
        }
        hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm
      `}
      onClick={onClick}
    >
      {/* 日期数字 */}
      <div className="absolute top-2 left-2">
        <span
          className={`
            text-sm font-medium
            ${isCurrentMonth
              ? 'text-slate-900 dark:text-slate-100'
              : 'text-slate-400 dark:text-slate-600'
            }
            ${isToday ? 'text-[#5E6AD2]' : ''}
          `}
        >
          {date.getDate()}
        </span>
      </div>

      {/* 提醒图标 */}
      {hasReminder && (
        <div className="absolute top-2 left-8">
          <Bell className="h-3 w-3 text-amber-500" strokeWidth={2} fill="currentColor" />
        </div>
      )}

      {/* 笔记数量徽章 */}
      {noteCount > 0 && (
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-medium text-white bg-[#5E6AD2] rounded-full">
            {noteCount}
          </span>
        </div>
      )}

      {/* 笔记指示点（最多显示3个） */}
      {!showHeatmap && noteCount > 0 && noteCount <= 3 && (
        <div className="absolute bottom-2 left-2 flex gap-1">
          {Array.from({ length: Math.min(noteCount, 3) }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]/60"
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 可拖拽的笔记卡片（用于在日历中拖拽）
interface DraggableNoteProps {
  note: Note
  onClick: () => void
}

export function DraggableNote({ note, onClick }: DraggableNoteProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `note-${note.id}`,
    data: { note },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`
        p-2 rounded-lg bg-white dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06]
        hover:border-[#5E6AD2]/30 cursor-grab active:cursor-grabbing
        transition-all
        ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}
      `}
    >
      <div className="text-[12px] font-medium text-slate-900 dark:text-slate-100 truncate">
        {note.title || '无标题'}
      </div>
      {note.reminderEnabled === 1 && note.reminderDate && (
        <div className="flex items-center gap-1 mt-1">
          <Bell className="h-2.5 w-2.5 text-amber-500" strokeWidth={2} />
          <span className="text-[10px] text-amber-600 dark:text-amber-400">
            {new Date(note.reminderDate).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}
    </div>
  )
}
