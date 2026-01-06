import { useState, useMemo, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { noteOperations, formatDateKey, type Note } from '../lib/db'

export type CalendarView = 'month' | 'week' | 'day'
export type DateField = 'createdAt' | 'updatedAt'

export interface UseCalendarReturn {
  currentDate: Date
  view: CalendarView
  dateField: DateField
  notes: Note[] | undefined
  distribution: Map<string, number>
  dateRange: { start: Date; end: Date }
  selectedDate: Date | null
  showHeatmap: boolean
  setView: (view: CalendarView) => void
  setDateField: (field: DateField) => void
  setSelectedDate: (date: Date | null) => void
  setShowHeatmap: (show: boolean) => void
  goToToday: () => void
  goToPrevious: () => void
  goToNext: () => void
  goToDate: (date: Date) => void
  // 拖拽相关
  moveNoteToDate: (noteId: number, targetDate: Date) => Promise<void>
  // 提醒相关
  setNoteReminder: (noteId: number, reminderDate: Date) => Promise<void>
  clearNoteReminder: (noteId: number) => Promise<void>
  upcomingReminders: Note[] | undefined
}

export function useCalendar(): UseCalendarReturn {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [dateField, setDateField] = useState<DateField>('createdAt')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showHeatmap, setShowHeatmap] = useState(false)

  // 计算日期范围
  const dateRange = useMemo(() => {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    switch (view) {
      case 'month':
        // 获取当月第一天
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        // 获取当月最后一天
        end.setMonth(end.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        // 扩展到显示的完整日历（包括上月末和下月初）
        const firstDayOfWeek = new Date(start).getDay()
        start.setDate(start.getDate() - firstDayOfWeek)
        const lastDayOfWeek = new Date(end).getDay()
        end.setDate(end.getDate() + (6 - lastDayOfWeek))
        break
      case 'week':
        const day = start.getDay()
        start.setDate(start.getDate() - day)
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'day':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
    }

    return { start, end }
  }, [currentDate, view])

  // 实时查询笔记
  const notes = useLiveQuery(
    async () => {
      return await noteOperations.getByDateRange(
        dateRange.start,
        dateRange.end,
        dateField
      )
    },
    [dateRange.start.getTime(), dateRange.end.getTime(), dateField]
  )

  // 查询即将到期的提醒（30分钟内）
  const upcomingReminders = useLiveQuery(
    async () => {
      return await noteOperations.getUpcomingReminders(30)
    },
    []
  )

  // 计算日期分布
  const distribution = useMemo(() => {
    if (!notes) return new Map<string, number>()

    const map = new Map<string, number>()
    notes.forEach((note) => {
      const date = note[dateField] as Date
      const key = formatDateKey(date)
      map.set(key, (map.get(key) || 0) + 1)
    })

    return map
  }, [notes, dateField])

  // 导航方法
  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const goToPrevious = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() - 7)
        break
      case 'day':
        newDate.setDate(newDate.getDate() - 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, view])

  const goToNext = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1)
        break
      case 'week':
        newDate.setDate(newDate.getDate() + 7)
        break
      case 'day':
        newDate.setDate(newDate.getDate() + 1)
        break
    }
    setCurrentDate(newDate)
  }, [currentDate, view])

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date)
    setSelectedDate(date)
  }, [])

  // 拖拽：移动笔记到新日期
  const moveNoteToDate = useCallback(async (noteId: number, targetDate: Date) => {
    // 保持原有的时分秒，只更改日期部分
    const note = await noteOperations.get(noteId)
    if (!note) return

    const originalDate = note.createdAt
    const newDate = new Date(targetDate)
    newDate.setHours(
      originalDate.getHours(),
      originalDate.getMinutes(),
      originalDate.getSeconds(),
      originalDate.getMilliseconds()
    )

    await noteOperations.updateCreatedAt(noteId, newDate)
  }, [])

  // 设置笔记提醒
  const setNoteReminder = useCallback(async (noteId: number, reminderDate: Date) => {
    await noteOperations.setReminder(noteId, reminderDate)
  }, [])

  // 清除笔记提醒
  const clearNoteReminder = useCallback(async (noteId: number) => {
    await noteOperations.clearReminder(noteId)
  }, [])

  return {
    currentDate,
    view,
    dateField,
    notes,
    distribution,
    dateRange,
    selectedDate,
    showHeatmap,
    setView,
    setDateField,
    setSelectedDate,
    setShowHeatmap,
    goToToday,
    goToPrevious,
    goToNext,
    goToDate,
    moveNoteToDate,
    setNoteReminder,
    clearNoteReminder,
    upcomingReminders,
  }
}

// 辅助函数：获取周数
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// 辅助函数：获取热力图颜色
export function getHeatmapColor(count: number, isDark: boolean = false): string {
  if (count === 0) {
    return isDark ? 'bg-white/[0.03]' : 'bg-slate-100'
  }
  if (count <= 2) {
    return 'bg-[#5E6AD2]/20'
  }
  if (count <= 5) {
    return 'bg-[#5E6AD2]/40'
  }
  if (count <= 10) {
    return 'bg-[#5E6AD2]/60'
  }
  return 'bg-[#5E6AD2]/80'
}

// 辅助函数：格式化时间显示
export function formatCalendarTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 辅助函数：判断是否是同一天
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}
