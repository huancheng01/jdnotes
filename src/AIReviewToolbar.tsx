import { Check, X, Sparkles } from 'lucide-react'
import { useEffect } from 'react'

interface AIReviewToolbarProps {
  isStreaming: boolean
  onAccept: () => void
  onDiscard: () => void
}

export function AIReviewToolbar({
  isStreaming,
  onAccept,
  onDiscard,
}: AIReviewToolbarProps) {
  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter = Accept
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isStreaming) {
          onAccept()
        }
      }
      // Escape = Discard
      if (e.key === 'Escape') {
        e.preventDefault()
        onDiscard()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isStreaming, onAccept, onDiscard])

  return (
    <div className="ai-review-toolbar inline-flex items-center gap-1 ml-2 align-middle">
      {isStreaming ? (
        /* 生成中 - 显示 Sparkle 动画 */
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-full shadow-lg">
          <Sparkles className="h-3 w-3 text-indigo-500 ai-sparkle" />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">生成中</span>
          <button
            onClick={onDiscard}
            className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
            title="停止 (Esc)"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        /* 审查状态 */
        <div className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-full shadow-lg">
          <button
            onClick={onAccept}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
            title="接受 (⌘+Enter)"
          >
            <Check className="h-3 w-3" />
            <span>接受</span>
          </button>
          <button
            onClick={onDiscard}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
            title="放弃 (Esc)"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
