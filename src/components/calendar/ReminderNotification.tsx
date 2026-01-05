import { useState, useEffect, useCallback } from 'react'
import { Bell, X, ExternalLink } from 'lucide-react'
import type { Note } from '../../lib/db'

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

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
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
        sendBrowserNotification(note)
      })
    }
  }, [reminders, notifiedIds])

  // 发送浏览器通知
  const sendBrowserNotification = useCallback((note: Note) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('笔记提醒', {
        body: note.title || '无标题笔记',
        icon: '/app-icon.png',
        tag: `note-reminder-${note.id}`,
      })

      notification.onclick = () => {
        window.focus()
        onSelectNote(note)
        handleDismiss(note.id)
      }

      // 5秒后自动关闭
      setTimeout(() => notification.close(), 5000)
    }
  }, [onSelectNote])

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

// 辅助组件：提醒设置面板（可在设置页面使用）
export function ReminderSettings() {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
    }
  }

  return (
    <div className="p-4 bg-white dark:bg-white/[0.03] rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
      <div className="flex items-center gap-3 mb-3">
        <Bell className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
          笔记提醒
        </h3>
      </div>

      <p className="text-[13px] text-slate-500 mb-4">
        启用浏览器通知，在设定的时间收到笔记提醒。
      </p>

      <div className="flex items-center justify-between">
        <span className="text-[13px] text-slate-600 dark:text-slate-400">
          通知权限状态
        </span>
        {permission === 'granted' ? (
          <span className="text-[13px] text-green-600 dark:text-green-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            已启用
          </span>
        ) : permission === 'denied' ? (
          <span className="text-[13px] text-red-600 dark:text-red-400">
            已拒绝
          </span>
        ) : (
          <button
            onClick={requestPermission}
            className="px-3 py-1.5 text-[13px] font-medium text-white bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 rounded-lg transition-colors"
          >
            启用通知
          </button>
        )}
      </div>

      {permission === 'denied' && (
        <p className="mt-3 text-[12px] text-slate-400">
          请在浏览器设置中允许本站发送通知。
        </p>
      )}
    </div>
  )
}
