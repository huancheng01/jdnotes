import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Bell } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import { 
  isPermissionGranted, 
  requestPermission, 
  sendNotification 
} from '@tauri-apps/plugin-notification'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, updateSetting } = useSettings()
  const [showApiKey, setShowApiKey] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'default'>('default')
  const [isCheckingPermission, setIsCheckingPermission] = useState(true)

  // 检查通知权限状态
  useEffect(() => {
    const checkPermission = async () => {
      setIsCheckingPermission(true)
      try {
        const granted = await isPermissionGranted()
        setNotificationPermission(granted ? 'granted' : 'default')
      } catch (e) {
        console.warn('Failed to check notification permission:', e)
        setNotificationPermission('default')
      }
      setIsCheckingPermission(false)
    }
    
    if (open) {
      checkPermission()
    }
  }, [open])

  // 请求通知权限
  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission()
      setNotificationPermission(result === 'granted' ? 'granted' : 'denied')
      
      // 如果授权成功，发送一个测试通知
      if (result === 'granted') {
        await sendNotification({
          title: 'JD Notes',
          body: '通知已启用！',
        })
      }
    } catch (e) {
      console.warn('Failed to request notification permission:', e)
      setNotificationPermission('denied')
    }
  }

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 模态框 */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-dark-sidebar rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-dark-sidebar">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            设置
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-6">
          {/* AI 配置区域 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
              AI 配置
            </h3>
            <div className="space-y-4">
              {/* API 基础 URL */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  API 基础 URL
                </label>
                <input
                  type="text"
                  value={settings.aiBaseUrl}
                  onChange={(e) => updateSetting('aiBaseUrl', e.target.value)}
                  placeholder="https://api.deepseek.com"
                  className="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.aiApiKey}
                    onChange={(e) => updateSetting('aiApiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 pr-10 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* 模型名称 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  模型名称
                </label>
                <input
                  type="text"
                  value={settings.aiModel}
                  onChange={(e) => updateSetting('aiModel', e.target.value)}
                  placeholder="deepseek-chat"
                  className="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* 提醒通知设置 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
              提醒通知
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Bell className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  系统通知
                </span>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                启用系统通知后，笔记提醒到期时会收到系统弹窗通知。
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  当前状态
                </span>
                {isCheckingPermission ? (
                  <span className="text-xs text-gray-400">检测中...</span>
                ) : notificationPermission === 'granted' ? (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    已启用
                  </span>
                ) : notificationPermission === 'denied' ? (
                  <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    已拒绝
                  </span>
                ) : (
                  <button
                    onClick={handleRequestPermission}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 rounded-lg transition-colors"
                  >
                    启用通知
                  </button>
                )}
              </div>
              
              {notificationPermission === 'denied' && (
                <p className="mt-3 text-xs text-gray-400">
                  通知已被拒绝，请在系统设置中允许本应用发送通知。
                </p>
              )}
              
              {notificationPermission === 'granted' && (
                <p className="mt-3 text-xs text-gray-400">
                  提醒到期时，将显示系统弹窗通知和应用内通知。
                </p>
              )}
            </div>
          </div>

          {/* 关于区域 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              关于
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              JD Notes v1.0.0
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              一个简洁高效的本地笔记应用
            </p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-3 italic">
              to jiaxiang
            </p>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-dark-sidebar">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
