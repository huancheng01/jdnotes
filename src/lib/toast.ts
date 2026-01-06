/**
 * 简易 Toast 通知系统
 * 提供全局的用户反馈通知功能
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  duration?: number // 显示时长，毫秒
  position?: 'top' | 'bottom'
}

interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

// Toast 状态
let toasts: Toast[] = []
let toastId = 0
let containerElement: HTMLDivElement | null = null
let listeners: Set<() => void> = new Set()

// 订阅 toast 变化
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// 通知监听器
function notify() {
  listeners.forEach(fn => fn())
}

// 创建或获取 toast 容器
function getContainer(): HTMLDivElement {
  if (containerElement) return containerElement
  
  containerElement = document.createElement('div')
  containerElement.id = 'toast-container'
  containerElement.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none'
  document.body.appendChild(containerElement)
  
  return containerElement
}

// 渲染单个 toast
function renderToast(toast: Toast): HTMLDivElement {
  const el = document.createElement('div')
  el.id = `toast-${toast.id}`
  el.className = `
    pointer-events-auto
    px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm
    transform transition-all duration-300 ease-out
    translate-x-full opacity-0
    text-sm font-medium
    ${toast.type === 'success' ? 'bg-green-50/90 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/50' : ''}
    ${toast.type === 'error' ? 'bg-red-50/90 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/50' : ''}
    ${toast.type === 'warning' ? 'bg-yellow-50/90 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200/50 dark:border-yellow-800/50' : ''}
    ${toast.type === 'info' ? 'bg-blue-50/90 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50' : ''}
  `.trim().replace(/\s+/g, ' ')
  
  // 图标
  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }
  
  el.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-base">${icons[toast.type]}</span>
      <span>${toast.message}</span>
    </div>
  `
  
  return el
}

// 显示 toast
function show(message: string, type: ToastType, options: ToastOptions = {}) {
  const { duration = 4000 } = options
  
  const toast: Toast = {
    id: ++toastId,
    message,
    type,
    duration,
  }
  
  toasts = [...toasts, toast]
  notify()
  
  const container = getContainer()
  const el = renderToast(toast)
  container.appendChild(el)
  
  // 触发进入动画
  requestAnimationFrame(() => {
    el.classList.remove('translate-x-full', 'opacity-0')
    el.classList.add('translate-x-0', 'opacity-100')
  })
  
  // 自动移除
  setTimeout(() => {
    remove(toast.id)
  }, duration)
  
  return toast.id
}

// 移除 toast
function remove(id: number) {
  const el = document.getElementById(`toast-${id}`)
  if (el) {
    // 退出动画
    el.classList.remove('translate-x-0', 'opacity-100')
    el.classList.add('translate-x-full', 'opacity-0')
    
    setTimeout(() => {
      el.remove()
      toasts = toasts.filter(t => t.id !== id)
      notify()
    }, 300)
  }
}

// 导出 toast 方法
export const toast = {
  success: (message: string, options?: ToastOptions) => show(message, 'success', options),
  error: (message: string, options?: ToastOptions) => show(message, 'error', options),
  warning: (message: string, options?: ToastOptions) => show(message, 'warning', options),
  info: (message: string, options?: ToastOptions) => show(message, 'info', options),
  remove,
  subscribe,
  getToasts: () => toasts,
}

// 默认导出
export default toast
