import { Editor } from '@tiptap/react'
import { Sparkles, FileText, Languages, MessageSquare, Square, Send, X } from 'lucide-react'
import { useAIStream, AIAction } from './useAIStream'
import { useState, useEffect, useCallback } from 'react'

interface AIContextMenuProps {
  editor: Editor
  position: { x: number; y: number } | null
  hasSelection: boolean
  onClose: () => void
}

export function AIContextMenu({ editor, position, hasSelection, onClose }: AIContextMenuProps) {
  const [showInput, setShowInput] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showError, setShowError] = useState<string | null>(null)
  const [streamPreview, setStreamPreview] = useState('')

  const { isStreaming, startStream, stopStream } = useAIStream({
    onChunk: (chunk) => {
      // 缓冲内容用于预览，不直接插入
      setStreamPreview((prev) => prev + chunk)
    },
    onFinish: (fullText) => {
      // 流结束后，一次性插入完整的 Markdown 内容
      if (fullText.trim()) {
        editor.chain().focus().insertContent(fullText).run()
      }
      setStreamPreview('')
      setShowInput(false)
      setCustomPrompt('')
      onClose()
    },
    onError: (error) => {
      setStreamPreview('')
      setShowError(error)
      setTimeout(() => setShowError(null), 3000)
    },
  })

  // ESC 关闭菜单
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isStreaming) {
          stopStream()
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isStreaming, stopStream])

  // 点击外部关闭
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.ai-context-menu')) {
        if (!isStreaming) {
          onClose()
        }
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, isStreaming])

  // 获取选中文本
  const getSelectedText = useCallback(() => {
    const { from, to } = editor.state.selection
    return editor.state.doc.textBetween(from, to, ' ')
  }, [editor])

  // 获取上下文文本
  const getContextText = useCallback(() => {
    const { from } = editor.state.selection
    const textBefore = editor.state.doc.textBetween(0, from, ' ')
    return textBefore.slice(-500)
  }, [editor])

  // 处理选中文本的 AI 操作
  const handleSelectionAction = useCallback(
    async (action: AIAction) => {
      const selectedText = getSelectedText()
      if (!selectedText.trim()) return

      // 删除选中的文本
      editor.chain().focus().deleteSelection().run()

      // 开始流式生成
      await startStream(action, selectedText)
    },
    [editor, getSelectedText, startStream]
  )

  // 处理续写
  const handleContinue = useCallback(async () => {
    const context = getContextText()
    if (!context.trim()) {
      setShowError('请先输入一些内容')
      setTimeout(() => setShowError(null), 3000)
      return
    }
    await startStream('continue', context)
  }, [getContextText, startStream])

  // 处理自定义提问
  const handleCustomPrompt = useCallback(async () => {
    if (!customPrompt.trim()) return
    const context = hasSelection ? getSelectedText() : getContextText()
    await startStream('custom', context, customPrompt)
  }, [customPrompt, hasSelection, getSelectedText, getContextText, startStream])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCustomPrompt()
    }
  }

  if (!position) return null

  // 计算菜单位置，确保不超出屏幕
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 220),
    top: Math.min(position.y, window.innerHeight - 300),
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

        {isStreaming ? (
          <div className="flex flex-col gap-2 p-2 max-w-[320px]">
            {/* 预览区域 */}
            {streamPreview && (
              <div className="max-h-[200px] overflow-y-auto text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded p-2 whitespace-pre-wrap break-words">
                {streamPreview}
              </div>
            )}
            {/* 状态栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-indigo-600 dark:text-indigo-400">AI 正在生成...</span>
              </div>
              <button
                onClick={() => {
                  stopStream()
                  setStreamPreview('')
                }}
                className="p-1 text-gray-500 hover:text-red-500 rounded transition-colors"
                title="停止"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            </div>
          </div>
        ) : showInput ? (
          <div className="flex flex-col gap-2 p-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题..."
                autoFocus
                className="flex-1 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white"
              />
              <button
                onClick={handleCustomPrompt}
                disabled={!customPrompt.trim()}
                className="p-1.5 text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  onClick={() => handleSelectionAction('refine')}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>改进写作</span>
                </button>
                <button
                  onClick={() => handleSelectionAction('summarize')}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>总结摘要</span>
                </button>
                <button
                  onClick={() => handleSelectionAction('translate')}
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
              onClick={handleContinue}
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

        {/* 错误提示 */}
        {showError && (
          <div className="px-2 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded mt-1">
            {showError}
          </div>
        )}
      </div>
    </div>
  )
}
