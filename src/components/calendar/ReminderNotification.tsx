import { useState, useEffect, useCallback } from 'react'
import { Bell, X, ExternalLink } from 'lucide-react'
import { 
  isPermissionGranted, 
  requestPermission, 
  sendNotification 
} from '@tauri-apps/plugin-notification'
import type { Note } from '../../lib/db'

// 发送系统通知
async function sendSystemNotification(title: string, body: string): Promise<boolean> {
  try {
    let permission = await isPermissionGranted()
    if (!permission) {
      permission = (await requestPermission()) === 'granted'
    }
    
    if (permission) {
      await sendNotification({ title, body })
      return true
    }
  } catch (e) {
    console.warn('Failed to send notification:', e)
  }
  return false
}

interface ReminderNotificationProps {
  reminders: Note[]
  onSelectNote: (note: Note) => void
  onDismiss: (noteId: number) => void
}

export function ReminderNotification({
  reminders,
  onSelectNote,
  onDismiss,
}: ReminderNotificationProps) {
  const [visibleReminders, setVisibleReminders] = useState<Note[]>([])
  const [notifiedIds, setNotifiedIds] = useState<Set<number>>(new Set())

  // 初始化时请求通知权限
  useEffect(() => {
    const initPermission = async () => {
      try {
        const granted = await isPermissionGranted()
        if (!granted) {
          await requestPermission()
        }
      } catch (e) {
        console.warn('Failed to initialize notification permission:', e)
      }
    }
    initPermission()
  }, [])

  // 检查新的提醒并显示通知
  useEffect(() => {
    const newReminders = reminders.filter((r) => !notifiedIds.has(r.id))

    if (newReminders.length > 0) {
      // 更新已通知的 ID
      setNotifiedIds((prev) => {
        const next = new Set(prev)
        newReminders.forEach((r) => next.add(r.id))
        return next
      })

      // 添加到可见提醒列表
      setVisibleReminders((prev) => [...prev, ...newReminders])

      // 发送系统通知
      newReminders.forEach((note) => {
        sendSystemNotification('笔记提醒', note.title || '无标题笔记')
      })
    }
  }, [reminders, notifiedIds])

  // 关闭提醒
  const handleDismiss = useCallback((noteId: number) => {
    setVisibleReminders((prev) => prev.filter((r) => r.id !== noteId))
    onDismiss(noteId)
  }, [onDismiss])

  // 关闭所有提醒
  const handleDismissAll = useCallback(() => {
    visibleReminders.forEach((r) => onDismiss(r.id))
    setVisibleReminders([])
  }, [visibleReminders, onDismiss])

  if (visibleReminders.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {/* 批量关闭按钮 */}
      {visibleReminders.length > 1 && (
        <button
          onClick={handleDismissAll}
          className="text-[12px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 mb-1"
        >
          关闭所有 ({visibleReminders.length})
        </button>
      )}

      {/* 提醒列表 */}
      {visibleReminders.map((note) => (
        <div
          key={note.id}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-black/[0.06] dark:border-white/[0.06] p-4 animate-slide-in"
        >
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
              <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  提醒
                </span>
                <button
                  onClick={() => handleDismiss(note.id)}
                  className="p-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] rounded"
                >
                  <X className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
                </button>
              </div>

              <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {note.title || '无标题'}
              </h4>

              {note.reminderDate && (
                <p className="text-[12px] text-slate-500 mt-1">
                  {new Date(note.reminderDate).toLocaleString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}

              <button
                onClick={() => {
                  onSelectNote(note)
                  handleDismiss(note.id)
                }}
                className="mt-2 text-[13px] text-[#5E6AD2] hover:text-[#5E6AD2]/80 font-medium flex items-center gap-1"
              >
                查看笔记
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* 动画样式 */}
      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
