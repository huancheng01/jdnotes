import { useCallback, useRef } from 'react'
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { useCalendar } from '../../hooks/useCalendar'
import { CalendarHeader } from './CalendarHeader'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { ReminderNotification } from './ReminderNotification'
import type { Note } from '../../lib/db'

interface CalendarViewProps {
  onSelectNote: (note: Note) => void
  onBack?: () => void
}

export function CalendarView({ onSelectNote }: CalendarViewProps) {
  const calendar = useCalendar()
  const calendarRef = useRef<HTMLDivElement>(null)

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 拖拽 8px 后才激活
      },
    })
  )

  // 处理拖拽结束
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (!over) return

      // 从 active.id 提取笔记 ID
      const noteIdStr = String(active.id).replace('note-', '')
      const noteId = parseInt(noteIdStr, 10)

      if (isNaN(noteId)) return

      // 从 over.data 获取目标日期
      const targetDate = over.data.current?.date as Date | undefined

      if (targetDate) {
        await calendar.moveNoteToDate(noteId, targetDate)
      }
    },
    [calendar]
  )

  // 导出日历
  const handleExport = useCallback(async () => {
    if (!calendarRef.current) return

    try {
      // 显示导出中提示
      const loadingDiv = document.createElement('div')
      loadingDiv.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50'
      loadingDiv.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl">
          <div class="text-center">
            <div class="animate-spin h-8 w-8 border-4 border-[#5E6AD2] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p class="text-slate-600 dark:text-slate-300">正在导出...</p>
          </div>
        </div>
      `
      document.body.appendChild(loadingDiv)

      // 等待一帧以确保 DOM 更新
      await new Promise((resolve) => requestAnimationFrame(resolve))

      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
      })

      // 提供导出选项
      const format = await showExportDialog()

      if (format === 'png') {
        // 导出为 PNG
        const link = document.createElement('a')
        link.download = `calendar-${formatExportDate(calendar.currentDate)}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      } else if (format === 'pdf') {
        // 导出为 PDF
        const imgWidth = 210 // A4 宽度 (mm)
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        const pdf = new jsPDF('p', 'mm', 'a4')
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`calendar-${formatExportDate(calendar.currentDate)}.pdf`)
      }

      document.body.removeChild(loadingDiv)
    } catch (error) {
      console.error('Export failed:', error)
      alert('导出失败，请重试')
    }
  }, [calendar.currentDate])

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col bg-[#F9FBFC] dark:bg-[#0B0D11]">
        {/* 提醒通知 */}
        <ReminderNotification
          reminders={calendar.upcomingReminders || []}
          onSelectNote={onSelectNote}
          onDismiss={calendar.clearNoteReminder}
        />

        <CalendarHeader
          currentDate={calendar.currentDate}
          view={calendar.view}
          dateField={calendar.dateField}
          showHeatmap={calendar.showHeatmap}
          onViewChange={calendar.setView}
          onDateFieldChange={calendar.setDateField}
          onHeatmapToggle={calendar.setShowHeatmap}
          onPrevious={calendar.goToPrevious}
          onNext={calendar.goToNext}
          onToday={calendar.goToToday}
          onExport={handleExport}
        />

        <div ref={calendarRef} className="flex-1 overflow-hidden" id="calendar-content">
          {calendar.view === 'month' && (
            <MonthView
              currentDate={calendar.currentDate}
              notes={calendar.notes || []}
              distribution={calendar.distribution}
              selectedDate={calendar.selectedDate}
              showHeatmap={calendar.showHeatmap}
              dateField={calendar.dateField}
              onSelectDate={calendar.goToDate}
              onSelectNote={onSelectNote}
            />
          )}

          {calendar.view === 'week' && (
            <WeekView
              currentDate={calendar.currentDate}
              notes={calendar.notes || []}
              dateField={calendar.dateField}
              onSelectNote={onSelectNote}
            />
          )}

          {calendar.view === 'day' && (
            <DayView
              currentDate={calendar.currentDate}
              notes={calendar.notes || []}
              dateField={calendar.dateField}
              onSelectNote={onSelectNote}
              onSetReminder={calendar.setNoteReminder}
              onClearReminder={calendar.clearNoteReminder}
            />
          )}
        </div>
      </div>
    </DndContext>
  )
}

// 导出日期格式化
function formatExportDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// 显示导出格式选择对话框
function showExportDialog(): Promise<'png' | 'pdf' | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement('div')
    dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50'
    dialog.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-xl w-80">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">选择导出格式</h3>
        <div class="space-y-2">
          <button id="export-png" class="w-full py-3 px-4 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors flex items-center gap-3">
            <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <div class="font-medium">PNG 图片</div>
              <div class="text-xs text-slate-400">适合分享和预览</div>
            </div>
          </button>
          <button id="export-pdf" class="w-full py-3 px-4 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors flex items-center gap-3">
            <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <div class="font-medium">PDF 文档</div>
              <div class="text-xs text-slate-400">适合打印和存档</div>
            </div>
          </button>
        </div>
        <button id="export-cancel" class="w-full mt-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
          取消
        </button>
      </div>
    `

    const cleanup = () => {
      document.body.removeChild(dialog)
    }

    dialog.querySelector('#export-png')?.addEventListener('click', () => {
      cleanup()
      resolve('png')
    })

    dialog.querySelector('#export-pdf')?.addEventListener('click', () => {
      cleanup()
      resolve('pdf')
    })

    dialog.querySelector('#export-cancel')?.addEventListener('click', () => {
      cleanup()
      resolve(null)
    })

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        cleanup()
        resolve(null)
      }
    })

    document.body.appendChild(dialog)
  })
}
