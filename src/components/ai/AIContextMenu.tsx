import { Sparkles, FileText, Languages, MessageSquare, Send, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import type { AIAction } from '../../hooks/useAIStream'

interface AIContextMenuProps {
  position: { x: number; y: number } | null
  hasSelection: boolean
  onAction: (action: AIAction, customPrompt?: string) => void
  onClose: () => void
}

export function AIContextMenu({ position, hasSelection, onAction, onClose }: AIContextMenuProps) {
  const [showInput, setShowInput] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')

  // ESC 关闭菜单
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // 点击外部关闭
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.ai-context-menu')) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const handleAction = useCallback((action: AIAction) => {
    onAction(action)
    onClose()
  }, [onAction, onClose])

  const handleCustomPrompt = useCallback(() => {
    if (!customPrompt.trim()) return
    onAction('custom', customPrompt)
    setCustomPrompt('')
    setShowInput(false)
    onClose()
  }, [customPrompt, onAction, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCustomPrompt()
    }
  }

  if (!position) return null

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 220),
    top: Math.min(position.y, window.innerHeight - 250),
    zIndex: 100,
  }

  return (
    <div className="ai-context-menu" style={menuStyle}>
      <div className="flex flex-col gap-1 p-1.5 bg-white dark:bg-dark-sidebar rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 min-w-[200px]">
        {/* 标题 */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 dark:border-gray-700 mb-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            AI 助手
          </span>
          <button
            onClick={onClose}
            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {showInput ? (
          <div className="flex flex-col gap-2 p-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题..."
                autoFocus
                className="flex-1 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <button
                onClick={handleCustomPrompt}
                disabled={!customPrompt.trim()}
                className="p-1.5 text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => {
                setShowInput(false)
                setCustomPrompt('')
              }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-left px-1"
            >
              取消
            </button>
          </div>
        ) : (
          <>
            {/* 选中文本时的选项 */}
            {hasSelection && (
              <>
                <button
                  onClick={() => handleAction('refine')}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>改进写作</span>
                </button>
                <button
                  onClick={() => handleAction('summarize')}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>总结摘要</span>
                </button>
                <button
                  onClick={() => handleAction('translate')}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                >
                  <Languages className="h-3.5 w-3.5" />
                  <span>中英互译</span>
                </button>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
              </>
            )}

            {/* 通用选项 */}
            <button
              onClick={() => handleAction('continue')}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI 续写</span>
            </button>
            <button
              onClick={() => setShowInput(true)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>自由提问</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
